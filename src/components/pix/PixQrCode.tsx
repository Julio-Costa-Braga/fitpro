"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function PixQrCode({ value, size = 260 }: { value: string; size?: number }) {
  const { t } = useLanguage();
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0B0B12", light: "#FFFFFF" },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-white rounded-2xl flex items-center justify-center text-xs text-black/50"
      >
        {t("pix.qrLoading")}
      </div>
    );
  }

  return <img src={src} alt={t("pix.qrAria")} width={size} height={size} className="rounded-2xl" />;
}