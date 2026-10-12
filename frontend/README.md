# Car InspectO – Frontend

```
npm install
npm run dev   # http://localhost:5173  (needs the backend running – see ../README.md)
```

Copy `.env.example` to `.env` for the optional settings (`VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`).

- `src/lib/api.js` – API client and the per-tab login session.
- `src/lib/db.js` – the data layer: `useDB(selector)` reads, the exported functions (`createBooking`, `assignInspector`, …) write through the API.
- `src/services/auth.js` – sign in / sign up / Google sign-in.

Demo logins come from the backend seed (`npm run seed` in `../backend`) and are shown on the sign-in page in development only.
