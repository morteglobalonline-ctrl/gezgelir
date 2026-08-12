# Test Credentials — GezGelir Driver App

## Authentication (JWT, email + password)
Bearer token returned by `/api/auth/login` and `/api/auth/register`, stored in localStorage (`gg_token`).
Frontend sends `Authorization: Bearer <token>`.

### Demo account (seeded on startup, idempotent)
- Email: `demo@gezgelir.com`
- Password: `demo1234`
- Maps to demo driver **Ömer Yılmaz** with rich seeded data (14 trips, 6 transactions, 1 bank account).

New registrations get their own scoped data + a starter set of demo trips/transactions/bank account.

## Auth endpoints
- POST `/api/auth/register` { email, password, first_name, last_name }
- POST `/api/auth/login` { email, password }
- GET  `/api/auth/me` (Bearer)

## Config / URLs
- Frontend: `REACT_APP_BACKEND_URL` (in `/app/frontend/.env`), all endpoints under `/api`.
- Backend: `MONGO_URL`, `DB_NAME=gezgelir`, `JWT_SECRET`, `DEMO_EMAIL`, `DEMO_PASSWORD` (in `/app/backend/.env`).

## Dev bypass
- Append `?skip=1` to any route to skip splash + onboarding (still requires login).
  For deep-screen tests: log in (or use demo) first, then navigate with `?skip=1`.
