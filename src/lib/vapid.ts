// Chave PUBLIC nao e segredo (e distribuida ao navegador), mas vem de env:
// sem NEXT_PUBLIC_VAPID_PUBLIC_KEY o push fica indisponivel (nunca cair em fallback).
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:contato@fitpro.app";

export const PUSH_SUPPORTED_TEXT = {
  pt: "Ative para receber notificacoes no celular mesmo com o app fechado.",
  en: "Enable to receive phone notifications even with the app closed.",
  es: "Activa para recibir notificaciones en el móvil aunque la app esté cerrada.",
};

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}