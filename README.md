# Paraware

Paraware is split into two deployable parts:

- **`landing/`** – Public marketing/landing website (separate URL)
- **`app/`** – Main Paraware application: citizen PWA + authority workspace + API (separate URL)

## Structure

- `landing/` – Standalone Vite + React site for the public landing page
- `app/` – Full application (Vite client + Express API + SQLite)

## Firebase configuration

- `app/google-services.json` contains the supplied Android Firebase configuration for the future native app package `com.paraware.app`.
- `landing/src/firebase.js` initializes the supplied Firebase Web SDK configuration and enables Analytics when the browser supports it.
- Firebase browser configuration values are public client configuration; access control and sensitive operations should still be enforced by Firebase Security Rules and the API.

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

## Wasmer (landing) + CI

- **Landing (`landing/`)** is prepared for Wasmer Edge static deployment (`landing/app.yaml`, `landing/wasmer.toml`, `landing/Staticfile`). Build output: `landing/dist/`.
- **GitHub Actions:** `.github/workflows/deploy-landing.yml` deploys the landing on pushes to `master/main` (or manual dispatch) when configured with:
  - Secret: `WASMER_TOKEN`
  - Repo variables (optional but recommended): `VITE_APP_URL`, `VITE_API_URL` (the deployed app/API base URL)
- **Manual deploy (requires Wasmer login):**
  ```bash
  wasmer login
  cd landing
  npm.cmd ci
  npm.cmd run build
  wasmer deploy
  ```

## API deployment (important)

The current API (`app/server/`) is a **Node.js/Express** server using **`node:sqlite`** and local filesystem storage (`server/data/*.db`, `server/uploads/`). This stack is **not directly compatible with Wasmer Edge** as-is (Wasmer Edge is optimized for static sites, PHP/Python/WinterCG-style workloads, and has specific runtime/storage constraints). 

To “deploy the API” and use it for the future app build, use a Node-compatible host (e.g. Render, Railway, Fly.io, VPS, etc.) for `app/server` (with a persistent database/storage strategy), then set:
- `landing` build vars: `VITE_APP_URL`/`VITE_API_URL` → deployed app/API URL
- future app client API base URL → deployed API URL

If you specifically need the API on Wasmer, the backend would need to be re-architected for a Wasmer-supported runtime (and a compatible persistence layer/volumes).
