"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2, ArrowLeft, Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, Apple, Clock, Layers,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Food {
  id: string;
  name: string;
  quantity: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  calories: number | null;
}

interface Meal {
  id: string;
  time: string;
  name: string;
  order: number;
  foods: Food[];
}

interface DietTemplate {
  id: string;
  name: string;
  description?: string | null;
  level: "INICIANTE" | "MODERADO" | "AVANCADO";
  isPreset: boolean;
  dailyProtein: number | null;
  dailyCarbs: number | null;
  dailyFat: number | null;
  dailyCalories: number | null;
  waterIntake: string | null;
  supplementation: string | null;
  meals: Meal[];
}

const LEVELS = [
  { value: "INICIANTE", labelKey: "common.level.beginner" },
  { value: "MODERADO", labelKey: "common.level.intermediate" },
  { value: "AVANCADO", labelKey: "common.level.advanced" },
];

function foodPayload(foods: Food[]) {
  return foods.map((f) => ({
    name: f.name,
    quantity: f.quantity,
    protein: f.protein ?? undefined,
    carbs: f.carbs ?? undefined,
    fat: f.fat ?? undefined,
    calories: f.calories ?? undefined,
  }));
}

function mealPayload(meals: Meal[]) {
  return meals.map((m) => ({
    time: m.time,
    name: m.name,
    order: m.order,
    foods: foodPayload(m.foods),
  }));
}

export default function DietTemplateEditPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [template, setTemplate] = useState<DietTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: "", description: "", level: "INICIANTE" });

  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealForm, setMealForm] = useState({ time: "", name: "" });

  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [addingFoodToMeal, setAddingFoodToMeal] = useState<string | null>(null);
  const [foodFormMap, setFoodFormMap] = useState<Record<string, { name: string; quantity: string; protein: string; carbs: string; fat: string; calories: string }>>({});

  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ template: DietTemplate }>(`/api/diet-templates/${id}`);
      setTemplate(data.template);
      setMetaForm({
        name: data.template.name,
        description: data.template.description ?? "",
        level: data.template.level,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("diet.errLoadTemplate"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    loadTemplate();
  }, [user, token, authLoading, router, loadTemplate]);

  function startAddFood(mealId: string) {
    setAddingFoodToMeal(mealId);
    setFoodFormMap((prev) => ({
      ...prev,
      [mealId]: { name: "", quantity: "", protein: "", carbs: "", fat: "", calories: "" },
    }));
  }

  function startEditMeal(meal: Meal) {
    setEditingMealId(meal.id);
    setMealForm({ time: meal.time, name: meal.name });
    setShowMealForm(true);
  }

  async function saveMeals(meals: Meal[]) {
    if (!template) return;
    setSaving(true);
    try {
      await api.put(`/api/diet-templates/${id}`, { meals: mealPayload(meals) });
      await loadTemplate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("diet.errSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMeta() {
    if (!metaForm.name.trim()) return;
    setSaving(true);
    try {
      await api.put(`/api/diet-templates/${id}`, {
        name: metaForm.name,
        description: metaForm.description || undefined,
        level: metaForm.level,
      });
      setEditingMeta(false);
      await loadTemplate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("diet.errSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMeal() {
    if (!template || !mealForm.time.trim() || !mealForm.name.trim()) return;
    let meals: Meal[];
    if (editingMealId) {
      meals = template.meals.map((m) =>
        m.id === editingMealId ? { ...m, time: mealForm.time.trim(), name: mealForm.name.trim() } : m
      );
    } else {
      const maxOrder = template.meals.length ? Math.max(...template.meals.map((m) => m.order)) + 1 : 1;
      meals = [
        ...template.meals,
        { id: "new", time: mealForm.time.trim(), name: mealForm.name.trim(), order: maxOrder, foods: [] },
      ];
    }
    setShowMealForm(false);
    setEditingMealId(null);
    setMealForm({ time: "", name: "" });
    await saveMeals(meals);
  }

  async function handleDeleteMeal(mealId: string) {
    if (!template) return;
    if (!confirm(t("diet.confirmDeleteMeal"))) return;
    const meals = template.meals.filter((m) => m.id !== mealId).map((m, i) => ({ ...m, order: i + 1 }));
    await saveMeals(meals);
  }

  async function handleSaveFood(mealId: string) {
    if (!template) return;
    const f = foodFormMap[mealId];
    if (!f?.name.trim()) return;
    const meal = template.meals.find((m) => m.id === mealId);
    if (!meal) return;

    const meals = template.meals.map((m) => {
      if (m.id !== mealId) return m;
      return {
        ...m,
        foods: [
          ...m.foods.map((food) => ({
            id: food.id,
            name: food.name,
            quantity: food.quantity,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            calories: food.calories,
          })),
          {
            id: "new",
            name: f.name.trim(),
            quantity: f.quantity.trim(),
            protein: f.protein ? Number(f.protein) : null,
            carbs: f.carbs ? Number(f.carbs) : null,
            fat: f.fat ? Number(f.fat) : null,
            calories: f.calories ? Number(f.calories) : null,
          } as Food,
        ],
      };
    });
    setAddingFoodToMeal(null);
    await saveMeals(meals);
  }

  async function handleRemoveFood(mealId: string, foodId: string) {
    if (!template) return;
    const meals = template.meals.map((m) =>
      m.id === mealId ? { ...m, foods: m.foods.filter((f) => f.id !== foodId) } : m
    );
    await saveMeals(meals);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user || !template) return null;

  return (
    <AppLayout title={template.name}>
      <div className="space-y-6 animate-fadeIn">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <Link
          href="/diets/templates"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("diet.backTemplates")}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Apple className="w-5 h-5" />
          </div>
          {editingMeta ? (
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <Input
                value={metaForm.name}
                onChange={(e) => setMetaForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("diet.templateNamePh")}
                className="text-lg font-bold min-w-[200px]"
                autoFocus
              />
              <Input
                value={metaForm.description}
                onChange={(e) => setMetaForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("diet.descPhShort")}
                className="flex-1 min-w-[200px]"
              />
              <select
                value={metaForm.level}
                onChange={(e) => setMetaForm((f) => ({ ...f, level: e.target.value }))}
                className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {t(l.labelKey)}
                  </option>
                ))}
              </select>
              <Button size="sm" icon={<Save className="w-4 h-4" />} onClick={handleSaveMeta} loading={saving} />
              <Button
                size="sm"
                variant="ghost"
                icon={<X className="w-4 h-4" />}
                onClick={() => {
                  setEditingMeta(false);
                  setMetaForm({
                    name: template.name,
                    description: template.description ?? "",
                    level: template.level,
                  });
                }}
              />
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{template.name}</h1>
                {template.isPreset && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                    {t("diet.presetLabel")}
                  </span>
                )}
                <button
                  onClick={() => setEditingMeta(true)}
                  className="p-1 rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted">
                {t("diet.levelLabel", { label: t(LEVELS.find((l) => l.value === template.level)?.labelKey ?? "") })}
                {template.description && ` \u00B7 ${template.description}`}
              </p>
            </div>
          )}
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => { setEditingMealId(null); setMealForm({ time: "", name: "" }); setShowMealForm(true); }}
          >
            {t("diet.mealButton")}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("diet.mealsTitle")}</h2>
          <span className="text-xs text-muted">
            {t(template.meals.length === 1 ? "diet.mealCountOne" : "diet.mealCountMany", { n: template.meals.length })}
          </span>
        </div>

        {template.meals.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">{t("diet.noMeals")}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {template.meals.map((meal) => {
              const mealTotals = meal.foods.reduce(
                (acc, f) => ({
                  protein: acc.protein + (f.protein || 0),
                  carbs: acc.carbs + (f.carbs || 0),
                  fat: acc.fat + (f.fat || 0),
                  calories: acc.calories + (f.calories || 0),
                }),
                { protein: 0, carbs: 0, fat: 0, calories: 0 }
              );
              const isExpanded = expandedMealId === meal.id;
              return (
                <Card key={meal.id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#1E1E1E] transition-colors"
                    onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                        {meal.time || "?"}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{meal.name}</h3>
                        <p className="text-xs text-muted">
                          {t(meal.foods.length === 1 ? "diet.foodCountOne" : "diet.foodCountMany", { n: meal.foods.length })} · {mealTotals.calories.toFixed(0)} kcal
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex gap-2 text-xs text-muted">
                        <span>P: {mealTotals.protein.toFixed(0)}g</span>
                        <span>C: {mealTotals.carbs.toFixed(0)}g</span>
                        <span>G: {mealTotals.fat.toFixed(0)}g</span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      {meal.foods.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted text-xs">
                                <th className="text-left pb-2 font-medium">{t("diet.tableFood")}</th>
                                <th className="text-right pb-2 font-medium">{t("diet.tableQty")}</th>
                                <th className="text-right pb-2 font-medium">{t("diet.protShort")}</th>
                                <th className="text-right pb-2 font-medium">{t("diet.carbShort")}</th>
                                <th className="text-right pb-2 font-medium">{t("diet.fatShort")}</th>
                                <th className="text-right pb-2 font-medium">{t("diet.kcalShort")}</th>
                                <th className="pb-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {meal.foods.map((food) => (
                                <tr key={food.id}>
                                  <td className="py-2 font-medium">{food.name}</td>
                                  <td className="py-2 text-right text-muted">{food.quantity}</td>
                                  <td className="py-2 text-right">{food.protein ?? "-"}</td>
                                  <td className="py-2 text-right">{food.carbs ?? "-"}</td>
                                  <td className="py-2 text-right">{food.fat ?? "-"}</td>
                                  <td className="py-2 text-right">{food.calories ?? "-"}</td>
                                  <td className="py-2 text-right">
                                    <button
                                      onClick={() => handleRemoveFood(meal.id, food.id)}
                                      className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted text-center py-2">{t("diet.noFoods")}</p>
                      )}

                      {addingFoodToMeal === meal.id ? (
                        <div className="bg-bg rounded-lg p-3 space-y-3">
                          <p className="text-xs font-medium text-muted">{t("diet.newFood")}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <Input placeholder={t("diet.foodNamePh")} value={foodFormMap[meal.id]?.name || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], name: e.target.value } }))} className="text-xs" />
                            <Input placeholder={t("diet.foodQtyPh")} value={foodFormMap[meal.id]?.quantity || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], quantity: e.target.value } }))} className="text-xs" />
                            <Input placeholder={t("diet.foodProteinPh")} type="number" value={foodFormMap[meal.id]?.protein || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], protein: e.target.value } }))} className="text-xs" />
                            <Input placeholder={t("diet.foodCarbsPh")} type="number" value={foodFormMap[meal.id]?.carbs || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], carbs: e.target.value } }))} className="text-xs" />
                            <Input placeholder={t("diet.foodFatPh")} type="number" value={foodFormMap[meal.id]?.fat || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], fat: e.target.value } }))} className="text-xs" />
                            <Input placeholder={t("diet.foodCalPh")} type="number" value={foodFormMap[meal.id]?.calories || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], calories: e.target.value } }))} className="text-xs" />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setAddingFoodToMeal(null)}>{t("common.cancel")}</Button>
                            <Button size="sm" onClick={() => handleSaveFood(meal.id)}>{t("common.save")}</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => startAddFood(meal.id)}>
                            {t("diet.addFood")}
                          </Button>
                          <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEditMeal(meal)}>
                            {t("common.edit")}
                          </Button>
                          <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDeleteMeal(meal.id)}>
                            {t("common.delete")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showMealForm} onClose={() => { setShowMealForm(false); setEditingMealId(null); }} title={t(editingMealId ? "diet.editMealTitle" : "diet.newMealTitle")} size="sm">
        <div className="space-y-4">
          <Input
            label={t("diet.timeLabel")}
            placeholder={t("diet.timePlaceholder")}
            value={mealForm.time}
            onChange={(e) => setMealForm((f) => ({ ...f, time: e.target.value }))}
          />
          <Input
            label={t("diet.mealNameLabel")}
            placeholder={t("diet.mealNamePlaceholder")}
            value={mealForm.name}
            onChange={(e) => setMealForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowMealForm(false); setEditingMealId(null); }} className="flex-1">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveMeal} className="flex-1">
              {t(editingMealId ? "common.save" : "common.create")}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}