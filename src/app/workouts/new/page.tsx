"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { dayOfWeekKeys } from "@/lib/i18n/dictionaries";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
}

const DAY_LETTERS = ["A", "B", "C", "D", "E", "F"];

const dayLetterColor: Record<string, string> = {
  A: "bg-accent/15 text-accent",
  B: "bg-blue-500/15 text-blue-400",
  C: "bg-green-500/15 text-green-400",
  D: "bg-yellow-500/15 text-yellow-400",
  E: "bg-red-500/15 text-red-400",
  F: "bg-pink-500/15 text-pink-400",
};

export default function NewWorkoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    studentId: "",
    dayLetter: "A",
    dayOfWeek: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ students: Student[] }>("/api/students")
      .then((data) => setStudents(data.students))
      .catch(() => setError(t("wk.errLoadStudents")))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.studentId) return;
    setCreating(true);
    setError("");
    try {
      const workout = await api.post<{ id: string }>("/api/workouts", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        studentId: form.studentId,
        dayLetter: form.dayLetter,
        dayOfWeek: form.dayOfWeek || undefined,
      });
      router.push(`/workouts/${workout.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("wk.errCreate"));
      setCreating(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout title={t("wk.newWorkout")}>
      <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
        <Link
          href="/workouts"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("wk.backList")}
        </Link>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("wk.newWorkout")}</h1>
              <p className="text-sm text-muted">{t("wk.subtitle")}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("wk.workoutName")}
              placeholder={t("wk.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label={t("wk.description")}
              placeholder={t("wk.descPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted">{t("wk.student")}</label>
              <select
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                required
                disabled={loading}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all disabled:opacity-50"
              >
                <option value="">{t("common.selectStudent")}</option>
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
                    onClick={() => setForm((f) => ({ ...f, dayLetter: letter }))}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                      form.dayLetter === letter
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
                value={form.dayOfWeek}
                onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
              >
                <option value="">—</option>
                {dayOfWeekKeys.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.key)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/workouts")}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={creating} className="flex-1">
                {t("wk.newWorkout")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}