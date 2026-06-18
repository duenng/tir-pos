#!/usr/bin/env python3
import json
import os
import socket
import sqlite3
import ssl
import textwrap
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
DB_PATH = DATA_DIR / "pos.db"
PRODUCTS_PATH = DATA_DIR / "products.json"
PRINTERS_PATH = DATA_DIR / "printers.json"
HOST = os.environ.get("POS_HOST", "0.0.0.0")
PORT = int(os.environ.get("POS_PORT", "8787"))
SHOP_NAME = os.environ.get("POS_SHOP_NAME", "Emergency POS")
RECEIPT_SHOP_NAME = os.environ.get("POS_RECEIPT_SHOP_NAME", "The Infinity Room")
SSL_CERT_FILE = os.environ.get("POS_SSL_CERT")
SSL_KEY_FILE = os.environ.get("POS_SSL_KEY")


def env_flag(name: str, default: bool) -> bool:
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() not in {"0", "false", "no", "off", ""}


PRINTING_ENABLED = env_flag("POS_PRINTING_ENABLED", True)


def ensure_data_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not PRODUCTS_PATH.exists():
        PRODUCTS_PATH.write_text("[]\n", encoding="utf-8")
    if not PRINTERS_PATH.exists():
        PRINTERS_PATH.write_text("[]\n", encoding="utf-8")


def init_db() -> None:
    ensure_data_files()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL UNIQUE,
                cashier TEXT,
                note TEXT,
                subtotal REAL NOT NULL,
                total REAL NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                sku TEXT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                line_total REAL NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )
            """
        )
        conn.commit()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def list_products():
    return load_json(PRODUCTS_PATH, [])


def save_products(products) -> None:
    save_json(PRODUCTS_PATH, products)


def update_product_stock(sku: str, stock_value):
    products = list_products()
    normalized_sku = str(sku or "").strip()
    if not normalized_sku:
        raise ValueError("SKU is required.")
    updated_product = None
    for product in products:
        if str(product.get("sku", "")).strip() != normalized_sku:
            continue
        if stock_value in ("", None):
            product.pop("stock", None)
        else:
            stock = int(stock_value)
            if stock < 0:
                raise ValueError("Stock cannot be negative.")
            product["stock"] = stock
        updated_product = product
        break
    if updated_product is None:
        raise ValueError(f"Product '{normalized_sku}' not found.")
    save_products(products)
    return updated_product


def apply_lunch_stock(items):
    products = list_products()
    lunch_quantities = {}
    for item in items:
        if str(item.get("category", "")).strip().lower() != "lunch":
            continue
        sku = str(item.get("sku", "")).strip()
        if not sku:
            continue
        lunch_quantities[sku] = lunch_quantities.get(sku, 0) + int(item.get("quantity", 0))
    if not lunch_quantities:
        return

    for product in products:
        sku = str(product.get("sku", "")).strip()
        if sku not in lunch_quantities:
            continue
        if "stock" not in product:
            continue
        remaining = int(product.get("stock", 0))
        requested = lunch_quantities[sku]
        if requested > remaining:
            raise ValueError(f"Not enough stock for {product.get('name', sku)}. Remaining: {remaining}.")

    for product in products:
        sku = str(product.get("sku", "")).strip()
        if sku not in lunch_quantities or "stock" not in product:
            continue
        product["stock"] = int(product.get("stock", 0)) - lunch_quantities[sku]

    save_products(products)


def list_printers():
    printers = load_json(PRINTERS_PATH, [])
    return sorted(printers, key=lambda item: item.get("id", ""))


def find_printer_by_role(role: str):
    for printer in list_printers():
        if str(printer.get("role", "")).lower() == role.lower():
            return printer
    return None


def recent_orders(limit=25):
    with get_db() as conn:
        order_rows = conn.execute(
            """
            SELECT id, order_number, cashier, note, subtotal, total, created_at
            FROM orders
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        results = []
        for order in order_rows:
            items = conn.execute(
                """
                SELECT sku, name, price, quantity, line_total
                FROM order_items
                WHERE order_id = ?
                ORDER BY id ASC
                """,
                (order["id"],),
            ).fetchall()
            results.append(
                {
                    "id": order["id"],
                    "order_number": order["order_number"],
                    "cashier": order["cashier"] or "",
                    "note": order["note"] or "",
                    "subtotal": order["subtotal"],
                    "total": order["total"],
                    "created_at": order["created_at"],
                    "items": [dict(item) for item in items],
                }
            )
        return results


def next_order_number() -> str:
    stamp = datetime.now().strftime("%Y%m%d")
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS count FROM orders WHERE order_number LIKE ?",
            (f"{stamp}-%",),
        ).fetchone()
        sequence = (row["count"] or 0) + 1
    return f"{stamp}-{sequence:04d}"


def validate_order(payload):
    items = payload.get("items") or []
    if not items:
        raise ValueError("Order must contain at least one item.")
    clean_items = []
    subtotal = 0.0
    for raw_item in items:
        name = str(raw_item.get("name", "")).strip()
        if not name:
            raise ValueError("Every item must have a name.")
        quantity = int(raw_item.get("quantity", 0))
        if quantity <= 0:
            raise ValueError(f"Invalid quantity for {name}.")
        price = float(raw_item.get("price", 0))
        if price < 0:
            raise ValueError(f"Invalid price for {name}.")
        line_total = round(price * quantity, 2)
        subtotal = round(subtotal + line_total, 2)
        clean_items.append(
            {
                "sku": str(raw_item.get("sku", "")).strip(),
                "name": name,
                "category": str(raw_item.get("category", "")).strip(),
                "price": round(price, 2),
                "quantity": quantity,
                "line_total": line_total,
            }
        )
    return {
        "cashier": str(payload.get("cashier", "")).strip(),
        "note": str(payload.get("note", "")).strip(),
        "items": clean_items,
        "subtotal": subtotal,
        "total": subtotal,
        "print_jobs": payload.get("print_jobs") or [],
    }


def create_order(payload):
    order = validate_order(payload)
    apply_lunch_stock(order["items"])
    order_number = next_order_number()
    created_at = datetime.now().isoformat(timespec="seconds")
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO orders (order_number, cashier, note, subtotal, total, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                order_number,
                order["cashier"],
                order["note"],
                order["subtotal"],
                order["total"],
                created_at,
            ),
        )
        order_id = cursor.lastrowid
        for item in order["items"]:
            conn.execute(
                """
                INSERT INTO order_items (order_id, sku, name, price, quantity, line_total)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    order_id,
                    item["sku"],
                    item["name"],
                    item["price"],
                    item["quantity"],
                    item["line_total"],
                ),
            )
        conn.commit()

    print_results = []
    if PRINTING_ENABLED:
        for print_job in build_automatic_print_jobs(order["items"]):
            print_results.append(
                run_print_job(
                    print_job=print_job,
                    order_number=order_number,
                    cashier=order["cashier"],
                    note=order["note"],
                    items=order["items"],
                    total=order["total"],
                )
            )

    order["id"] = order_id
    order["order_number"] = order_number
    order["created_at"] = created_at
    return order, print_results


def build_automatic_print_jobs(items):
    jobs = []
    receipt_printer = find_printer_by_role("receipt")
    dessert_printer = find_printer_by_role("dessert")
    kitchen_printer = find_printer_by_role("kitchen")
    label_printer = find_printer_by_role("label")

    if receipt_printer:
        jobs.append({"printer_id": receipt_printer["id"], "copies": 1, "mode": "receipt"})

    drink_items = [item for item in items if str(item.get("category", "")).lower() in {"coffee", "non-coffee"}]
    dessert_items = [item for item in items if str(item.get("category", "")).lower() == "dessert"]
    lunch_items = [item for item in items if str(item.get("category", "")).lower() == "lunch"]

    if label_printer and drink_items:
        jobs.append({"printer_id": label_printer["id"], "copies": 1, "mode": "label-items", "items": drink_items})
    if dessert_printer and dessert_items:
        jobs.append({"printer_id": dessert_printer["id"], "copies": 1, "mode": "prep-items", "items": dessert_items})
    if kitchen_printer and lunch_items:
        jobs.append({"printer_id": kitchen_printer["id"], "copies": 1, "mode": "prep-items", "items": lunch_items})

    return jobs


def find_printer(printer_id: str):
    for printer in list_printers():
        if printer.get("id") == printer_id:
            return printer
    raise ValueError(f"Printer '{printer_id}' not found.")


def safe_text(value: str) -> str:
    return str(value or "").replace("\n", " ").strip()


def escpos_align(mode: str) -> bytes:
    mapping = {"left": 0, "center": 1, "right": 2}
    return b"\x1ba" + bytes([mapping.get(mode, 0)])


def escpos_bold(enabled: bool) -> bytes:
    return b"\x1bE" + (b"\x01" if enabled else b"\x00")


def escpos_size(width_multiplier: int = 0, height_multiplier: int = 0) -> bytes:
    width = max(0, min(7, int(width_multiplier)))
    height = max(0, min(7, int(height_multiplier)))
    return b"\x1d!" + bytes([(width << 4) | height])


def escpos_cut(printer, feed_lines: int = 6) -> bytes:
    feed = b"\x1bd" + bytes([max(3, min(12, int(feed_lines)))])
    cut_mode = str(printer.get("cut_command", "gs_v_0")).lower()
    command_map = {
        "gs_v_0": b"\x1dV\x00",
        "gs_v_1": b"\x1dV\x01",
        "esc_i": b"\x1bi",
        "esc_m": b"\x1bm",
        "none": b"",
    }
    return feed + command_map.get(cut_mode, b"\x1dV\x00")


def paper_columns(printer) -> int:
    width_mm = int(printer.get("width_mm", 80))
    return 32 if width_mm <= 58 else 48


def printer_margin(printer, key: str, default: int) -> int:
    return max(0, int(printer.get(key, default)))


def format_line(left: str, right: str, columns: int) -> str:
    left = safe_text(left)
    right = safe_text(right)
    if len(left) + len(right) + 1 <= columns:
        return left + (" " * (columns - len(left) - len(right))) + right
    available = max(1, columns - len(right) - 1)
    return left[:available] + " " + right


def escape_zpl(value: str) -> str:
    return safe_text(value).replace("^", "").replace("~", "")


def mm_to_dots(mm: float, dpmm: int) -> int:
    return max(1, int(round(float(mm) * int(dpmm))))


def build_zpl_label(printer, order_number, cashier, item, copies) -> bytes:
    dpmm = int(printer.get("dpmm", 8))
    width = mm_to_dots(printer.get("width_mm", 50), dpmm)
    height = mm_to_dots(printer.get("print_height_mm", printer.get("height_mm", 32)), dpmm)
    corner_radius = mm_to_dots(printer.get("corner_radius_mm", 0), dpmm)
    margin_left = mm_to_dots(printer.get("margin_left_mm", 2), dpmm) + corner_radius
    margin_top = mm_to_dots(printer.get("margin_top_mm", 2), dpmm) + corner_radius
    full_name = safe_text(item["name"])
    parts = [part.strip() for part in full_name.split("/") if part.strip()]
    item_name = escape_zpl(parts[0] if parts else full_name)[:20]
    modifier_text = escape_zpl(" / ".join(parts[1:]))[:40]
    modifier_line_1 = modifier_text[:20]
    modifier_line_2 = modifier_text[20:40]
    order_mode = "TAKEAWAY" if "TAKEAWAY" in safe_text(item.get("order_note", "")).upper() else "DINE-IN"
    single_label = f"""^XA
^PW{width}
^LL{height}
^LH0,0
^MMT
^CF0,20
^FO{margin_left},{margin_top + 28}^FD{order_mode}^FS
^FO{margin_left},{margin_top + 52}^FD{order_number}^FS
^CF0,30
^FO{margin_left},{margin_top + 78}^FD{item_name}^FS
^CF0,20
^FO{margin_left},{margin_top + 110}^FD{modifier_line_1}^FS
^FO{margin_left},{margin_top + 134}^FD{modifier_line_2}^FS
^PQ{max(1, copies)},0,1,N
^XZ
"""
    return single_label.encode("ascii", errors="ignore")


def build_escpos_prep_ticket(printer, order_number, cashier, note, items, copies) -> bytes:
    columns = paper_columns(printer)
    margin_left = " " * printer_margin(printer, "margin_left_chars", 0)
    content_columns = max(16, columns - len(margin_left))
    top_feed = b"\n" * printer_margin(printer, "margin_top_lines", 0)
    order_mode = "TAKEAWAY" if "TAKEAWAY" in safe_text(note).upper() else "DINE-IN"
    lines = []
    lines.extend(
        [
            b"\x1b@",
            top_feed,
            escpos_align("center"),
            escpos_bold(True),
            escpos_size(1, 1),
            f"{order_mode}\n".encode("ascii", errors="ignore"),
            escpos_size(0, 0),
            escpos_bold(False),
            f"{order_number}\n".encode("ascii", errors="ignore"),
            escpos_align("left"),
        ]
    )
    lines.append(b"\n")

    for item in items:
        full_name = safe_text(item["name"])
        parts = [part.strip() for part in full_name.split("/") if part.strip()]
        title = parts[0] if parts else full_name
        modifier = " / ".join(parts[1:])
        qty = f"x{item['quantity']}"
        lines.append(escpos_bold(True))
        lines.append((margin_left + title[:content_columns] + "\n").encode("ascii", errors="ignore"))
        lines.append(escpos_bold(False))
        if modifier:
            modifier_lines = textwrap.wrap(modifier, width=max(10, content_columns)) or [modifier]
            for modifier_line in modifier_lines:
                lines.append(f"{margin_left}{modifier_line}\n".encode("ascii", errors="ignore"))
        if item.get("quantity", 1) > 1:
            lines.append(f"{margin_left}{qty}\n".encode("ascii", errors="ignore"))
        lines.append(b"\n")
    lines.append(escpos_cut(printer))
    return b"".join(lines) * max(1, copies)


def build_escpos_receipt(printer, order_number, cashier, note, items, total, copies) -> bytes:
    columns = paper_columns(printer)
    now_text = datetime.now().strftime("%Y-%m-%d %H:%M")
    margin_left = " " * printer_margin(printer, "margin_left_chars", 0)
    content_columns = max(20, columns - len(margin_left))
    top_feed = b"\n" * printer_margin(printer, "margin_top_lines", 0)
    qty_width = 4
    price_width = 8
    name_width = max(10, content_columns - qty_width - price_width)
    lines = [
        b"\x1b@",
        top_feed,
        escpos_align("center"),
        escpos_bold(True),
        escpos_size(1, 1),
        f"{RECEIPT_SHOP_NAME}\n".encode("ascii", errors="ignore"),
        escpos_size(0, 0),
        escpos_bold(False),
        f"Order {order_number}\n".encode("ascii", errors="ignore"),
        escpos_align("left"),
        (margin_left + ("-" * content_columns) + "\n").encode("ascii", errors="ignore"),
        f"{margin_left}Time   : {now_text}\n".encode("ascii", errors="ignore"),
        f"{margin_left}Cashier: {safe_text(cashier or 'STAFF')}\n".encode("ascii", errors="ignore"),
    ]
    if note:
        lines.append(f"{margin_left}Note   : {safe_text(note)}\n".encode("ascii", errors="ignore"))
    lines.append((margin_left + ("-" * content_columns) + "\n").encode("ascii", errors="ignore"))

    for item in items:
        name = safe_text(item["name"])[:name_width]
        qty = f"x{item['quantity']}"
        amount = f"${item['line_total']:.2f}"
        line = name.ljust(name_width) + qty.rjust(qty_width) + amount.rjust(price_width)
        lines.append((margin_left + line + "\n").encode("ascii", errors="ignore"))

    lines.extend(
        [
            (margin_left + ("-" * content_columns) + "\n").encode("ascii", errors="ignore"),
            escpos_bold(True),
            (margin_left + format_line("TOTAL", f"${total:.2f}", content_columns) + "\n").encode("ascii", errors="ignore"),
            escpos_bold(False),
            b"\n",
            escpos_align("center"),
            b"THANK YOU\n",
            escpos_cut(printer),
        ]
    )
    return b"".join(lines) * max(1, copies)


def build_print_payload(printer, order_number, cashier, note, items, total, copies, mode) -> bytes:
    protocol = str(printer.get("protocol", "escpos")).lower()
    if protocol == "zpl":
        payloads = []
        for item in items:
            label_count = max(1, int(item.get("quantity", 1))) * max(1, copies)
            single_item = dict(item)
            single_item["quantity"] = 1
            payloads.append(build_zpl_label(printer, order_number, cashier, single_item, label_count))
        return b"".join(payloads)
    if protocol != "escpos":
        raise ValueError(f"Unsupported printer protocol '{protocol}'.")
    role = str(printer.get("role", "")).lower()
    if mode == "receipt" or role == "receipt" or "receipt" in safe_text(printer.get("name", "")).lower():
        return build_escpos_receipt(printer, order_number, cashier, note, items, total, copies)
    return build_escpos_prep_ticket(printer, order_number, cashier, note, items, copies)


def send_to_printer(host: str, port: int, payload: bytes) -> None:
    with socket.create_connection((host, port), timeout=3) as sock:
        sock.sendall(payload)


def run_print_job(print_job, order_number, cashier, note, items, total):
    printer_id = str(print_job.get("printer_id", "")).strip()
    if not printer_id:
        raise ValueError("Missing printer ID.")
    printer = find_printer(printer_id)
    copies = max(1, int(print_job.get("copies", 1)))
    mode = str(print_job.get("mode", "")).strip().lower()
    target_items = print_job.get("items") or items
    slips_sent = 0

    try:
        prepared_items = []
        for item in target_items:
            prepared_item = dict(item)
            prepared_item["order_note"] = note
            prepared_items.append(prepared_item)
        payload = build_print_payload(
            printer=printer,
            order_number=order_number,
            cashier=cashier,
            note=note,
            items=prepared_items,
            total=total,
            copies=copies,
            mode=mode,
        )
        send_to_printer(
            host=str(printer["host"]),
            port=int(printer.get("port", 9100)),
            payload=payload,
        )
        slips_sent = copies

        return {
            "printer_id": printer_id,
            "printer_name": printer.get("name", printer_id),
            "status": "ok",
            "labels_sent": slips_sent,
        }
    except Exception as exc:
        return {
            "printer_id": printer_id,
            "printer_name": printer.get("name", printer_id),
            "status": "error",
            "error": str(exc),
        }


def export_orders_csv():
    orders = recent_orders(limit=5000)
    output = []
    header = [
        "order_number",
        "created_at",
        "cashier",
        "note",
        "sku",
        "item_name",
        "price",
        "quantity",
        "line_total",
        "order_total",
    ]
    output.append(header)
    for order in orders:
        for item in order["items"]:
            output.append(
                [
                    order["order_number"],
                    order["created_at"],
                    order["cashier"],
                    order["note"],
                    item["sku"],
                    item["name"],
                    item["price"],
                    item["quantity"],
                    item["line_total"],
                    order["total"],
                ]
            )
    lines = []
    for row in output:
        escaped = []
        for value in row:
            cell = str(value).replace('"', '""')
            escaped.append(f'"{cell}"')
        lines.append(",".join(escaped))
    return "\n".join(lines) + "\n"


class POSRequestHandler(BaseHTTPRequestHandler):
    server_version = "EmergencyPOS/0.1"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            return self.serve_static("index.html")
        if parsed.path.startswith("/static/"):
            filename = parsed.path.replace("/static/", "", 1)
            return self.serve_static(filename)
        if parsed.path == "/api/health":
            return self.send_json(
                {
                    "status": "ok",
                    "shop_name": SHOP_NAME,
                    "printing_enabled": PRINTING_ENABLED,
                }
            )
        if parsed.path == "/api/products":
            return self.send_json(list_products())
        if parsed.path == "/api/printers":
            return self.send_json(list_printers())
        if parsed.path == "/api/orders":
            params = parse_qs(parsed.query)
            limit = int(params.get("limit", ["25"])[0])
            return self.send_json(recent_orders(limit=limit))
        if parsed.path == "/api/orders.csv":
            data = export_orders_csv().encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Content-Disposition", 'attachment; filename="orders.csv"')
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/orders":
            payload = self.read_json_body()
            try:
                order, print_results = create_order(payload)
                return self.send_json(
                    {"order": order, "print_results": print_results},
                    status=HTTPStatus.CREATED,
                )
            except ValueError as exc:
                return self.send_json(
                    {"error": str(exc)},
                    status=HTTPStatus.BAD_REQUEST,
                )
            except Exception as exc:
                return self.send_json(
                    {"error": f"Server error: {exc}"},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
        if parsed.path == "/api/products/stock":
            payload = self.read_json_body()
            try:
                product = update_product_stock(
                    sku=payload.get("sku", ""),
                    stock_value=payload.get("stock"),
                )
                return self.send_json(product, status=HTTPStatus.OK)
            except ValueError as exc:
                return self.send_json(
                    {"error": str(exc)},
                    status=HTTPStatus.BAD_REQUEST,
                )
            except Exception as exc:
                return self.send_json(
                    {"error": f"Server error: {exc}"},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
        if parsed.path == "/api/print-test":
            if not PRINTING_ENABLED:
                return self.send_json(
                    {"error": "Printing is disabled on this server."},
                    status=HTTPStatus.BAD_REQUEST,
                )
            payload = self.read_json_body()
            printer_id = str(payload.get("printer_id", "")).strip()
            if not printer_id:
                return self.send_json(
                    {"error": "printer_id is required"},
                    status=HTTPStatus.BAD_REQUEST,
                )
            result = run_print_job(
                print_job={
                    "printer_id": printer_id,
                    "copies": int(payload.get("copies", 1)),
                },
                order_number="TEST-LABEL",
                cashier="TEST",
                note="",
                items=[
                    {
                        "sku": "TEST",
                        "name": "Printer Test",
                        "price": 0.0,
                        "quantity": 1,
                        "line_total": 0.0,
                    }
                ],
                total=0.0,
            )
            status = HTTPStatus.OK if result["status"] == "ok" else HTTPStatus.BAD_REQUEST
            return self.send_json(result, status=status)
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def serve_static(self, filename: str):
        file_path = STATIC_DIR / filename
        if not file_path.exists() or not file_path.is_file():
            return self.send_error(HTTPStatus.NOT_FOUND, "Static file not found")
        suffix = file_path.suffix.lower()
        content_type = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
        }.get(suffix, "application/octet-stream")
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length) if content_length else b"{}"
        return json.loads(body.decode("utf-8"))

    def send_json(self, payload, status=HTTPStatus.OK):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{stamp}] {self.address_string()} {format % args}")


def main():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), POSRequestHandler)
    scheme = "http"
    if SSL_CERT_FILE and SSL_KEY_FILE:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=SSL_CERT_FILE, keyfile=SSL_KEY_FILE)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        scheme = "https"
    print(f"{SHOP_NAME} running on {scheme}://{HOST}:{PORT}")
    print(f"Printing enabled: {'yes' if PRINTING_ENABLED else 'no'}")
    print(f"Open from another device on your LAN: {scheme}://YOUR-PC-IP:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
