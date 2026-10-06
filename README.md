# Car InspectO

- frontend/  React (Vite) app – `npm install && npm run dev` (http://localhost:5173)
- backend/   Express API – `npm install && npm run dev` (http://localhost:5000). Currently: Stripe PaymentIntents (AED).

Demo logins (mock data in localStorage): omar@example.com / demo123 (customer), khalid@carinspecto.com / demo123 (inspector), admin@carinspecto.com / admin123.

Stripe: put sk_test_... in backend/.env (STRIPE_SECRET_KEY) and pk_test_... in frontend/.env (VITE_STRIPE_PUBLISHABLE_KEY). Apple Pay needs your domain verified in the Stripe dashboard.

## Shared demo data (so every browser / device sees the same tickets & messages)
Run the API next to the frontend: `cd backend && npm install && npm run dev` (http://localhost:5000). The app then syncs data and
attachments through it automatically. Without the API the app still works, but data stays inside each browser.
