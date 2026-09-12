"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Apple, Plus, Pencil, Trash2, Send, ArrowLeft, Layers, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface TemplateMeal {
  id: string;
  name: string;
  time: string;
  order: number;
  foods: { id: string }[];
}

interface DietTemplate {
  id: string;
  name: string;
  description?: string | null;
  level: "INICIANTE" | "MODERADO" | "AVANCADO";
  isPreset: boolean;
  meals: TemplateMeal[];
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

export default function DietTemplatesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applyTarget, setApplyTarget] = useState<DietTemplate | null>(null);
  const [applyStudentId, setApplyStudentId] = useState("");
  const [applying, setApplying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.get<{ templates: DietTemplate[] }>("/api/diet-templates");
      setTemplates(data.templates);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("diet.errLoadModels"));
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
    if (!applyTarget || !applyStudentId) return;
    setApplying(true);
    setError("");
    try {
      const data = await api.post<{ dietPlan: { id: string } }>(
        `/api/diet-templates/${applyTarget.id}/apply`,
        { studentId: applyStudentId }
      );
      setApplyTarget(null);
      setApplyStudentId("");
      router.push(`/diets/${data.dietPlan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("diet.errApply"));
    } finally {
      setApplying(false);
    }
  }

  async function handleDelete(tmpl: DietTemplate) {
    if (!confirm(t("diet.confirmDeleteModel", { name: tmpl.name }))) return;
    setDeletingId(tmpl.id);
    try {
      await api.delete(`/api/diet-templates/${tmpl.id}`);
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("diet.errDeleteModel"));
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
    <AppLayout title={t("diet.templatesTitle")}>
      <div className="space-y-6 animate-fadeIn">
        <Link
          href="/diets"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("diet.backList")}
        </Link>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("diet.templatesTitle")}</h1>
            <p className="text-muted text-sm">
              {t("diet.templatesSubtitle")}
            </p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push("/diets/templates/new")}>
            {t("diet.newModel")}
          </Button>
        </div>

        {grouped.length === 0 ? (
          <Card className="p-12 text-center">
            <Layers className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">{t("diet.noModels")}</p>
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
                {items.map((tmpl) => {
                  const totalFoods = tmpl.meals.reduce((s, m) => s + m.foods.length, 0);
                  return (
                    <Card key={tmpl.id} className="flex flex-col h-full">
                      <CardContent className="flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                              <Apple className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm leading-tight truncate">{tmpl.name}</h3>
                              <p className="text-xs text-muted">
                                {t(tmpl.meals.length === 1 ? "diet.mealCountOne" : "diet.mealCountMany", { n: tmpl.meals.length })} · {t(totalFoods === 1 ? "diet.foodCountOne" : "diet.foodCountMany", { n: totalFoods })}
                              </p>
                            </div>
                          </div>
                          {tmpl.isPreset && <Badge variant="default">{t("diet.presetLabel")}</Badge>}
                        </div>
                        {tmpl.description && (
                          <p className="text-xs text-muted/80 mb-3 line-clamp-2">{tmpl.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${LEVEL_META[tmpl.level].badge}`}>
                            {t(LEVEL_META[tmpl.level].labelKey)}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/10 text-muted font-semibold flex items-center gap-1">
                            <UtensilsCrossed className="w-3 h-3" /> {tmpl.meals.length}x
                          </span>
                        </div>
                        <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            icon={<Send className="w-3.5 h-3.5" />}
                            onClick={() => setApplyTarget(tmpl)}
                          >
                            {t("diet.applyShort")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => router.push(`/diets/templates/${tmpl.id}`)}
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            loading={deletingId === tmpl.id}
                            onClick={() => handleDelete(tmpl)}
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
        title={t("diet.applyTitle")}
      >
        <div className="space-y-4">
          {applyTarget && (
            <div className="flex items-center gap-2 text-sm bg-bg rounded-lg px-3 py-2.5">
              <Apple className="w-4 h-4 text-accent shrink-0" />
              <span className="font-medium">{applyTarget.name}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("diet.studentLabel")}</label>
            <select
              value={applyStudentId}
              onChange={(e) => setApplyStudentId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
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
            <Button variant="secondary" className="flex-1" onClick={() => setApplyTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1" loading={applying} disabled={!applyStudentId} onClick={handleApply}>
              {t("diet.applyCreate")}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}