"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, QrCode, Copy, Check, Gift, Star } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { dateLocale, type Lang } from "@/lib/i18n/dictionaries";
import { api, type BillingInfo } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import {
  MONTHLY_FEE,
  EXTRA_STUDENT_PRICE,
  PACK5_PRICE,
  PACK10_PRICE,
  REFERRAL_DISCOUNT,
  REFERRAL_DISCOUNT_MONTHS,
  PIX_KEY,
} from "@/lib/billing";

function StatusPill({ value, tone }: { value: string; tone: "green" | "red" | "gold" | "blue" }) {
  const tones = {
    green: "bg-green-500/15 text-green-400",
    red: "bg-red-500/15 text-red-400",
    gold: "bg-amber-500/15 text-amber-400",
    blue: "bg-blue-500/15 text-blue-400",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${tones[tone]}`}>
      {value}
    </span>
  );
}

function localeDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(dateLocale(lang));
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<BillingInfo | null>(null);
  const [copied, setCopied] = useState<"pix" | "code" | null>(null);
  const [status, setStatus] = useState<{ value: string; tone: "green" | "red" | "gold" } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== "PERSONAL" && user.role !== "NUTRITIONIST")) {
      router.replace("/dashboard");
      setLoading(false);
      return;
    }
    api.billing
      .get()
      .then((d) => {
        setData(d);
        const plan = d.plan;
        if (plan.lifetime) {
          setStatus({ value: t("common.lifetime"), tone: "gold" });
        } else if (plan.paidUntil) {
          const paid = new Date(plan.paidUntil).getTime() >= Date.now();
          setStatus(
            paid
              ? { value: t("dash.paidUntil", { date: localeDate(plan.paidUntil, lang) }), tone: "green" }
              : { value: t("dash.latePayment"), tone: "red" }
          );
        } else {
          setStatus({ value: t("dash.noPayment"), tone: "red" });
        }
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : t("profile.error"))
      )
      .finally(() => setLoading(false));
  }, [user, authLoading, router, t, lang]);

  async function copy(text: string, key: "pix" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== "PERSONAL" && user.role !== "NUTRITIONIST")) return null;

  const plan = data?.plan;

  const hasDiscount = (plan?.referralDiscountMonths ?? 0) > 0;
  const planPrice = plan?.monthlyPrice ?? MONTHLY_FEE;
  const fee = plan?.totalFee ?? (hasDiscount ? planPrice - REFERRAL_DISCOUNT : planPrice);
  const baseFee = plan?.lifetime ? 0 : plan?.baseFee ?? planPrice;
  const extraStudents = plan?.extraStudents ?? 0;
  const extraFee = plan?.extraFee ?? 0;
  const limit = plan?.studentLimit ?? 10;
  const studentsCount = data?.studentsCount ?? 0;
  const full = !plan?.lifetime && studentsCount >= limit;

  return (
    <AppLayout title={t("bill.title")}>
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold mb-1">{t("bill.title")}</h1>
          <p className="text-muted">{t("bill.subtitle")}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 border-accent/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <h2 className="font-semibold">{t("bill.currentInvoice")}</h2>
              {status && <StatusPill {...status} />}
            </div>

            <p className="text-sm font-semibold">
              {t("dash.planLine", { limit, s: limit !== 1 ? "s" : "", fee: fee.toFixed(2).replace(".", ",") })}
            </p>
            <p className="text-xs text-muted mt-1">
              {t("dash.studentsUsed", { studentsCount, limit, s: limit !== 1 ? "s" : "" })}
              {full && extraStudents === 0 && <span className="text-red-400 font-medium">{t("dash.limitReached")}</span>}
              {hasDiscount && (
                <span className="text-green-400 font-medium">
                  {t("dash.referralDiscount", { amount: REFERRAL_DISCOUNT.toFixed(2).replace(".", ",") })}
                </span>
              )}
            </p>

            <div className="mt-2 rounded-lg bg-bg border border-border text-xs p-3 space-y-1">
              <div className="flex justify-between text-muted">
                <span>{t("bill.baseFee")}</span>
                <span>R$ {baseFee.toFixed(2).replace(".", ",")}</span>
              </div>
              {hasDiscount && !plan?.lifetime && (
                <div className="flex justify-between text-green-400">
                  <span>{t("bill.referralDiscountLine")}</span>
                  <span>- R$ {REFERRAL_DISCOUNT.toFixed(2).replace(".", ",")}</span>
                </div>
              )}
              {extraStudents > 0 && !plan?.lifetime && (
                <div className="flex justify-between text-amber-400">
                  <span>
                    {t("bill.extraStudents", { n: extraStudents, fee: EXTRA_STUDENT_PRICE.toFixed(2).replace(".", ",") })}
                  </span>
                  <span>+ R$ {extraFee.toFixed(2).replace(".", ",")}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-white pt-1 border-t border-border">
                <span>{t("bill.total")}</span>
                <span>R$ {fee.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>

            <p className="text-xs text-muted mt-2">{t("dash.payPix")}</p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-bg border border-border rounded-md px-2 py-1 font-mono break-all">
                {PIX_KEY}
              </code>
              <button
                onClick={() => copy(PIX_KEY, "pix")}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors shrink-0"
              >
                {copied === "pix" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === "pix" ? t("common.copied") : t("common.copy")}
              </button>
              <Link
                href="/pix"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-white transition-colors shrink-0"
              >
                {t("dash.seeCard")} &#8599;
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400" />
                  {t("dash.referralProgram")}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {hasDiscount
                    ? t("dash.referralGot", {
                        amount: REFERRAL_DISCOUNT.toFixed(2).replace(".", ","),
                        months: REFERRAL_DISCOUNT_MONTHS,
                      })
                    : t("dash.referralInvite", {
                        amount: REFERRAL_DISCOUNT.toFixed(2).replace(".", ","),
                        months: REFERRAL_DISCOUNT_MONTHS,
                      })}
                </p>
                {plan?.referralCode && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="text-xs bg-bg border border-border rounded-md px-2 py-1 font-mono">
                      {plan.referralCode}
                    </code>
                    <button
                      onClick={() => copy(plan.referralCode!, "code")}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors shrink-0"
                    >
                      {copied === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === "code" ? t("common.copied") : t("common.copy")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-muted bg-bg rounded-lg p-3 space-y-1">
              <p className="font-semibold text-muted">{t("dash.planTable")}</p>
              <p>{t("dash.tableRow1", { fee: MONTHLY_FEE.toFixed(2).replace(".", ",") })}</p>
              <p>{t("dash.tableRow2", { fee: EXTRA_STUDENT_PRICE.toFixed(2).replace(".", ",") })}</p>
              <p>{t("dash.tableRow3", { fee: PACK5_PRICE.toFixed(2).replace(".", ",") })}</p>
              <p>{t("dash.tableRow4", { fee: PACK10_PRICE.toFixed(2).replace(".", ",") })}</p>
              <p className="text-muted/70 pt-1">{t("dash.tableNote")}</p>
            </div>
          </Card>
        </div>

        <Card>
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">{t("bill.paymentHistory")}</h2>
          </div>
          {(data?.payments.length ?? 0) === 0 ? (
            <div className="px-5 py-8 text-center text-muted text-sm">
              {t("bill.noPayments")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border">
                    <th className="px-5 py-3 font-medium">{t("bill.reference")}</th>
                    <th className="px-5 py-3 font-medium">{t("bill.amount")}</th>
                    <th className="px-5 py-3 font-medium">{t("bill.date")}</th>
                    <th className="px-5 py-3 font-medium">{t("bill.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-white">{p.reference || "—"}</td>
                      <td className="px-5 py-3">R$ {p.amount.toFixed(2).replace(".", ",")}</td>
                      <td className="px-5 py-3 text-muted">
                        {localeDate(p.paidAt ?? p.createdAt, lang)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill
                          value={p.status === "PAID" ? t("bill.statusPaid") : t("bill.statusPending")}
                          tone={p.status === "PAID" ? "green" : "blue"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}