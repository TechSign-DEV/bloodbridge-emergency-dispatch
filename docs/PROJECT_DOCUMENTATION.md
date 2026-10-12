# BloodBridge — Complete Project Documentation

**Project title:** BloodBridge: Automated Geo-Proximity Emergency Donor Dispatch Engine  
**Project type:** MERN-stack web application / college final-year prototype  
**Database mode:** Local MongoDB Community Server (Atlas is not required)  
**Frontend:** React + Vite + Tailwind CSS + Axios + React Router + React Leaflet + Socket.IO Client  
**Backend:** Node.js + Express + Mongoose + JWT + Socket.IO  
**Document purpose:** Explain architecture, source-code responsibilities, database design, API contracts, real-time messaging, and end-to-end workflows.

> **Medical-safety notice:** BloodBridge is an educational prototype, not a certified emergency medical service. Do not use it as the sole channel for obtaining blood. The 90-day donation cutoff and exact blood-group match are simplified demo rules, not a clinical eligibility or compatibility decision. A real deployment would require verified donors and hospitals, blood-bank/clinical review, privacy and consent controls, audited workflows, and reliable operational fallbacks.

---

## 1. Executive summary

BloodBridge coordinates a hospital's emergency blood request with potentially eligible voluntary donors nearby. A hospital submits the required blood group, number of donor units, urgency, contact information, and location. The backend searches the donor collection using MongoDB's geospatial `$near` operator and a `2dsphere` index. The search radius begins at 5 km and expands to 10 km and then 20 km when the request still needs more non-rejected donor responses. For every newly selected donor, the backend stores a notification and then emits a real-time Socket.IO event to that donor's authenticated room.

Donors can review invitations and accept or reject them. Their responses are written to MongoDB, and an event alerts the relevant hospital dashboard. The hospital can view distances and response statuses, retry dispatch without creating duplicate donor/request notifications, or cancel an open request.

The project has two separate interfaces (Donor and Hospital), one Express API, one Socket.IO server attached to the same HTTP server, and one local MongoDB database named `bloodbridge`.

## 2. What Socket.IO does in BloodBridge

### 2.1 The problem it solves

A normal HTTP request is a one-off exchange: the browser asks the backend for data, and the backend returns a response. If a hospital dashboard is waiting for a donor to accept a request, plain HTTP alone does not automatically tell that page when the donor responds. The browser would need to poll repeatedly or the user would need to refresh manually.

Socket.IO creates a persistent, bidirectional connection between the browser and the server. After the connection is established, the server can send an event to the browser as soon as a relevant action occurs. This is useful for the BloodBridge emergency workflow because the donor and hospital may be using the application at the same time.

### 2.2 REST API vs Socket.IO

| Concern | REST API (Axios / Express) | Socket.IO |
|---|---|---|
| Typical direction | Browser requests; server responds | Either side can send named events after connection |
| BloodBridge example | Load donor notifications; create blood request; accept/reject; toggle availability | Alert donor about a new request; tell hospital that a donor responded |
| Durable data | Controllers save and read MongoDB documents | Socket events themselves are not the database of record |
| If a browser is offline | A request fails until it can reconnect | The browser does not receive a live event while disconnected; it must reload saved data from the API when back online |
| User experience | Fetch forms, records, dashboard data | Immediate alerts and live dashboard refresh triggers |

**Important design rule:** the database is the source of truth. Socket.IO is the fast notification channel. BloodBridge creates a `Notification` MongoDB document before emitting `blood:request:new`. If the donor is offline, the document remains available through `GET /api/donors/notifications` when the donor returns.

### 2.3 How the Socket.IO connection is authenticated

1. The user signs in through the REST API and receives a JWT.
2. The frontend stores the session under `bloodbridge_session` in browser `localStorage`.
3. `useSocketEvents.js` creates a Socket.IO client connection with `{ auth: { token } }`.
4. `server/src/config/socket.js` verifies the JWT during the Socket.IO handshake. It checks the JWT subject and whether the role is `donor` or `hospital`.
5. The server places the socket into one server-selected room: `donor:<userId>` or `hospital:<userId>`. The browser cannot choose another user's room.
6. The server emits private events to the room belonging to the relevant user.
7. When the page unmounts or the token changes, the React hook removes its event listeners and disconnects the socket.

The API and Socket.IO use the same `JWT_SECRET`; keep it private and use a strong value.

### 2.4 Socket events currently implemented

| Event | Direction / recipient | Meaning | Frontend effect |
|---|---|---|---|
| `connection:ready` | Server → connected client | Confirms that the authenticated socket connected and identifies the role | Emitted by the server; the current page hook does not display a dedicated UI reaction for this event |
| `blood:request:new` | Server → selected donor room | A new invitation was saved and the donor can respond | Donor dashboard shows a message and reloads profile, notifications, and history from the API |
| `blood:request:dispatch_updated` | Server → request-owning hospital room | Dispatch results were updated, including new alerts, donor counts, selected radius, and radii checked | Hospital dashboard shows a message and reloads saved requests |
| `blood:request:response` | Server → request-owning hospital room | A donor accepted or rejected an invitation | Hospital dashboard shows the response and reloads request data |
| `blood:request:cancelled` | Server → hospital and donors invited to that request | The hospital cancelled the request | The relevant dashboards show a message and refresh API data |
| `connect_error` | Socket.IO client-side connection error | The socket could not connect/authenticate | The hook logs a warning to the browser console |

Example event payload for a new donor invitation (illustrative values):

```json
{
  "notificationId": "notificationObjectId",
  "requestId": "requestObjectId",
  "bloodGroupRequired": "O+",
  "unitsNeeded": 2,
  "urgency": "critical",
  "distanceKm": 3.42,
  "radiusKm": 5,
  "status": "pending",
  "hospital": {
    "name": "Demo General Hospital",
    "phone": "+919876543211",
    "address": "Main Road, Warangal"
  },
  "message": "Urgent O+ blood request within 3.42 km. Please open BloodBridge to respond."
}
```

This payload is illustrative; object IDs, distances, and hospital details depend on the actual data.

### 2.5 Why the dashboard refreshes after a socket event

The event tells the browser that something changed. The dashboard then calls the REST APIs to fetch the latest stored state. This keeps the UI aligned with MongoDB rather than treating an event payload as the complete record. It also allows the user to recover by pressing **Refresh** after a disconnection.

### 2.6 Socket.IO is not SMS

The current `notificationService.js` uses Socket.IO for web alerts and writes a masked phone number plus request details to the backend console as `[SMS PLACEHOLDER]`. It does **not** send an actual SMS. The Twilio environment variables are placeholders until an SMS provider, consent flow, error handling, and delivery auditing are implemented.

---

## 3. System architecture

| Layer | Components | Purpose |
|---|---|---|
| Client applications | Donor browser and Hospital browser; React pages, AuthContext, ProtectedRoute | Collect user input and render profile, map, request, and response state |
| Client transport | Axios REST client and Socket.IO client | REST requests carry JWT bearer tokens; Socket.IO handshake also carries the JWT |
| Application server | One Node.js HTTP server running Express and Socket.IO | Express handles API routes; Socket.IO handles authenticated live events |
| Domain logic | Controllers, authentication/role middleware, dispatch and notification services | Validates actions, selects eligible donors, saves notification state, and emits events |
| Data access | Mongoose models | Validates and queries Donor, Hospital, BloodRequest, and Notification documents |
| Persistence | Local MongoDB Community Server | Stores the durable source of truth in the `bloodbridge` database |
| Live delivery | Socket.IO private rooms named `donor:<userId>` and `hospital:<userId>` | Pushes new request, donor response, dispatch update, and cancellation events to the correct connected users |

### 3.1 Request-response and live-event pathways

- **REST pathway:** browser → Axios → Express route → authentication/role middleware → controller/service → Mongoose → MongoDB → JSON response.
- **Real-time pathway:** backend operation saves its state → backend emits a named Socket.IO event to a role/user room → connected browser displays feedback and calls REST endpoints to refresh durable data.
- **Geospatial pathway:** hospital request controller → dispatch service → MongoDB `$near` donor query → create missing notification records → notify donor rooms → update dispatch metrics on the blood request.

### 3.2 Technology responsibilities

| Technology | Responsibility in this project |
|---|---|
| React 19 | Builds the landing page, forms, dashboards, and interactive UI |
| Vite 8 | Development server and frontend production bundler |
| Tailwind CSS v4 + project CSS | Styling and responsive layout |
| React Router DOM 7 | URL routing and role-protected dashboard routes |
| Axios | Calls REST endpoints and attaches the bearer token |
| React Leaflet + Leaflet | Displays request/donor/hospital location context on maps |
| Socket.IO client/server | Pushes live, named events to authenticated users |
| Node.js + Express | Hosts REST API and application middleware |
| Mongoose | Defines and validates MongoDB document models |
| MongoDB Community Server | Stores accounts, requests, and notifications locally |
| JSON Web Token (JWT) | Carries user ID and role for authenticated API/socket requests |
| bcryptjs | Hashes passwords before database storage and checks credentials on login |
| Helmet, CORS, express-rate-limit, Morgan | Security headers, origin policy, request limiting, and development request logs |

---

## 4. Project folder structure

```text
BloodBridge/
├── README.md
├── .gitignore
├── client/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   └── client.js
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── hooks/
│       │   └── useSocketEvents.js
│       ├── components/
│       │   ├── AppShell.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── LocationInputs.jsx
│       │   ├── LocationMap.jsx
│       │   ├── StatusBadge.jsx
│       │   └── Feedback.jsx
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── DonorRegisterPage.jsx
│       │   ├── HospitalRegisterPage.jsx
│       │   ├── DonorDashboard.jsx
│       │   └── HospitalDashboard.jsx
│       └── utils/
│           └── geo.js
└── server/
    ├── .env.example
    ├── package.json
    ├── README.md
    └── src/
        ├── app.js
        ├── server.js
        ├── config/
        │   ├── db.js
        │   └── socket.js
        ├── constants/
        │   └── blood.js
        ├── controllers/
        │   ├── authController.js
        │   ├── donorController.js
        │   └── requestController.js
        ├── middleware/
        │   ├── auth.js
        │   └── errorHandler.js
        ├── models/
        │   ├── Donor.js
        │   ├── Hospital.js
        │   ├── BloodRequest.js
        │   └── Notification.js
        ├── routes/
        │   ├── authRoutes.js
        │   ├── donorRoutes.js
        │   ├── requestRoutes.js
        │   └── healthRoutes.js
        ├── services/
        │   ├── dispatchService.js
        │   └── notificationService.js
        └── utils/
            ├── AppError.js
            ├── asyncHandler.js
            ├── geo.js
            └── jwt.js
```

### 4.1 Frontend source-code responsibilities

| File | Responsibility |
|---|---|
| `src/main.jsx` | Imports CSS/Leaflet styles and mounts React, BrowserRouter, AuthProvider, and App |
| `src/App.jsx` | Declares all public and protected routes; redirects `/dashboard` based on role |
| `src/context/AuthContext.jsx` | Reads/writes the session in localStorage and exposes token, role, user, sign-in and sign-out helpers |
| `src/components/ProtectedRoute.jsx` | Prevents unauthenticated users from opening protected dashboards and redirects the wrong role |
| `src/api/client.js` | Configures Axios base URL, timeout, bearer-token interceptor, and readable error messages |
| `src/hooks/useSocketEvents.js` | Opens an authenticated Socket.IO connection, attaches page-specific event listeners, and cleans up on unmount |
| `src/components/AppShell.jsx` | Shared visual shell/navigation frame used by routes |
| `src/components/LocationInputs.jsx` | Manual latitude/longitude and browser location input UI |
| `src/components/LocationMap.jsx` | Leaflet map presentation for locations/markers |
| `src/components/StatusBadge.jsx` | Consistent request/notification state presentation |
| `src/components/Feedback.jsx` | Success, informational, and error feedback messages |
| `src/pages/LandingPage.jsx` | Public project entry page and donor/hospital role selection |
| `src/pages/DonorRegisterPage.jsx` | Collects donor profile and location fields then calls the donor registration endpoint |
| `src/pages/HospitalRegisterPage.jsx` | Collects hospital profile/contact/location fields then calls hospital registration |
| `src/pages/LoginPage.jsx` | Shared login form configured for donor or hospital role |
| `src/pages/DonorDashboard.jsx` | Fetches donor profile, invitations and history; accepts/rejects requests and changes availability |
| `src/pages/HospitalDashboard.jsx` | Creates/loads/cancels requests, retries dispatch and displays donor statuses/distances |
| `src/utils/geo.js` | Converts API GeoJSON coordinate order for map use, supplies demo fallback coordinates, formats dates, and wraps browser geolocation |

### 4.2 Backend source-code responsibilities

| File | Responsibility |
|---|---|
| `src/server.js` | Loads environment variables, checks JWT secret, connects MongoDB, creates one HTTP server, attaches Socket.IO, and handles shutdown |
| `src/app.js` | Configures Express middleware, CORS, security headers, JSON parsing, request logs, rate limit, API routes and error handling |
| `src/config/db.js` | Connects Mongoose to local MongoDB and waits for model indexes to initialize |
| `src/config/socket.js` | Verifies Socket.IO JWT handshake and joins the authenticated user's private room |
| `src/constants/blood.js` | Centralizes blood groups, urgency/request/notification statuses, search radii and 90-day cooldown |
| `src/models/*.js` | Defines persisted MongoDB document fields, validation, references and indexes |
| `src/routes/*.js` | Maps HTTP methods/paths to controller functions and protects role-specific routers |
| `src/controllers/authController.js` | Validates account fields, hashes passwords, checks login credentials, and returns JWT/session data |
| `src/controllers/donorController.js` | Loads donor profile/notifications/history; updates location/availability; records donor responses |
| `src/controllers/requestController.js` | Creates, lists, inspects, retries and cancels hospital blood requests |
| `src/services/dispatchService.js` | Runs the geospatial radius-expansion algorithm, persists unique notifications, emits donor/hospital events, and updates counters |
| `src/services/notificationService.js` | Builds the donor alert payload, emits `blood:request:new`, and logs the SMS placeholder |
| `src/middleware/auth.js` | Validates bearer JWT and enforces roles such as `donor` or `hospital` |
| `src/middleware/errorHandler.js` | Converts route, validation, duplicate-key and unexpected failures to JSON error responses |
| `src/utils/geo.js` | Converts `{lat,lng}` to GeoJSON `[lng,lat]`, validates coordinate bounds, and calculates great-circle distance |
| `src/utils/jwt.js` | Signs JWTs containing user ID (`sub`) and role |
| `src/utils/asyncHandler.js`, `AppError.js` | Simplifies async error forwarding and standard application errors |

---

## 5. Frontend behavior

### 5.1 Routing and user roles

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page and role selection |
| `/donor/register` | Public | Donor registration form |
| `/donor/login` | Public | Donor sign-in |
| `/hospital/register` | Public | Hospital registration form |
| `/hospital/login` | Public | Hospital sign-in |
| `/dashboard` | Authenticated | Redirects to the dashboard for the current role |
| `/donor/dashboard` | Donor only | Donor profile, availability, notifications and history |
| `/hospital/dashboard` | Hospital only | Create/monitor requests, inspect matches, retry/cancel dispatch |
| unknown path | Public fallback | Page-not-found view |

`ProtectedRoute` is only a frontend navigation guard. Backend authorization is still mandatory: every protected API independently verifies the JWT and checks the role.

### 5.2 Session and Axios flow

1. Registration/login returns `{ token, role, user }` inside `data`.
2. `AuthContext` saves those fields in localStorage under `bloodbridge_session` and updates React state.
3. The Axios request interceptor reads the token and adds `Authorization: Bearer <token>`.
4. When the page reloads, `AuthContext` reads the stored session and restores the logged-in UI.
5. Sign-out removes the localStorage session and clears React state.

**Security note:** localStorage is acceptable for a local demonstration but is exposed to JavaScript in the page. For a production app, review the XSS threat model and consider secure, HttpOnly cookies plus CSRF protections, a Content Security Policy, and short-lived/access-token rotation strategies.

### 5.3 Donor dashboard flow

When the dashboard mounts, it loads three API resources in parallel: `GET /api/donors/me`, `GET /api/donors/notifications`, and `GET /api/donors/history`. It shows pending invitations and request details. A donor can:

- toggle `isAvailable`;
- view the registered location on the map. The current dashboard does not expose a location-editing control; the API endpoint `PATCH /api/donors/me/location` is available for updating it;
- accept or reject a pending invitation;
- inspect accepted/rejected/expired history;
- refresh saved state after a reconnect.

When `blood:request:new` or `blood:request:cancelled` arrives, the page displays feedback and refetches its REST data.

### 5.4 Hospital dashboard flow

The hospital dashboard loads `GET /api/requests/mine` and shows request status, urgency, selected radius, number notified, response status, distance, and a donor phone number only after a donor accepts. A hospital can:

- create an emergency request;
- review nearest matches and response status;
- retry dispatch for an eligible active request;
- cancel a request and expire pending invitations;
- refresh the view from the database.

When the hospital dashboard receives `blood:request:response`, `blood:request:dispatch_updated`, or `blood:request:cancelled`, it shows feedback and refetches `GET /api/requests/mine`.

### 5.5 Maps and coordinate behavior

- The frontend accepts human-friendly `{ "lat": ..., "lng": ... }` coordinates.
- Browser geolocation is optional and requires the user to allow access.
- The UI also supports entering coordinates manually.
- Leaflet uses latitude/longitude for display.
- OpenStreetMap map tiles need browser internet access; the API and database can otherwise run locally.
- If location is omitted in a hospital request, the backend uses the registered hospital location.
- The demo uses Warangal coordinates as a fallback/default in parts of the frontend; users should confirm coordinates before dispatch.

---

## 6. Backend request lifecycle

### 6.1 Server startup

1. Load `.env` with `dotenv`.
2. Fail fast if `JWT_SECRET` is missing or shorter than 32 characters.
3. Connect to the configured MongoDB URI.
4. Initialize Mongoose model indexes, including geospatial and notification-uniqueness indexes, when `MONGOOSE_AUTO_INDEX` is enabled.
5. Create a Node HTTP server around Express and attach Socket.IO to that same server.
6. Start listening on the configured port (default `5000`).

### 6.2 Middleware pipeline

For API requests, Express applies security headers via Helmet, CORS origin rules, JSON/urlencoded body parsing, development request logs, and a rate limiter at `/api` (300 requests per 15-minute window in the current source). It then routes `/api/health`, `/api/auth`, `/api/donors`, and `/api/requests`. Unknown endpoints go to the not-found handler. The centralized error handler formats errors as JSON.

### 6.3 Authentication and authorization

- Public endpoints: health, registration, and login.
- Protected endpoint header: `Authorization: Bearer <JWT>`.
- The JWT subject (`sub`) contains the user's MongoDB ID; `role` is either `donor` or `hospital`.
- Passwords are hashed using `bcryptjs` with 12 salt rounds before they are stored.
- Donor routes run `requireAuth` and `requireRole("donor")`.
- Request routes run `requireAuth` and `requireRole("hospital")`.
- A donor cannot call hospital request routes and a hospital cannot call donor profile/notification routes.

### 6.4 Error response shape

Common errors use this shape:

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

The handler maps Mongoose validation failures to HTTP 400, malformed Mongo IDs/cast failures to HTTP 400, and duplicate unique-key failures to HTTP 409. Unexpected 5xx errors are logged; stack details may be included outside production mode. Common status codes include 400 (invalid input), 401 (missing/invalid token or credentials), 403 (wrong role), 404 (record/route not found), 409 (duplicate or invalid state transition), and 500 (unexpected error).

---

## 7. Database design

The application uses **MongoDB Community Server locally** with database name `bloodbridge`. Compass is a graphical client used to inspect the database; it is not a substitute for the running MongoDB server. Collections are created automatically as records are written.

### 7.1 Collections and principal fields

#### `donors` — `Donor` model

| Field | Type / purpose |
|---|---|
| `name` | Required donor display name |
| `email` | Required, normalized to lowercase, unique within donors |
| `phone` | Required, unique within donors |
| `password` | bcrypt hash; excluded from default Mongoose selection/JSON response |
| `bloodGroup` | One of `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `location` | GeoJSON `Point`; coordinates are `[longitude, latitude]` |
| `lastDonatedAt` | Date or `null`; used by the 90-day demo eligibility filter |
| `isAvailable` | Boolean; only `true` donors are dispatched to |
| `createdAt`, `updatedAt` | Mongoose timestamps |

Indexes defined: `location: 2dsphere`, compound `{ bloodGroup: 1, isAvailable: 1 }`, and indexes on email, phone, blood group, donation date, and availability as specified by the schema.

#### `hospitals` — `Hospital` model

| Field | Type / purpose |
|---|---|
| `name` | Required hospital name |
| `email` | Required, lowercase, unique within hospitals |
| `phone` | Required, unique within hospitals |
| `password` | bcrypt hash, not included in default selection/JSON response |
| `address` | Required address text |
| `location` | GeoJSON `Point`; coordinates `[longitude, latitude]` |
| `createdAt`, `updatedAt` | Mongoose timestamps |

Indexes defined: `location: 2dsphere`, unique email/phone indexes.

#### `bloodrequests` — `BloodRequest` model

| Field | Type / purpose |
|---|---|
| `hospital` | Reference to the hospital that owns the request |
| `bloodGroupRequired` | Exact requested group from the allowed blood-group list |
| `unitsNeeded` | Integer from 1 to 100 |
| `urgency` | `low`, `medium`, `high`, or `critical` |
| `location` | GeoJSON request/collection point `[longitude, latitude]` |
| `contactNumber` | Emergency contact, defaults to hospital phone if omitted |
| `status` | `open`, `partially_fulfilled`, `fulfilled`, or `cancelled` |
| `matchedRadiusKm` | Last selected radius (5, 10, or 20) |
| `matchedDonorCount` | Size of final eligible-query result list for the dispatch run |
| `notifiedDonorCount` | Total notifications persisted for the request |
| `acceptedDonors` | Array of donor references that accepted |
| `dispatchRuns` | Number of dispatch runs/retries recorded |
| `dispatchedAt` | Timestamp of latest dispatch run |
| `createdAt`, `updatedAt` | Mongoose timestamps |

Indexes defined: `location: 2dsphere`, `{ hospital: 1, createdAt: -1 }`, and individual query indexes for hospital, group, urgency and status.

#### `notifications` — `Notification` model

| Field | Type / purpose |
|---|---|
| `bloodRequest` | Reference to the request being broadcast |
| `donor` | Reference to the donor receiving the invitation |
| `status` | `pending`, `accepted`, `rejected`, or `expired` |
| `distanceKm` | Calculated great-circle distance between request and donor points |
| `radiusKm` | Search radius used for this notification (5, 10 or 20 km) |
| `channels` | Defaults to `web` and `sms-console` markers |
| `sentAt` | Timestamp recorded when notification document is created |
| `respondedAt` | Null until the response/expiry is recorded |
| `createdAt`, `updatedAt` | Mongoose timestamps |

Indexes defined: unique compound `{ bloodRequest: 1, donor: 1 }` and `{ donor: 1, createdAt: -1 }`. The compound unique index is the database-level duplicate-prevention safeguard: a donor can have at most one notification record per request.

### 7.2 GeoJSON coordinate order

GeoJSON uses `[longitude, latitude]`, not `[latitude, longitude]`. The browser/API form uses `{lat, lng}` because that is easier for humans. The `toGeoPoint` helper validates the values and converts them:

```js
// Incoming request body
{ lat: 17.9689, lng: 79.5941 }

// Stored GeoJSON
{
  type: "Point",
  coordinates: [79.5941, 17.9689]
}
```

Swapping these values is a common geospatial bug. Longitude must be between -180 and 180; latitude must be between -90 and 90.

### 7.3 Why `2dsphere` matters

A `2dsphere` index allows MongoDB to interpret GeoJSON coordinates on a spherical representation of Earth and efficiently run supported geospatial operations. The donor dispatch query uses `$near` with `$geometry` and `$maxDistance`. With GeoJSON, `$maxDistance` is expressed in metres. The donor `location` `2dsphere` index is the important index for the dispatch query; hospital and request location indexes are also declared by the models for future queries/consistency.

### 7.4 Relationships

- One hospital can own many blood requests.
- One blood request can have many notification documents.
- One donor can receive many notifications across different requests.
- `BloodRequest.acceptedDonors` stores donor references that accepted the request.
- The `Notification` collection is the per-donor/per-request response history and status record.

---

## 8. Geo-proximity dispatch algorithm

### 8.1 Eligibility filter

The dispatcher queries the donor collection for donors who satisfy all of the following:

1. `bloodGroup` exactly matches `bloodGroupRequired`.
2. `isAvailable` is `true`.
3. `lastDonatedAt` is `null`/missing or older than or equal to 90 days before the dispatch time.
4. Donor location is within the active `$maxDistance` radius from the request's GeoJSON point.

This is exact-group matching for the prototype. It is not a clinical blood-compatibility engine.

### 8.2 Radius expansion

1. Start with a 5 km radius and run the eligible-donor `$near` query.
2. Count candidate donors who have no prior notification for this request, or whose prior notification is not `rejected`.
3. If that count covers `unitsNeeded`, stop expanding the radius.
4. Otherwise, repeat the full query at 10 km. If still insufficient, run it at the maximum 20 km radius and stop there even if fewer donors are found than requested.
5. From the final result set, create notification documents only for donors who have not previously been notified for this request.
6. Emit Socket.IO alerts to the newly notified donors and update the request's dispatch metrics.

The search repeats the full near query at each radius; it does not simply query the outer ring. MongoDB returns `$near` results in ascending distance order. When enough non-rejected candidates are found, the dispatcher stops expanding; otherwise, it stops after 20 km. Donors can be notified even if the total number of matches is less than `unitsNeeded` at 20 km.

### 8.3 Duplicate-prevention layers

1. `dispatchService.js` reads prior notifications for that request and skips donors already in that set.
2. New `Notification` records are created before `sendDonorAlert` emits a live event.
3. The database unique compound index on `{bloodRequest, donor}` blocks duplicates even if two dispatch retries race concurrently. Duplicate-key error `11000` is handled as a race rather than sending another event.

This provides request-level deduplication; it does not mean a donor can never be alerted about a different request.

### 8.4 Distance calculation

MongoDB `$near` determines which donors fit within the radius and orders them by proximity. `utils/geo.js` also calculates a great-circle distance (Haversine-style formula) between stored GeoJSON points. That value is persisted as `distanceKm` on the notification and displayed in the hospital dashboard.

### 8.5 Dispatch output and saved metrics

After each dispatch, the service updates the request with `matchedRadiusKm`, `matchedDonorCount`, `notifiedDonorCount`, `dispatchRuns`, and `dispatchedAt`. It then emits `blood:request:dispatch_updated` to the owning hospital room. Existing notifications are not resent on retry.

---

## 9. Complete REST API reference

**Base URL:** `http://localhost:5000/api`  
**Protected header:** `Authorization: Bearer <JWT>`  
**Content type:** `application/json` for JSON bodies.

### 9.1 Health endpoint

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Reports API state, MongoDB connected/disconnected state, and timestamp |

### 9.2 Authentication endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/donors/register` | Public | Create donor, hash password, return donor JWT/session |
| `POST` | `/auth/donors/login` | Public | Verify donor credentials and return donor JWT/session |
| `POST` | `/auth/hospitals/register` | Public | Create hospital, hash password, return hospital JWT/session |
| `POST` | `/auth/hospitals/login` | Public | Verify hospital credentials and return hospital JWT/session |

**Donor registration body**

```json
{
  "name": "Demo Donor",
  "email": "donor@example.com",
  "phone": "+919876543210",
  "password": "DonorDemo123!",
  "bloodGroup": "O+",
  "location": { "lat": 17.9689, "lng": 79.5941 },
  "lastDonatedAt": null,
  "isAvailable": true
}
```

**Hospital registration body**

```json
{
  "name": "Demo General Hospital",
  "email": "hospital@example.com",
  "phone": "+919876543211",
  "password": "HospitalDemo123!",
  "address": "Main Road, Warangal",
  "location": { "lat": 17.9695, "lng": 79.5950 }
}
```

Successful registration/login response shape:

```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "<JWT>",
    "role": "donor",
    "user": { "_id": "<mongo-id>" }
  }
}
```

The actual `user` object contains profile fields; passwords are not returned.

**Validation notes:** email is normalized to lowercase; password length is 8–128 characters; donor blood group must be one of the eight configured values; coordinates must be valid; last-donation date cannot be in the future. Email and phone uniqueness conflicts return HTTP 409.

### 9.3 Donor endpoints (donor JWT required)

| Method | Endpoint | Body/query | Purpose |
|---|---|---|---|
| `GET` | `/donors/me` | — | Fetch current donor profile |
| `PATCH` | `/donors/me/availability` | `{ "isAvailable": false }` | Enable/disable eligibility for new dispatches |
| `PATCH` | `/donors/me/location` | `{ "location": { "lat": 17.97, "lng": 79.59 } }` | Update saved donor location |
| `GET` | `/donors/notifications` | optional `?status=pending` | Fetch donor invitations; accepted statuses: `pending`, `accepted`, `rejected`, `expired` |
| `PATCH` | `/donors/notifications/:notificationId/respond` | `{ "response": "accepted" }` or `rejected` | Record donor response |
| `GET` | `/donors/history` | — | Fetch accepted, rejected and expired history |

**Response example**

```json
{ "response": "accepted" }
```

The backend accepts `accepted` or `rejected` only and only if the notification is still `pending`. Repeating a response returns HTTP 409. If the underlying request has been cancelled/fulfilled, the notification is expired and the donor cannot respond.

On acceptance, the donor is added to `acceptedDonors`, the request becomes `partially_fulfilled` or `fulfilled`, the donor's availability becomes `false`, and the donor's other pending invitations are expired. If the request becomes fulfilled, its other pending invitations are also expired. The hospital receives `blood:request:response`.

### 9.4 Hospital request endpoints (hospital JWT required)

| Method | Endpoint | Body/query | Purpose |
|---|---|---|---|
| `POST` | `/requests` | blood group, units, urgency, optional location/contact | Create request, run dispatch immediately and return request + dispatch summary |
| `GET` | `/requests/mine` | — | List current hospital's requests, sorted newest first, with donor response records |
| `GET` | `/requests/:requestId` | — | Read one request owned by the current hospital, with matches |
| `POST` | `/requests/:requestId/dispatch` | — | Retry dispatch; existing donor/request notifications are not duplicated |
| `PATCH` | `/requests/:requestId/cancel` | — | Cancel a request and expire pending notifications |

**Create blood request body**

```json
{
  "bloodGroupRequired": "O+",
  "unitsNeeded": 2,
  "urgency": "critical",
  "location": { "lat": 17.9689, "lng": 79.5941 },
  "contactNumber": "+919876543211"
}
```

`urgency` may be `low`, `medium`, `high`, or `critical`. `unitsNeeded` must be an integer from 1 to 100. If `location` is omitted, the registered hospital location is used. If `contactNumber` is omitted/blank, the hospital phone is used.

A successful create response contains `data.request` and `data.dispatch`. Dispatch summary fields include `matchedRadiusKm`, `radiiChecked`, `matchedDonorCount`, `newlyNotifiedCount`, `notifiedDonorCount`, and the matched donor list. The list includes donor names, group, approximate distance, and notification status, but does not expose donor phone in the dispatch summary.

**Privacy rule:** in the hospital's saved request list/detail, donor phone is exposed only after that donor's notification status is `accepted`. Before acceptance, the UI says the contact is available after acceptance.

**Cancellation behavior:** a fulfilled request cannot be cancelled; an already-cancelled request cannot be cancelled again. Cancelling sets request status to `cancelled`, marks pending notifications `expired`, and emits `blood:request:cancelled` to the hospital and each invited donor room.

---

## 10. End-to-end business workflows

### Workflow A — Donor registration and login

1. User visits `/donor/register`.
2. UI collects name, email, phone, password, blood group, last-donated date, availability and location.
3. Axios sends `POST /api/auth/donors/register`.
4. The controller validates the values, converts location to GeoJSON, hashes the password with bcryptjs, and creates the `Donor` document.
5. The API signs a JWT with donor role and returns the session.
6. AuthContext stores the session; the user is taken to `/donor/dashboard`.
7. The donor dashboard loads profile, invitations and history, then connects Socket.IO using the JWT.

### Workflow B — Hospital creates an emergency request

1. Hospital signs in and visits `/hospital/dashboard`.
2. Hospital enters required blood group, units, urgency, contact number and coordinates.
3. Axios sends `POST /api/requests` with the hospital JWT.
4. `requireAuth` verifies the token; `requireRole("hospital")` blocks non-hospital users.
5. The controller validates inputs, chooses the request location/contact and saves a `BloodRequest` document.
6. It calls `dispatchBloodRequest()` immediately.
7. The dispatcher queries eligible donors at 5 km, then 10 km/20 km as necessary.
8. For each new donor, it stores a unique `Notification` document. Already-notified donors are skipped.
9. The notification service emits `blood:request:new` to the matching donor's private socket room and logs the SMS placeholder.
10. The dispatcher updates request metrics and emits `blood:request:dispatch_updated` to the hospital room.
11. The REST response returns to the hospital page; the page updates its request list.

### Workflow C — Donor accepts or rejects

1. Connected donor receives `blood:request:new`; the dashboard displays a message and fetches notifications from MongoDB through the REST API.
2. Donor presses Accept or Reject.
3. Axios sends `PATCH /api/donors/notifications/:notificationId/respond`.
4. Backend confirms that this notification belongs to the authenticated donor and is still pending.
5. Backend writes the response and response timestamp.
6. If accepted, the donor is added to the request's accepted list, donor availability becomes false, other pending invitations for that donor expire, and the request may become partially fulfilled or fulfilled.
7. Backend emits `blood:request:response` to the hospital's private room.
8. Hospital dashboard shows the incoming response and refetches the saved request list.
9. The donor's phone is exposed in the hospital request view only after acceptance.

### Workflow D — Retry dispatch

1. Hospital presses **Retry dispatch** on an open/partially fulfilled request.
2. Frontend calls `POST /api/requests/:requestId/dispatch`.
3. Backend re-runs eligible donor search and accounts for prior notification statuses.
4. Existing donor/request pairs are skipped; the unique compound MongoDB index is the final duplicate guard.
5. Newly found donors are notified, saved metrics are updated, and the hospital receives `blood:request:dispatch_updated`.
6. Hospital view refreshes from the API.

### Workflow E — Hospital cancels a request

1. Hospital presses Cancel and confirms.
2. Frontend calls `PATCH /api/requests/:requestId/cancel`.
3. Backend changes request status to `cancelled` and converts pending invitations to `expired`.
4. Backend emits `blood:request:cancelled` to the hospital and the donors who were invited.
5. Both sides refresh durable state from the API.

---

## 11. Local setup (MongoDB Compass / no Atlas)

### 11.1 Prerequisites

- Node.js `20.19+` (or `22.12+` recommended for Vite 8)
- npm
- MongoDB Community Server installed and running locally
- MongoDB Compass optional for viewing collections

**Compass is only the GUI.** The MongoDB Community Server process must be running independently.

### 11.2 Start local MongoDB

Connect Compass to:

```text
mongodb://127.0.0.1:27017
```

The application uses:

```text
mongodb://127.0.0.1:27017/bloodbridge
```

The `bloodbridge` database and collections appear after the first successful writes. No Atlas account, Atlas credential, or remote connection string is required.

### 11.3 Configure and start the backend

From the project root, open Terminal 1:

**Windows PowerShell**

```powershell
cd server
Copy-Item .env.example .env
npm install
```

**macOS/Linux**

```bash
cd server
cp .env.example .env
npm install
```

Edit `server/.env` and set a strong, private `JWT_SECRET` with at least 32 characters. Keep the default MongoDB URI for a standard local installation. Then run:

```bash
npm run dev
```

Expected local API base URL: `http://localhost:5000`. Test `http://localhost:5000/api/health`; `database` should be `connected`.

### 11.4 Configure and start the frontend

Open Terminal 2 in the project root:

**Windows PowerShell**

```powershell
cd client
Copy-Item .env.example .env
npm install
npm run dev
```

**macOS/Linux**

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

### 11.5 Environment variables

**`server/.env`**

| Variable | Purpose | Local default / guidance |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/bloodbridge` |
| `PORT` | Express/Socket.IO listening port | `5000` |
| `NODE_ENV` | Controls development logging/error details | `development` locally |
| `CLIENT_URL` | Allowed frontend origin(s), comma-separated | `http://localhost:5173` |
| `JWT_SECRET` | Secret for signing/verifying API and socket JWTs | Replace sample with strong random secret, 32+ chars |
| `JWT_EXPIRES_IN` | JWT expiry | `7d` |
| `MONGOOSE_AUTO_INDEX` | Whether Mongoose initializes schema indexes on startup | `true` in development |
| `TWILIO_ACCOUNT_SID` | Reserved for future real SMS integration | Empty; unused placeholder now |
| `TWILIO_AUTH_TOKEN` | Reserved for future real SMS integration | Empty; unused placeholder now |
| `TWILIO_PHONE_NUMBER` | Reserved for future real SMS integration | Empty; unused placeholder now |

**`client/.env`**

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Restart the related dev server after editing an environment file. Do not commit `.env` files or secrets to Git.

---

## 12. Recommended integration test checklist

Use synthetic test accounts and test coordinates; do not enter real patient data.

1. Start MongoDB Community Server, the API and Vite client.
2. Check `GET http://localhost:5000/api/health`; verify that the JSON response reports `"database": "connected"`.
3. Register two or more synthetic donors with the same blood group, different email/phone numbers, availability enabled, and valid coordinates within 20 km. Use `lastDonatedAt: null` or a date at least 90 days old.
4. Register a hospital account and sign in.
5. Create an emergency request for that same group with `unitsNeeded: 1` and coordinates close to the test donors.
6. Confirm a `BloodRequest` document and matching `Notification` documents appear in Compass.
7. Confirm the hospital dashboard shows the chosen radius, notified count, donor distance and pending status.
8. Sign in as one of the donors in a separate browser/incognito session. Keep the donor dashboard open before creating another request to see the live `blood:request:new` event.
9. Accept or reject the invitation. Confirm the notification status changes in MongoDB and the hospital dashboard updates after the socket event.
10. Confirm the hospital only sees the accepting donor's phone number after acceptance.
11. Retry dispatch and confirm that the same donor/request pair is not duplicated.
12. Cancel a different active request. Confirm pending notifications become `expired` and the invited donor dashboard receives the cancellation event.
13. Toggle a donor unavailable and verify the donor is not selected for new dispatches.
14. Use an ineligible last-donation date (less than 90 days ago) and verify the donor is not matched by the demo rule.
15. Test no-match behavior with an uncommon location/group combination and confirm the dispatcher stops at 20 km and reports how many donors were found.

### 12.1 Useful checks in MongoDB Compass

After creating requests, inspect these collections:

- `donors`: confirm the stored coordinates are `[longitude, latitude]` and passwords are not exposed by API responses.
- `hospitals`: confirm account and GeoJSON location fields.
- `bloodrequests`: confirm `status`, `matchedRadiusKm`, `matchedDonorCount`, `notifiedDonorCount`, `dispatchRuns`, and `acceptedDonors`.
- `notifications`: confirm one record per request/donor, the selected radius, distance, status, and response timestamps.

In the donor notification collection, use a compound key mentally as `(bloodRequest, donor)`: that pair must not occur twice. The unique index enforces this rule.

---

## 13. Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB Community Server is not running or listens on another port | Start the MongoDB service; test the URI in Compass; verify `MONGODB_URI` |
| Compass opens but the API cannot connect | Compass is a GUI and does not itself run the database server | Install/start MongoDB Community Server separately |
| API reports `JWT_SECRET` is too short/missing | `.env` absent or secret was not updated | Create `server/.env`, set a random secret of at least 32 characters, restart backend |
| Browser says API cannot be reached | Backend is stopped or `VITE_API_URL` is incorrect | Test `/api/health`; confirm API is on port 5000; restart Vite after env changes |
| REST returns 401 | Missing, invalid or expired JWT | Sign in again; confirm Axios is attaching `Authorization: Bearer ...` |
| REST returns 403 | Authenticated account has the wrong role | Use a donor token for donor routes and a hospital token for request routes |
| REST returns 409 for duplicate email/phone | The value already exists in that collection | Sign in with the existing account or register using a different test identity |
| `$near` fails or reports missing geospatial index | Geo index was not created | Keep `MONGOOSE_AUTO_INDEX=true`, restart the backend, and wait for model initialization; if auto-indexing is disabled, create the declared indexes manually |
| Donor sees no new live alert | Donor socket was offline, invalid token, wrong socket URL, or CORS origin mismatch | Keep the donor dashboard open; check browser console for `connect_error`; confirm `VITE_SOCKET_URL`, `CLIENT_URL`, and JWT session |
| Donor was offline when request was created | A live event cannot reach a disconnected browser | After signing in, the dashboard retrieves persisted notifications from `GET /api/donors/notifications` |
| Hospital dashboard appears stale | Socket reconnect or refresh did not complete | Press Refresh; check the hospital socket connection and API logs |
| Map tiles do not load | Browser has no internet access or tile provider unavailable | Verify internet access; map tiles are external OpenStreetMap resources even though API/DB are local |
| Vite build/start complains about Node version | Node version is below the Vite 8 requirement | Use Node 20.19+ or 22.12+ and reinstall dependencies if required |

---

## 14. Security, privacy and reliability notes

### Implemented in this prototype

- Password hashing through bcryptjs (12 salt rounds).
- JWT authentication on protected routes and the Socket.IO handshake.
- Role-based separation between donor endpoints and hospital request endpoints.
- CORS allow-list sourced from `CLIENT_URL`.
- Helmet security headers, request body limits, and API rate limiting.
- Password fields excluded from default Mongoose selection and JSON serialization.
- Hospital ownership is verified before reading, retrying, or cancelling its requests.
- Donor phone is included in hospital match output only for accepted notifications.
- Notifications are persisted before a web event is sent.
- A unique notification index prevents request-level duplicate broadcasts on retries/races.

### Important limitations before production

- The SMS integration is a console placeholder, not a delivery provider.
- Hospital registration is self-service and does not verify that an institution is legitimate.
- Donor identity, phone ownership, consent and eligibility are not verified.
- Exact blood-group matching and the 90-day cooldown are simplified demo logic. A medical professional/blood bank must define clinical compatibility and eligibility rules.
- JWT is stored in browser localStorage in the current frontend. Assess the XSS risk and authentication design before real deployment.
- Socket.IO emits events to connected clients; there is no durable Socket.IO event queue. The REST/database recovery pattern mitigates this for the current dashboards, but a production design should include reconnection strategy, observability and robust event handling.
- The current app does not implement rate-limited SMS delivery, OTP, password reset, admin moderation, audit logging, consent records, data retention/erasure policy, encryption-at-rest governance, or a privacy/compliance review.
- Acceptance logic modifies request acceptance state in application code. Before production, use transaction/atomic-operation design and concurrency tests so two donors accepting near-simultaneously cannot lead to inaccurate fulfillment metrics.
- There is no inventory system to track actual blood components/units, no blood-bank API integration, and no clinical verification of whether a donor's contribution fulfills a request.
- A notification record being `accepted` records willingness to respond; it does not prove the donor reached the hospital or successfully donated blood.
- A production emergency system needs a staffed fallback process and must never be the only means of arranging blood.

---

## 15. Future improvements

Suggested improvements in priority order:

1. **Automated test suite:** unit-test `toGeoPoint`, distance calculation, eligibility cutoff, radius expansion, role guards, duplicate retry, accept/reject and cancel behavior.
2. **Integration tests with MongoDB:** use a disposable test database to verify geospatial matching and unique-index behavior.
3. **Reliable notification delivery:** add an outbox/queue, retry strategy and event idempotency if dispatch must scale across instances.
4. **Real SMS gateway:** implement Twilio or another provider with opt-in consent, phone verification, delivery status callback and retry limits.
5. **Verified hospital onboarding:** manual/administrative approval before enabling hospital dispatch.
6. **Privacy and identity safeguards:** phone OTP, documented consent, minimal disclosure, access logs, rate limits and explicit account lifecycle controls.
7. **Clinical policy engine:** have qualified blood-bank professionals specify donor deferrals and compatibility; do not encode ad-hoc medical rules.
8. **Atomic acceptance workflow:** use MongoDB transactions/conditional updates to reserve capacity and prevent concurrent over-acceptance.
9. **Request lifecycle management:** define expiration, escalation, closure, contact attempts and audit history.
10. **Deployment and operations:** HTTPS, secret manager, monitoring/alerts, backups, restore drills, database access control and disaster-recovery plan.
11. **Accessibility and usability:** keyboard tests, form labels, contrast, loading and error states, and mobile dashboard validation.
12. **Production geospatial/privacy policy:** explain how donor location is collected, stored, displayed, updated and deleted.

---

## 16. Glossary for project presentation / viva

| Term | Plain-language definition |
|---|---|
| MERN | MongoDB, Express, React and Node.js — the application's main stack |
| API | A defined interface through which the frontend asks the backend to perform an operation or return data |
| REST | HTTP request/response interaction, used here for forms and retrieving saved records |
| JWT | A signed token that communicates user identity and role to the API/socket handshake |
| Middleware | Code executed during a request pipeline, such as token verification, CORS or error handling |
| Mongoose schema/model | The code definition and interface for validating and querying a MongoDB collection |
| GeoJSON Point | A geographic point represented by `type: "Point"` and `[longitude, latitude]` coordinates |
| `2dsphere` index | A MongoDB index for geographic calculations/queries on spherical map coordinates |
| `$near` | A MongoDB geospatial operator that finds nearby points, ordered by distance when used with a supported index |
| `$maxDistance` | The upper search distance; for this GeoJSON query it is specified in metres |
| Radius expansion | Repeating the donor search at increasing radii until coverage is sufficient or the maximum radius is reached |
| Socket.IO | A library for bidirectional, event-based, near-real-time communication between server and client |
| Socket room | A server-managed group of connected sockets; BloodBridge uses one private room per authenticated user/role |
| Notification document | The durable record connecting one request to one donor and recording pending/accepted/rejected/expired status |
| Idempotency / deduplication | Ensuring a repeated operation does not create duplicate notifications for the same donor/request pair |
| Source of truth | The authoritative persisted state; in this project, MongoDB accessed through the REST API |

---

## 17. One-minute project explanation

> BloodBridge is a MERN-stack emergency donor coordination prototype. Donors and hospitals register and log in with separate JWT roles. A hospital creates an emergency blood request with a blood group, units, urgency and location. The backend searches the MongoDB donor collection using a `2dsphere` index and `$near`, applying blood-group, availability and demo 90-day donation-cutoff filters. It expands the radius from 5 to 10 to 20 kilometres when it needs more eligible donor responses. For every newly matched donor, it stores a notification and sends a Socket.IO event to that donor's private authenticated room. The donor can accept or reject through the REST API, and the response is stored in MongoDB and pushed to the hospital dashboard through another Socket.IO event. A unique compound index prevents duplicate notifications for the same request and donor. The system uses local MongoDB Community Server, so MongoDB Atlas is not required. It is an academic prototype and needs clinical, security, verification and reliability work before real-world emergency use.

---

## 18. Reference files

- Root setup summary: `README.md`
- Frontend guide: `client/README.md`
- Backend/API guide: `server/README.md`
- Backend environment template: `server/.env.example`
- Frontend environment template: `client/.env.example`
- Main geospatial algorithm: `server/src/services/dispatchService.js`
- Live alert payload and SMS placeholder: `server/src/services/notificationService.js`
- Socket authentication/rooms: `server/src/config/socket.js`
- Browser socket hook: `client/src/hooks/useSocketEvents.js`
- MongoDB schemas/indexes: `server/src/models/`

**End of documentation.**
