# Emergency POS

Small LAN-only POS for short-term fallback use. It runs on one computer in the shop, stores sales in SQLite, and can send raw `ESC/POS` print jobs to network printers over the local network.

## What it does

- Local web app for checkout from any device on the same LAN
- Stores orders in `data/pos.db`
- Loads product list from `data/products.json`
- Loads printer settings from `data/printers.json`
- Prints directly to printer IPs on port `9100`
- Exports sales to CSV from `/api/orders.csv`

## Start

```bash
python3 app.py
```

Then open:

- On the same computer: `http://127.0.0.1:8787`
- On another device in the shop: `http://YOUR-PC-IP:8787`

Optional environment variables:

```bash
POS_HOST=0.0.0.0
POS_PORT=8787
POS_SHOP_NAME="My Shop"
python3 app.py
```

To run at home without trying to reach the shop printers:

```bash
POS_PRINTING_ENABLED=0 python3 app.py
```

When printing is disabled, orders are still saved normally and checkout will confirm that the order was saved without printing.

## Printer setup

Edit [data/printers.json](/Users/duenng/Documents/GitHub/tir-pos/data/printers.json) and replace the sample IP addresses with your real printer IPs.

Supported protocols:

- `escpos` for thermal receipt and kitchen printers
- `zpl` for label printers that accept Zebra-compatible commands

For your current setup:

- `Dessert Preparing` uses `58mm`
- `Kitchen Preparing` uses `58mm`
- `Receipt` uses `80mm`
- `Label Printer` at `192.168.1.143` uses `zpl`

Most LAN receipt printers listen on raw TCP port `9100`. If your printers use another port, change `port`.
If you are away from the shop network, either disable printing with `POS_PRINTING_ENABLED=0` or update the printer IPs to devices reachable from the current LAN.

## Product setup

Edit [data/products.json](/Users/duenng/Documents/GitHub/tir-pos/data/products.json).

Example:

```json
{
  "sku": "ITEM-001",
  "name": "Sample Product",
  "price": 9.99
}
```

## Notes

- This is designed as a simple emergency fallback for your final 3 days.
- It does not depend on the internet. It only needs your local network.
- Orders stay on the computer that runs `app.py`.
- Use the printer `Test` button in the UI to confirm each printer is reachable.
