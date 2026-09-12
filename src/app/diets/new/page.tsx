"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Apple } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Student {
  id: string;
  name: string;
}

interface DietPlan {
  id: string;
}

export default function NewDietPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", studentId: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ students: Student[] }>("/api/students")
      .then((data) => setStudents(data.students))
      .catch(() => setError(t("diet.errLoadStudents")))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.studentId) return;
    setCreating(true);
    setError("");
    try {
      const data = await api.post<{ dietPlan: DietPlan }>("/api/diets", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        studentId: form.studentId,
      });
      router.push(`/diets/${data.dietPlan.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("diet.errCreate"));
      setCreating(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout title={t("diet.newTitle")}>
      <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
        <Link
          href="/diets"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("diet.backList")}
        </Link>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("diet.newTitle")}</h1>
              <p className="text-sm text-muted">{t("diet.newSubtitle")}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("diet.nameLabel")}
              placeholder={t("diet.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label={t("wk.description")}
              placeholder={t("diet.descPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted">{t("diet.studentLabel")}</label>
              <select
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                required
                disabled={loading}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all disabled:opacity-50"
              >
                <option value="">{t("diet.selectStudent")}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/diets")}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={creating} className="flex-1">
                {t("diet.create")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}