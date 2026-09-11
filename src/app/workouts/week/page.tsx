"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarDays, CalendarRange, Plus, Pencil, Trash2, Send, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type WeekTemplate } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
}

const WEEKDAY_SHORT: Record<string, string> = {
  Segunda: "Seg",
  Terca: "Ter",
  Quarta: "Qua",
  Quinta: "Qui",
  Sexta: "Sex",
  Sabado: "Sab",
  Domingo: "Dom",
};

const LEVEL_META: Record<string, { label: string; badge: string }> = {
  INICIANTE: { label: "Iniciante", badge: "bg-green-500/15 text-green-400" },
  MODERADO: { label: "Moderado", badge: "bg-blue-500/15 text-blue-400" },
  AVANCADO: { label: "Avancado", badge: "bg-red-500/15 text-red-400" },
};

export default function WeekTemplatesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [weeks, setWeeks] = useState<WeekTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applyTarget, setApplyTarget] = useState<WeekTemplate | null>(null);
  const [applyStudentId, setApplyStudentId] = useState("");
  const [applying, setApplying] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadWeeks = useCallback(async () => {
    try {
      const data = await api.weekTemplates.list();
      setWeeks(data.weeks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar semanas");
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
    loadWeeks();
  }, [user, token, authLoading, router, loadWeeks]);

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
    setAppliedMsg("");
    try {
      const data = await api.weekTemplates.apply(applyTarget.id, applyStudentId);
      setApplyTarget(null);
      setApplyStudentId("");
      setAppliedMsg(
        `Semana "${data.weekName}" aplicada: ${data.created} treino(s) criados para o aluno.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao aplicar semana");
    } finally {
      setApplying(false);
    }
  }

  async function handleDelete(w: WeekTemplate) {
    if (!confirm(`Excluir a semana "${w.name}"?`)) return;
    setDeletingId(w.id);
    try {
      await api.weekTemplates.remove(w.id);
      await loadWeeks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir semana");
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
    .map((level) => ({ level, items: weeks.filter((w) => w.level === level) }))
    .filter((g) => g.items.length > 0);

  return (
    <AppLayout title="Semanas de Treino">
      <div className="space-y-6 animate-fadeIn">
        <Link
          href="/workouts"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Treinos
        </Link>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {appliedMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-3">
            {appliedMsg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Semanas de Treino</h1>
            <p className="text-muted text-sm">
              Monte a semana inteira combinando seus modelos e aplique para o aluno com um clique.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<CalendarRange className="w-4 h-4" />}
              onClick={() => router.push("/workouts/templates")}
            >
              Modelos
            </Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push("/workouts/week/new")}>
              Nova Semana
            </Button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <Card className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">Nenhuma semana de treino criada</p>
            <p className="text-xs text-muted mt-1">
              Crie uma semana combinando modelos de treino por dia.
            </p>
          </Card>
        ) : (
          grouped.map(({ level, items }) => (
            <div key={level} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${LEVEL_META[level].badge}`}>
                  {LEVEL_META[level].label}
                </span>
                <span className="text-xs text-muted">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((w) => {
                  const filled = w.days.filter((d) => d.workoutTemplate);
                  return (
                    <Card key={w.id} className="flex flex-col h-full">
                      <CardContent className="flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                              <CalendarDays className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm leading-tight truncate">{w.name}</h3>
                              <p className="text-xs text-muted">
                                {filled.length}/{w.days.filter((d) => d.workoutTemplateId).length} dias
                              </p>
                            </div>
                          </div>
                          {w.isPreset && <Badge variant="default">Padrao</Badge>}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {filled.map((d) => (
                            <span
                              key={d.id}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-card border border-border"
                              title={d.workoutTemplate?.name ?? d.weekday}
                            >
                              {WEEKDAY_SHORT[d.weekday] ?? d.weekday}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            icon={<Send className="w-3.5 h-3.5" />}
                            onClick={() => setApplyTarget(w)}
                          >
                            Aplicar p/ aluno
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => router.push(`/workouts/week/${w.id}`)}
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            loading={deletingId === w.id}
                            onClick={() => handleDelete(w)}
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
        title="Aplicar semana para o aluno"
      >
        <div className="space-y-4">
          {applyTarget && (
            <div className="flex items-center gap-2 text-sm bg-bg rounded-lg px-3 py-2.5">
              <CalendarDays className="w-4 h-4 text-accent shrink-0" />
              <span className="font-medium">{applyTarget.name}</span>
              <span className="text-muted text-xs">
                ({applyTarget.days.filter((d) => d.workoutTemplateId).length} treinos na semana)
              </span>
            </div>
          )}
          <p className="text-xs text-muted">
            Os treinos serao criados com o dia da semana definido (Segunda, Terca, etc.). O aluno ja ve o treino certo no dia certo.
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">Aluno *</label>
            <select
              value={applyStudentId}
              onChange={(e) => setApplyStudentId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
            >
              <option value="">Selecione o aluno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setApplyTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              loading={applying}
              disabled={!applyStudentId}
              onClick={handleApply}
            >
              Criar semana p/ o aluno
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}