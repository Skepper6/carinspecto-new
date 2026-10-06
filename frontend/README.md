# Car InspectO – Frontend

```
npm install
npm run dev   # http://localhost:5173
```

Demo logins (mock mode, data in localStorage; reset from Admin > Content & plans):
- Customer: aarav@example.com / demo123
- Inspector: rohan@carinspecto.com / demo123
- Admin: admin@carinspecto.com / admin123

Firebase Auth: copy .env.example to .env and fill VITE_FIREBASE_*.
All data access is in src/lib/db.js (one function per future Express endpoint).
