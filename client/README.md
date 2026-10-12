# BloodBridge — Frontend

React/Vite frontend for **BloodBridge: Automated Geo-Proximity Emergency Donor Dispatch Engine**. Uses Tailwind CSS v4, Axios, React Router, React Leaflet, Leaflet and Socket.IO client.

> Educational college project prototype only. It is not a certified emergency dispatch service. Do not use real patient data or rely on this application as the sole route for obtaining blood. Clinical eligibility, blood compatibility, donor identity and hospital legitimacy need professional verification.

## Requirements

- Node.js 20.19+ (Vite 8 prerequisite) and npm
- BloodBridge Express backend running at `http://localhost:5000`
- Local MongoDB Community Server running (MongoDB Compass is an optional GUI; it is not the server)

## Run locally

Open a second terminal while the backend is running.

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

On Windows PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env
```

Open `http://localhost:5173`.

The `.env.example` defaults are:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Restart Vite after editing `.env`. Ensure the server's `CLIENT_URL` includes `http://localhost:5173`.

## Run the entire project

**Terminal 1 — backend**

```bash
cd server
# First time only: copy .env.example to .env and set a strong JWT_SECRET
npm install
npm run dev
```

**Terminal 2 — frontend**

```bash
cd client
# First time only: copy .env.example to .env
npm install
npm run dev
```

If you are using Windows PowerShell and have not configured either environment file yet, run `Copy-Item .env.example .env` in each folder.

## Main routes

| Route | Role | Purpose |
|---|---|---|
| `/` | Public | Landing page and role selection |
| `/donor/register` | Public | Donor registration, blood group, last donation date, location |
| `/donor/login` | Public | Donor sign-in |
| `/donor/dashboard` | Donor JWT | Live invitations, accept/reject, availability, history |
| `/hospital/register` | Public | Hospital registration and location |
| `/hospital/login` | Public | Hospital sign-in |
| `/hospital/dashboard` | Hospital JWT | Create requests, inspect matches, retry dispatch, cancel |

## Implemented frontend integration

- JWT is stored in `localStorage` under `bloodbridge_session`; Axios attaches the bearer token automatically.
- Socket.IO authenticates with the same token and handles donor request alerts plus hospital response/dispatch/cancellation updates.
- Donors can toggle availability and accept/reject requests.
- Hospitals can create, retry and cancel requests. Donor phone details are only shown when a donor has accepted, matching the backend's privacy behavior.
- Browser geolocation is optional; manual coordinates are supported. MongoDB API accepts `{ lat, lng }` and stores GeoJSON as `[longitude, latitude]`.
- Map tiles are loaded from OpenStreetMap and need an internet connection in the browser; the API/database themselves are local.

## Important API contract note

The current backend exposes `/api/auth/donors/*`, `/api/auth/hospitals/*`, `/api/donors/*` and `/api/requests/*`. The UI is wired to those endpoints. It loads the hospital registration/login user from the authenticated session because no `/api/auth/hospitals/profile` endpoint exists in the backend. Hospital requests and responses are read from `GET /api/requests/mine`.

## Build check

```bash
npm run build
```

If your Node.js version is too old for Vite 8, update Node to 20.19+ or 22.12+ before installing dependencies. If the local backend cannot be reached, confirm it is running and test `http://localhost:5000/api/health`.
