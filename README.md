# Paraware

Paraware is split into two deployable parts:

- **`landing/`** – Public marketing/landing website (separate URL)
- **`app/`** – Main Paraware application: citizen PWA + authority workspace + API (separate URL)

## Structure

- `landing/` – Standalone Vite + React site for the public landing page
- `app/` – Full application (Vite client + Express API + SQLite)

## Run locally

### App (main product)
```bash
cd app
npm.cmd install
npm.cmd run dev
```
- Web: http://127.0.0.1:5173/
- API: http://localhost:4000/

Demo credentials:
- Citizen: `hana@example.com` / `paraware`
- Authority admin: `selam@woreda04.gov.et` / `woreda04`

### Landing page
```bash
cd landing
npm.cmd install
npm.cmd run dev
```

For split deployment, configure `landing/.env`:
```env
VITE_APP_URL=https://your-app-domain.example
VITE_API_URL=https://your-app-domain.example
```
This makes landing buttons/links point to the main app and fetches public overview data from the app API.

## Deployment notes

- Deploy **`app/`** as the main application (serves API and built client). Set the PWA/start experience to open the app directly (e.g. `/login` or `/app`).
- Deploy **`landing/`** as a separate static/marketing site at its own URL.
- Ensure CORS/proxying allows the landing site to call `GET /api/public/overview` on the app API if hosted on different origins.
