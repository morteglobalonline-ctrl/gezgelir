# Test Credentials — GezGelir Driver App

## Authentication
This iteration has **NO login/authentication**. A demo driver is auto-seeded and loaded on app start.

- Demo driver: **Ömer Yılmaz** (id: `me`)
- Vehicle: Volkswagen Passat · plate `34 GEZ 027` · Uygun
- Data is seeded automatically by backend `seed()` on startup (config, driver, 14 trips, 6 transactions).

## URLs / Config
- Frontend calls backend via `REACT_APP_BACKEND_URL` (in `/app/frontend/.env`), all endpoints prefixed with `/api`.
- MongoDB: `MONGO_URL` + `DB_NAME=gezgelir` (in `/app/backend/.env`).

## Dev bypass
- Append `?skip=1` to any route to skip splash + onboarding and land directly in the app (e.g. `/kazanc?skip=1`).
