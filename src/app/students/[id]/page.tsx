"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Mail, Phone, Calendar, Dumbbell, Apple, TrendingUp, Plus, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DayLetterBadge } from "@/components/ui/DayLetterBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { dateLocale } from "@/lib/i18n/dictionaries";

interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface Workout {
  id: string;
  name: string;
  dayLetter: string;
  dayOfWeek: string | null;
  isActive: boolean;
  createdAt: string;
  exercises: { exercise: { name: string; muscleGroup: string }; sets: number; reps: string }[];
}

interface DietPlan {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  dailyCalories: number | null;
  dailyProtein: number | null;
  dailyCarbs: number | null;
  dailyFat: number | null;
  createdAt: string;
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
}

interface StudentStats {
  totalWorkouts: number;
  completedSessions: number;
  totalSessions: number;
  completionRate: number;
  latestProgress: { weight: number | null } | null;
}

export default function StudentDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { t, lang } = useLanguage();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [progress, setProgress] = useState<ProgressLog[]>([]);
  const [activeTab, setActiveTab] = useState("workouts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({
    weight: "", bodyFat: "", chest: "", waist: "", arm: "", thigh: "", notes: "",
  });
  const [savingProgress, setSavingProgress] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [studentData, workoutsData, dietsData, progressData, statsData] = await Promise.all([
        api.get<{ student: Student }>(`/api/students/${studentId}`),
        api.get<Workout[]>(`/api/workouts?studentId=${studentId}`),
        api.get<{ dietPlans: DietPlan[] }>(`/api/diets?studentId=${studentId}`).catch(() => ({ dietPlans: [] })),
        api.get<ProgressLog[]>(`/api/progress?studentId=${studentId}`).catch(() => []),
        api.get<StudentStats>(`/api/stats/student?studentId=${studentId}`).catch(() => ({
          totalWorkouts: 0, completedSessions: 0, totalSessions: 0, completionRate: 0, latestProgress: null,
        })),
      ]);
      setStudent(studentData.student);
      setWorkouts(workoutsData);
      setDiets(dietsData.dietPlans);
      setProgress(progressData);
      setStats(statsData);
    } catch {
      setError(t("stu.errLoadDetail"));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }
    loadAll();
  }, [user, authLoading, router, loadAll]);

  async function handleAddProgress() {
    setSavingProgress(true);
    try {
      await api.post("/api/progress", {
        studentId,
        weight: progressForm.weight ? Number(progressForm.weight) : undefined,
        bodyFat: progressForm.bodyFat ? Number(progressForm.bodyFat) : undefined,
        chest: progressForm.chest ? Number(progressForm.chest) : undefined,
        waist: progressForm.waist ? Number(progressForm.waist) : undefined,
        arm: progressForm.arm ? Number(progressForm.arm) : undefined,
        thigh: progressForm.thigh ? Number(progressForm.thigh) : undefined,
        notes: progressForm.notes || undefined,
      });
      setProgressForm({ weight: "", bodyFat: "", chest: "", waist: "", arm: "", thigh: "", notes: "" });
      setShowProgressForm(false);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("stu.errSaveProgress"));
    } finally {
      setSavingProgress(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <AppLayout title={t("stu.notFound")}>
        <Card className="p-12 text-center">
          <p className="text-muted">{t("stu.notFound")}</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push("/students")}>
            {t("stu.back")}
          </Button>
        </Card>
      </AppLayout>
    );
  }

  const tabs = [
    { id: "workouts", label: t("nav.workouts"), icon: <Dumbbell className="w-4 h-4" />, count: workouts.length },
    { id: "diets", label: t("nav.diets"), icon: <Apple className="w-4 h-4" />, count: diets.length },
    { id: "progress", label: t("nav.progress"), icon: <TrendingUp className="w-4 h-4" />, count: progress.length },
  ];

  return (
    <AppLayout title={student.name}>
      <div className="space-y-6 animate-fadeIn">
        <button onClick={() => router.push("/students")} className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("stu.backList")}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center text-accent font-bold text-xl shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{student.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted mt-1">
                {student.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{student.email}</span>}
                {student.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{student.phone}</span>}
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{t("stu.since", { date: new Date(student.createdAt).toLocaleDateString(dateLocale(lang)) })}</span>
              </div>
            </div>
          </div>
        </Card>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
              <p className="text-xs text-muted mt-1">{t("nav.workouts")}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.completionRate}%</p>
              <p className="text-xs text-muted mt-1">{t("stu.completion")}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.latestProgress?.weight ? `${stats.latestProgress.weight}kg` : "-"}</p>
              <p className="text-xs text-muted mt-1">{t("stu.currentWeight")}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.completedSessions}/{stats.totalSessions}</p>
              <p className="text-xs text-muted mt-1">{t("stu.sessions")}</p>
            </Card>
          </div>
        )}

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "workouts" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link href={`/workouts/new?studentId=${studentId}`}>
                <Button icon={<Plus className="w-4 h-4" />}>{t("stu.newWorkout")}</Button>
              </Link>
            </div>
            {workouts.length === 0 ? (
              <Card className="p-8 text-center">
                <Dumbbell className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">{t("stu.noWorkouts")}</p>
              </Card>
            ) : (
              workouts.map((w) => (
                <Card key={w.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{w.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <DayLetterBadge letter={w.dayLetter} className="w-5 h-5 rounded-md text-[10px]" />
                        <span className="text-xs text-muted">{w.dayOfWeek || "—"}</span>
                      </div>
                    </div>
                    <Badge variant={w.isActive ? "success" : "default"}>
                      {w.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted">
                    {w.exercises.length} exercicio{w.exercises.length !== 1 ? "s" : ""}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "diets" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link href={`/diets?studentId=${studentId}&create=1`}>
                <Button icon={<Plus className="w-4 h-4" />}>{t("stu.newDiet")}</Button>
              </Link>
            </div>
            {diets.length === 0 ? (
              <Card className="p-8 text-center">
                <Apple className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">{t("stu.noDiets")}</p>
              </Card>
            ) : (
              diets.map((d) => (
                <Card
                  key={d.id}
                  hover
                  onClick={() => router.push(`/diets/${d.id}`)}
                  className="p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{d.name}</h3>
                      {d.description && <p className="text-xs text-muted mt-0.5">{d.description}</p>}
                      {d.dailyCalories && (
                        <p className="text-xs text-muted mt-1">{d.dailyCalories} kcal/dia</p>
                      )}
                    </div>
                    <Badge variant={d.isActive ? "success" : "default"}>
                      {d.isActive ? t("stu.activeF") : t("stu.inactiveF")}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "progress" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowProgressForm(true)}>
                {t("stu.addRecord")}
              </Button>
            </div>

            {progress.length > 0 && (
              <Card className="p-4">
                <p className="text-sm font-medium mb-3">{t("stu.weightEvolution")}</p>
                <div className="space-y-2">
                  {progress.slice().reverse().map((p) => {
                    if (!p.weight) return null;
                    const maxW = Math.max(...progress.filter((x) => x.weight).map((x) => x.weight!));
                    const pct = maxW > 0 ? (p.weight / maxW) * 100 : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3 text-xs">
                        <span className="w-16 text-muted shrink-0">{new Date(p.date).toLocaleDateString(dateLocale(lang), { day: "2-digit", month: "2-digit" })}</span>
                        <div className="flex-1 bg-bg rounded-full h-4 overflow-hidden">
                          <div className="h-full bg-accent/40 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-14 text-right font-medium shrink-0">{p.weight}kg</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {progress.length === 0 ? (
              <Card className="p-8 text-center">
                <TrendingUp className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">{t("stu.noProgress")}</p>
              </Card>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                {progress.map((p) => (
                  <div key={p.id} className="relative mb-4">
                    <div className="absolute -left-4 top-4 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg" />
                    <Card className="p-4 ml-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted">{new Date(p.date).toLocaleDateString(dateLocale(lang))}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {p.weight && <div><span className="text-muted">{t("stu.rec.weight")}</span> <span className="font-medium">{p.weight} kg</span></div>}
                        {p.bodyFat && <div><span className="text-muted">{t("stu.rec.bodyFat")}</span> <span className="font-medium">{p.bodyFat}%</span></div>}
                        {p.chest && <div><span className="text-muted">{t("stu.rec.chest")}</span> <span className="font-medium">{p.chest} cm</span></div>}
                        {p.waist && <div><span className="text-muted">{t("stu.rec.waist")}</span> <span className="font-medium">{p.waist} cm</span></div>}
                        {p.arm && <div><span className="text-muted">{t("stu.rec.arm")}</span> <span className="font-medium">{p.arm} cm</span></div>}
                        {p.thigh && <div><span className="text-muted">{t("stu.rec.thigh")}</span> <span className="font-medium">{p.thigh} cm</span></div>}
                      </div>
                      {p.notes && <p className="text-xs text-muted mt-2 italic">{p.notes}</p>}
                    </Card>
                  </div>
                ))}
              </div>
            )}

            <Modal open={showProgressForm} onClose={() => setShowProgressForm(false)} title={t("stu.newProgressTitle")} size="lg">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label={t("stu.form.weight")} type="number" step="0.1" placeholder="80.5" value={progressForm.weight} onChange={(e) => setProgressForm((f) => ({ ...f, weight: e.target.value }))} />
                  <Input label={t("stu.form.bodyFat")} type="number" step="0.1" placeholder="15.2" value={progressForm.bodyFat} onChange={(e) => setProgressForm((f) => ({ ...f, bodyFat: e.target.value }))} />
                  <Input label={t("stu.form.chest")} type="number" step="0.1" placeholder="100" value={progressForm.chest} onChange={(e) => setProgressForm((f) => ({ ...f, chest: e.target.value }))} />
                  <Input label={t("stu.form.waist")} type="number" step="0.1" placeholder="80" value={progressForm.waist} onChange={(e) => setProgressForm((f) => ({ ...f, waist: e.target.value }))} />
                  <Input label={t("stu.form.arm")} type="number" step="0.1" placeholder="35" value={progressForm.arm} onChange={(e) => setProgressForm((f) => ({ ...f, arm: e.target.value }))} />
                  <Input label={t("stu.form.thigh")} type="number" step="0.1" placeholder="55" value={progressForm.thigh} onChange={(e) => setProgressForm((f) => ({ ...f, thigh: e.target.value }))} />
                </div>
                <Textarea label={t("stu.form.notes")} placeholder={t("stu.form.notesPlaceholder")} value={progressForm.notes} onChange={(e) => setProgressForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setShowProgressForm(false)} className="flex-1">{t("common.cancel")}</Button>
                  <Button onClick={handleAddProgress} loading={savingProgress} className="flex-1">{t("common.save")}</Button>
                </div>
              </div>
            </Modal>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
