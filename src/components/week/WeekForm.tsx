"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CalendarDays, Dumbbell } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const LEVELS = [
  { value: "INICIANTE", labelKey: "common.level.beginner" },
  { value: "MODERADO", labelKey: "common.level.intermediate" },
  { value: "AVANCADO", labelKey: "common.level.advanced" },
];

const WEEKDAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

const WEEKDAY_KEYS: Record<string, string> = {
  Segunda: "common.week.monday",
  Terca: "common.week.tuesday",
  Quarta: "common.week.wednesday",
  Quinta: "common.week.thursday",
  Sexta: "common.week.friday",
  Sabado: "common.week.saturday",
  Domingo: "common.week.sunday",
};

interface WTemplate {
  id: string;
  name: string;
  level: "INICIANTE" | "MODERADO" | "AVANCADO";
  isPreset: boolean;
  exercises: { id: string }[];
}

export function WeekForm({ weekId }: { weekId?: string }) {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [templates, setTemplates] = useState<WTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("INICIANTE");
  const [days, setDays] = useState<Record<string, string>>(
    Object.fromEntries(WEEKDAYS.map((d) => [d, ""]))
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    async function load() {
      try {
        const [tpls, week] = await Promise.all([
          api.get<{ templates: WTemplate[] }>("/api/workout-templates"),
          weekId ? api.weekTemplates.get(weekId) : Promise.resolve(null),
        ]);
        setTemplates(tpls.templates);
        if (week) {
          setName(week.week.name);
          setDescription(week.week.description ?? "");
          setLevel(week.week.level);
          const next: Record<string, string> = Object.fromEntries(
            WEEKDAYS.map((d) => [d, ""])
          );
          for (const day of week.week.days) {
            if (day.workoutTemplateId) next[day.weekday] = day.workoutTemplateId;
          }
          setDays(next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("wk.formErrLoad"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [weekId, user, token, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      level: level as "INICIANTE" | "MODERADO" | "AVANCADO",
      days: WEEKDAYS.filter((d) => days[d]).map((d) => ({
        weekday: d,
        workoutTemplateId: days[d],
      })),
    };
    if (payload.days.length === 0) {
      setError(t("wk.formNoModel"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (weekId) {
        await api.weekTemplates.update(weekId, payload);
      } else {
        await api.weekTemplates.create(payload);
      }
      router.push("/workouts/week");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("wk.formErrSave"));
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title={weekId ? t("wk.formTitleEdit") : t("wk.formTitleNew")}>
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <a
          href="/workouts/week"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("wk.formBack")}
        </a>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {weekId ? t("wk.formHeadingEdit") : t("wk.formHeadingNew")}
              </h1>
              <p className="text-sm text-muted">
                {t("wk.formSubtitle")}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label={t("wk.formNameLabel")}
                  placeholder={t("wk.formNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-muted">{t("wk.level")}</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {t(l.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Textarea
              label={t("wk.formDescLabel")}
              placeholder={t("wk.formDescPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted">{t("wk.formDaysLabel")}</label>
                <span className="text-xs text-muted">
                  {t("wk.formDaysFilled", { n: WEEKDAYS.filter((d) => days[d]).length })}
                </span>
              </div>

              {WEEKDAYS.map((d) => {
                const tpl = templates.find((tpl) => tpl.id === days[d]);
                return (
                  <div key={d} className="flex items-center gap-3">
                    <div className="w-24 shrink-0">
                      <span className="text-sm font-medium text-white">{t(WEEKDAY_KEYS[d])}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <select
                        value={days[d]}
                        onChange={(e) => setDays((prev) => ({ ...prev, [d]: e.target.value }))}
                        className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                      >
                        <option value="">{t("wk.formNoTraining")}</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                            {tpl.isPreset ? t("wk.formDefaultSuffix") : ""}
                          </option>
                        ))}
                      </select>
                      {tpl && (
                        <span className="text-xs text-muted shrink-0 hidden sm:inline">
                          {t("wk.formExCount", { n: tpl.exercises.length })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <a
                  href="/workouts/templates/new"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  {t("wk.formNewModelLink")}
                </a>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => router.push("/workouts/week")}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={saving} className="flex-1" disabled={templates.length === 0}>
                {weekId ? t("common.saveChanges") : t("wk.formCreateWeek")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}