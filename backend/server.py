import os
import uuid
import random
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = os.path.dirname(__file__)
load_dotenv(os.path.join(ROOT, ".env"))

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="GezGelir Driver API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TR = "%Y-%m-%dT%H:%M:%S"


def now_utc():
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class DriveStopIn(BaseModel):
    distance_km: float = Field(gt=0)
    duration_sec: int = Field(ge=0, default=0)
    started_at: str | None = None


class WithdrawIn(BaseModel):
    amount: float = Field(gt=0)
    iban: str | None = None


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "id": "gezgelir-config",
    "currency": "TRY",
    "rate_per_km": 3.00,
    "eligible_ratio": 0.97,
    "weekly_goal_km": 500,
    "weekly_goal_bonus": 250,
    "payout_min": 100,
    "payout_schedule": "Haftalık",
    "tagline": "Hareket Et, Kazan",
    "levels": [
        {"key": "bronze", "label": "Bronz", "min_km": 0},
        {"key": "silver", "label": "Gümüş", "min_km": 2000},
        {"key": "gold", "label": "Altın", "min_km": 6000},
        {"key": "platinum", "label": "Platin", "min_km": 12000},
    ],
}

STATUSES = ["Onaylandı", "Onaylandı", "Onaylandı", "İşleniyor", "İnceleniyor", "Düzeltilmiş"]


def make_trip(days_ago, hour, dur_hours, dist, status, rate, eligible_ratio):
    start = (now_utc() - timedelta(days=days_ago)).replace(
        hour=hour, minute=random.randint(0, 55), second=0, microsecond=0
    )
    end = start + timedelta(hours=dur_hours)
    eligible = round(dist * eligible_ratio, 1) if status != "İnceleniyor" else round(dist * 0.6, 1)
    earning = round(eligible * rate, 2)
    return {
        "id": str(uuid.uuid4()),
        "started_at": iso(start),
        "ended_at": iso(end),
        "distance_km": round(dist, 1),
        "eligible_km": eligible,
        "rate": rate,
        "earning": earning,
        "status": status,
        "route_label": random.choice(
            ["Kadıköy → Levent", "Beşiktaş → Maslak", "Şişli → Ataşehir",
             "Üsküdar → Taksim", "Bakırköy → Kadıköy", "Kartal → Kozyatağı"]
        ),
    }


async def seed():
    cfg = await db.config.find_one({"id": "gezgelir-config"})
    if not cfg:
        await db.config.insert_one(dict(DEFAULT_CONFIG))
        cfg = DEFAULT_CONFIG
    rate = cfg["rate_per_km"]
    er = cfg["eligible_ratio"]

    if await db.trips.count_documents({}) == 0:
        specs = [
            (0, 8, 3.5, 84.6, "Onaylandı"),
            (0, 14, 1.2, 31.4, "İşleniyor"),
            (1, 9, 2.8, 71.2, "Onaylandı"),
            (1, 18, 1.5, 38.9, "Onaylandı"),
            (2, 7, 4.0, 96.3, "Onaylandı"),
            (3, 10, 2.1, 52.7, "İnceleniyor"),
            (4, 8, 3.2, 79.5, "Onaylandı"),
            (5, 16, 1.8, 44.2, "Düzeltilmiş"),
            (6, 9, 3.6, 88.1, "Onaylandı"),
            (8, 8, 2.9, 66.4, "Onaylandı"),
            (11, 10, 3.1, 74.9, "Onaylandı"),
            (14, 9, 4.2, 101.7, "Onaylandı"),
            (18, 8, 2.4, 58.3, "Onaylandı"),
            (23, 11, 3.3, 81.0, "Onaylandı"),
        ]
        trips = [make_trip(d, h, dh, dist, st, rate, er) for (d, h, dh, dist, st) in specs]
        await db.trips.insert_many(trips)

    if await db.transactions.count_documents({}) == 0:
        txs = [
            {"id": str(uuid.uuid4()), "type": "earning", "title": "GezGelir Hakediş",
             "amount": 1482.00, "status": "Tamamlandı", "created_at": iso(now_utc() - timedelta(days=1))},
            {"id": str(uuid.uuid4()), "type": "earning", "title": "GezGelir Hakediş",
             "amount": 986.40, "status": "Tamamlandı", "created_at": iso(now_utc() - timedelta(days=4))},
            {"id": str(uuid.uuid4()), "type": "withdrawal", "title": "Banka Hesabına Çekim",
             "amount": -3000.00, "status": "Tamamlandı", "created_at": iso(now_utc() - timedelta(days=6))},
            {"id": str(uuid.uuid4()), "type": "bonus", "title": "Haftalık Hedef Bonusu",
             "amount": 250.00, "status": "Tamamlandı", "created_at": iso(now_utc() - timedelta(days=7))},
            {"id": str(uuid.uuid4()), "type": "earning", "title": "GezGelir Hakediş",
             "amount": 1204.80, "status": "Tamamlandı", "created_at": iso(now_utc() - timedelta(days=9))},
            {"id": str(uuid.uuid4()), "type": "withdrawal", "title": "Banka Hesabına Çekim",
             "amount": -2500.00, "status": "Tamamlandı", "created_at": iso(now_utc() - timedelta(days=14))},
        ]
        await db.transactions.insert_many(txs)

    if not await db.drivers.find_one({"id": "me"}):
        await db.drivers.insert_one({
            "id": "me",
            "first_name": "Ömer",
            "last_name": "Yılmaz",
            "title": "GezGelir Sürücüsü",
            "status": "Hesap Aktif",
            "phone": "+90 5•• ••• •• 34",
            "email": "omer@ornek.com",
            "joined_at": iso(now_utc() - timedelta(days=214)),
            "vehicle": {
                "name": "Volkswagen Passat",
                "year": 2021,
                "color": "Gri",
                "plate": "34 GEZ 027",
                "eligibility": "Uygun",
            },
            "bank": {"bank_name": "GezGelir Banka", "iban": "TR•• •••• •••• •••• •••• •• 42"},
            "available_balance": 4850.00,
            "pending_balance": 1240.60,
            "withdrawn_this_month": 3000.00,
        })


@app.on_event("startup")
async def _startup():
    await seed()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def parse(dt_str):
    return datetime.fromisoformat(dt_str)


async def get_config():
    cfg = await db.config.find_one({"id": "gezgelir-config"}, {"_id": 0})
    return cfg or DEFAULT_CONFIG


async def all_trips():
    return await db.trips.find({}, {"_id": 0}).sort("started_at", -1).to_list(500)


def range_start(range_key: str):
    n = now_utc()
    if range_key == "today":
        return n.replace(hour=0, minute=0, second=0, microsecond=0)
    if range_key == "week":
        monday = n - timedelta(days=n.weekday())
        return monday.replace(hour=0, minute=0, second=0, microsecond=0)
    if range_key == "month":
        return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return datetime(2000, 1, 1, tzinfo=timezone.utc)


def summarize(trips, start):
    km = 0.0
    eligible = 0.0
    earning = 0.0
    count = 0
    for t in trips:
        if parse(t["started_at"]) >= start:
            km += t["distance_km"]
            eligible += t["eligible_km"]
            earning += t["earning"]
            count += 1
    return {
        "distance_km": round(km, 1),
        "eligible_km": round(eligible, 1),
        "earning": round(earning, 2),
        "trips": count,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api.get("/config")
async def config():
    return await get_config()


@api.get("/driver/me")
async def driver_me():
    d = await db.drivers.find_one({"id": "me"}, {"_id": 0})
    trips = await all_trips()
    total = summarize(trips, datetime(2000, 1, 1, tzinfo=timezone.utc))
    cfg = await get_config()
    total_km = total["eligible_km"]
    level = cfg["levels"][0]
    for lv in cfg["levels"]:
        if total_km >= lv["min_km"]:
            level = lv
    d["membership"] = {
        "joined_at": d["joined_at"],
        "total_km": total_km,
        "total_earning": total["earning"],
        "status": d["status"],
        "level": level,
    }
    d["greeting_name"] = d["first_name"]
    return d


@api.get("/trips")
async def trips(range: str = "month"):
    ts = await all_trips()
    start = range_start(range)
    filtered = [t for t in ts if parse(t["started_at"]) >= start]
    return {"summary": summarize(ts, start), "items": filtered}


@api.get("/trips/{trip_id}")
async def trip_detail(trip_id: str):
    t = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Sürüş bulunamadı")
    return t


@api.get("/earnings/summary")
async def earnings_summary(range: str = "month"):
    cfg = await get_config()
    ts = await all_trips()
    start = range_start(range)
    s = summarize(ts, start)
    week = summarize(ts, range_start("week"))
    goal = cfg["weekly_goal_km"]
    return {
        "range": range,
        "earning": s["earning"],
        "eligible_km": s["eligible_km"],
        "distance_km": s["distance_km"],
        "trips": s["trips"],
        "rate_per_km": cfg["rate_per_km"],
        "currency": cfg["currency"],
        "weekly": {
            "goal_km": goal,
            "current_km": week["eligible_km"],
            "remaining_km": round(max(0, goal - week["eligible_km"]), 1),
            "progress": round(min(1.0, week["eligible_km"] / goal), 4) if goal else 0,
            "bonus": cfg["weekly_goal_bonus"],
        },
    }


@api.get("/earnings/series")
async def earnings_series(rng: str = Query("week", alias="range")):
    """Daily earning buckets for chart."""
    ts = await all_trips()
    days = 7 if rng == "week" else 30
    labels_tr = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    buckets = []
    for i in range(days - 1, -1, -1):
        day = (now_utc() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        nxt = day + timedelta(days=1)
        total = sum(t["earning"] for t in ts if day <= parse(t["started_at"]) < nxt)
        km = sum(t["eligible_km"] for t in ts if day <= parse(t["started_at"]) < nxt)
        label = labels_tr[day.weekday()] if rng == "week" else day.strftime("%d.%m")
        buckets.append({"label": label, "earning": round(total, 2), "km": round(km, 1)})
    return {"series": buckets}


@api.get("/wallet")
async def wallet():
    d = await db.drivers.find_one({"id": "me"}, {"_id": 0})
    ts = await all_trips()
    total = summarize(ts, datetime(2000, 1, 1, tzinfo=timezone.utc))
    return {
        "available": round(d["available_balance"], 2),
        "pending": round(d["pending_balance"], 2),
        "withdrawn_this_month": round(d["withdrawn_this_month"], 2),
        "total_earning": total["earning"],
        "currency": "TRY",
        "bank": d["bank"],
    }


@api.get("/wallet/transactions")
async def wallet_transactions():
    txs = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": txs}


@api.post("/wallet/withdraw")
async def withdraw(body: WithdrawIn):
    d = await db.drivers.find_one({"id": "me"})
    if body.amount > d["available_balance"]:
        raise HTTPException(400, "Yetersiz bakiye")
    tx = {
        "id": str(uuid.uuid4()),
        "type": "withdrawal",
        "title": "Banka Hesabına Çekim",
        "amount": -round(body.amount, 2),
        "status": "İşleniyor",
        "created_at": iso(now_utc()),
    }
    await db.transactions.insert_one(dict(tx))
    await db.drivers.update_one(
        {"id": "me"},
        {"$inc": {"available_balance": -body.amount, "withdrawn_this_month": body.amount}},
    )
    tx.pop("_id", None)
    return {"ok": True, "transaction": tx}


@api.post("/drive/stop")
async def drive_stop(body: DriveStopIn):
    cfg = await get_config()
    rate = cfg["rate_per_km"]
    eligible = round(body.distance_km * cfg["eligible_ratio"], 1)
    earning = round(eligible * rate, 2)
    start = parse(body.started_at) if body.started_at else now_utc() - timedelta(seconds=body.duration_sec)
    trip = {
        "id": str(uuid.uuid4()),
        "started_at": iso(start),
        "ended_at": iso(now_utc()),
        "distance_km": round(body.distance_km, 1),
        "eligible_km": eligible,
        "rate": rate,
        "earning": earning,
        "status": "İşleniyor",
        "route_label": "Canlı Sürüş",
    }
    await db.trips.insert_one(dict(trip))
    await db.drivers.update_one({"id": "me"}, {"$inc": {"pending_balance": earning}})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "earning",
        "title": "GezGelir Hakediş",
        "amount": earning,
        "status": "İşleniyor",
        "created_at": iso(now_utc()),
    })
    trip.pop("_id", None)
    return {"ok": True, "trip": trip}


@api.get("/health")
async def health():
    return {"status": "ok", "service": "gezgelir"}


app.include_router(api)
