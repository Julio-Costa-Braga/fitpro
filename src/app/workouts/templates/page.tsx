"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Dumbbell, Plus, Pencil, Trash2, Send, ArrowLeft, Layers, CalendarDays } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { dayOfWeekKeys } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  gifUrl?: string | null;
}

interface WTemplateExercise {
  id: string;
  order: number;
  sets: number;
  reps: string;
  initialLoad?: string | null;
  restTime: number;
  exercise: Exercise;
}

interface WTemplate {
  id: string;
  name: string;
  description?: string | null;
  level: "INICIANTE" | "MODERADO" | "AVANCADO";
  isPreset: boolean;
  exercises: WTemplateExercise[];
}

interface Student {
  id: string;
  name: string;
}

const LEVEL_META: Record<string, { labelKey: string; badge: string }> = {
  INICIANTE: { labelKey: "common.level.beginner", badge: "bg-green-500/15 text-green-400" },
  MODERADO: { labelKey: "common.level.intermediate", badge: "bg-blue-500/15 text-blue-400" },
  AVANCADO: { labelKey: "common.level.advanced", badge: "bg-red-500/15 text-red-400" },
};

const DAY_LETTERS = ["A", "B", "C", "D", "E", "F"];
const dayLetterColor: Record<string, string> = {
  A: "bg-accent/15 text-accent",
  B: "bg-blue-500/15 text-blue-400",
  C: "bg-green-500/15 text-green-400",
  D: "bg-yellow-500/15 text-yellow-400",
  E: "bg-red-500/15 text-red-400",
  F: "bg-pink-500/15 text-pink-400",
};

const WEEKDAY_LABELS: Record<string, string> = {
  "": "common.none",
  Segunda: "common.week.monday",
  Terca: "common.week.tuesday",
  Quarta: "common.week.wednesday",
  Quinta: "common.week.thursday",
  Sexta: "common.week.friday",
  Sabado: "common.week.saturday",
  Domingo: "common.week.sunday",
};

export default function WorkoutTemplatesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [templates, setTemplates] = useState<WTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applyTarget, setApplyTarget] = useState<WTemplate | null>(null);
  const [applyForm, setApplyForm] = useState({ studentId: "", dayLetter: "A", dayOfWeek: "" });
  const [applying, setApplying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.get<{ templates: WTemplate[] }>("/api/workout-templates");
      setTemplates(data.templates);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("wk.errLoadModels"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    loadTemplates();
  }, [user, token, authLoading, router, loadTemplates]);

  useEffect(() => {
    if (!applyTarget) return;
    api
      .get<{ students: Student[] }>("/api/students")
      .then((data) => setStudents(data.students))
      .catch(() => setStudents([]));
  }, [applyTarget]);

  async function handleApply() {
    if (!applyTarget || !applyForm.studentId) return;
    setApplying(true);
    setError("");
    try {
      const data = await api.post<{ workout: { id: string } }>(
        `/api/workout-templates/${applyTarget.id}/apply`,
        {
          studentId: applyForm.studentId,
          dayLetter: applyForm.dayLetter,
          dayOfWeek: applyForm.dayOfWeek || undefined,
        }
      );
      setApplyTarget(null);
      setApplyForm({ studentId: "", dayLetter: "A", dayOfWeek: "" });
      router.push(`/workouts/${data.workout.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("wk.errApplyTemplate"));
    } finally {
      setApplying(false);
    }
  }

  async function handleDelete(tpl: WTemplate) {
    if (!confirm(t("wk.confirmDeleteModel", { name: tpl.name }))) return;
    setDeletingId(tpl.id);
    try {
      await api.delete(`/api/workout-templates/${tpl.id}`);
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("wk.errDeleteModel"));
    } finally {
      setDeletingId(null);
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

  const grouped = (["INICIANTE", "MODERADO", "AVANCADO"] as const)
    .map((level) => ({ level, items: templates.filter((t) => t.level === level) }))
    .filter((g) => g.items.length > 0);

  return (
    <AppLayout title={t("wk.modelTitle")}>
      <div className="space-y-6 animate-fadeIn">
        <Link
          href="/workouts"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("wk.backList")}
        </Link>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("wk.modelTitle")}</h1>
            <p className="text-muted text-sm">
              {t("wk.modelSubtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<CalendarDays className="w-4 h-4" />}
              onClick={() => router.push("/workouts/week")}
            >
              {t("wk.weekChip")}
            </Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push("/workouts/templates/new")}>
              {t("wk.newModel")}
            </Button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <Card className="p-12 text-center">
            <Layers className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">{t("wk.noModels")}</p>
          </Card>
        ) : (
          grouped.map(({ level, items }) => (
            <div key={level} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${LEVEL_META[level].badge}`}>
                  {t(LEVEL_META[level].labelKey)}
                </span>
                <span className="text-xs text-muted">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((tpl) => {
                  const levelMeta = LEVEL_META[tpl.level];
                  return (
                    <Card key={tpl.id} className="flex flex-col h-full">
                      <CardContent className="flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                              <Dumbbell className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm leading-tight truncate">{tpl.name}</h3>
                              <p className="text-xs text-muted">
                                {t("wk.modelExercises", { n: tpl.exercises.length, s: tpl.exercises.length !== 1 ? "s" : "" })}
                              </p>
                            </div>
                          </div>
                          {tpl.isPreset && <Badge variant="default">{t("wk.isDefault")}</Badge>}
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-muted/80 mb-3 line-clamp-2">{tpl.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${levelMeta.badge}`}>
                            {t(levelMeta.labelKey)}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            icon={<Send className="w-3.5 h-3.5" />}
                            onClick={() => setApplyTarget(tpl)}
                          >
                            {t("wk.applyToStudent")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => router.push(`/workouts/templates/${tpl.id}`)}
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            loading={deletingId === tpl.id}
                            onClick={() => handleDelete(tpl)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={!!applyTarget}
        onClose={() => setApplyTarget(null)}
        title={t("wk.applyModalTitle")}
      >
        <div className="space-y-4">
          {applyTarget && (
            <div className="flex items-center gap-2 text-sm bg-bg rounded-lg px-3 py-2.5">
              <Dumbbell className="w-4 h-4 text-accent shrink-0" />
              <span className="font-medium">{applyTarget.name}</span>
              <span className="text-muted text-xs">
                {t("wk.applyCount", { n: applyTarget.exercises.length })}
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("wk.studentLabel")}</label>
            <select
              value={applyForm.studentId}
              onChange={(e) => setApplyForm((f) => ({ ...f, studentId: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
            >
              <option value="">{t("wk.selectStudent")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("wk.dayLetter")}</label>
            <div className="flex gap-2">
              {DAY_LETTERS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setApplyForm((f) => ({ ...f, dayLetter: letter }))}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    applyForm.dayLetter === letter
                      ? dayLetterColor[letter]
                      : "bg-card border border-border text-muted hover:text-white"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("wk.dayOfWeek")}</label>
            <select
              value={applyForm.dayOfWeek}
              onChange={(e) => setApplyForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
            >
              {dayOfWeekKeys.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(WEEKDAY_LABELS[opt.value] ?? opt.value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setApplyTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="flex-1"
              loading={applying}
              disabled={!applyForm.studentId}
              onClick={handleApply}
            >
              {t("wk.createForStudent")}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}