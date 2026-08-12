# GezGelir — Driver / Vehicle-Owner App (PRD)

## Problem Statement (original)
First production-quality mobile app for **GezGelir**, a Turkish mobility-based earning platform.
This is **Platform A — the Driver / Vehicle Owner app only**. NOT the advertiser platform (B) and
NOT the internal device/LED-control operations platform (C).
Drivers earn money based on **eligible/verified kilometers driven**.
Emotional promise: **Hareket Et, Kazan.** Core loop: Join → approved → drive → accumulate eligible km → earn → withdraw.

## Architecture
- Frontend: React (CRA) + Tailwind + framer-motion + lucide-react. Mobile-first, centered ~460px app-shell.
- Backend: FastAPI + MongoDB (motor). All routes under `/api`.
- Brand assets cropped faithfully from the supplied identity image (no redraw): `frontend/src/assets/brand/{mascot,wordmark,logo_full,app_icon}.png`.
- Design system centralized in `tailwind.config.js` + `src/index.css` (GezGelir Green #00C27A, Charcoal #1A1F23, Gold #FFC14D, Mint #E6F7F0, White). Light-first. Fonts: Sora (display) + Manrope (body).
- Business rules are **configurable** via `/api/config` (rate_per_km, eligible_ratio, weekly_goal_km, weekly_goal_bonus, payout_min, levels).

## Personas
- Ömer — a vehicle owner/driver who wants his existing movement to earn money simply and trustworthily.

## Implemented (2026-06-12)
- Branded splash (~1.4s) + 3-step onboarding (first run only, localStorage `gg_onboarded`).
- 5-tab bottom nav: Ana Sayfa · Sürüşler · Kazanç (emphasized center) · Cüzdan · Profil.
- **Home**: greeting, charcoal earnings hero (animated ₺), "Sürüşe Başla", 4 quick metrics, weekly goal progress, recent trip.
- **Sürüşler**: dark summary card, 7-day bar chart, range tabs (Bugün/Hafta/Ay), grouped trip list, trip detail bottom sheet.
- **Kazanç**: range filters (Bugün/Hafta/Ay/Toplam), animated hero, metrics, weekly bar chart, weekly goal+bonus, driver level card.
- **Cüzdan**: available balance hero, "Paranı Çek" withdraw sheet (demo/MOCKED), mini stats, bank card, transaction history.
- **Profil**: identity, dark membership summary (join date/total km/total earning/level), vehicle card, settings menu, brand footer.
- **Live drive session** (`/surus`): immersive dark screen with live km/earning/timer + animated road; finish posts to backend → success overlay.
- Backend endpoints: config, driver/me, trips (+detail), earnings/summary, earnings/series, wallet, wallet/transactions, drive/stop, wallet/withdraw. Auto-seed demo data on startup.
- Testing: iteration_1 — backend 15/15 pytest pass, frontend 100% flows pass.

## MOCKED / Demo
- Wallet withdrawal & drive-stop update MongoDB state but there is **NO real bank/payment processing**. Balances/transactions are illustrative.
- No authentication in this iteration; demo driver auto-loads.

## Dev note
- `?skip=1` query param bypasses splash+onboarding to land directly in the app (useful for QA/screenshots). Harmless in prod.

## Backlog (next)
- P1: Real onboarding/KYC + auth (JWT or Emergent Google) and per-driver data.
- P1: Real bank account management (Banka Hesaplarım / IBAN add-edit) + real payout provider.
- P2: Notifications center, documents (Belgelerim) upload, security settings.
- P2: Milestones/challenges/earning multipliers driven by config; monthly series charts.
- P2: Trip route map preview in detail sheet.
