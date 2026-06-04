# Bhagyoday Roof Industry - Project Specification

This document serves as the Technical Reference Manual for the Bhagyoday Roof Industry ERP.

## 1. System Overview
A full-stack industrial roofing management portal designed for high-efficiency quotation generation, inventory tracking, and sales analytics.

## 2. Tech Stack
- **Frontend**: React 18 (Vite), TypeScript, Tailwind CSS.
- **Backend**: Firebase 10+ (Auth & Firestore).
- **Icons**: Lucide React.
- **Animations**: Motion (framer-motion).

## 3. Data Schema (Firestore)

### `users` (Collection)
- `uid`: string (Primary Key)
- `email`: string
- `role`: 'admin' | 'employee'
- `empPermissions`: { canAccessHistory, canAccessClients, canAccessSales, canAccessSettings }

### `inventory` (Collection)
- `id`: string
- `name`: string
- `stock`: number
- `minStock`: number (threshold for "Low Stock" alert)
- `rate`: number (default price)
- `unit`: 'RFT' | 'PCS' | 'SQ'

### `quotations` (Collection)
- `estNo`: string (Auto-incrementing from global settings)
- `custName`: string
- `waNo`: string
- `items`: Array<{ name, qty, len, pcs, rate, total }>
- `status`: 'Sent' | 'Material Dispatched' | 'In Production' | 'Deal Loss' | 'Awaiting Client' | 'New'
- `reason`: string (Reason for loss or status update)
- `rawDate`: YYYY-MM-DD
- `grandTotal`: string
- `createdBy`: uid

### `settings` -> `global` (Document)
- `company`: { name, logo, gst, addr1, phone, social, qrCode }
- `pdfCfg`: { bank, terms, footer }
- `empPermissions`: (Global toggles for staff access)
- `estCounter`: number (Tracks next estimate #)

## 4. Key Business Logic

### Calculation Formulas
- **Item Total**: `(Quantity * Rate)`
- **Gross Total**: Sum of all items.
- **GST (18%)**: `Gross * 0.18`
- **Grand Total**: `Gross + GST`

### Stock Rules
1. **Validation**: Check `inventory[item].stock` against requested quantity.
2. **Alerts**:
   - `inventory[item].stock <= 0` -> Block quotation.
   - `inventory[item].stock < minStock` -> Display "Low Stock" badge.

### Access Control
- **Login**: Custom entry for Admin/Staff.
- **Permissions**: The UI strictly filters Tabs/Settings based on the `empPermissions` object stored in global settings for any user with the `employee` role.

### Output Actions
- **Print/PDF**: Uses browser `window.print()` with a hidden-on-screen, visible-on-print template styled with Tailwind `no-print` classes.
- **WhatsApp**: Encodes estimation details into a URL scheme: `wa.me/number?text=...`.
- **Sync**: Optional POST request to a Google Apps Script URL for spreadsheet logging.

## 5. Development Guidelines
- Always use `Functional Components` with `TypeScript`.
- Keep calculations in `QuotationForm` and `Preview` synced.
- Admin features must be guarded by both UI (Tabs) and Firestore Rules.
