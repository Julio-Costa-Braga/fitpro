"use client";

import { buildPixPayload } from "@/lib/pix";
import { MONTHLY_FEE, PIX_KEY } from "@/lib/billing";
import { PixQrCode } from "@/components/pix/PixQrCode";
import { PixCopyButton } from "@/components/pix/PixCopyButton";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const pixPayload = buildPixPayload({
  key: PIX_KEY,
  merchantName: "FITPRO",
  merchantCity: "SAO PAULO",
  amount: MONTHLY_FEE,
});

export default function PixPage() {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors mb-6"
        >
          &larr; &nbsp; {t("pix.back")}
        </Link>

        <div className="bg-gradient-to-br from-accent/30 via-card to-card rounded-3xl p-[1.5px]">
          <div className="bg-card rounded-[calc(1.5rem-1.5px)] p-6 flex flex-col items-center text-center">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xl font-bold tracking-tight">FitPro</span>
            </div>
            <p className="text-sm font-semibold text-white mt-2">{t("pix.title")}</p>
            <p className="text-4xl font-black text-white mt-1">
              R$ {MONTHLY_FEE.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-xs text-muted mt-1 mb-5">{t("pix.perMonth")}</p>

            <PixQrCode value={pixPayload} />

            <p className="text-xs text-muted mt-5 mb-2">{t("pix.copyPasteLabel")}</p>
            <code className="text-[11px] bg-bg border border-border rounded-lg px-3 py-2 font-mono break-all w-full">
              {PIX_KEY}
            </code>
            <PixCopyButton value={pixPayload} label={t("pix.copyBtn")} />

            <p className="text-[11px] text-muted/70 mt-4 leading-relaxed">
              {t("pix.desc")}
              <br />
              {t("pix.confirm")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}