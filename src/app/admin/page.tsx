"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, Users, UserPlus, ChevronDown, Mail, Phone, X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface AdminPersonal {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count: { students: number };
}

interface AdminStudent {
  id: string;
  name: string;
  email: string | null;
  personalId: string | null;
  personal: { name: string } | null;
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totals, setTotals] = useState<{
    personals: number;
    students: number;
    studentsWithoutTrainer: number;
  } | null>(null);
  const [personals, setPersonals] = useState<AdminPersonal[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "STUDENT" as "PERSONAL" | "STUDENT",
    trainerId: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    loadOverview();
  }, [user, authLoading, router]);

  async function loadOverview() {
    try {
      const data = await api.get<{
        totals: typeof totals;
        personals: AdminPersonal[];
        students: AdminStudent[];
      }>("/api/admin/overview");
      setTotals(data.totals);
      setPersonals(data.personals);
      setStudents(data.students);
    } catch {
      setError("Erro ao carregar visao geral");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;
    setCreating(true);
    setError("");
    try {
      await api.post("/api/auth/accounts", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        trainerId: form.role === "STUDENT" && form.trainerId ? form.trainerId : undefined,
      });
      setForm({ name: "", email: "", password: "", phone: "", role: "STUDENT", trainerId: "" });
      setShowModal(false);
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <AppLayout title="Administracao">
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent" />
              Painel Admin
            </h1>
            <p className="text-muted text-sm">Visao geral do sistema</p>
          </div>
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            Criar Conta
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {totals && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Personal Trainers</p>
              <p className="text-3xl font-bold text-accent">{totals.personals}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Alunos</p>
              <p className="text-3xl font-bold text-green-400">{totals.students}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Sem personal</p>
              <p className="text-3xl font-bold text-amber-400">{totals.studentsWithoutTrainer}</p>
            </Card>
          </div>
        )}

        {personals.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Personal Trainers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personals.map((pt) => (
                <Card key={pt.id} className="p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent font-semibold text-sm shrink-0">
                      {pt.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{pt.name}</p>
                      <p className="text-xs text-muted flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />{pt.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted pt-2 border-t border-border">
                    {pt._count.students} aluno{pt._count.students !== 1 ? "s" : ""}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3">Alunos</h2>
          {students.length === 0 ? (
            <Card className="p-10 text-center">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted">Nenhum aluno cadastrado</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((st) => (
                <Card key={st.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center text-green-400 font-semibold text-sm shrink-0">
                      {st.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-sm">{st.name}</p>
                      {st.email && (
                        <p className="text-xs text-muted flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />{st.email}
                        </p>
                      )}
                      <p className="text-xs text-muted mt-1">
                        {st.personal ? `Personal: ${st.personal.name}` : "Sem personal"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Criar Conta"
          size="md"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Tipo de Conta</label>
              <div className="flex gap-2">
                {(["STUDENT", "PERSONAL"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, role: r, trainerId: "" }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.role === r
                        ? "bg-accent/15 border-accent text-accent"
                        : "bg-card border-border text-muted hover:border-muted"
                    }`}
                  >
                    {r === "STUDENT" ? "Aluno" : "Personal"}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Nome *"
              placeholder="Nome completo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Senha *"
              type="password"
              placeholder="Minimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />

            {form.role === "STUDENT" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Personal (opcional)</label>
                <select
                  value={form.trainerId}
                  onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Sem personal</option>
                  {personals.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreate} loading={creating} className="flex-1">
                Criar Conta
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}