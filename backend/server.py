import os
import uuid
import random
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv

ROOT = os.path.dirname(__file__)
load_dotenv(os.path.join(ROOT, ".env"))

import jwt
import bcrypt
import requests
from fastapi import (FastAPI, APIRouter, HTTPException, Query, Request, Depends,
                     UploadFile, File, Form, Header, Response)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="GezGelir Driver API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_utc():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


def parse(s):
    return datetime.fromisoformat(s)


# ---------------------------------------------------------------------------
# Auth utilities
# ---------------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": now_utc() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Oturum bulunamadı")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Oturum süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Geçersiz oturum")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "Kullanıcı bulunamadı")
    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str = Field(min_length=1)
    last_name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class DriveStopIn(BaseModel):
    distance_km: float = Field(gt=0)
    duration_sec: int = Field(ge=0, default=0)
    started_at: str | None = None
    route_label: str | None = None


class WithdrawIn(BaseModel):
    amount: float = Field(gt=0)
    bank_account_id: str | None = None


class BankAccountIn(BaseModel):
    bank_name: str = Field(min_length=1)
    iban: str = Field(min_length=10)
    holder_name: str = Field(min_length=1)
    make_default: bool = False


# ---------------------------------------------------------------------------
# Config (business rules — configurable / server-driven)
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
    "multiplier": {"label": "Hafta Sonu Bonusu", "factor": 1.2, "active": True,
                   "note": "Cumartesi-Pazar kazançların x1,2"},
    "levels": [
        {"key": "bronze", "label": "Bronz", "min_km": 0},
        {"key": "silver", "label": "Gümüş", "min_km": 2000},
        {"key": "gold", "label": "Altın", "min_km": 6000},
        {"key": "platinum", "label": "Platin", "min_km": 12000},
    ],
    "missions": [
        {"id": "w_km", "title": "Haftalık 500 km", "desc": "Bu hafta 500 km tamamla",
         "type": "km", "target": 500, "reward": 250, "period": "week"},
        {"id": "w_trips", "title": "10 Sürüş", "desc": "Bu hafta 10 sürüş tamamla",
         "type": "trips", "target": 10, "reward": 100, "period": "week"},
        {"id": "w_earn", "title": "₺1.500 Kazanç", "desc": "Bu hafta ₺1.500 kazan",
         "type": "earning", "target": 1500, "reward": 150, "period": "week"},
    ],
    "badges": [
        {"id": "first_drive", "title": "İlk Sürüş", "desc": "İlk sürüşünü tamamladın",
         "type": "trips_total", "target": 1, "icon": "flag"},
        {"id": "km_1000", "title": "1.000 km", "desc": "Toplam 1.000 km'yi geçtin",
         "type": "km_total", "target": 1000, "icon": "route"},
        {"id": "km_5000", "title": "Yol Ustası", "desc": "Toplam 5.000 km'yi geçtin",
         "type": "km_total", "target": 5000, "icon": "medal"},
        {"id": "earn_5000", "title": "₺5.000 Kulübü", "desc": "Toplam ₺5.000 kazandın",
         "type": "earning_total", "target": 5000, "icon": "coins"},
        {"id": "trips_50", "title": "Deneyimli", "desc": "50 sürüş tamamladın",
         "type": "trips_total", "target": 50, "icon": "star"},
        {"id": "goal_master", "title": "Hedef Avcısı", "desc": "Haftalık hedefi tamamla",
         "type": "week_goal", "target": 1, "icon": "target"},
    ],
}

ROUTES = {
    "Kadıköy → Levent": {"points": [[40.9906, 29.0295], [41.0053, 29.0270], [41.0255, 29.0090],
                                     [41.0450, 28.9970], [41.0780, 29.0110]]},
    "Beşiktaş → Maslak": {"points": [[41.0422, 29.0083], [41.0665, 29.0170], [41.0870, 29.0210],
                                      [41.1085, 29.0230], [41.1122, 29.0210]]},
    "Şişli → Ataşehir": {"points": [[41.0605, 28.9870], [41.0480, 29.0090], [41.0210, 29.0640],
                                     [40.9920, 29.1050], [40.9840, 29.1270]]},
    "Üsküdar → Taksim": {"points": [[41.0255, 29.0150], [41.0330, 29.0000], [41.0390, 28.9870],
                                     [41.0369, 28.9870], [41.0369, 28.9850]]},
    "Bakırköy → Kadıköy": {"points": [[40.9790, 28.8720], [40.9920, 28.9200], [41.0060, 28.9780],
                                       [40.9990, 29.0050], [40.9906, 29.0295]]},
    "Kartal → Kozyatağı": {"points": [[40.9060, 29.1870], [40.9250, 29.1450], [40.9560, 29.1150],
                                       [40.9720, 29.0980], [40.9800, 29.0930]]},
}


# ---------------------------------------------------------------------------
# Object storage (Emergent-managed)
# ---------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "gezgelir"
_storage_key = None

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
              "gif": "image/gif", "webp": "image/webp", "heic": "image/heic",
              "heif": "image/heif", "pdf": "application/pdf"}


def init_storage(force=False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path, data, content_type):
    try:
        key = init_storage()
        r = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
        if r.status_code == 404:
            key = init_storage(force=True)
            r = requests.put(f"{STORAGE_URL}/objects/{path}",
                             headers={"X-Storage-Key": key, "Content-Type": content_type},
                             data=data, timeout=120)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(502, f"Depolama hatası: {e}")


def get_object(path):
    key = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# Required document slots + statuses
DOC_TYPES = [
    {"key": "ehliyet", "label": "Ehliyet", "desc": "Sürücü belgenin ön yüzü"},
    {"key": "ruhsat", "label": "Araç Ruhsatı", "desc": "Aracının ruhsat belgesi"},
    {"key": "arac_foto", "label": "Araç Fotoğrafı", "desc": "Aracının net bir fotoğrafı"},
]
DOC_LABELS = {d["key"]: d["label"] for d in DOC_TYPES}


def doc_status(created_iso):
    """Demo review flow: İnceleniyor for ~30s after upload, then Onaylandı."""
    elapsed = (now_utc() - parse(created_iso)).total_seconds()
    return "İnceleniyor" if elapsed < 30 else "Onaylandı"


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
def tr_amount(v):
    s = f"{float(v):,.2f}".replace(",", "§").replace(".", ",").replace("§", ".")
    return s


def tr_km(v):
    return f"{float(v):.1f}".replace(".", ",")


async def create_notification(user_id, ntype, title, body, icon="bell"):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": ntype,
        "title": title, "body": body, "icon": icon,
        "read": False, "created_at": iso(now_utc())})


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------
def make_trip(user_id, days_ago, hour, dur_hours, dist, status, rate, er):
    start = (now_utc() - timedelta(days=days_ago)).replace(
        hour=hour, minute=random.randint(0, 55), second=0, microsecond=0)
    end = start + timedelta(hours=dur_hours)
    eligible = round(dist * er, 1) if status != "İnceleniyor" else round(dist * 0.6, 1)
    earning = round(eligible * rate, 2)
    label = random.choice(list(ROUTES.keys()))
    return {
        "id": str(uuid.uuid4()), "user_id": user_id,
        "started_at": iso(start), "ended_at": iso(end),
        "distance_km": round(dist, 1), "eligible_km": eligible,
        "rate": rate, "earning": earning, "status": status,
        "route_label": label, "points": ROUTES[label]["points"],
    }


async def seed_user_data(user_id):
    cfg = await get_config()
    rate, er = cfg["rate_per_km"], cfg["eligible_ratio"]
    specs = [
        (0, 8, 3.5, 84.6, "Onaylandı"), (0, 14, 1.2, 31.4, "İşleniyor"),
        (1, 9, 2.8, 71.2, "Onaylandı"), (1, 18, 1.5, 38.9, "Onaylandı"),
        (2, 7, 4.0, 96.3, "Onaylandı"), (3, 10, 2.1, 52.7, "İnceleniyor"),
        (4, 8, 3.2, 79.5, "Onaylandı"), (5, 16, 1.8, 44.2, "Düzeltilmiş"),
        (6, 9, 3.6, 88.1, "Onaylandı"), (8, 8, 2.9, 66.4, "Onaylandı"),
        (11, 10, 3.1, 74.9, "Onaylandı"), (14, 9, 4.2, 101.7, "Onaylandı"),
        (18, 8, 2.4, 58.3, "Onaylandı"), (23, 11, 3.3, 81.0, "Onaylandı"),
    ]
    trips = [make_trip(user_id, *s, rate, er) for s in specs]
    await db.trips.insert_many(trips)

    txs = [
        ("earning", "GezGelir Hakediş", 1482.00, "Tamamlandı", 1),
        ("earning", "GezGelir Hakediş", 986.40, "Tamamlandı", 4),
        ("withdrawal", "Banka Hesabına Çekim", -3000.00, "Tamamlandı", 6),
        ("bonus", "Haftalık Hedef Bonusu", 250.00, "Tamamlandı", 7),
        ("earning", "GezGelir Hakediş", 1204.80, "Tamamlandı", 9),
        ("withdrawal", "Banka Hesabına Çekim", -2500.00, "Tamamlandı", 14),
    ]
    await db.transactions.insert_many([
        {"id": str(uuid.uuid4()), "user_id": user_id, "type": t, "title": ti,
         "amount": a, "status": st, "created_at": iso(now_utc() - timedelta(days=d))}
        for (t, ti, a, st, d) in txs
    ])

    ba_id = str(uuid.uuid4())
    await db.bank_accounts.insert_one({
        "id": ba_id, "user_id": user_id, "bank_name": "GezGelir Banka",
        "iban": "TR33 0006 1005 1978 6457 8413 42", "holder_name": "Hesap Sahibi",
        "is_default": True, "created_at": iso(now_utc())})

    await db.drivers.insert_one({
        "id": user_id, "user_id": user_id,
        "title": "GezGelir Sürücüsü", "status": "Hesap Aktif",
        "phone": "+90 5•• ••• •• 34",
        "joined_at": iso(now_utc() - timedelta(days=214)),
        "vehicle": {"name": "Volkswagen Passat", "year": 2021, "color": "Gri",
                    "plate": "34 GEZ 027", "eligibility": "Uygun"},
        "available_balance": 4850.00, "pending_balance": 1240.60,
        "withdrawn_this_month": 3000.00, "default_bank_account_id": ba_id})

    seed_notifs = [
        ("earning", "Hakedişin onaylandı", "84,6 km'lik sürüşünden ₺253,80 hesabına eklendi.", "coins", 0),
        ("approval", "Aracın uygun", "Volkswagen Passat aracın GezGelir için onaylandı.", "check", 1),
        ("withdrawal", "Çekimin tamamlandı", "₺3.000,00 banka hesabına başarıyla aktarıldı.", "wallet", 6),
        ("info", "Hoş geldin! 🎉", "GezGelir'e katıldın. Hareket et, kazanmaya başla.", "spark", 8),
    ]
    await db.notifications.insert_many([
        {"id": str(uuid.uuid4()), "user_id": user_id, "type": t, "title": ti,
         "body": b, "icon": ic, "read": d > 2, "created_at": iso(now_utc() - timedelta(days=d, hours=d))}
        for (t, ti, b, ic, d) in seed_notifs])


async def get_config():
    cfg = await db.config.find_one({"id": "gezgelir-config"}, {"_id": 0})
    return cfg or DEFAULT_CONFIG


@app.on_event("startup")
async def _startup():
    try:
        init_storage()
    except Exception as e:
        print("Storage init failed:", e)
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    if not await db.config.find_one({"id": "gezgelir-config"}):
        await db.config.insert_one(dict(DEFAULT_CONFIG))
    # demo user
    demo_email = os.environ.get("DEMO_EMAIL", "demo@gezgelir.com").lower()
    demo_pw = os.environ.get("DEMO_PASSWORD", "demo1234")
    existing = await db.users.find_one({"email": demo_email})
    if not existing:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": demo_email, "password_hash": hash_password(demo_pw),
            "first_name": "Ömer", "last_name": "Yılmaz", "created_at": iso(now_utc())})
        await seed_user_data(uid)


# ---------------------------------------------------------------------------
# Data helpers (scoped by user)
# ---------------------------------------------------------------------------
async def user_trips(uid):
    return await db.trips.find({"user_id": uid}, {"_id": 0}).sort("started_at", -1).to_list(500)


def range_start(key):
    n = now_utc()
    if key == "today":
        return n.replace(hour=0, minute=0, second=0, microsecond=0)
    if key == "week":
        m = n - timedelta(days=n.weekday())
        return m.replace(hour=0, minute=0, second=0, microsecond=0)
    if key == "month":
        return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return datetime(2000, 1, 1, tzinfo=timezone.utc)


def summarize(trips, start):
    km = el = earn = 0.0
    cnt = 0
    for t in trips:
        if parse(t["started_at"]) >= start:
            km += t["distance_km"]; el += t["eligible_km"]; earn += t["earning"]; cnt += 1
    return {"distance_km": round(km, 1), "eligible_km": round(el, 1),
            "earning": round(earn, 2), "trips": cnt}


def withdrawal_status(created_iso):
    elapsed = (now_utc() - parse(created_iso)).total_seconds()
    if elapsed < 20:
        return "Beklemede"
    if elapsed < 75:
        return "İşleniyor"
    return "Tamamlandı"


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
async def check_lockout(identifier):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= 5:
        if (now_utc() - parse(rec["last"])).total_seconds() < 900:
            raise HTTPException(429, "Çok fazla deneme. 15 dakika sonra tekrar deneyin.")


async def register_attempt(identifier, ok):
    if ok:
        await db.login_attempts.delete_one({"identifier": identifier})
    else:
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last": iso(now_utc())}}, upsert=True)


@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Bu e-posta zaten kayıtlı")
    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid, "email": email, "password_hash": hash_password(body.password),
        "first_name": body.first_name.strip(), "last_name": body.last_name.strip(),
        "created_at": iso(now_utc())})
    await seed_user_data(uid)
    token = create_token(uid, email)
    return {"token": token, "user": {"id": uid, "email": email,
            "first_name": body.first_name.strip(), "last_name": body.last_name.strip()}}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    identifier = email
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await register_attempt(identifier, False)
        raise HTTPException(401, "E-posta veya şifre hatalı")
    await register_attempt(identifier, True)
    token = create_token(user["id"], email)
    return {"token": token, "user": {"id": user["id"], "email": email,
            "first_name": user["first_name"], "last_name": user.get("last_name", "")}}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Config (public)
# ---------------------------------------------------------------------------
@api.get("/config")
async def config():
    return await get_config()


# ---------------------------------------------------------------------------
# Driver / trips / earnings (scoped)
# ---------------------------------------------------------------------------
@api.get("/driver/me")
async def driver_me(user: dict = Depends(get_current_user)):
    d = await db.drivers.find_one({"id": user["id"]}, {"_id": 0})
    trips = await user_trips(user["id"])
    total = summarize(trips, datetime(2000, 1, 1, tzinfo=timezone.utc))
    cfg = await get_config()
    total_km = total["eligible_km"]
    level = cfg["levels"][0]
    for lv in cfg["levels"]:
        if total_km >= lv["min_km"]:
            level = lv
    d["first_name"] = user["first_name"]
    d["last_name"] = user.get("last_name", "")
    d["email"] = user["email"]
    d["greeting_name"] = user["first_name"]
    d["membership"] = {"joined_at": d["joined_at"], "total_km": total_km,
                       "total_earning": total["earning"], "status": d["status"], "level": level}
    ba = await db.bank_accounts.find_one({"id": d.get("default_bank_account_id")}, {"_id": 0})
    d["bank"] = ba
    return d


@api.get("/trips")
async def trips(range: str = "month", user: dict = Depends(get_current_user)):
    ts = await user_trips(user["id"])
    start = range_start(range)
    items = [t for t in ts if parse(t["started_at"]) >= start]
    return {"summary": summarize(ts, start), "items": items}


@api.get("/trips/{trip_id}")
async def trip_detail(trip_id: str, user: dict = Depends(get_current_user)):
    t = await db.trips.find_one({"id": trip_id, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Sürüş bulunamadı")
    return t


@api.get("/earnings/summary")
async def earnings_summary(range: str = "month", user: dict = Depends(get_current_user)):
    cfg = await get_config()
    ts = await user_trips(user["id"])
    s = summarize(ts, range_start(range))
    week = summarize(ts, range_start("week"))
    goal = cfg["weekly_goal_km"]
    return {"range": range, "earning": s["earning"], "eligible_km": s["eligible_km"],
            "distance_km": s["distance_km"], "trips": s["trips"],
            "rate_per_km": cfg["rate_per_km"], "currency": cfg["currency"],
            "multiplier": cfg.get("multiplier"),
            "weekly": {"goal_km": goal, "current_km": week["eligible_km"],
                       "remaining_km": round(max(0, goal - week["eligible_km"]), 1),
                       "progress": round(min(1.0, week["eligible_km"] / goal), 4) if goal else 0,
                       "bonus": cfg["weekly_goal_bonus"]}}


@api.get("/earnings/series")
async def earnings_series(rng: str = Query("week", alias="range"),
                          user: dict = Depends(get_current_user)):
    ts = await user_trips(user["id"])
    days = 7 if rng == "week" else 30
    labels_tr = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    out = []
    for i in range(days - 1, -1, -1):
        day = (now_utc() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        nxt = day + timedelta(days=1)
        earn = sum(t["earning"] for t in ts if day <= parse(t["started_at"]) < nxt)
        km = sum(t["eligible_km"] for t in ts if day <= parse(t["started_at"]) < nxt)
        label = labels_tr[day.weekday()] if rng == "week" else day.strftime("%d.%m")
        out.append({"label": label, "earning": round(earn, 2), "km": round(km, 1)})
    return {"series": out}


# ---------------------------------------------------------------------------
# Gamification (server-driven levels, missions, badges, multiplier)
# ---------------------------------------------------------------------------
@api.get("/gamification")
async def gamification(user: dict = Depends(get_current_user)):
    cfg = await get_config()
    ts = await user_trips(user["id"])
    total = summarize(ts, datetime(2000, 1, 1, tzinfo=timezone.utc))
    week = summarize(ts, range_start("week"))
    total_km = total["eligible_km"]

    levels = cfg["levels"]
    idx = 0
    for i, lv in enumerate(levels):
        if total_km >= lv["min_km"]:
            idx = i
    current = levels[idx]
    nxt = levels[idx + 1] if idx + 1 < len(levels) else None
    lvl_progress = 1.0 if not nxt else min(1.0, (total_km - current["min_km"]) / (nxt["min_km"] - current["min_km"]))

    def mission_current(m):
        if m["type"] == "km":
            return week["eligible_km"]
        if m["type"] == "trips":
            return week["trips"]
        if m["type"] == "earning":
            return week["earning"]
        return 0

    missions = []
    for m in cfg.get("missions", []):
        cur = round(mission_current(m), 1)
        missions.append({**m, "current": cur,
                         "progress": round(min(1.0, cur / m["target"]), 4) if m["target"] else 0,
                         "completed": cur >= m["target"]})

    week_goal_done = week["eligible_km"] >= cfg["weekly_goal_km"]
    badges = []
    for b in cfg.get("badges", []):
        if b["type"] == "trips_total":
            val = total["trips"]
        elif b["type"] == "km_total":
            val = total_km
        elif b["type"] == "earning_total":
            val = total["earning"]
        elif b["type"] == "week_goal":
            val = 1 if week_goal_done else 0
        else:
            val = 0
        badges.append({**b, "earned": val >= b["target"], "value": round(val, 1)})

    return {"level": {**current, "index": idx, "progress": round(lvl_progress, 4),
                      "total_km": total_km, "next": nxt},
            "multiplier": cfg.get("multiplier"),
            "missions": missions, "badges": badges}


# ---------------------------------------------------------------------------
# Wallet & bank accounts
# ---------------------------------------------------------------------------
def serialize_tx(t):
    if t["type"] == "withdrawal" and t.get("status") not in ("Tamamlandı",) and t.get("lifecycle"):
        t = {**t, "status": withdrawal_status(t["created_at"])}
    return t


@api.get("/wallet")
async def wallet(user: dict = Depends(get_current_user)):
    d = await db.drivers.find_one({"id": user["id"]}, {"_id": 0})
    ts = await user_trips(user["id"])
    total = summarize(ts, datetime(2000, 1, 1, tzinfo=timezone.utc))
    ba = await db.bank_accounts.find_one({"id": d.get("default_bank_account_id")}, {"_id": 0})
    cfg = await get_config()
    return {"available": round(d["available_balance"], 2), "pending": round(d["pending_balance"], 2),
            "withdrawn_this_month": round(d["withdrawn_this_month"], 2),
            "total_earning": total["earning"], "currency": "TRY",
            "payout_min": cfg.get("payout_min", 0), "bank": ba}


@api.get("/wallet/transactions")
async def wallet_transactions(user: dict = Depends(get_current_user)):
    txs = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": [serialize_tx(t) for t in txs]}


@api.post("/wallet/withdraw")
async def withdraw(body: WithdrawIn, user: dict = Depends(get_current_user)):
    d = await db.drivers.find_one({"id": user["id"]})
    if body.amount > d["available_balance"]:
        raise HTTPException(400, "Yetersiz bakiye")
    ba_id = body.bank_account_id or d.get("default_bank_account_id")
    ba = await db.bank_accounts.find_one({"id": ba_id, "user_id": user["id"]}, {"_id": 0})
    if not ba:
        raise HTTPException(400, "Geçerli bir banka hesabı seçin")
    # Atomic conditional debit to prevent concurrent overdraw
    res = await db.drivers.update_one(
        {"id": user["id"], "available_balance": {"$gte": body.amount}},
        {"$inc": {"available_balance": -body.amount, "withdrawn_this_month": body.amount}},
    )
    if res.modified_count == 0:
        raise HTTPException(400, "Yetersiz bakiye")
    tx = {"id": str(uuid.uuid4()), "user_id": user["id"], "type": "withdrawal",
          "title": "Banka Hesabına Çekim", "amount": -round(body.amount, 2),
          "status": "Beklemede", "lifecycle": True, "bank_iban": ba["iban"],
          "created_at": iso(now_utc())}
    await db.transactions.insert_one(dict(tx))
    await create_notification(
        user["id"], "withdrawal", "Çekim talebin alındı",
        f"₺{tr_amount(body.amount)} tutarındaki çekim {ba['bank_name']} hesabına işleniyor.", "wallet")
    tx.pop("_id", None)
    return {"ok": True, "transaction": serialize_tx(tx)}


@api.get("/bank-accounts")
async def list_banks(user: dict = Depends(get_current_user)):
    items = await db.bank_accounts.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(50)
    return {"items": items}


@api.post("/bank-accounts")
async def add_bank(body: BankAccountIn, user: dict = Depends(get_current_user)):
    count = await db.bank_accounts.count_documents({"user_id": user["id"]})
    ba = {"id": str(uuid.uuid4()), "user_id": user["id"], "bank_name": body.bank_name.strip(),
          "iban": body.iban.strip().upper(), "holder_name": body.holder_name.strip(),
          "is_default": body.make_default or count == 0, "created_at": iso(now_utc())}
    await db.bank_accounts.insert_one(dict(ba))
    if ba["is_default"]:
        await db.bank_accounts.update_many(
            {"user_id": user["id"], "id": {"$ne": ba["id"]}}, {"$set": {"is_default": False}})
        await db.drivers.update_one({"id": user["id"]}, {"$set": {"default_bank_account_id": ba["id"]}})
    ba.pop("_id", None)
    return {"ok": True, "account": ba}


@api.put("/bank-accounts/{ba_id}")
async def edit_bank(ba_id: str, body: BankAccountIn, user: dict = Depends(get_current_user)):
    res = await db.bank_accounts.update_one(
        {"id": ba_id, "user_id": user["id"]},
        {"$set": {"bank_name": body.bank_name.strip(), "iban": body.iban.strip().upper(),
                  "holder_name": body.holder_name.strip()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Hesap bulunamadı")
    if body.make_default:
        await db.bank_accounts.update_many({"user_id": user["id"]}, {"$set": {"is_default": False}})
        await db.bank_accounts.update_one({"id": ba_id}, {"$set": {"is_default": True}})
        await db.drivers.update_one({"id": user["id"]}, {"$set": {"default_bank_account_id": ba_id}})
    return {"ok": True}


@api.post("/bank-accounts/{ba_id}/default")
async def set_default_bank(ba_id: str, user: dict = Depends(get_current_user)):
    ba = await db.bank_accounts.find_one({"id": ba_id, "user_id": user["id"]})
    if not ba:
        raise HTTPException(404, "Hesap bulunamadı")
    await db.bank_accounts.update_many({"user_id": user["id"]}, {"$set": {"is_default": False}})
    await db.bank_accounts.update_one({"id": ba_id}, {"$set": {"is_default": True}})
    await db.drivers.update_one({"id": user["id"]}, {"$set": {"default_bank_account_id": ba_id}})
    return {"ok": True}


@api.delete("/bank-accounts/{ba_id}")
async def delete_bank(ba_id: str, user: dict = Depends(get_current_user)):
    ba = await db.bank_accounts.find_one({"id": ba_id, "user_id": user["id"]})
    if not ba:
        raise HTTPException(404, "Hesap bulunamadı")
    await db.bank_accounts.delete_one({"id": ba_id})
    if ba.get("is_default"):
        other = await db.bank_accounts.find_one({"user_id": user["id"]})
        new_default = other["id"] if other else None
        if new_default:
            await db.bank_accounts.update_one({"id": new_default}, {"$set": {"is_default": True}})
        await db.drivers.update_one({"id": user["id"]}, {"$set": {"default_bank_account_id": new_default}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Drive
# ---------------------------------------------------------------------------
@api.post("/drive/stop")
async def drive_stop(body: DriveStopIn, user: dict = Depends(get_current_user)):
    cfg = await get_config()
    rate, er = cfg["rate_per_km"], cfg["eligible_ratio"]
    eligible = round(body.distance_km * er, 1)
    earning = round(eligible * rate, 2)
    start = parse(body.started_at) if body.started_at else now_utc() - timedelta(seconds=body.duration_sec)
    label = body.route_label if body.route_label in ROUTES else random.choice(list(ROUTES.keys()))
    trip = {"id": str(uuid.uuid4()), "user_id": user["id"],
            "started_at": iso(start), "ended_at": iso(now_utc()),
            "distance_km": round(body.distance_km, 1), "eligible_km": eligible,
            "rate": rate, "earning": earning, "status": "İşleniyor",
            "route_label": label, "points": ROUTES[label]["points"]}
    await db.trips.insert_one(dict(trip))
    await db.drivers.update_one({"id": user["id"]}, {"$inc": {"pending_balance": earning}})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "type": "earning",
        "title": "GezGelir Hakediş", "amount": earning, "status": "İşleniyor",
        "created_at": iso(now_utc())})
    await create_notification(
        user["id"], "earning", "Sürüş kaydedildi",
        f"{tr_km(eligible)} km kazandıran mesafe · +₺{tr_amount(earning)} hesabına işleniyor.", "coins")
    trip.pop("_id", None)
    return {"ok": True, "trip": trip}


@api.get("/health")
async def health():
    return {"status": "ok", "service": "gezgelir"}


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
@api.get("/documents")
async def list_documents(user: dict = Depends(get_current_user)):
    docs = await db.documents.find(
        {"user_id": user["id"], "is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(100)
    latest = {}
    for d in docs:
        if d["type"] not in latest:
            latest[d["type"]] = d
    slots = []
    for t in DOC_TYPES:
        d = latest.get(t["key"])
        if d:
            slots.append({**t, "uploaded": True, "id": d["id"],
                          "status": doc_status(d["created_at"]),
                          "original_filename": d.get("original_filename"),
                          "content_type": d.get("content_type"),
                          "created_at": d["created_at"]})
        else:
            slots.append({**t, "uploaded": False, "status": "Eksik"})
    approved = sum(1 for s in slots if s["status"] == "Onaylandı")
    return {"items": slots, "approved": approved, "total": len(slots)}


@api.post("/documents/upload")
async def upload_document(type: str = Form(...), file: UploadFile = File(...),
                          user: dict = Depends(get_current_user)):
    if type not in DOC_LABELS:
        raise HTTPException(400, "Geçersiz belge türü")
    ext = (file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin")
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    if not content_type.startswith("image/") and content_type != "application/pdf":
        raise HTTPException(400, "Yalnızca görsel veya PDF yükleyebilirsin")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "Dosya en fazla 10MB olabilir")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    # supersede previous docs of same type
    await db.documents.update_many(
        {"user_id": user["id"], "type": type, "is_deleted": False}, {"$set": {"is_deleted": True}})
    rec = {"id": str(uuid.uuid4()), "user_id": user["id"], "type": type,
           "storage_path": result["path"], "original_filename": file.filename,
           "content_type": content_type, "size": result.get("size", len(data)),
           "is_deleted": False, "created_at": iso(now_utc())}
    await db.documents.insert_one(dict(rec))
    await create_notification(
        user["id"], "document", f"{DOC_LABELS[type]} yüklendi",
        "Belgen incelemeye alındı. Kısa süre içinde onaylanacak.", "doc")
    return {"ok": True, "document": {"id": rec["id"], "type": type,
            "status": doc_status(rec["created_at"]), "created_at": rec["created_at"]}}


@api.get("/documents/{doc_id}/file")
async def serve_document(doc_id: str, authorization: str = Header(None), auth: str = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(401, "Yetki gerekli")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Geçersiz oturum")
    rec = await db.documents.find_one({"id": doc_id, "user_id": payload["sub"], "is_deleted": False})
    if not rec:
        raise HTTPException(404, "Dosya bulunamadı")
    data, content_type = get_object(rec["storage_path"])
    return Response(content=data, media_type=rec.get("content_type", content_type))


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    res = await db.documents.update_one(
        {"id": doc_id, "user_id": user["id"]}, {"$set": {"is_deleted": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Belge bulunamadı")
    return {"ok": True}


@api.get("/files/{path:path}")
async def serve_file(path: str, authorization: str = Header(None), auth: str = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(401, "Yetki gerekli")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Geçersiz oturum")
    rec = await db.documents.find_one({"storage_path": path, "is_deleted": False})
    if not rec or rec["user_id"] != payload["sub"]:
        raise HTTPException(404, "Dosya bulunamadı")
    data, content_type = get_object(path)
    return Response(content=data, media_type=rec.get("content_type", content_type))


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    unread = sum(1 for n in items if not n.get("read"))
    return {"items": items, "unread": unread}


@api.post("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


app.include_router(api)
