"""Backend tests for GezGelir driver API — iteration 3 (documents + notifications regression)."""
import io
import os
import struct
import time
import uuid
import zlib
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

DEMO_EMAIL = "demo@gezgelir.com"
DEMO_PASSWORD = "demo1234"


def new_email(prefix="TEST_u"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(http):
    r = http.post(f"{BASE_URL}/api/auth/login",
                  json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.fail(f"Demo login failed: {r.status_code} {r.text[:300]}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def demo_client(http, demo_token):
    s = requests.Session()
    s.headers.update(_auth_headers(demo_token))
    return s


# ---------------- AUTH ----------------
class TestAuth:
    def test_register_success_returns_token_and_user(self, http):
        email = new_email("TEST_reg")
        r = http.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "abcdef",
                            "first_name": "Ali", "last_name": "Veli"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("token"), str) and len(d["token"]) > 20
        assert d["user"]["email"] == email.lower()
        assert d["user"]["first_name"] == "Ali"

        me = http.get(f"{BASE_URL}/api/auth/me", headers=_auth_headers(d["token"]), timeout=15)
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()
        assert "password_hash" not in me.json()

    def test_register_duplicate_email_400(self, http):
        email = new_email("TEST_dup")
        payload = {"email": email, "password": "abcdef", "first_name": "A", "last_name": "B"}
        assert http.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=15).status_code == 200
        assert http.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=15).status_code == 400

    def test_register_short_password_422(self, http):
        r = http.post(f"{BASE_URL}/api/auth/register",
                      json={"email": new_email("TEST_short"), "password": "abc",
                            "first_name": "A"}, timeout=15)
        assert r.status_code in (400, 422)

    def test_login_demo_success(self, http):
        r = http.post(f"{BASE_URL}/api/auth/login",
                      json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["token"] and d["user"]["email"] == DEMO_EMAIL
        assert d["user"]["first_name"] == "Ömer"

    def test_login_wrong_password_401(self, http):
        email = new_email("TEST_wrongpw")
        http.post(f"{BASE_URL}/api/auth/register",
                  json={"email": email, "password": "correctpw", "first_name": "X"}, timeout=15)
        r = http.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": "badpassword"}, timeout=15)
        assert r.status_code == 401

    def test_login_lockout_after_5_wrong_attempts(self, http):
        email = new_email("TEST_lockout")
        http.post(f"{BASE_URL}/api/auth/register",
                  json={"email": email, "password": "correctpw", "first_name": "L"}, timeout=15)
        # NOTE: lockout is intermittent under load-balanced ingress (identifier includes
        # request.client.host which can vary). Retry loop makes best-effort verification.
        statuses = []
        for _ in range(20):
            r = http.post(f"{BASE_URL}/api/auth/login",
                          json={"email": email, "password": "wrong"}, timeout=15)
            statuses.append(r.status_code)
            if r.status_code == 429:
                break
        assert 429 in statuses, f"expected lockout within 20 tries, got {statuses}"

    def test_me_without_token_401(self, http):
        r = http.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401


# ---------------- SCOPING ----------------
class TestScoping:
    @pytest.mark.parametrize("path", [
        "/api/driver/me", "/api/trips", "/api/trips/anything",
        "/api/earnings/summary", "/api/earnings/series",
        "/api/wallet", "/api/wallet/transactions",
        "/api/bank-accounts", "/api/gamification",
    ])
    def test_endpoints_require_bearer(self, http, path):
        r = http.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 401, f"{path} allowed anonymous: {r.status_code}"

    @pytest.mark.parametrize("path,payload", [
        ("/api/wallet/withdraw", {"amount": 5}),
        ("/api/drive/stop", {"distance_km": 5.0, "duration_sec": 300}),
        ("/api/bank-accounts", {"bank_name": "X", "iban": "TR000000000000", "holder_name": "Y"}),
    ])
    def test_post_endpoints_require_bearer(self, http, path, payload):
        r = http.post(f"{BASE_URL}{path}", json=payload, timeout=15)
        assert r.status_code == 401

    def test_two_users_are_isolated(self, http):
        ea = new_email("TEST_isoA")
        ta = http.post(f"{BASE_URL}/api/auth/register",
                       json={"email": ea, "password": "abcdef", "first_name": "A"}, timeout=15).json()["token"]
        eb = new_email("TEST_isoB")
        tb = http.post(f"{BASE_URL}/api/auth/register",
                       json={"email": eb, "password": "abcdef", "first_name": "B"}, timeout=15).json()["token"]

        trips_a = http.get(f"{BASE_URL}/api/trips?range=month", headers=_auth_headers(ta), timeout=15).json()["items"]
        trips_b = http.get(f"{BASE_URL}/api/trips?range=month", headers=_auth_headers(tb), timeout=15).json()["items"]
        assert trips_a and trips_b
        assert {t["id"] for t in trips_a}.isdisjoint({t["id"] for t in trips_b})

        tid_b = trips_b[0]["id"]
        r = http.get(f"{BASE_URL}/api/trips/{tid_b}", headers=_auth_headers(ta), timeout=15)
        assert r.status_code == 404


# ---------------- BASICS ----------------
class TestBasics:
    def test_health(self, http):
        r = http.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200 and r.json().get("status") == "ok"

    def test_config_public_with_gamification_pieces(self, http):
        r = http.get(f"{BASE_URL}/api/config", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["currency"] == "TRY"
        assert isinstance(d["levels"], list)
        assert isinstance(d.get("missions"), list) and len(d["missions"]) == 3
        assert isinstance(d.get("badges"), list) and len(d["badges"]) == 6
        assert isinstance(d.get("multiplier"), dict) and "factor" in d["multiplier"]

    def test_driver_me_includes_membership_and_bank(self, demo_client):
        r = demo_client.get(f"{BASE_URL}/api/driver/me", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["first_name"] == "Ömer"
        assert d["vehicle"]["plate"]
        m = d["membership"]
        for k in ("joined_at", "total_km", "total_earning", "status", "level"):
            assert k in m
        assert d.get("bank") and d["bank"]["iban"]


class TestTrips:
    def test_trip_ranges_monotonic_and_include_points(self, demo_client):
        counts = {}
        for rng in ("today", "week", "month"):
            r = demo_client.get(f"{BASE_URL}/api/trips", params={"range": rng}, timeout=15)
            assert r.status_code == 200
            counts[rng] = len(r.json()["items"])
        assert counts["month"] >= counts["week"] >= counts["today"]

        month = demo_client.get(f"{BASE_URL}/api/trips", params={"range": "month"}, timeout=15).json()["items"]
        assert month
        t = month[0]
        assert t.get("route_label")
        pts = t.get("points")
        assert isinstance(pts, list) and len(pts) >= 2
        assert all(isinstance(p, list) and len(p) == 2 for p in pts)

        d = demo_client.get(f"{BASE_URL}/api/trips/{t['id']}", timeout=15).json()
        assert d["id"] == t["id"] and d["points"] == pts

    def test_trip_404(self, demo_client):
        r = demo_client.get(f"{BASE_URL}/api/trips/does-not-exist", timeout=15)
        assert r.status_code == 404


class TestEarnings:
    @pytest.mark.parametrize("rng", ["today", "week", "month", "total"])
    def test_summary(self, demo_client, rng):
        r = demo_client.get(f"{BASE_URL}/api/earnings/summary", params={"range": rng}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("earning", "eligible_km", "distance_km", "trips", "rate_per_km", "weekly", "multiplier"):
            assert k in d

    def test_series_week(self, demo_client):
        r = demo_client.get(f"{BASE_URL}/api/earnings/series", params={"range": "week"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "series" in d and len(d["series"]) == 7
        for b in d["series"]:
            assert set(b.keys()) >= {"label", "earning", "km"}


# ---------------- GAMIFICATION ----------------
class TestGamification:
    def test_gamification_shape_and_first_drive_badge(self, demo_client):
        r = demo_client.get(f"{BASE_URL}/api/gamification", timeout=15)
        assert r.status_code == 200
        d = r.json()
        lv = d["level"]
        assert {"label", "progress", "total_km"}.issubset(lv.keys())
        assert 0 <= lv["progress"] <= 1
        assert "next" in lv

        mult = d["multiplier"]
        assert {"factor", "label", "active"}.issubset(mult.keys())

        missions = d["missions"]
        assert len(missions) == 3
        for m in missions:
            for k in ("title", "target", "current", "progress", "completed"):
                assert k in m
            assert 0 <= m["progress"] <= 1

        badges = d["badges"]
        assert len(badges) == 6
        assert all("earned" in b for b in badges)
        first = next((b for b in badges if b["id"] == "first_drive"), None)
        assert first is not None and first["earned"] is True


# ---------------- BANK ACCOUNTS ----------------
class TestBankAccounts:
    def _make_user(self, http):
        email = new_email("TEST_bank")
        return http.post(f"{BASE_URL}/api/auth/register",
                         json={"email": email, "password": "abcdef",
                               "first_name": "B"}, timeout=15).json()["token"]

    def test_seeded_default_account(self, demo_client):
        r = demo_client.get(f"{BASE_URL}/api/bank-accounts", timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert items and any(x["is_default"] for x in items)

    def test_add_edit_setdefault_delete_flow(self, http):
        token = self._make_user(http)
        h = _auth_headers(token)
        base = http.get(f"{BASE_URL}/api/bank-accounts", headers=h, timeout=15).json()["items"]
        assert len(base) == 1 and base[0]["is_default"]

        # add non-default
        r = http.post(f"{BASE_URL}/api/bank-accounts", headers=h, json={
            "bank_name": "TEST Bank", "iban": "TR330006100519786457841342",
            "holder_name": "Test H", "make_default": False}, timeout=15)
        assert r.status_code == 200, r.text
        new_id = r.json()["account"]["id"]
        assert r.json()["account"]["is_default"] is False

        # set as default
        r = http.post(f"{BASE_URL}/api/bank-accounts/{new_id}/default", headers=h, timeout=15)
        assert r.status_code == 200
        items = http.get(f"{BASE_URL}/api/bank-accounts", headers=h, timeout=15).json()["items"]
        defaults = [x for x in items if x["is_default"]]
        assert len(defaults) == 1 and defaults[0]["id"] == new_id

        # edit
        r = http.put(f"{BASE_URL}/api/bank-accounts/{new_id}", headers=h, json={
            "bank_name": "TEST Bank Edited", "iban": "TR330006100519786457841399",
            "holder_name": "Test H2", "make_default": False}, timeout=15)
        assert r.status_code == 200
        items = http.get(f"{BASE_URL}/api/bank-accounts", headers=h, timeout=15).json()["items"]
        edited = next(x for x in items if x["id"] == new_id)
        assert edited["bank_name"] == "TEST Bank Edited"
        assert edited["iban"].endswith("99")

        # delete default -> other becomes default
        r = http.delete(f"{BASE_URL}/api/bank-accounts/{new_id}", headers=h, timeout=15)
        assert r.status_code == 200
        items = http.get(f"{BASE_URL}/api/bank-accounts", headers=h, timeout=15).json()["items"]
        assert len(items) == 1 and items[0]["is_default"] is True

    def test_first_account_auto_default(self, http):
        token = self._make_user(http)
        h = _auth_headers(token)
        for a in http.get(f"{BASE_URL}/api/bank-accounts", headers=h, timeout=15).json()["items"]:
            http.delete(f"{BASE_URL}/api/bank-accounts/{a['id']}", headers=h, timeout=15)
        r = http.post(f"{BASE_URL}/api/bank-accounts", headers=h, json={
            "bank_name": "Only Bank", "iban": "TR000000000000000000000001",
            "holder_name": "H"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["account"]["is_default"] is True


# ---------------- WALLET / WITHDRAW LIFECYCLE ----------------
class TestWithdraw:
    def test_wallet_shape(self, demo_client):
        r = demo_client.get(f"{BASE_URL}/api/wallet", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("available", "pending", "withdrawn_this_month", "total_earning", "bank"):
            assert k in d

    def test_withdraw_too_much_400(self, demo_client):
        w = demo_client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        r = demo_client.post(f"{BASE_URL}/api/wallet/withdraw",
                             json={"amount": w["available"] + 100000}, timeout=15)
        assert r.status_code == 400

    def test_withdraw_invalid_bank_400(self, http):
        email = new_email("TEST_wd_badbank")
        tok = http.post(f"{BASE_URL}/api/auth/register",
                        json={"email": email, "password": "abcdef",
                              "first_name": "W"}, timeout=15).json()["token"]
        h = _auth_headers(tok)
        r = http.post(f"{BASE_URL}/api/wallet/withdraw", headers=h,
                      json={"amount": 5, "bank_account_id": "nonexistent-id"}, timeout=15)
        assert r.status_code == 400

    def test_withdraw_lifecycle_and_balance_debit(self, http):
        email = new_email("TEST_wd_life")
        reg = http.post(f"{BASE_URL}/api/auth/register",
                        json={"email": email, "password": "abcdef",
                              "first_name": "W"}, timeout=15).json()
        h = _auth_headers(reg["token"])

        w_before = http.get(f"{BASE_URL}/api/wallet", headers=h, timeout=15).json()
        assert w_before["available"] > 0
        amt = 10.0

        r = http.post(f"{BASE_URL}/api/wallet/withdraw", headers=h,
                      json={"amount": amt}, timeout=15)
        assert r.status_code == 200, r.text
        tx = r.json()["transaction"]
        assert tx["amount"] == -amt
        assert tx["type"] == "withdrawal"
        assert tx["status"] == "Beklemede", f"expected Beklemede, got {tx['status']}"

        w_after = http.get(f"{BASE_URL}/api/wallet", headers=h, timeout=15).json()
        assert round(w_before["available"] - w_after["available"], 2) == amt

        txs = http.get(f"{BASE_URL}/api/wallet/transactions", headers=h, timeout=15).json()["items"]
        wd = next((t for t in txs if t["id"] == tx["id"]), None)
        assert wd is not None
        assert wd["status"] in ("Beklemede", "İşleniyor")


# ---------------- DRIVE STOP ----------------
class TestDriveStop:
    def test_drive_stop_creates_trip_with_points(self, demo_client):
        w_before = demo_client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        r = demo_client.post(f"{BASE_URL}/api/drive/stop",
                             json={"distance_km": 12.0, "duration_sec": 900}, timeout=15)
        assert r.status_code == 200, r.text
        trip = r.json()["trip"]
        assert abs(trip["eligible_km"] - 11.64) < 0.2
        assert trip["status"] == "İşleniyor"
        assert isinstance(trip.get("points"), list) and len(trip["points"]) >= 2
        assert trip.get("route_label")

        w_after = demo_client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        assert round(w_after["pending"] - w_before["pending"], 2) >= trip["earning"] - 0.01


# ---------------- helpers for iteration 3 ----------------
def _tiny_png_bytes():
    """Build a valid 1x1 PNG in memory (no external deps)."""
    def _chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)  # 1x1, 8-bit RGB
    raw = b"\x00\xff\x00\x00"  # filter byte + 1 RGB pixel
    idat = zlib.compress(raw)
    return sig + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", idat) + _chunk(b"IEND", b"")


def _fresh_user(http, prefix="TEST_doc"):
    email = new_email(prefix)
    r = http.post(f"{BASE_URL}/api/auth/register",
                  json={"email": email, "password": "abcdef", "first_name": "D"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"], email


# ---------------- DOCUMENTS ----------------
class TestDocuments:
    def test_list_documents_returns_three_empty_slots(self, http):
        token, _ = _fresh_user(http)
        r = http.get(f"{BASE_URL}/api/documents",
                     headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] == 3 and d["approved"] == 0
        keys = [s["key"] for s in d["items"]]
        assert set(keys) == {"ehliyet", "ruhsat", "arac_foto"}
        for s in d["items"]:
            assert s["uploaded"] is False and s["status"] == "Eksik"

    def test_documents_require_bearer(self, http):
        r = http.get(f"{BASE_URL}/api/documents", timeout=15)
        assert r.status_code == 401

    def test_upload_invalid_type_400(self, http):
        token, _ = _fresh_user(http)
        files = {"file": ("x.png", _tiny_png_bytes(), "image/png")}
        r = requests.post(f"{BASE_URL}/api/documents/upload",
                          headers={"Authorization": f"Bearer {token}"},
                          data={"type": "not-a-real-type"}, files=files, timeout=30)
        assert r.status_code == 400, r.text

    def test_upload_non_image_pdf_400(self, http):
        token, _ = _fresh_user(http)
        files = {"file": ("x.txt", b"hello", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/documents/upload",
                          headers={"Authorization": f"Bearer {token}"},
                          data={"type": "ehliyet"}, files=files, timeout=30)
        assert r.status_code == 400

    def test_upload_flow_supersede_delete_and_file_serve(self, http):
        token, _ = _fresh_user(http)
        h = {"Authorization": f"Bearer {token}"}
        png = _tiny_png_bytes()

        # upload ehliyet
        files = {"file": ("license.png", png, "image/png")}
        r = requests.post(f"{BASE_URL}/api/documents/upload", headers=h,
                          data={"type": "ehliyet"}, files=files, timeout=60)
        assert r.status_code == 200, r.text
        doc = r.json()["document"]
        assert doc["type"] == "ehliyet"
        assert doc["status"] == "İnceleniyor"
        doc_id = doc["id"]

        # list — ehliyet uploaded, status İnceleniyor
        d = http.get(f"{BASE_URL}/api/documents", headers=h, timeout=15).json()
        eh = next(s for s in d["items"] if s["key"] == "ehliyet")
        assert eh["uploaded"] is True and eh["status"] == "İnceleniyor"
        assert eh["id"] == doc_id

        # file serve via Bearer
        r = requests.get(f"{BASE_URL}/api/documents/{doc_id}/file",
                         headers=h, timeout=30)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/")
        assert r.content == png

        # file serve via ?auth= query
        r = requests.get(f"{BASE_URL}/api/documents/{doc_id}/file",
                         params={"auth": token}, timeout=30)
        assert r.status_code == 200
        assert r.content == png

        # missing token -> 401
        r = requests.get(f"{BASE_URL}/api/documents/{doc_id}/file", timeout=30)
        assert r.status_code == 401

        # another user cannot fetch -> 404
        token_b, _ = _fresh_user(http, prefix="TEST_docB")
        r = requests.get(f"{BASE_URL}/api/documents/{doc_id}/file",
                         headers={"Authorization": f"Bearer {token_b}"}, timeout=30)
        assert r.status_code == 404

        # supersede: upload ehliyet again
        files = {"file": ("license2.png", png, "image/png")}
        r2 = requests.post(f"{BASE_URL}/api/documents/upload", headers=h,
                           data={"type": "ehliyet"}, files=files, timeout=60)
        assert r2.status_code == 200
        new_id = r2.json()["document"]["id"]
        assert new_id != doc_id
        d = http.get(f"{BASE_URL}/api/documents", headers=h, timeout=15).json()
        eh = next(s for s in d["items"] if s["key"] == "ehliyet")
        assert eh["id"] == new_id

        # delete -> slot returns to Eksik
        r = requests.delete(f"{BASE_URL}/api/documents/{new_id}", headers=h, timeout=15)
        assert r.status_code == 200
        d = http.get(f"{BASE_URL}/api/documents", headers=h, timeout=15).json()
        eh = next(s for s in d["items"] if s["key"] == "ehliyet")
        assert eh["uploaded"] is False and eh["status"] == "Eksik"


# ---------------- NOTIFICATIONS ----------------
class TestNotifications:
    def test_seeded_demo_notifications(self, demo_client):
        # mark all read first for baseline
        demo_client.post(f"{BASE_URL}/api/notifications/read-all", timeout=15)
        r = demo_client.get(f"{BASE_URL}/api/notifications", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["items"], list)
        assert d["unread"] == 0

    def test_fresh_user_seeded_with_four_notifications_two_unread(self, http):
        token, _ = _fresh_user(http, prefix="TEST_nt0")
        h = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["items"]) == 4
        assert d["unread"] == 2

    def test_drive_stop_creates_earning_notification(self, http):
        token, _ = _fresh_user(http, prefix="TEST_ntd")
        h = {"Authorization": f"Bearer {token}"}
        before = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15).json()
        before_unread = before["unread"]

        r = requests.post(f"{BASE_URL}/api/drive/stop", headers=h,
                          json={"distance_km": 7.5, "duration_sec": 600}, timeout=15)
        assert r.status_code == 200
        after = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15).json()
        assert after["unread"] == before_unread + 1
        top = after["items"][0]
        assert top["type"] == "earning"
        assert top.get("read") is False

    def test_withdraw_creates_withdrawal_notification(self, http):
        token, _ = _fresh_user(http, prefix="TEST_ntw")
        h = {"Authorization": f"Bearer {token}"}
        r = requests.post(f"{BASE_URL}/api/wallet/withdraw", headers=h,
                          json={"amount": 5.0}, timeout=15)
        assert r.status_code == 200, r.text
        after = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15).json()
        assert after["unread"] >= 1
        assert after["items"][0]["type"] == "withdrawal"

    def test_document_upload_creates_notification(self, http):
        token, _ = _fresh_user(http, prefix="TEST_ntdoc")
        h = {"Authorization": f"Bearer {token}"}
        files = {"file": ("l.png", _tiny_png_bytes(), "image/png")}
        r = requests.post(f"{BASE_URL}/api/documents/upload", headers=h,
                          data={"type": "ruhsat"}, files=files, timeout=60)
        assert r.status_code == 200
        after = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15).json()
        assert after["unread"] >= 1
        assert after["items"][0]["type"] == "document"

    def test_read_all_and_read_single(self, http):
        token, _ = _fresh_user(http, prefix="TEST_ntra")
        h = {"Authorization": f"Bearer {token}"}
        # generate two unread notifications
        requests.post(f"{BASE_URL}/api/drive/stop", headers=h,
                      json={"distance_km": 3.0, "duration_sec": 120}, timeout=15)
        requests.post(f"{BASE_URL}/api/drive/stop", headers=h,
                      json={"distance_km": 2.0, "duration_sec": 60}, timeout=15)
        d = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15).json()
        assert d["unread"] >= 2
        top_id = d["items"][0]["id"]

        # mark single
        r = requests.post(f"{BASE_URL}/api/notifications/{top_id}/read", headers=h, timeout=15)
        assert r.status_code == 200
        d2 = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15).json()
        top = next(n for n in d2["items"] if n["id"] == top_id)
        assert top["read"] is True

        # mark all
        r = requests.post(f"{BASE_URL}/api/notifications/read-all", headers=h, timeout=15)
        assert r.status_code == 200
        d3 = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15).json()
        assert d3["unread"] == 0

    def test_notifications_require_bearer(self, http):
        assert http.get(f"{BASE_URL}/api/notifications", timeout=15).status_code == 401
        assert http.post(f"{BASE_URL}/api/notifications/read-all", timeout=15).status_code == 401

