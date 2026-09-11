"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Plus, Trash2, Edit3, Droplets, Pill, Clock, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface MealFood {
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
  foods: MealFood[];
}

interface DietPlan {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  dailyProtein: number | null;
  dailyCarbs: number | null;
  dailyFat: number | null;
  dailyCalories: number | null;
  waterIntake: string | null;
  supplementation: string | null;
  student: { id: string; name: string };
  meals: Meal[];
  mealLogs: { id: string; mealId: string; date: string }[];
}

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="w-full bg-bg rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MacroCard({ label, current, target, unit, color }: {
  label: string; current: number; target: number | null; unit: string; color: string;
}) {
  return (
    <div className="bg-bg rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs font-medium">
          {current.toFixed(1)}{unit}
          {target ? <span className="text-muted"> / {target}{unit}</span> : null}
        </span>
      </div>
      {target ? <ProgressBar current={current} target={target} color={color} /> : null}
    </div>
  );
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function todayEatenIds(logs: { mealId: string; date: string }[]): Set<string> {
  const now = new Date();
  return new Set(
    logs
      .filter((l) => isSameDay(new Date(l.date), now))
      .map((l) => l.mealId)
  );
}

export default function DietDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const dietId = params.id as string;

  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealForm, setMealForm] = useState({ time: "", name: "" });
  const [savingMeal, setSavingMeal] = useState(false);

  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [eatenMealIds, setEatenMealIds] = useState<Set<string>>(new Set());
  const [togglingMeal, setTogglingMeal] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [foodFormMap, setFoodFormMap] = useState<Record<string, { name: string; quantity: string; protein: string; carbs: string; fat: string; calories: string }>>({});
  const [addingFoodToMeal, setAddingFoodToMeal] = useState<string | null>(null);

  const [showEditPlan, setShowEditPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "", description: "", dailyProtein: "", dailyCarbs: "", dailyFat: "", dailyCalories: "",
    waterIntake: "", supplementation: "", isActive: true,
  });
  const [savingPlan, setSavingPlan] = useState(false);

  const loadDiet = useCallback(async () => {
    try {
      const data = await api.get<{ dietPlan: DietPlan }>(`/api/diets/${dietId}`);
      setDiet(data.dietPlan);
      setEatenMealIds(todayEatenIds(data.dietPlan.mealLogs ?? []));
    } catch {
      setError("Erro ao carregar plano alimentar");
    } finally {
      setLoading(false);
    }
  }, [dietId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }
    loadDiet();
  }, [user, authLoading, router, loadDiet]);

  async function handleSaveMeal() {
    if (!mealForm.time.trim() || !mealForm.name.trim()) return;
    setSavingMeal(true);
    try {
      if (editingMealId) {
        await api.put(`/api/diets/${dietId}/meals/${editingMealId}`, {
          time: mealForm.time.trim(),
          name: mealForm.name.trim(),
        });
      } else {
        const maxOrder = diet?.meals.length ? Math.max(...diet.meals.map((m) => m.order)) + 1 : 0;
        await api.post(`/api/diets/${dietId}/meals`, {
          time: mealForm.time.trim(),
          name: mealForm.name.trim(),
          order: maxOrder,
        });
      }
      setMealForm({ time: "", name: "" });
      setEditingMealId(null);
      setShowMealForm(false);
      await loadDiet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar refeicao");
    } finally {
      setSavingMeal(false);
    }
  }

  async function handleDeleteMeal(mealId: string) {
    if (!confirm("Excluir esta refeicao?")) return;
    try {
      await api.delete(`/api/diets/${dietId}/meals/${mealId}`);
      await loadDiet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir refeicao");
    }
  }

  async function toggleEaten(meal: Meal) {
    if (user?.role !== "STUDENT") return;
    const wasEaten = eatenMealIds.has(meal.id);
    setTogglingMeal(meal.id);
    try {
      const res = await api.post<{ eaten: boolean }>(
        `/api/diets/${dietId}/meals/${meal.id}/eat`,
        { eaten: !wasEaten }
      );
      setEatenMealIds((prev) => {
        const next = new Set(prev);
        if (res.eaten) next.add(meal.id);
        else next.delete(meal.id);
        return next;
      });
      if (res.eaten && user.name) {
        setNotice(t("diet.notified", { student: user.name }));
        setTimeout(() => setNotice(""), 4000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao marcar refeicao");
    } finally {
      setTogglingMeal(null);
    }
  }

  function startEditMeal(meal: Meal) {
    setEditingMealId(meal.id);
    setMealForm({ time: meal.time, name: meal.name });
    setShowMealForm(true);
  }

  function startAddFood(mealId: string) {
    setAddingFoodToMeal(mealId);
    setFoodFormMap((prev) => ({
      ...prev,
      [mealId]: { name: "", quantity: "", protein: "", carbs: "", fat: "", calories: "" },
    }));
  }

  async function handleSaveFood(mealId: string) {
    const f = foodFormMap[mealId];
    if (!f?.name.trim()) return;
    const meal = diet?.meals.find((m) => m.id === mealId);
    if (!meal) return;

    const updatedFoods = [
      ...meal.foods.map((food) => ({
        name: food.name,
        quantity: food.quantity,
        protein: food.protein ?? undefined,
        carbs: food.carbs ?? undefined,
        fat: food.fat ?? undefined,
        calories: food.calories ?? undefined,
      })),
      {
        name: f.name.trim(),
        quantity: f.quantity.trim(),
        protein: f.protein ? Number(f.protein) : undefined,
        carbs: f.carbs ? Number(f.carbs) : undefined,
        fat: f.fat ? Number(f.fat) : undefined,
        calories: f.calories ? Number(f.calories) : undefined,
      },
    ];

    try {
      await api.put(`/api/diets/${dietId}/meals/${mealId}`, {
        time: meal.time,
        name: meal.name,
        order: meal.order,
        foods: updatedFoods,
      });
      setAddingFoodToMeal(null);
      await loadDiet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar alimento");
    }
  }

  async function handleSavePlan() {
    if (!planForm.name.trim()) return;
    setSavingPlan(true);
    try {
      await api.put(`/api/diets/${dietId}`, {
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        dailyProtein: planForm.dailyProtein ? Number(planForm.dailyProtein) : undefined,
        dailyCarbs: planForm.dailyCarbs ? Number(planForm.dailyCarbs) : undefined,
        dailyFat: planForm.dailyFat ? Number(planForm.dailyFat) : undefined,
        dailyCalories: planForm.dailyCalories ? Number(planForm.dailyCalories) : undefined,
        waterIntake: planForm.waterIntake.trim() || undefined,
        supplementation: planForm.supplementation.trim() || undefined,
        isActive: planForm.isActive,
      });
      setShowEditPlan(false);
      await loadDiet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar plano");
    } finally {
      setSavingPlan(false);
    }
  }

  function openEditPlan() {
    if (!diet) return;
    setPlanForm({
      name: diet.name,
      description: diet.description || "",
      dailyProtein: diet.dailyProtein?.toString() || "",
      dailyCarbs: diet.dailyCarbs?.toString() || "",
      dailyFat: diet.dailyFat?.toString() || "",
      dailyCalories: diet.dailyCalories?.toString() || "",
      waterIntake: diet.waterIntake || "",
      supplementation: diet.supplementation || "",
      isActive: diet.isActive,
    });
    setShowEditPlan(true);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!diet) {
    return (
      <AppLayout title="Plano nao encontrado">
        <Card className="p-12 text-center">
          <p className="text-muted">Plano nao encontrado</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push("/diets")}>Voltar</Button>
        </Card>
      </AppLayout>
    );
  }

  const totals = diet.meals.reduce(
    (acc, m) => {
      for (const f of m.foods) {
        acc.protein += f.protein || 0;
        acc.carbs += f.carbs || 0;
        acc.fat += f.fat || 0;
        acc.calories += f.calories || 0;
      }
      return acc;
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );

  return (
    <AppLayout title={diet.name}>
      <div className="space-y-6 animate-fadeIn">
        <button onClick={() => router.push("/diets")} className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para Dietas
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {notice && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-3">
            {notice}
          </div>
        )}

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{diet.name}</h1>
                <Badge variant={diet.isActive ? "success" : "default"}>
                  {diet.isActive ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <p className="text-sm text-muted">Aluno: {diet.student.name}</p>
              <div className="flex gap-4 text-xs text-muted mt-2">
                {diet.startDate && <span>Inicio: {new Date(diet.startDate).toLocaleDateString("pt-BR")}</span>}
                {diet.endDate && <span>Fim: {new Date(diet.endDate).toLocaleDateString("pt-BR")}</span>}
              </div>
            </div>
            {user?.role !== "STUDENT" && (
              <Button variant="secondary" size="sm" icon={<Edit3 className="w-3.5 h-3.5" />} onClick={openEditPlan}>
                Editar
              </Button>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroCard label="Proteina" current={totals.protein} target={diet.dailyProtein} unit="g" color="bg-red-400" />
          <MacroCard label="Carboidrato" current={totals.carbs} target={diet.dailyCarbs} unit="g" color="bg-yellow-400" />
          <MacroCard label="Gordura" current={totals.fat} target={diet.dailyFat} unit="g" color="bg-blue-400" />
          <MacroCard label="Calorias" current={totals.calories} target={diet.dailyCalories} unit="" color="bg-green-400" />
        </div>

        {(diet.waterIntake || diet.supplementation) && (
          <Card className="p-5">
            <div className="space-y-3">
              {diet.waterIntake && (
                <div className="flex items-center gap-3 text-sm">
                  <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-muted">Agua:</span>
                  <span className="font-medium">{diet.waterIntake}</span>
                </div>
              )}
              {diet.supplementation && (
                <div className="flex items-start gap-3 text-sm">
                  <Pill className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted">Suplementacao:</span>
                    <p className="text-white mt-0.5">{diet.supplementation}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Refeicoes</h2>
          {user?.role !== "STUDENT" && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingMealId(null); setMealForm({ time: "", name: "" }); setShowMealForm(true); }}>
              Adicionar Refeicao
            </Button>
          )}
        </div>

        {diet.meals.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">Nenhuma refeicao cadastrada</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {diet.meals.map((meal) => {
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
                          {meal.foods.length} alimento{meal.foods.length !== 1 ? "s" : ""} &middot; {mealTotals.calories.toFixed(0)} kcal
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === "STUDENT" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEaten(meal);
                          }}
                          disabled={togglingMeal === meal.id}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            eatenMealIds.has(meal.id)
                              ? "bg-green-500/15 text-green-400"
                              : "bg-card border border-border text-muted hover:text-white"
                          }`}
                        >
                          {togglingMeal === meal.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          {eatenMealIds.has(meal.id) ? t("diet.eaten") : t("diet.markEaten")}
                        </button>
                      )}
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
                                <th className="text-left pb-2 font-medium">Alimento</th>
                                <th className="text-right pb-2 font-medium">Qtd</th>
                                <th className="text-right pb-2 font-medium">Prot</th>
                                <th className="text-right pb-2 font-medium">Carb</th>
                                <th className="text-right pb-2 font-medium">Gord</th>
                                <th className="text-right pb-2 font-medium">Kcal</th>
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
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted text-center py-2">Nenhum alimento adicionado</p>
                      )}

                      {addingFoodToMeal === meal.id ? (
                        <div className="bg-bg rounded-lg p-3 space-y-3">
                          <p className="text-xs font-medium text-muted">Novo alimento</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <Input placeholder="Nome *" value={foodFormMap[meal.id]?.name || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], name: e.target.value } }))} className="text-xs" />
                            <Input placeholder="Quantidade" value={foodFormMap[meal.id]?.quantity || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], quantity: e.target.value } }))} className="text-xs" />
                            <Input placeholder="Proteina (g)" type="number" value={foodFormMap[meal.id]?.protein || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], protein: e.target.value } }))} className="text-xs" />
                            <Input placeholder="Carboidrato (g)" type="number" value={foodFormMap[meal.id]?.carbs || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], carbs: e.target.value } }))} className="text-xs" />
                            <Input placeholder="Gordura (g)" type="number" value={foodFormMap[meal.id]?.fat || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], fat: e.target.value } }))} className="text-xs" />
                            <Input placeholder="Calorias" type="number" value={foodFormMap[meal.id]?.calories || ""} onChange={(e) => setFoodFormMap((prev) => ({ ...prev, [meal.id]: { ...prev[meal.id], calories: e.target.value } }))} className="text-xs" />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setAddingFoodToMeal(null)}>Cancelar</Button>
                            <Button size="sm" onClick={() => handleSaveFood(meal.id)}>Salvar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {user?.role !== "STUDENT" && (
                            <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => startAddFood(meal.id)}>
                              Adicionar Alimento
                            </Button>
                          )}
                        </>
                      )}

                      {user?.role !== "STUDENT" && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" icon={<Edit3 className="w-3.5 h-3.5" />} onClick={() => startEditMeal(meal)}>
                          Editar
                        </Button>
                        <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDeleteMeal(meal.id)}>
                          Excluir
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

        <Modal open={showMealForm} onClose={() => { setShowMealForm(false); setEditingMealId(null); }} title={editingMealId ? "Editar Refeicao" : "Nova Refeicao"} size="sm">
          <div className="space-y-4">
            <Input
              label="Horario *"
              placeholder="Ex: 07:00"
              value={mealForm.time}
              onChange={(e) => setMealForm((f) => ({ ...f, time: e.target.value }))}
            />
            <Input
              label="Nome *"
              placeholder="Ex: Cafe da Manha"
              value={mealForm.name}
              onChange={(e) => setMealForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setShowMealForm(false); setEditingMealId(null); }} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveMeal} loading={savingMeal} className="flex-1">
                {editingMealId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={showEditPlan} onClose={() => setShowEditPlan(false)} title="Editar Plano" size="lg">
          <div className="space-y-4">
            <Input label="Nome *" value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} />
            <Textarea label="Descricao" value={planForm.description} onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Proteina diaria (g)" type="number" value={planForm.dailyProtein} onChange={(e) => setPlanForm((f) => ({ ...f, dailyProtein: e.target.value }))} />
              <Input label="Carboidrato diario (g)" type="number" value={planForm.dailyCarbs} onChange={(e) => setPlanForm((f) => ({ ...f, dailyCarbs: e.target.value }))} />
              <Input label="Gordura diaria (g)" type="number" value={planForm.dailyFat} onChange={(e) => setPlanForm((f) => ({ ...f, dailyFat: e.target.value }))} />
              <Input label="Calorias diárias" type="number" value={planForm.dailyCalories} onChange={(e) => setPlanForm((f) => ({ ...f, dailyCalories: e.target.value }))} />
            </div>
            <Input label="Ingestao de agua" value={planForm.waterIntake} onChange={(e) => setPlanForm((f) => ({ ...f, waterIntake: e.target.value }))} placeholder="Ex: 3L ao dia" />
            <Textarea label="Suplementacao" value={planForm.supplementation} onChange={(e) => setPlanForm((f) => ({ ...f, supplementation: e.target.value }))} rows={2} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={planForm.isActive} onChange={(e) => setPlanForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-accent" />
              Plano ativo
            </label>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowEditPlan(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSavePlan} loading={savingPlan} className="flex-1">Salvar</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
