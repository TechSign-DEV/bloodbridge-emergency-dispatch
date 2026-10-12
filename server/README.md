# BloodBridge — Backend API

**BloodBridge: Automated Geo-Proximity Emergency Donor Dispatch Engine** is a MERN-stack college project prototype for matching a hospital's emergency blood request with nearby, available volunteer donors.

This folder contains the Node.js/Express backend, MongoDB/Mongoose models, JWT authentication, geospatial dispatch logic, and Socket.IO events. The React/Vite frontend is the next project phase.

> **Important:** This is an educational prototype, not a certified emergency medical service. Do not rely on it for real blood dispatch without clinical and legal review, verified donor identity/eligibility, privacy controls, operational monitoring, and tested fallback procedures. The 90-day deferral rule is a simplified project rule and must be validated against applicable blood-bank policy. Matching is exact blood-group matching; a production system needs clinician/blood-bank verification of compatibility.

## 1. Requirements

- Node.js 20 or newer
- npm
- MongoDB Community Server running locally
- MongoDB Compass (optional GUI for viewing the local database)

**Compass is a database GUI, not the database server.** Install/start MongoDB Community Server locally first. This project does not need MongoDB Atlas.

## 2. Folder structure

```text
server/
├── .env.example
├── .gitignore
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
    │   ├── BloodRequest.js
    │   ├── Donor.js
    │   ├── Hospital.js
    │   └── Notification.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── donorRoutes.js
    │   ├── healthRoutes.js
    │   └── requestRoutes.js
    ├── services/
    │   ├── dispatchService.js
    │   └── notificationService.js
    └── utils/
        ├── AppError.js
        ├── asyncHandler.js
        ├── geo.js
        └── jwt.js
```

## 3. Configure local MongoDB

1. Start the **MongoDB Community Server** service on your machine.
2. Open MongoDB Compass and connect to:

   ```text
   mongodb://127.0.0.1:27017
   ```

3. The `bloodbridge` database is created automatically when the app writes its first document. You do not need to create it manually.
4. From this `server` folder, create your environment file:

   **Windows PowerShell**

   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux**

   ```bash
   cp .env.example .env
   ```

5. Update `JWT_SECRET` in `.env` to a long random value (at least 32 characters). Leave the local connection string as-is if MongoDB is running on the default local port.

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/bloodbridge
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
   JWT_EXPIRES_IN=7d
   MONGOOSE_AUTO_INDEX=true
   ```

## 4. Install and run

```bash
npm install
npm run dev
```

Expected logs include a MongoDB connection message and:

```text
BloodBridge API listening on http://localhost:5000
```

Verify it in your browser or API client:

```http
GET http://localhost:5000/api/health
```

Example response:

```json
{
  "success": true,
  "message": "BloodBridge API is running",
  "database": "connected",
  "timestamp": "2026-10-12T00:00:00.000Z"
}
```

The timestamp in your actual response will differ.

## 5. Geospatial logic

The `Donor.location` and `Hospital.location` fields use GeoJSON `Point` data in **[longitude, latitude]** order. Donor and request location schemas are indexed with `2dsphere` indexes. The API accepts locations as `{ "lat": 17.9689, "lng": 79.5941 }` and converts them before saving.

On request creation the dispatcher runs a MongoDB `$near` query with:

- exact `bloodGroup` match;
- `isAvailable: true`;
- `lastDonatedAt` missing/null or at least 90 days ago;
- `$maxDistance` of 5,000, 10,000, then 20,000 metres.

It starts at 5 km and widens if there are fewer eligible, non-rejected matches than the number of requested units. Results are distance-ordered by MongoDB. The `(bloodRequest, donor)` unique index on `Notification` prevents duplicate notifications on dispatch retries. Socket.IO alerts are sent only to the matching donor's authenticated room. SMS integration is currently a console-log placeholder; no SMS is actually sent.

The `2dsphere` indexes are defined in the Mongoose models and created automatically while `MONGOOSE_AUTO_INDEX=true`. If you turn auto-indexing off, create the relevant indexes manually in Compass or through `mongosh`.

## 6. Authentication

The API returns a JWT on registration/login. For protected requests use:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

There are two roles: `donor` and `hospital`. A donor token cannot use hospital routes, and a hospital token cannot use donor routes.

Passwords are hashed with bcrypt. Never commit `.env` or use the sample JWT secret outside local development.

## 7. API endpoints

Base URL: `http://localhost:5000/api`

### Health

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Health and MongoDB connection state |

### Auth

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/donors/register` | No | Register a donor |
| POST | `/auth/donors/login` | No | Donor login |
| POST | `/auth/hospitals/register` | No | Register a hospital |
| POST | `/auth/hospitals/login` | No | Hospital login |

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

### Donor dashboard APIs (donor JWT required)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/donors/me` | Load donor profile |
| PATCH | `/donors/me/availability` | Change availability: `{ "isAvailable": false }` |
| PATCH | `/donors/me/location` | Update location: `{ "location": { "lat": 17.97, "lng": 79.59 } }` |
| GET | `/donors/notifications` | Incoming requests, newest first |
| GET | `/donors/notifications?status=pending` | Filter notifications by status |
| PATCH | `/donors/notifications/:notificationId/respond` | Accept/reject an invitation |
| GET | `/donors/history` | Accepted, rejected, and expired notification history |

Response example for accepting/rejecting:

```json
{ "response": "accepted" }
```

An accepted donor is marked unavailable to prevent overlapping invitations. The donor must manually turn availability back on after their donation/deferral period has been reviewed.

### Hospital dashboard APIs (hospital JWT required)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/requests` | Create request and trigger radius dispatch |
| GET | `/requests/mine` | List hospital's requests and donor responses |
| GET | `/requests/:requestId` | Request detail and matching notifications |
| POST | `/requests/:requestId/dispatch` | Retry dispatch; existing notifications are not duplicated |
| PATCH | `/requests/:requestId/cancel` | Cancel a request and expire pending invitations |

**Create request body**

```json
{
  "bloodGroupRequired": "O+",
  "unitsNeeded": 2,
  "urgency": "critical",
  "location": { "lat": 17.9695, "lng": 79.5950 },
  "contactNumber": "+919876543211"
}
```

`location` and `contactNumber` are optional if they should default to the hospital's registered location and phone. `urgency` values: `low`, `medium`, `high`, `critical`. Blood group must be one of `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`.

Hospital match records do not expose a donor phone number until the donor accepts the request. The response includes the donor name, exact blood group, distance, and invitation status for dashboard display.

## 8. Socket.IO client events

Connect with the same JWT returned by auth:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: localStorage.getItem("token") },
});

socket.on("connection:ready", console.log);
socket.on("blood:request:new", (notification) => console.log("New donor request", notification));
socket.on("blood:request:response", (response) => console.log("Donor response", response));
socket.on("blood:request:dispatch_updated", (summary) => console.log("Dispatch summary", summary));
socket.on("blood:request:cancelled", (event) => console.log("Request cancelled", event));
```

- Donor receives `blood:request:new` in their private authenticated room.
- Hospital receives `blood:request:response` and `blood:request:dispatch_updated` in their private room.
- The frontend should still fetch REST APIs on page load/reconnect; sockets are real-time updates, not the source of durable history.

## 9. Test flow (Postman, Thunder Client, or curl)

1. `GET /api/health` and ensure `database` is `connected`.
2. Register two or more donors within 20 km of the hospital. Use the same blood group as the test request and set `lastDonatedAt` to `null` or a date more than 90 days ago.
3. Register/login a hospital and copy its token.
4. `POST /api/requests` with the hospital token and a blood group matching the donor accounts.
5. Check the response's `data.dispatch` fields (`radiiChecked`, `matchedRadiusKm`, `matchedDonorCount`, `newlyNotifiedCount`). Check the server console for `[SMS PLACEHOLDER]` messages.
6. Login as a donor and call `GET /api/donors/notifications` using the donor token. Accept/reject with `PATCH /api/donors/notifications/:notificationId/respond`.
7. Call `GET /api/requests/mine` with the hospital token to view donor response statuses. Call `POST /api/requests/:requestId/dispatch` again and verify `newlyNotifiedCount` is zero for already-notified donors.

## 10. Known prototype limitations

- SMS is a console placeholder; no Twilio messages are delivered.
- No email/phone OTP verification, password reset, hospital verification, donor identity verification, or consent audit trail is implemented.
- This demo uses a simplified 90-day date check and one accepted donor per unit; real donation eligibility, blood compatibility, inventory, and allocation rules must be defined with qualified blood-bank staff.
- Production deployment needs HTTPS, secret management, durable audit logs, monitoring, database backups, access reviews, stricter privacy controls, and integration tests.
