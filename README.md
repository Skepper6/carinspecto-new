# Car InspectO

- `frontend/`  React (Vite) app – customer, inspector and admin portals.
- `backend/`   Express + MongoDB API. All data, logins, payment checks and permissions live here.

## Run it

```bash
# 1. backend  (http://localhost:5000)
cd backend
cp .env.example .env        # then fill in JWT_SECRET (and MONGODB_URI for the live Atlas database, see below)
npm install
npm run seed                # loads the demo data into your LOCAL MongoDB (wipes the app collections first; refuses to run in production)
npm run dev

# 2. frontend (http://localhost:5173)
cd frontend
cp .env.example .env        # optional: VITE_GOOGLE_CLIENT_ID, VITE_STRIPE_PUBLISHABLE_KEY
npm install
npm run dev
```

Demo logins (after `npm run seed`): `omar@example.com` / `demo123` (customer), `khalid@carinspecto.com` / `demo123` (inspector), `admin@carinspecto.com` / `admin123`.
The seed is for development: **change or remove these accounts before going live** – their passwords are public.

## Backend configuration (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | **Live** MongoDB Atlas connection string (keep `/carinspecto` as the database name). Only used when `NODE_ENV=production` |
| `MONGODB_URI_LOCAL` | Optional. Database used on your own computer. Default: local MongoDB `mongodb://127.0.0.1:27017/carinspecto_dev`. Never shares data with the live database |
| `JWT_SECRET` | 32+ random characters – signs login tokens. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_ORIGIN` | Allowed website origin(s), comma separated |
| `CLIENT_URL` | Public address of the website, used in email links (defaults to the first `CLIENT_ORIGIN`) |
| `GOOGLE_CLIENT_ID` | Enables "Continue with Google" (same ID as `VITE_GOOGLE_CLIENT_ID`) |
| `STRIPE_SECRET_KEY` | Enables real card payments. Without it the app runs in demo-payment mode |
| `STRIPE_WEBHOOK_SECRET` | Enables the Stripe webhook (`POST /api/payments/webhook`: refunds made in Stripe show on the booking; a payment with no booking alerts the admins) |
| `DO_SPACES_BUCKET`, `_REGION`, `_ENDPOINT`, `_KEY`, `_SECRET` | DigitalOcean Spaces (private) for inspection photos and attachments. Empty = stored in MongoDB. Move existing data with `npm run migrate:photos` |
| `RESEND_API_KEY`, `MAIL_FROM` | Email through [Resend](https://resend.com) (password reset, email verification, booking / report / support notifications). `MAIL_FROM` must be an address on a domain verified in Resend. Empty = nothing is sent; in development the email, including its link, is printed in the backend terminal |

## How it works

- Login returns a token that the browser keeps per tab (`sessionStorage`), so customer, inspector and admin can be open side by side. Changing or resetting a password signs out every other session.
- The browser only receives the data its role may see (`GET /api/bootstrap`); every change goes through a validated endpoint. Prices, promo codes, payment status and permissions are always decided on the server.
- With Stripe configured, a booking only counts as paid after the server confirms the PaymentIntent with Stripe, and cancelling a paid booking issues the refund.
- Inspection photos are loaded on demand (`GET /api/inspections/:id`) so lists stay light.
- Password rules: 8+ characters. Reset and verification links are one-time, stored only as hashes, and expire (1 h / 24 h). "Forgot password" answers the same for unknown emails.
- Sign-up requires accepting the Terms and Privacy Policy (pages `/terms` and `/privacy`, text editable by the admin under Content & plans).

## Checks

```bash
cd backend && npm run smoke     # 112 API checks (permissions, booking lifecycle, tickets, files, passwords, sessions…) against a running, freshly seeded server
```

## Before going live

- Replace the demo accounts, restrict the Atlas IP access list, and use a fresh `JWT_SECRET`.
- In the Stripe dashboard add the webhook endpoint (events `charge.refunded`, `payment_intent.succeeded`) and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
- Verify your sending domain in Resend and set `RESEND_API_KEY` / `MAIL_FROM`, `CLIENT_URL`, and `NODE_ENV=production`.
- Run the backend on Node 22 or newer (the AWS storage library requires it from January 2027).
