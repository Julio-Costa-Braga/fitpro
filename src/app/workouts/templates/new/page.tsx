"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers, Dumbbell } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "next/link";

const LEVELS = [
  { value: "INICIANTE", labelKey: "common.level.beginner" },
  { value: "MODERADO", labelKey: "common.level.intermediate" },
  { value: "AVANCADO", labelKey: "common.level.advanced" },
];

export default function NewWorkoutTemplatePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", description: "", level: "INICIANTE" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const data = await api.post<{ template: { id: string } }>("/api/workout-templates", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        level: form.level,
      });
      router.push(`/workouts/templates/${data.template.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("wk.errCreateModel"));
      setCreating(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout title={t("wk.newModelTitle")}>
      <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
        <Link
          href="/workouts/templates"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("wk.backModels")}
        </Link>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("wk.newModelTitle")}</h1>
              <p className="text-sm text-muted">{t("wk.newModelSubtitle")}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("wk.tmplNameLabel")}
              placeholder={t("wk.tmplNamePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Textarea
              label={t("wk.description")}
              placeholder={t("wk.tmplDescPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted">{t("wk.studentLevel")}</label>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, level: lvl.value }))}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      form.level === lvl.value
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-border bg-card text-muted hover:text-white"
                    }`}
                  >
                    {t(lvl.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/workouts/templates")}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={creating} className="flex-1" icon={<Dumbbell className="w-4 h-4" />}>
                {t("wk.createModel")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}