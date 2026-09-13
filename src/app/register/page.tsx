"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function RegisterPage() {
  const { register, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [role, setRole] = useState<"PERSONAL" | "NUTRITIONIST">("PERSONAL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!authLoading && user) {
    router.replace("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ name, email, password, role, referralCode: referralCode.trim() || undefined });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.registerTitle");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-bg to-accent/10 animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,#8A2BE220,transparent_70%)]" />
        <div className="relative z-10 text-center px-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-accent" />
            </div>
            <span className="text-3xl font-bold tracking-tight">FitPro</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            {t("auth.heroRegister1")}
            <br />
            <span className="text-accent">{t("auth.heroRegister2")}</span>
          </h1>
          <p className="text-muted text-lg max-w-md">
            {t("auth.heroRegisterSubtitle")}
          </p>
        </div>
      </div>

      {/* Register form side */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile brand */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-accent" />
          </div>
          <span className="text-2xl font-bold tracking-tight">FitPro</span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1">{t("auth.registerTitle")}</h2>
          <p className="text-muted mb-8">
            {t("auth.registerSubtitle")}
          </p>

          <div className="bg-accent/10 border border-accent/20 text-accent text-xs font-medium rounded-lg px-4 py-3 mb-6 flex items-start gap-2">
            <span className="mt-0.5 shrink-0">&#9889;</span>
            <span>{t("auth.trialNote")}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5 text-muted">
                {t("auth.name")}
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-muted">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-muted">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordMin")}
                  className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="referralCode" className="block text-sm font-medium text-muted">
                {t("auth.referralCode")} <span className="text-accent">{t("common.optional")}</span>
              </label>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder={t("auth.referralCodePlaceholder")}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
              />
              <p className="text-xs text-muted">{t("auth.referralCodeHint")}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted">
                {t("auth.chooseRole")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("PERSONAL")}
                  className={`flex items-center gap-2.5 bg-card border rounded-lg px-3 py-3 text-left transition-colors ${
                    role === "PERSONAL" ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <span className="text-sm">&#129469;</span>
                  <div>
                    <p className="text-sm font-medium">{t("auth.personalTrainer")}</p>
                    <p className="text-xs text-muted">{t("auth.personalOnlyNote")}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("NUTRITIONIST")}
                  className={`flex items-center gap-2.5 bg-card border rounded-lg px-3 py-3 text-left transition-colors ${
                    role === "NUTRITIONIST" ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <span className="text-sm">&#129367;</span>
                  <div>
                    <p className="text-sm font-medium">{t("auth.nutritionist")}</p>
                    <p className="text-xs text-muted">{t("auth.nutritionOnlyNote")}</p>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("auth.creating")}
                </>
              ) : (
                t("auth.registerTitle")
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            {t("auth.haveAccount")}{" "}
            <Link href="/" className="text-accent hover:text-accent-hover font-medium transition-colors">
              {t("auth.loginLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
