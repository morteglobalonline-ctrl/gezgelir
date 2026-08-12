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
