import { endpoints } from "./api";

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getRegistration() {
  return navigator.serviceWorker.register("/sw.js");
}

export async function getPushStatus() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? "enabled" : "disabled";
  } catch {
    return "disabled";
  }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("Bu cihaz anlık bildirimi desteklemiyor.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Bildirim izni verilmedi.");
  const reg = await getRegistration();
  await navigator.serviceWorker.ready;
  const { key } = await endpoints.pushKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(key),
    });
  }
  await endpoints.pushSubscribe(sub.toJSON());
  return "enabled";
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) {
      await endpoints.pushUnsubscribe(sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    /* ignore */
  }
  return "disabled";
}
