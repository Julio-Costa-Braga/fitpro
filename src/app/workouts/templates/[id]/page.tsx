"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Save, X, Search, Layers } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ExerciseGif } from "@/components/ui/ExerciseGif";
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
  notes?: string | null;
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

const LEVELS = [
  { value: "INICIANTE", label: "Iniciante" },
  { value: "MODERADO", label: "Moderado" },
  { value: "AVANCADO", label: "Avancado" },
];

const muscleGroupColors: Record<string, string> = {
  Peito: "text-red-400",
  Costas: "text-blue-400",
  Ombros: "text-yellow-400",
  Bracos: "text-green-400",
  Pernas: "text-purple-400",
  Abdomen: "text-orange-400",
  Cardio: "text-pink-400",
  Mobilidade: "text-teal-400",
  Outros: "text-muted",
};

function Dumbbell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" /><path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" />
    </svg>
  );
}

export default function WorkoutTemplateEditPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { t, tExerciseName } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [template, setTemplate] = useState<WTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: "", description: "", level: "INICIANTE" });
  const [savingMeta, setSavingMeta] = useState(false);

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [addingExercise, setAddingExercise] = useState<string | null>(null);

  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ sets: 3, reps: "10", initialLoad: "", restTime: 60 });
  const [savingExercise, setSavingExercise] = useState(false);

  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ template: WTemplate }>(`/api/workout-templates/${id}`);
      setTemplate(data.template);
      setMetaForm({
        name: data.template.name,
        description: data.template.description ?? "",
        level: data.template.level,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar modelo");
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

  async function loadExercises() {
    try {
      const data = await api.get<Exercise[]>("/api/exercises");
      setAllExercises(data);
    } catch {
      // ignore
    }
  }

  function exercisePayload(we: WTemplateExercise[]) {
    return we.map((x) => ({
      order: x.order,
      sets: x.sets,
      reps: x.reps,
      initialLoad: x.initialLoad,
      restTime: x.restTime,
      notes: x.notes,
      exerciseId: x.exercise.id,
    }));
  }

  async function handleSaveMeta() {
    if (!metaForm.name.trim()) return;
    setSavingMeta(true);
    try {
      await api.put(`/api/workout-templates/${id}`, {
        name: metaForm.name,
        description: metaForm.description || undefined,
        level: metaForm.level,
      });
      setEditingMeta(false);
      await loadTemplate();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleAddExercise(exerciseId: string) {
    if (!template) return;
    try {
      setAddingExercise(exerciseId);
      const next = [
        ...exercisePayload(template.exercises),
        { order: template.exercises.length + 1, sets: 3, reps: "10", initialLoad: "", restTime: 60, exerciseId },
      ];
      await api.put(`/api/workout-templates/${id}`, { exercises: next });
      setShowAddExercise(false);
      setExerciseSearch("");
      await loadTemplate();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setAddingExercise(null);
    }
  }

  async function handleRemoveExercise(we: WTemplateExercise) {
    if (!template) return;
    if (!confirm("Remover este exercicio do modelo?")) return;
    try {
      const next = template.exercises
        .filter((e) => e.id !== we.id)
        .map((e, i) => ({ ...e, order: i + 1 }));
      await api.put(`/api/workout-templates/${id}`, { exercises: exercisePayload(next) });
      await loadTemplate();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  }

  async function handleSaveExercise(we: WTemplateExercise) {
    if (!template) return;
    try {
      setSavingExercise(true);
      const next = template.exercises.map((e) =>
        e.id === we.id
          ? { ...e, sets: editForm.sets, reps: editForm.reps, initialLoad: editForm.initialLoad || undefined, restTime: editForm.restTime }
          : e
      );
      await api.put(`/api/workout-templates/${id}`, { exercises: exercisePayload(next) });
      setEditingExercise(null);
      await loadTemplate();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingExercise(false);
    }
  }

  const filteredExercises = allExercises.filter((ex) => {
    if (!exerciseSearch) return true;
    const q = exerciseSearch.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      tExerciseName(ex.name).toLowerCase().includes(q) ||
      ex.muscleGroup.toLowerCase().includes(q)
    );
  });

  const existingIds = new Set(template?.exercises.map((we) => we.exercise.id) ?? []);

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
          href="/workouts/templates"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Modelos
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          {editingMeta ? (
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <Input
                value={metaForm.name}
                onChange={(e) => setMetaForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do modelo"
                className="text-lg font-bold min-w-[200px]"
                autoFocus
              />
              <Input
                value={metaForm.description}
                onChange={(e) => setMetaForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descricao..."
                className="flex-1 min-w-[200px]"
              />
              <select
                value={metaForm.level}
                onChange={(e) => setMetaForm((f) => ({ ...f, level: e.target.value }))}
                className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <Button size="sm" icon={<Save className="w-4 h-4" />} onClick={handleSaveMeta} loading={savingMeta} />
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
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{template.name}</h1>
                  {template.isPreset && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                      Padrao
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
                  Nivel: {LEVELS.find((l) => l.value === template.level)?.label}
                  {template.description && ` \u00B7 ${template.description}`}
                </p>
              </div>
            </div>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { loadExercises(); setShowAddExercise(true); }}>
            Adicionar
          </Button>
        </div>

        {template.exercises.length === 0 ? (
          <Card className="p-12 text-center">
            <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted mb-3">Nenhum exercicio neste modelo</p>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { loadExercises(); setShowAddExercise(true); }}>
              Adicionar Exercicio
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {template.exercises.map((we, idx) => (
              <Card key={we.id}>
                <CardContent className="flex items-center gap-4">
                  <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {we.exercise.gifUrl ? (
                    <ExerciseGif
                      src={we.exercise.gifUrl}
                      alt={we.exercise.name}
                      title={tExerciseName(we.exercise.name)}
                      className="w-12 h-12 rounded-lg bg-bg"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-bg flex items-center justify-center shrink-0">
                      <Dumbbell className="w-5 h-5 text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{tExerciseName(we.exercise.name)}</h3>
                      <span className={`text-xs ${muscleGroupColors[we.exercise.muscleGroup] ?? "text-muted"}`}>
                        {we.exercise.muscleGroup}
                      </span>
                    </div>
                    {editingExercise === we.id ? (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">S:</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.sets}
                            onChange={(e) => setEditForm({ ...editForm, sets: +e.target.value })}
                            className="w-14 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">R:</label>
                          <input
                            value={editForm.reps}
                            onChange={(e) => setEditForm({ ...editForm, reps: e.target.value })}
                            className="w-16 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">Carga:</label>
                          <input
                            value={editForm.initialLoad}
                            onChange={(e) => setEditForm({ ...editForm, initialLoad: e.target.value })}
                            className="w-20 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">Desc:</label>
                          <input
                            type="number"
                            min={0}
                            value={editForm.restTime}
                            onChange={(e) => setEditForm({ ...editForm, restTime: +e.target.value })}
                            className="w-16 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <Button size="sm" icon={<Save className="w-3 h-3" />} onClick={() => handleSaveExercise(we)} loading={savingExercise} />
                        <Button size="sm" variant="ghost" icon={<X className="w-3 h-3" />} onClick={() => setEditingExercise(null)} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted mt-0.5">
                        {we.sets}x{we.reps}
                        {we.initialLoad && ` \u00B7 ${we.initialLoad}`}
                        {` \u00B7 ${we.restTime}s descanso`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingExercise(we.id);
                        setEditForm({
                          sets: we.sets,
                          reps: we.reps,
                          initialLoad: we.initialLoad ?? "",
                          restTime: we.restTime,
                        });
                      }}
                      className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveExercise(we)}
                      className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showAddExercise}
        onClose={() => { setShowAddExercise(false); setExerciseSearch(""); }}
        title="Adicionar Exercicio"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            placeholder="Buscar exercicio..."
            icon={<Search className="w-4 h-4" />}
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
          />
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {filteredExercises.length === 0 ? (
              <p className="text-center text-muted text-sm py-6">Nenhum exercicio encontrado</p>
            ) : (
              filteredExercises.map((ex) => {
                const alreadyAdded = existingIds.has(ex.id);
                return (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg hover:bg-[#222] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tExerciseName(ex.name)}</p>
                        <p className={`text-xs ${muscleGroupColors[ex.muscleGroup] ?? "text-muted"}`}>
                          {ex.muscleGroup}
                        </p>
                      </div>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-xs text-muted">Ja adicionado</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => handleAddExercise(ex.id)}
                        loading={addingExercise === ex.id}
                      >
                        Adicionar
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}