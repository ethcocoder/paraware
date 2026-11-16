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

The API (`app/server/`) is a **Node.js/Express** server backed by Firebase Admin + Firestore. It uses simple collection reads and document writes for `users`, `reports`, `messages`, `notifications`, `departments`, `announcements`, `report_events`, and `audit_logs`; it does not require composite Firestore indexes. Uploaded media uses the deployment's temporary filesystem and should move to Firebase Storage before production use.

For Vercel, configure the sensitive `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable on the `paraware-app` project for Production, Preview, and Development. The value is the Firebase Admin service-account JSON and must never be committed to Git.

The app can be deployed as a Vercel serverless function because Firestore supplies persistent data storage. For production media persistence, connect Firebase Storage and replace the temporary upload path, then set:
- `landing` build vars: `VITE_APP_URL`/`VITE_API_URL` → deployed app/API URL
- app client API base URL → deployed API URL
