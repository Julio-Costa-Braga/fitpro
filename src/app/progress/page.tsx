"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, TrendingUp, ChevronDown, CalendarDays, AlertTriangle, CheckCircle2, Calculator, Dumbbell, Apple } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { dateLocale, type Lang } from "@/lib/i18n/dictionaries";

interface Student {
  id: string;
  name: string;
}

interface ProgressLog {
  id: string;
  date: string;
  weight: number | null;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  arm: number | null;
  thigh: number | null;
  notes: string | null;
  professional?: { id: string; name: string; role: "PERSONAL" | "NUTRITIONIST" } | null;
}

interface ProgressResponse {
  progress: ProgressLog[];
  reviewFrequencyDays: number;
  nextReviewDate: string;
  overdue: boolean;
}

interface ProgressInput {
  weight?: number | null;
  bodyFat?: number | null;
  chest?: number | null;
  waist?: number | null;
  arm?: number | null;
  thigh?: number | null;
}

interface ProgressionDay {
  date: string;
  completed: number;
  skipped: number;
  eaten: number;
}

interface ProgressionOverview {
  periodDays: number;
  workouts: {
    completed: number;
    skipped: number;
    total: number;
    completionRate: number;
    daily: ProgressionDay[];
  };
  diet: {
    eaten: number;
    skipped: number;
    total: number;
    adherenceRate: number;
    daily: ProgressionDay[];
  };
}

const MEASURES: { key: keyof ProgressInput; label: string; unit: string }[] = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "bodyFat", label: "Gordura", unit: "%" },
  { key: "chest", label: "Peito", unit: "cm" },
  { key: "waist", label: "Cintura", unit: "cm" },
  { key: "arm", label: "Braco", unit: "cm" },
  { key: "thigh", label: "Coxa", unit: "cm" },
];

const MEASURE_LABEL_KEYS: Record<string, string> = {
  Peso: "prog.measure.weight",
  Gordura: "prog.measure.bodyFat",
  Peito: "prog.measure.chest",
  Cintura: "prog.measure.waist",
  Braco: "prog.measure.arm",
  Coxa: "prog.measure.thigh",
};

function Delta({ value }: { value: number }) {
  const str = value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  return (
    <span
      className={
        value > 0
          ? "text-red-400"
          : value < 0
            ? "text-green-400"
            : "text-muted"
      }
    >
      {str}
    </span>
  );
}

function MiniBarChart({ data, valueKey, altKey, lang }: {
  data: ProgressionDay[];
  valueKey: "completed" | "eaten";
  altKey: "skipped";
  lang: Lang;
}) {
  const max = Math.max(...data.map((d) => (d[valueKey] || 0) + (d[altKey] || 0)), 1);
  return (
    <div className="flex items-end gap-1 h-14">
      {data.map((d) => {
        const v = d[valueKey] || 0;
        const a = d[altKey] || 0;
        const t = v + a;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            <div className="w-full flex flex-col justify-end h-12 rounded overflow-hidden">
              {t === 0 ? (
                <div className="w-full h-full bg-border/40" />
              ) : (
                <>
                  <div className="w-full bg-red-500/60" style={{ height: `${(a / max) * 100}%` }} />
                  <div className="w-full bg-green-500/60" style={{ height: `${(v / max) * 100}%` }} />
                </>
              )}
            </div>
            <span className="text-[9px] text-muted leading-none truncate">
              {new Date(d.date).toLocaleDateString(dateLocale(lang), { day: "2-digit" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [progress, setProgress] = useState<ProgressLog[]>([]);
  const [reviewFrequencyDays, setReviewFrequencyDays] = useState(30);
  const [nextReviewDate, setNextReviewDate] = useState<string | null>(null);
  const [overdue, setOverdue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [savingFreq, setSavingFreq] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState<ProgressionOverview | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    weight: "", bodyFat: "", chest: "", waist: "", arm: "", thigh: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [progressTab, setProgressTab] = useState<"personal" | "nutritionist">("personal");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }

    async function loadStudents() {
      try {
        const data = await api.get<{ students: Student[] }>("/api/students");
        setStudents(data.students);
        if (data.students.length > 0) {
          setSelectedStudentId(data.students[0].id);
        }
      } catch {
        setError(t("stu.errLoad"));
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [user, authLoading, router]);

  const loadProgress = useCallback(async (studentId: string) => {
    if (!studentId) return;
    setLoadingProgress(true);
    try {
      const [progressData, overviewData] = await Promise.all([
        api.get<ProgressResponse>(`/api/progress?studentId=${studentId}`),
        api.get<ProgressionOverview>(`/api/progress/overview?studentId=${studentId}`).catch(() => null),
      ]);
      setProgress(progressData.progress);
      setReviewFrequencyDays(progressData.reviewFrequencyDays);
      setNextReviewDate(progressData.nextReviewDate);
      setOverdue(progressData.overdue);
      setOverview(overviewData);
    } catch {
      setError(t("prog.errLoad"));
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) loadProgress(selectedStudentId);
  }, [selectedStudentId, loadProgress]);

  async function handleSave() {
    if (!selectedStudentId) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/progress", {
        studentId: selectedStudentId,
        weight: form.weight ? Number(form.weight) : undefined,
        bodyFat: form.bodyFat ? Number(form.bodyFat) : undefined,
        chest: form.chest ? Number(form.chest) : undefined,
        waist: form.waist ? Number(form.waist) : undefined,
        arm: form.arm ? Number(form.arm) : undefined,
        thigh: form.thigh ? Number(form.thigh) : undefined,
        notes: form.notes || undefined,
      });
      setForm({ weight: "", bodyFat: "", chest: "", waist: "", arm: "", thigh: "", notes: "" });
      setShowForm(false);
      await loadProgress(selectedStudentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("prog.errSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFrequency() {
    if (!selectedStudentId) return;
    setSavingFreq(true);
    setError("");
    try {
      await api.put(`/api/students/${selectedStudentId}`, {
        reviewFrequencyDays,
      });
      await loadProgress(selectedStudentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("prog.errSavePeriod"));
    } finally {
      setSavingFreq(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  const personalLogs = progress.filter(
    (p) => !p.professional || p.professional.role === "PERSONAL"
  );
  const nutritionLogs = progress.filter(
    (p) => p.professional?.role === "NUTRITIONIST"
  );
  const isStudentBoth =
    user?.role === "STUDENT" &&
    personalLogs.length > 0 &&
    nutritionLogs.length > 0;
  const viewProgress: ProgressLog[] = isStudentBoth
    ? progressTab === "personal"
      ? personalLogs
      : nutritionLogs
    : progress;
  const weightEntries = viewProgress.filter((p) => p.weight);
  const latestWeight = weightEntries.length > 0 ? weightEntries[0].weight : null;
  const firstWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const weightDiff = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <AppLayout title={t("nav.progress")}>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("nav.progress")}</h1>
            <p className="text-muted text-sm">{t("prog.subtitle")}</p>
          </div>
          {selectedStudentId && user?.role !== "STUDENT" && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
              {t("prog.newAssessment")}
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {students.length > 0 && user?.role !== "STUDENT" && (
          <Select
            label={t("prog.student")}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}

        {students.length === 0 && (
          <Card className="p-12 text-center">
            <TrendingUp className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">{t("prog.noStudents")}</p>
          </Card>
        )}

        {selectedStudentId && !loadingProgress && nextReviewDate && (
          <Card className={overdue ? "p-5 border-red-500/30" : "p-5 border-accent/20"}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    overdue ? "bg-red-500/10 text-red-400" : "bg-accent/10 text-accent"
                  }`}
                >
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {t("prog.nextReview")}
                    {overdue ? (
                      <Badge variant="danger">
                        <AlertTriangle className="w-3 h-3" /> {t("common.late")}
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3" /> {t("common.ontime")}
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    {overdue
                      ? t("prog.dueNow")
                      : t("prog.scheduled", {
                          date: new Date(nextReviewDate).toLocaleDateString(
                            dateLocale(lang),
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            }
                          ),
                          n: Math.max(0, Math.ceil((new Date(nextReviewDate).getTime() - Date.now()) / 86400000)),
                        })}
                  </p>
                  {user?.role === "STUDENT" && !overdue && (
                    <p className="text-xs text-muted mt-1">
                      {t("prog.studentEmpty")}
                    </p>
                  )}
                </div>
              </div>

              {user && user.role !== "STUDENT" && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("prog.every")}</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={7}
                        max={365}
                        className="w-24"
                        value={reviewFrequencyDays}
                        onChange={(e) => setReviewFrequencyDays(Number(e.target.value || 30))}
                      />
                      <span className="text-sm text-muted">{t("prog.days")}</span>
                      <Button variant="secondary" size="sm" onClick={handleSaveFrequency} loading={savingFreq}>
                        {t("common.save")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {selectedStudentId && loadingProgress && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        )}

        {selectedStudentId && !loadingProgress && (
          <>
            {isStudentBoth && (
              <div className="flex flex-wrap gap-2">
                <Button variant={progressTab === "personal" ? "primary" : "secondary"} size="sm" onClick={() => setProgressTab("personal")}>
                  {t("prog.tabPersonal")}
                </Button>
                <Button variant={progressTab === "nutritionist" ? "primary" : "secondary"} size="sm" onClick={() => setProgressTab("nutritionist")}>
                  {t("prog.tabNutritionist")}
                </Button>
              </div>
            )}
            {isStudentBoth && viewProgress.length === 0 && (
              <Card className="p-5">
                <p className="text-sm text-muted">{t("prog.nothingByProfessional")}</p>
              </Card>
            )}
            {!isStudentBoth && latestWeight && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{latestWeight}kg</p>
                  <p className="text-xs text-muted mt-1">{t("prog.currentWeight")}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{viewProgress[0]?.bodyFat ? `${viewProgress[0].bodyFat}%` : "-"}</p>
                  <p className="text-xs text-muted mt-1">{t("prog.measure.bodyFat")}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className={`text-2xl font-bold ${weightDiff && weightDiff < 0 ? "text-green-400" : weightDiff && weightDiff > 0 ? "text-red-400" : ""}`}>
                    {weightDiff != null ? `${weightDiff > 0 ? "+" : ""}${weightDiff.toFixed(1)}kg` : "-"}
                  </p>
                  <p className="text-xs text-muted mt-1">{t("prog.variation")}</p>
                </Card>
              </div>
            )}

            {viewProgress.length > 1 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium">{t("prog.sinceFirst")}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MEASURES.map((m) => {
                    const latest = viewProgress.find((x) => x[m.key]);
                    const first = [...viewProgress].reverse().find((x) => x[m.key]);
                    if (!latest || !first || latest[m.key] == null || first[m.key] == null) return null;
                    const value = (latest[m.key] as number) - (first[m.key] as number);
                    return (
                      <div key={m.key} className="bg-bg rounded-lg p-3 flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {t(MEASURE_LABEL_KEYS[m.label] ?? m.label)} ({m.unit})
                        </span>
                        <span className="text-sm font-semibold">
                          <Delta value={value} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {weightEntries.length > 1 && (
              <Card className="p-5">
                <p className="text-sm font-medium mb-4">{t("prog.weightEvolution")}</p>
                <div className="space-y-2">
                  {weightEntries.slice().reverse().map((p) => {
                    const weights = weightEntries.map((x) => x.weight!).filter(Boolean);
                    const minW = Math.min(...weights);
                    const maxW = Math.max(...weights);
                    const range = maxW - minW || 1;
                    const pct = ((p.weight! - minW) / range) * 80 + 10;
                    return (
                      <div key={p.id} className="flex items-center gap-3 text-xs">
                        <span className="w-20 text-muted shrink-0">
                          {new Date(p.date).toLocaleDateString(dateLocale(lang), { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </span>
                        <div className="flex-1 bg-bg rounded-full h-5 overflow-hidden relative">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent/50 to-accent transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                            {p.weight}kg
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {overview && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell className="w-4 h-4 text-accent" />
                    <h2 className="font-semibold text-sm">{t("prog.workoutProgression")}</h2>
                  </div>
                  {overview.workouts.total === 0 ? (
                    <p className="text-xs text-muted">{t("prog.noSessionRecords", { days: overview.periodDays })}</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-bold">{overview.workouts.completionRate}%</span>
                        <span className="text-xs text-muted">{t("prog.adherenceRate")}</span>
                      </div>
                      <p className="text-[11px] text-muted mb-3">
                        {overview.workouts.completed} {t("prog.completed")} &middot; {overview.workouts.skipped} {t("prog.skipped")}
                      </p>
                      <MiniBarChart data={overview.workouts.daily} valueKey="completed" altKey="skipped" lang={lang} />
                    </>
                  )}
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Apple className="w-4 h-4 text-accent" />
                    <h2 className="font-semibold text-sm">{t("prog.dietProgression")}</h2>
                  </div>
                  {overview.diet.total === 0 ? (
                    <p className="text-xs text-muted">{t("prog.noMealRecords", { days: overview.periodDays })}</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-bold">{overview.diet.adherenceRate}%</span>
                        <span className="text-xs text-muted">{t("prog.adherenceRate")}</span>
                      </div>
                      <p className="text-[11px] text-muted mb-3">
                        {overview.diet.eaten} {t("prog.eaten")} &middot; {overview.diet.skipped} {t("prog.skippedMeals")}
                      </p>
                      <MiniBarChart data={overview.diet.daily} valueKey="eaten" altKey="skipped" lang={lang} />
                    </>
                  )}
                </Card>
              </div>
            )}

            {viewProgress.length === 0 && !loadingProgress && (
              <Card className="p-8 text-center">
                <TrendingUp className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">{t("prog.noRecords")}</p>
              </Card>
            )}

            {viewProgress.length > 0 && (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                {viewProgress.map((p, index) => (
                  <div key={p.id} className="relative mb-4">
                    <div className="absolute -left-4 top-4 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg" />
                    <Card className="p-4 ml-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs text-muted">{new Date(p.date).toLocaleDateString(dateLocale(lang), { day: "2-digit", month: "long", year: "numeric" })}</p>
                        {index === 0 ? (
                          <Badge variant="success">{t("prog.sortRecent")}</Badge>
                        ) : (
                          <Badge variant="default">{t("prog.sortAssessment")}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {p.weight && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.weight}</p>
                            <p className="text-[10px] text-muted">{t("prog.form.weight")}</p>
                          </div>
                        )}
                        {p.bodyFat && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.bodyFat}%</p>
                            <p className="text-[10px] text-muted">{t("prog.form.bodyFat")}</p>
                          </div>
                        )}
                        {p.chest && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.chest}</p>
                            <p className="text-[10px] text-muted">{t("prog.form.chest")}</p>
                          </div>
                        )}
                        {p.waist && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.waist}</p>
                            <p className="text-[10px] text-muted">{t("prog.form.waist")}</p>
                          </div>
                        )}
                        {p.arm && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.arm}</p>
                            <p className="text-[10px] text-muted">{t("prog.form.arm")}</p>
                          </div>
                        )}
                        {p.thigh && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.thigh}</p>
                            <p className="text-[10px] text-muted">{t("prog.form.thigh")}</p>
                          </div>
                        )}
                      </div>
                      {index < viewProgress.length - 1 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-2 pt-2 border-t border-border/60">
                          <span className="text-muted/80">{t("prog.vsPrevious")}</span>
                          {MEASURES.map((m) => {
                            const current = p[m.key];
                            const prev = viewProgress[index + 1][m.key];
                            if (current == null || prev == null) return null;
                            const diff = (current as number) - (prev as number);
                            return (
                              <span key={m.key}>
                                {t(MEASURE_LABEL_KEYS[m.label] ?? m.label)}: <Delta value={diff} />
                                {m.unit}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {p.notes && <p className="text-xs text-muted mt-2 italic">{p.notes}</p>}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Modal open={showForm} onClose={() => setShowForm(false)} title={t("prog.newAssessment")} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label={t("prog.form.weight")} type="number" step="0.1" placeholder="80.5" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} />
              <Input label={t("prog.form.bodyFat")} type="number" step="0.1" placeholder="15.2" value={form.bodyFat} onChange={(e) => setForm((f) => ({ ...f, bodyFat: e.target.value }))} />
              <Input label={t("prog.form.chest")} type="number" step="0.1" placeholder="100" value={form.chest} onChange={(e) => setForm((f) => ({ ...f, chest: e.target.value }))} />
              <Input label={t("prog.form.waist")} type="number" step="0.1" placeholder="80" value={form.waist} onChange={(e) => setForm((f) => ({ ...f, waist: e.target.value }))} />
              <Input label={t("prog.form.arm")} type="number" step="0.1" placeholder="35" value={form.arm} onChange={(e) => setForm((f) => ({ ...f, arm: e.target.value }))} />
              <Input label={t("prog.form.thigh")} type="number" step="0.1" placeholder="55" value={form.thigh} onChange={(e) => setForm((f) => ({ ...f, thigh: e.target.value }))} />
            </div>
            <Textarea label={t("prog.notes")} placeholder={t("prog.notesPlaceholder")} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">{t("common.cancel")}</Button>
              <Button onClick={handleSave} loading={saving} className="flex-1">{t("common.save")}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
