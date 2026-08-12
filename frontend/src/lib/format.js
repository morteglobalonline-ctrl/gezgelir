const nfKm = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nfInt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const nfMoney = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const money = (v) => `₺${nfMoney.format(Number(v || 0))}`;
export const moneySigned = (v) => {
  const n = Number(v || 0);
  const s = `₺${nfMoney.format(Math.abs(n))}`;
  return n < 0 ? `−${s}` : `+${s}`;
};
export const km = (v) => `${nfKm.format(Number(v || 0))} km`;
export const kmNum = (v) => nfKm.format(Number(v || 0));
export const intNum = (v) => nfInt.format(Number(v || 0));

export const timeShort = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export const dateLabel = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === y.toDateString();
  if (sameDay) return "Bugün";
  if (isYesterday) return "Dün";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const dateFull = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
};

export const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün önce`;
  return dateLabel(iso);
};
