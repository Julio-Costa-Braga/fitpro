"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Search, Dumbbell, Image } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { ExerciseGif } from "@/components/ui/ExerciseGif";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  gifUrl?: string | null;
  description?: string | null;
}

const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bracos",
  "Pernas",
  "Abdomen",
  "Cardio",
  "Mobilidade",
  "Outros",
];

const muscleGroupColors: Record<string, string> = {
  Peito: "bg-red-500/10 border-red-500/30 text-red-400",
  Costas: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  Ombros: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  Bracos: "bg-green-500/10 border-green-500/30 text-green-400",
  Pernas: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  Abdomen: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  Cardio: "bg-pink-500/10 border-pink-500/30 text-pink-400",
  Mobilidade: "bg-teal-500/10 border-teal-500/30 text-teal-400",
  Outros: "bg-gray-500/10 border-gray-500/30 text-gray-400",
};

export default function ExercisesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { tExerciseName } = useLanguage();
  const router = useRouter();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterGroup, setFilterGroup] = useState("all");
  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", muscleGroup: "Peito", gifUrl: "", description: "" });

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editForm, setEditForm] = useState({ name: "", muscleGroup: "Peito", gifUrl: "", description: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadExercises = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.get<Exercise[]>("/api/exercises");
      setExercises(data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    loadExercises();
  }, [user, token, authLoading, router, loadExercises]);

  const filtered = exercises.filter((ex) => {
    if (filterGroup !== "all" && ex.muscleGroup !== filterGroup) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ex.name.toLowerCase().includes(q) ||
        tExerciseName(ex.name).toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tabs = [
    { id: "all", label: "Todos", count: exercises.length },
    ...MUSCLE_GROUPS.filter((mg) => exercises.some((e) => e.muscleGroup === mg)).map((mg) => ({
      id: mg,
      label: mg,
      count: exercises.filter((e) => e.muscleGroup === mg).length,
    })),
  ];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.muscleGroup) return;
    try {
      setCreating(true);
      await api.post("/api/exercises", {
        name: form.name,
        muscleGroup: form.muscleGroup,
        gifUrl: form.gifUrl || undefined,
        description: form.description || undefined,
      });
      setShowCreateModal(false);
      setForm({ name: "", muscleGroup: "Peito", gifUrl: "", description: "" });
      await loadExercises();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(ex: Exercise) {
    setEditingExercise(ex);
    setEditForm({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      gifUrl: ex.gifUrl ?? "",
      description: ex.description ?? "",
    });
  }

  async function handleSaveEdit() {
    if (!editingExercise || !editForm.name.trim()) return;
    try {
      setSavingEdit(true);
      await api.put(`/api/exercises/${editingExercise.id}`, {
        name: editForm.name,
        muscleGroup: editForm.muscleGroup,
        gifUrl: editForm.gifUrl || null,
        description: editForm.description || null,
      });
      setEditingExercise(null);
      await loadExercises();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(ex: Exercise) {
    if (!confirm(`Remover "${ex.name}"?`)) return;
    try {
      await api.delete(`/api/exercises/${ex.id}`);
      await loadExercises();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
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
    <AppLayout title="Biblioteca de Exercicios">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Biblioteca de Exercicios</h1>
            <p className="text-muted text-sm">{exercises.length} exercicios cadastrados</p>
          </div>
          {user.role === "PERSONAL" && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
              Novo Exercicio
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar exercicio..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
        </div>

        <Tabs tabs={tabs} activeTab={filterGroup} onChange={setFilterGroup} />

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">Nenhum exercicio encontrado</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((ex) => (
              <Card key={ex.id} hover onClick={() => user.role === "PERSONAL" && startEdit(ex)}>
                <CardContent className="flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    {ex.gifUrl ? (
                      <ExerciseGif
                        src={ex.gifUrl}
                        alt={ex.name}
                        title={tExerciseName(ex.name)}
                        className="w-16 h-16 rounded-lg bg-bg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-bg flex items-center justify-center shrink-0">
                        <Image className="w-6 h-6 text-muted/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{tExerciseName(ex.name)}</h3>
                      <Badge
                        variant="default"
                        className={`mt-1 ${muscleGroupColors[ex.muscleGroup] ?? ""}`}
                      >
                        {ex.muscleGroup}
                      </Badge>
                      {ex.description && (
                        <p className="text-xs text-muted mt-1.5 line-clamp-2">{ex.description}</p>
                      )}
                    </div>
                  </div>
                  {user.role === "PERSONAL" && (
                    <div className="flex items-center gap-1 ml-auto pt-2 border-t border-border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(ex);
                        }}
                        className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ex);
                        }}
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Exercicio"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome"
            placeholder="Ex: Supino Reto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">Grupo Muscular</label>
            <select
              value={form.muscleGroup}
              onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
            >
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>
                  {mg}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="URL do GIF/Imagem"
            placeholder="https://..."
            value={form.gifUrl}
            onChange={(e) => setForm({ ...form, gifUrl: e.target.value })}
          />
          <Input
            label="Descricao"
            placeholder="Descricao opcional..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={creating} className="flex-1">
              Criar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        title="Editar Exercicio"
      >
        {editingExercise && (
          <div className="space-y-4">
            <Input
              label="Nome"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted">Grupo Muscular</label>
              <select
                value={editForm.muscleGroup}
                onChange={(e) => setEditForm({ ...editForm, muscleGroup: e.target.value })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
              >
                {MUSCLE_GROUPS.map((mg) => (
                  <option key={mg} value={mg}>
                    {mg}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="URL do GIF/Imagem"
              value={editForm.gifUrl}
              onChange={(e) => setEditForm({ ...editForm, gifUrl: e.target.value })}
            />
            <Input
              label="Descricao"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingExercise(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} loading={savingEdit} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
