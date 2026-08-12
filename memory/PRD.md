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

## Implemented — Iteration 2 (2026-06-12)
- **Auth (JWT, email+password)**: register/login/me, bcrypt hashing, deterministic email-based brute-force lockout (429 after 5), Bearer token in localStorage. All data endpoints now require auth and are **scoped per user** (`user_id`). Demo account `demo@gezgelir.com` / `demo1234` → Ömer. New users get seeded starter data. Branded Auth screen + logout.
- **Bank accounts (real)**: `/api/bank-accounts` CRUD (add/edit/delete/set-default, first auto-default, safe default reassignment). Managed from Cüzdan bank sheet.
- **Withdrawal lifecycle**: atomic conditional debit (no overdraw), transaction status computed from time — Beklemede→İşleniyor→Tamamlandı. Withdraw sheet lets user pick target account. (Money movement stays DEMO/MOCKED.)
- **Route map**: trips carry `points` (lat/lng); trip-detail sheet shows a Leaflet/OpenStreetMap (CartoDB tiles) green polyline preview. `react-leaflet`.
- **Gamification (server-driven)**: `/api/gamification` → level+progress+next, active multiplier, 3 weekly missions (km/trips/earning) with progress, 6 badges with earned state. UI: Görevler + Rozetler on Kazanç, multiplier banner on Home.
- **Config extended**: multiplier, missions, badges now in `/api/config` (configurable).
- Testing: iteration_2 — backend 39/39 pytest pass; all critical frontend flows pass. Fixed: onboarding-skip tap obstruction, deterministic lockout, atomic withdraw.

## Implemented — Iteration 3 (2026-06-12)
- **Belge Yükleme (Documents)**: Emergent object storage integration. 3 slots (Ehliyet, Araç Ruhsatı, Araç Fotoğrafı); photo/PDF upload from camera/gallery, per-user scoped, authenticated file serving (`/api/documents/{id}/file`). Status: Eksik → İnceleniyor → Onaylandı (demo auto-review ~30s). UI: DocumentsSheet from Profil → Belgelerim (preview thumb, Değiştir, Sil, progress summary).
- **Bildirim Merkezi (Notifications)**: per-user notifications with unread count; bell badge on Home; NotificationSheet with icons + relative time + "Tümünü okundu işaretle". Auto-generated on drive-stop / withdraw / document upload; 4 seeded on register. Bodies use Turkish number formatting.
- Testing: iteration_3 — backend 51/51 pytest pass; all frontend flows pass. Fixed: Turkish locale in notification bodies. (Backend suite: /app/backend/tests/backend_test.py.)

## Implemented — Iteration 4 (2026-06-12)
- **Anlık Bildirim (Web Push, VAPID)**: Service Worker (`/sw.js`) + `pywebpush`. Auto-generated VAPID keys in `db.settings`. Endpoints `/push/public-key` (public), `/push/subscribe` (validated PushKeys), `/push/unsubscribe`, `/push/test`. Push fires best-effort (non-blocking, 10s timeout, dead subs auto-pruned on 404/410) on every notification (drive/withdraw/upload). Toggle in NotificationSheet (enable/disable) with graceful denied/unsupported states.
- **Belge Hatırlatıcı**: Home shows a gentle "n belgen eksik" card (→ opens DocumentsSheet) when any document is Eksik; seeded "Belgelerini tamamla" notification for new users. Card hides once all docs uploaded.
- Testing: iteration_4 — backend **60/60** pytest pass; all frontend flows pass; no functional issues. Applied hardening (nested PushKeys validation → 422, webpush timeout).

## Fixes — Iteration 5 (2026-06-12)
- **Terminoloji**: Tüm kullanıcıya görünen "Hakediş" → "Kazanç" (Bekleyen Kazanç, işlem başlığı "GezGelir Kazanç", bildirim "Kazancın onaylandı"). Mantık: KM → Kazanç → Bakiye → Ödeme.
- **Resmi seviye oranları**: Bronz 0,40 / Gold 0,50 / Platinum 0,60 TL/km. Demo 3,00 TL/km kaldırıldı. TL/km her yerde kullanıcının mevcut seviyesinden gelir (`/config` levels + `/earnings/summary` level+rate + `/driver/me` membership.level). Kazanç ekranında seviye kartı + Bronz→Gold→Platinum ilerleme şeridi; Profil rozetinde "Bronz · ₺0,40/km". Örnek kazançlar matematiksel olarak orana uygun (earning=eligible×rate). Seviye eşikleri (min_km) yalnızca backend config'te (uydurulmadı, sonra yönetilecek). Startup migration eski config'i otomatik yamalar.
- **Logo düzeltmesi**: Wordmark/LogoFull `object-fit:contain`, `maxWidth:100%`, block; marka görselleri şeffaf padding ile yeniden üretildi — hiçbir ekranda kırpılma/stretch yok, aspect ratio korunur.
- Testing: iteration_5 — backend **77/77** pytest pass; frontend tüm 3 düzeltme her ekranda doğrulandı; sorun yok.

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
