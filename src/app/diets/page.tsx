"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Apple, Search, ChevronRight, Layers } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Student {
  id: string;
  name: string;
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
  student: { id: string; name: string };
  trainer?: { id: string; name: string; role: "PERSONAL" | "NUTRITIONIST" } | null;
  meals: { foods: { protein: number | null; carbs: number | null; fat: number | null; calories: number | null }[] }[];
  createdAt: string;
}

function MacroPill({ label, value, unit, color }: { label: string; value: number | null; unit: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-muted">{label}:</span>
      <span className="font-medium">{value != null ? `${value}${unit}` : "-"}</span>
    </div>
  );
}

export default function DietsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", studentId: "" });
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const studentsData = await api.get<{ students: Student[] }>("/api/students");
      setStudents(studentsData.students);

      const allDiets: DietPlan[] = [];
      for (const s of studentsData.students) {
        try {
          const data = await api.get<{ dietPlans: DietPlan[] }>(`/api/diets?studentId=${s.id}`);
          for (const d of data.dietPlans) {
            d.student = { id: s.id, name: s.name };
            allDiets.push(d);
          }
        } catch { /* skip */ }
      }
      setDiets(allDiets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      setError(t("diet.errLoad"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }
    loadData();
  }, [user, authLoading, router, loadData]);

  async function handleCreate() {
    if (!user || !form.name.trim() || !form.studentId) return;
    setCreating(true);
    setError("");
    try {
      const data = await api.post<{ dietPlan: DietPlan }>("/api/diets", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        studentId: form.studentId,
      });
      const studentName = students.find((s) => s.id === form.studentId)?.name || "";
      data.dietPlan.student = { id: form.studentId, name: studentName };
      data.dietPlan.trainer = { id: user.id, name: user.name, role: user.role as "PERSONAL" | "NUTRITIONIST" };
      data.dietPlan.meals = [];
      setDiets((prev) => [data.dietPlan, ...prev]);
      setForm({ name: "", description: "", studentId: "" });
      setShowCreate(false);
      router.push(`/diets/${data.dietPlan.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("diet.errCreate"));
    } finally {
      setCreating(false);
    }
  }

  const filtered = diets.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.student.name.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title={t("diet.title")}>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("diet.title")}</h1>
            <p className="text-muted text-sm">{t(diets.length === 1 ? "diet.planCountOne" : "diet.planCountMany", { n: diets.length })}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/diets/templates">
              <Button variant="secondary" icon={<Layers className="w-4 h-4" />}>
                {t("diet.models")}
              </Button>
            </Link>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              {t("diet.newPlan")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder={t("diet.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Apple className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">{t(diets.length === 0 ? "diet.empty" : "diet.noResults")}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((diet) => {
              const totalProtein = diet.meals.reduce((s, m) => s + m.foods.reduce((fs, f) => fs + (f.protein || 0), 0), 0);
              const totalCarbs = diet.meals.reduce((s, m) => s + m.foods.reduce((fs, f) => fs + (f.carbs || 0), 0), 0);
              const totalFat = diet.meals.reduce((s, m) => s + m.foods.reduce((fs, f) => fs + (f.fat || 0), 0), 0);

              return (
                <Card
                  key={diet.id}
                  hover
                  onClick={() => router.push(`/diets/${diet.id}`)}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{diet.name}</h3>
                        <Badge variant={diet.isActive ? "success" : "default"}>
                          {t(diet.isActive ? "common.active" : "common.inactive")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted">{t("diet.assignedTo")}{diet.student.name}</p>
                      {diet.trainer && (
                        <p className="text-xs text-muted mt-0.5 inline-flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded-full font-medium text-[10px] ${
                            diet.trainer.role === "NUTRITIONIST" ? "bg-purple-500/15 text-purple-400" : "bg-accent/15 text-accent"
                          }`}>
                            {diet.trainer.role === "NUTRITIONIST" ? t("admin.roleNutritionist") : t("admin.rolePersonal")}
                          </span>
                          {diet.trainer.name}
                        </p>
                      )}
                      {diet.description && (
                        <p className="text-xs text-muted mt-1 line-clamp-1">{diet.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-3">
                        <MacroPill label={t("diet.protShort")} value={diet.dailyProtein || totalProtein} unit="g" color="bg-red-400" />
                        <MacroPill label={t("diet.carbShort")} value={diet.dailyCarbs || totalCarbs} unit="g" color="bg-yellow-400" />
                        <MacroPill label={t("diet.fatShort")} value={diet.dailyFat || totalFat} unit="g" color="bg-blue-400" />
                        <MacroPill label={t("diet.kcalShort")} value={diet.dailyCalories} unit="" color="bg-green-400" />
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted shrink-0 mt-1" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("diet.newTitle")} size="md">
          <div className="space-y-4">
            <Select
              label={t("diet.studentLabel")}
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
              placeholder={t("common.selectStudent")}
              options={students.map((s) => ({ value: s.id, label: s.name }))}
            />
            <Input
              label={t("diet.nameLabel")}
              placeholder={t("diet.createNamePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Textarea
              label={t("wk.description")}
              placeholder={t("diet.planDescPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} loading={creating} className="flex-1">
                {t("diet.create")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
