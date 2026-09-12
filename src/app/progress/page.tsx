"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, TrendingUp, ChevronDown, CalendarDays, AlertTriangle, CheckCircle2, Calculator } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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

const MEASURES: { key: keyof ProgressInput; label: string; unit: string }[] = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "bodyFat", label: "Gordura", unit: "%" },
  { key: "chest", label: "Peito", unit: "cm" },
  { key: "waist", label: "Cintura", unit: "cm" },
  { key: "arm", label: "Braco", unit: "cm" },
  { key: "thigh", label: "Coxa", unit: "cm" },
];

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

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
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

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    weight: "", bodyFat: "", chest: "", waist: "", arm: "", thigh: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

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
        setError("Erro ao carregar alunos");
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
      const data = await api.get<ProgressResponse>(`/api/progress?studentId=${studentId}`);
      setProgress(data.progress);
      setReviewFrequencyDays(data.reviewFrequencyDays);
      setNextReviewDate(data.nextReviewDate);
      setOverdue(data.overdue);
    } catch {
      setError("Erro ao carregar progresso");
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
      setError(err instanceof Error ? err.message : "Erro ao salvar registro");
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
      setError(err instanceof Error ? err.message : "Erro ao salvar periodo");
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

  const weightEntries = progress.filter((p) => p.weight);
  const latestWeight = weightEntries.length > 0 ? weightEntries[0].weight : null;
  const firstWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const weightDiff = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <AppLayout title="Progresso">
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Progresso</h1>
            <p className="text-muted text-sm">Acompanhe a evolucao dos alunos e agende as reavaliacoes</p>
          </div>
          {selectedStudentId && user?.role !== "STUDENT" && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
              Nova Avaliação
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
            label="Aluno"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}

        {students.length === 0 && (
          <Card className="p-12 text-center">
            <TrendingUp className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">Nenhum aluno cadastrado</p>
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
                    Próxima reavaliação
                    {overdue ? (
                      <Badge variant="danger">
                        <AlertTriangle className="w-3 h-3" /> Em atraso
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3" /> Em dia
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    {overdue
                      ? "Já está na hora de registrar uma nova avaliação do aluno."
                      : `Agendada para ${new Date(nextReviewDate).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })} — ${Math.max(0, Math.ceil((new Date(nextReviewDate).getTime() - Date.now()) / 86400000))} dia(s).`}
                  </p>
                  {user?.role === "STUDENT" && !overdue && (
                    <p className="text-xs text-muted mt-1">
                      Quando seu personal registrar uma nova avaliação, você verá aqui a sua evolução.
                    </p>
                  )}
                </div>
              </div>

              {user && user.role !== "STUDENT" && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs text-muted mb-1">Reavaliação a cada</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={7}
                        max={365}
                        className="w-24"
                        value={reviewFrequencyDays}
                        onChange={(e) => setReviewFrequencyDays(Number(e.target.value || 30))}
                      />
                      <span className="text-sm text-muted">dias</span>
                      <Button variant="secondary" size="sm" onClick={handleSaveFrequency} loading={savingFreq}>
                        Salvar
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
            {latestWeight && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{latestWeight}kg</p>
                  <p className="text-xs text-muted mt-1">Peso Atual</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{progress[0]?.bodyFat ? `${progress[0].bodyFat}%` : "-"}</p>
                  <p className="text-xs text-muted mt-1">% Gordura</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className={`text-2xl font-bold ${weightDiff && weightDiff < 0 ? "text-green-400" : weightDiff && weightDiff > 0 ? "text-red-400" : ""}`}>
                    {weightDiff != null ? `${weightDiff > 0 ? "+" : ""}${weightDiff.toFixed(1)}kg` : "-"}
                  </p>
                  <p className="text-xs text-muted mt-1">Variacao</p>
                </Card>
              </div>
            )}

            {progress.length > 1 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium">Evolução desde a primeira avaliação</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MEASURES.map((m) => {
                    const latest = progress.find((x) => x[m.key]);
                    const first = [...progress].reverse().find((x) => x[m.key]);
                    if (!latest || !first || latest[m.key] == null || first[m.key] == null) return null;
                    const value = (latest[m.key] as number) - (first[m.key] as number);
                    return (
                      <div key={m.key} className="bg-bg rounded-lg p-3 flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {m.label} ({m.unit})
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
                <p className="text-sm font-medium mb-4">Evolucao do Peso</p>
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
                          {new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
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

            {progress.length === 0 && !loadingProgress && (
              <Card className="p-8 text-center">
                <TrendingUp className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">Nenhum registro de progresso para este aluno</p>
              </Card>
            )}

            {progress.length > 0 && (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                {progress.map((p, index) => (
                  <div key={p.id} className="relative mb-4">
                    <div className="absolute -left-4 top-4 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg" />
                    <Card className="p-4 ml-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs text-muted">{new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                        {index === 0 ? (
                          <Badge variant="success">Mais recente</Badge>
                        ) : (
                          <Badge variant="default">Avaliação</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {p.weight && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.weight}</p>
                            <p className="text-[10px] text-muted">Peso (kg)</p>
                          </div>
                        )}
                        {p.bodyFat && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.bodyFat}%</p>
                            <p className="text-[10px] text-muted">Gordura</p>
                          </div>
                        )}
                        {p.chest && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.chest}</p>
                            <p className="text-[10px] text-muted">Peito (cm)</p>
                          </div>
                        )}
                        {p.waist && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.waist}</p>
                            <p className="text-[10px] text-muted">Cintura (cm)</p>
                          </div>
                        )}
                        {p.arm && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.arm}</p>
                            <p className="text-[10px] text-muted">Braco (cm)</p>
                          </div>
                        )}
                        {p.thigh && (
                          <div className="bg-bg rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{p.thigh}</p>
                            <p className="text-[10px] text-muted">Coxa (cm)</p>
                          </div>
                        )}
                      </div>
                      {index < progress.length - 1 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-2 pt-2 border-t border-border/60">
                          <span className="text-muted/80">vs anterior:</span>
                          {MEASURES.map((m) => {
                            const current = p[m.key];
                            const prev = progress[index + 1][m.key];
                            if (current == null || prev == null) return null;
                            const diff = (current as number) - (prev as number);
                            return (
                              <span key={m.key}>
                                {m.label}: <Delta value={diff} />
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

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Avaliação" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Peso (kg)" type="number" step="0.1" placeholder="80.5" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} />
              <Input label="% Gordura" type="number" step="0.1" placeholder="15.2" value={form.bodyFat} onChange={(e) => setForm((f) => ({ ...f, bodyFat: e.target.value }))} />
              <Input label="Peito (cm)" type="number" step="0.1" placeholder="100" value={form.chest} onChange={(e) => setForm((f) => ({ ...f, chest: e.target.value }))} />
              <Input label="Cintura (cm)" type="number" step="0.1" placeholder="80" value={form.waist} onChange={(e) => setForm((f) => ({ ...f, waist: e.target.value }))} />
              <Input label="Braco (cm)" type="number" step="0.1" placeholder="35" value={form.arm} onChange={(e) => setForm((f) => ({ ...f, arm: e.target.value }))} />
              <Input label="Coxa (cm)" type="number" step="0.1" placeholder="55" value={form.thigh} onChange={(e) => setForm((f) => ({ ...f, thigh: e.target.value }))} />
            </div>
            <Textarea label="Observacoes" placeholder="Notas sobre o progresso..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} loading={saving} className="flex-1">Salvar</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
