"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { api } from "@/lib/api";

export default function ChangePasswordPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError(t("cp.errShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("cp.errMismatch"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      updateUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("cp.errSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-xl font-bold">{t("cp.title")}</h1>
          <p className="text-muted text-sm">
            {t("cp.subtitle")}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">{t("cp.current")}</label>
            <input
              type="password"
              placeholder={t("cp.currentPlaceholder")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">{t("cp.new")}</label>
            <input
              type="password"
              placeholder={t("auth.passwordMin")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">{t("cp.confirm")}</label>
            <input
              type="password"
              placeholder={t("cp.confirmPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("cp.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}