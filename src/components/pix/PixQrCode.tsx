"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PixQrCode({ value, size = 260 }: { value: string; size?: number }) {
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
        Gerando QR...
      </div>
    );
  }

  return <img src={src} alt="QR Code PIX" width={size} height={size} className="rounded-2xl" />;
}