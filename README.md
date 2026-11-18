# TuteLedger: Backend API

TuteLedger is a back-office web app for private tuition tutors. A tutor records every fee payment at the moment it is received, tied to a student, a class and a billing month, so "what was paid, for what, and when?" is answered from one record that the tutor controls instead of a paper card held by the student.

This repository is the **backend** (REST API). The React frontend is in a separate repository.

|                     |                                                                       |
| ------------------- | --------------------------------------------------------------------- |
| Live backend        | https://tuteledger-backend.onrender.com (health check: `/api/health`) |
| Live frontend       | https://tuteledger-frontend.vercel.app                                |
| Backend repository  | https://github.com/kalpanath-selvaraja/tuteledger-backend             |
| Frontend repository | https://github.com/kalpanath-selvaraja/tuteledger-frontend            |

## Demo logins

Fictional accounts and fictional data, for marking only.

| Role         | Email                  | Password               |
| ------------ | ---------------------- | ---------------------- |
| Tutor        | tutor1@example.com     | tutor1Demo2026!        |
| Receptionist | reception1@example.com | receptionist1Demo2026! |

## Technologies

- Node.js, Express 5, **TypeScript**
- MongoDB Atlas with Mongoose (validation and indexes)
- JWT (access and refresh tokens), bcryptjs (password hashing)
- cors, dotenv
- Deployed on Render, database on MongoDB Atlas

## Main features

- **Authentication:** login returns a 15-minute access token and a 7-day refresh token. `POST /api/auth/refresh` issues a new access token.
- **Role-based authorization:** two roles, Tutor and Receptionist. The role of the person making a request is always read from the account record in the database, never from the request.
- **Classes:** create, view, edit and delete (delete only if the class never had an enrollment). Tutor only for changes.
- **Students:** create, search, page, view and edit. Only the Tutor can set a student inactive, and not while an enrollment is open.
- **Enrollments:** link a student to a class. The start month is set by the server. The Tutor can end or reopen an enrollment.
- **Ledger:** month-by-month Paid, Waived or Unpaid for each class of a student, with totals. It is computed on request and stores nothing extra.
- **Payments:** one request can pay several months and produces one receipt number with one row per month. The amount comes from the class fee, never from the request.
- **Void and waive (Tutor only):** payments are never edited or deleted. A mistake is a void with a reason. A waiver, with a reason, marks a month as not owed.
- **Staff accounts (Tutor only):** the Tutor creates accounts (a Receptionist by default), lists all accounts, and edits an account's name, email and password. There is no public sign-up.
- **PDF statements and receipts (advanced feature):** generated in the frontend from the ledger data the API returns.

Screenshots of every screen are in the frontend README: https://github.com/kalpanath-selvaraja/tuteledger-frontend#screenshots

## Setup and run (backend)

Requirements: Node.js 20 or newer, a MongoDB Atlas database (or local MongoDB).

```bash
git clone https://github.com/kalpanath-selvaraja/tuteledger-backend.git
cd tuteledger-backend
npm install
cp .env.example .env      # on Windows: copy .env.example .env
```

Fill in `.env`:

| Variable | Meaning |
|---|---|
| `PORT` | Port for local use (default 5000) |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | A different secret for refresh tokens |
| `CORS_ORIGINS` | The one frontend origin allowed, with no trailing slash, for example `http://localhost:5173` |
| `SEED_TUTOR_NAME`, `SEED_TUTOR_EMAIL`, `SEED_TUTOR_PASSWORD` | The demo Tutor account created by the seed script |
| `SEED_RECEPTIONIST_NAME`, `SEED_RECEPTIONIST_EMAIL`, `SEED_RECEPTIONIST_PASSWORD` | The demo Receptionist account created by the seed script |

Create the demo Tutor and Receptionist accounts, then start the API:

```bash
npm run seed                          # creates each account only if it does not exist yet
npm run dev                           # http://localhost:5000/api
```

The seed script is safe to run more than once: an account that already exists is left unchanged.

Production build: `npm run build` then `npm start`.

## Deployment

The backend runs as a Render web service with the build command `npm install dev && npm run build` and the start command `npm start`. The environment variables are the ones in the table above (Render sets `PORT` itself), and the database is MongoDB Atlas. The frontend is deployed separately on Vercel.

## Setup and run (frontend)

```bash
git clone https://github.com/kalpanath-selvaraja/tuteledger-frontend.git
cd tuteledger-frontend
npm install
```

Create `.env.local` with `VITE_API_URL=http://localhost:5000/api`, then run `npm run dev` and open http://localhost:5173.

The backend allows exactly one frontend origin per environment, so a local frontend talks to a local backend and the live frontend talks to the live backend.

## System design

**Architecture.** A React single-page app calls a stateless REST API over HTTPS. The API reads and writes MongoDB Atlas through Mongoose. The access token is sent in the `Authorization: Bearer` header. Every request passes through the same chain: CORS, JSON parsing, database connection, authentication, role check, controller.

**Data model (5 entities):**

- **User:** name, email (unique), passwordHash, role (tutor or receptionist), active
- **Student:** name, guardianName, phone, status (active or inactive)
- **Class:** name, subject, dayOfWeek, startTime, monthlyFeeLKR (integer), active
- **Enrollment:** studentId, classId, startMonth, endMonth (null means still enrolled). One enrollment per student per class, enforced by a unique index. This resolves the many-to-many link between Student and Class.
- **Payment:** enrollmentId, month ("YYYY-MM"), kind (payment or waiver), amountLKR, receiptNo, reason, recordedBy, status (active or voided), voidReason. A unique index allows only one active row per enrollment per month.

**Rules enforced on the server:** every route except login and refresh needs a valid token (401); the Tutor-only routes (classes changes, user management, voids, waivers, ending an enrollment) return 403 for a Receptionist; `recordedBy` comes from the token; there is no edit or delete route for payments; a month that is already paid or waived returns 409; a month outside the enrollment period returns 400.

## API summary

Base path `/api`. Success: `{ success: true, data }`. Failure: `{ success: false, message, errors? }`. Status codes used: 200, 201, 400, 401, 403, 404, 409.

| Area | Endpoints | Access |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` | Login and refresh public; me needs a token |
| Users | `POST /users`, `GET /users`, `PUT /users/:id` | Tutor |
| Classes | `GET /classes`, `GET /classes/:id` | Both roles |
| | `POST /classes`, `PUT /classes/:id`, `DELETE /classes/:id` | Tutor |
| Students | `GET /students`, `GET /students/:id`, `GET /students/:id/ledger`, `POST /students`, `PUT /students/:id` | Both roles (only the Tutor can set status) |
| Enrollments | `GET /enrollments`, `POST /enrollments` | Both roles |
| | `PUT /enrollments/:id` (end or reopen) | Tutor |
| Payments | `GET /payments`, `POST /payments` | Both roles |
| | `PUT /payments/:id/void` | Tutor |
| Waivers | `POST /waivers` | Tutor |
| Health | `GET /health` | Public |

## Project structure

```
src/
  config/        environment variables and database connection
  controllers/   request handling and business rules
  middleware/    authenticate and role checks
  models/        Mongoose schemas and indexes
  routes/        route definitions
  scripts/       seed script for the demo Tutor and Receptionist accounts
  utils/         response helpers, token helpers, month and fee helpers
```



## Not in this version

Attendance marking, a dashboard of collected and outstanding totals, partial payments, fee history (a fee change currently applies to unpaid months too), deactivating or reactivating accounts (the refresh route already refuses a deactivated user, but no endpoint or screen can deactivate one yet), and student or parent login.

## Known limitations

- Tokens are kept in the browser's localStorage, so they could be read by an injected script (XSS).
- The server cannot revoke a refresh token before it expires (there is no token store).
- Changing a password does not sign out sessions that are already open: an access token stays valid until it expires (15 minutes).
- Owed amounts are derived from the enrollment period and the class fee, not stored, so they can change if a fee is edited.
- The backend runs on Render's free tier, which sleeps after about 15 minutes without requests. The first request after a pause can take up to a minute.
