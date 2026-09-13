import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/lib/vapid";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "TG6B3IiecsRnOXIy4yvEYG6qUDbTwhu9Ab-_S2-wg7Q";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = Buffer.from(base64, "base64");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData[i];
  return outputArray;
}

export interface PushRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Envia um push para todos os aparelhos registrados do usuario.
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/dashboard"
): Promise<void> {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) return;

    const payload = JSON.stringify({ title, body, url });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400 }
          )
          .catch(async (err: unknown) => {
            const code =
              err && typeof err === "object" && "statusCode" in err
                ? (err as { statusCode: number }).statusCode
                : 0;
            // 404/410: aparelho desinstalado/revogado - limpa o registro.
            if (code === 404 || code === 410) {
              await prisma.pushSubscription.deleteMany({
                where: { endpoint: sub.endpoint },
              });
            }
          })
      )
    );
  } catch (error) {
    console.error("Send push error:", error);
  }
}