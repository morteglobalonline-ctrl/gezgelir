"""Backend tests for GezGelir driver API."""
import os
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- health/config/driver ----
class TestBasics:
    def test_health(self, client):
        r = client.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_config(self, client):
        r = client.get(f"{BASE_URL}/api/config", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["currency"] == "TRY"
        assert isinstance(d["rate_per_km"], (int, float))
        assert isinstance(d["weekly_goal_km"], (int, float))
        assert isinstance(d["weekly_goal_bonus"], (int, float))
        assert isinstance(d["levels"], list) and len(d["levels"]) >= 1

    def test_driver_me(self, client):
        r = client.get(f"{BASE_URL}/api/driver/me", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["first_name"] == "Ömer"
        assert "vehicle" in d and d["vehicle"]["plate"]
        assert "eligibility" in d["vehicle"]
        assert "bank" in d
        m = d["membership"]
        for k in ("joined_at", "total_km", "total_earning", "status", "level"):
            assert k in m


# ---- trips ----
class TestTrips:
    def test_trips_ranges_monotonic(self, client):
        counts = {}
        for rng in ("today", "week", "month"):
            r = client.get(f"{BASE_URL}/api/trips", params={"range": rng}, timeout=15)
            assert r.status_code == 200
            data = r.json()
            assert "summary" in data and "items" in data
            for k in ("distance_km", "eligible_km", "earning", "trips"):
                assert k in data["summary"]
            counts[rng] = len(data["items"])
        assert counts["month"] >= counts["week"] >= counts["today"]

    def test_trip_detail_and_404(self, client):
        r = client.get(f"{BASE_URL}/api/trips", params={"range": "month"}, timeout=15)
        items = r.json()["items"]
        assert items, "expected seeded trips"
        tid = items[0]["id"]
        r = client.get(f"{BASE_URL}/api/trips/{tid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == tid
        r = client.get(f"{BASE_URL}/api/trips/does-not-exist", timeout=15)
        assert r.status_code == 404


# ---- earnings ----
class TestEarnings:
    @pytest.mark.parametrize("rng", ["today", "week", "month", "total"])
    def test_summary(self, client, rng):
        r = client.get(f"{BASE_URL}/api/earnings/summary", params={"range": rng}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("earning", "eligible_km", "distance_km", "trips", "rate_per_km", "weekly"):
            assert k in d
        w = d["weekly"]
        for k in ("goal_km", "current_km", "remaining_km", "progress", "bonus"):
            assert k in w

    def test_series_week_not_500(self, client):
        # Previously bugged: 'range' shadowed Python range()
        r = client.get(f"{BASE_URL}/api/earnings/series", params={"range": "week"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "series" in d and len(d["series"]) == 7
        for b in d["series"]:
            assert set(b.keys()) >= {"label", "earning", "km"}


# ---- wallet ----
class TestWallet:
    def test_wallet(self, client):
        r = client.get(f"{BASE_URL}/api/wallet", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("available", "pending", "withdrawn_this_month", "total_earning", "bank"):
            assert k in d

    def test_transactions(self, client):
        r = client.get(f"{BASE_URL}/api/wallet/transactions", timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert items
        types = {t["type"] for t in items}
        assert types & {"earning", "withdrawal", "bonus"}
        for t in items:
            if t["type"] == "withdrawal":
                assert t["amount"] < 0

    def test_withdraw_too_much(self, client):
        w = client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        r = client.post(f"{BASE_URL}/api/wallet/withdraw",
                        json={"amount": w["available"] + 10000}, timeout=15)
        assert r.status_code == 400

    def test_withdraw_success_reduces_balance(self, client):
        w_before = client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        amt = 10.0
        if w_before["available"] < amt:
            pytest.skip("insufficient balance for test")
        r = client.post(f"{BASE_URL}/api/wallet/withdraw", json={"amount": amt}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        tx = d["transaction"]
        assert tx["amount"] == -amt
        assert tx["type"] == "withdrawal"
        assert tx["status"] == "İşleniyor"
        w_after = client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        assert round(w_before["available"] - w_after["available"], 2) == amt


# ---- drive stop ----
class TestDriveStop:
    def test_drive_stop_creates_trip(self, client):
        w_before = client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        payload = {"distance_km": 12.0, "duration_sec": 900, "started_at": None}
        r = client.post(f"{BASE_URL}/api/drive/stop", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        trip = d["trip"]
        # eligible ~ 0.97 * 12
        assert abs(trip["eligible_km"] - 11.64) < 0.2
        expected_earning = round(trip["eligible_km"] * trip["rate"], 2)
        assert abs(trip["earning"] - expected_earning) < 0.02
        assert trip["status"] == "İşleniyor"

        # verify persisted
        r2 = client.get(f"{BASE_URL}/api/trips/{trip['id']}", timeout=15)
        assert r2.status_code == 200

        # pending increased
        w_after = client.get(f"{BASE_URL}/api/wallet", timeout=15).json()
        assert round(w_after["pending"] - w_before["pending"], 2) >= trip["earning"] - 0.01

        # a new earning tx exists
        txs = client.get(f"{BASE_URL}/api/wallet/transactions", timeout=15).json()["items"]
        assert any(t["type"] == "earning" and t["status"] == "İşleniyor" for t in txs)
