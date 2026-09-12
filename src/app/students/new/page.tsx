"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface NewStudent {
  id: string;
}

export default function NewStudentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const data = await api.post<{ student: NewStudent }>("/api/students", {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      router.push(`/students/${data.student.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("stu.errCreate"));
      setCreating(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout title={t("stu.new")}>
      <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
        <Link
          href="/students"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("stu.backList")}
        </Link>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("stu.new")}</h1>
              <p className="text-sm text-muted">{t("stu.newSubtitle")}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("stu.formName")}
              placeholder={t("auth.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label={t("auth.email")}
              type="email"
              placeholder={t("stu.emailPlaceholder")}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label={t("stu.phoneLabel")}
              placeholder={t("stu.phonePlaceholder")}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label={t("stu.accessPassLabel")}
              type="password"
              placeholder={t("stu.accessPassPlaceholder")}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/students")}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={creating} className="flex-1">
                {t("stu.new")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}