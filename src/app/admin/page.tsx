"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, Users, UserPlus, Mail, X, Power, Star, CalendarPlus,
  Trash2, Infinity as InfinityIcon, Ban, CheckCircle2, LayoutDashboard, CreditCard, Dumbbell,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type AdminAccount } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MONTHLY_FEE, REFERRAL_DISCOUNT, REFERRAL_DISCOUNT_MONTHS } from "@/lib/billing";

interface AdminPersonal {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  studentLimit: number;
  monthlyPrice: number;
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
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);

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
  const [tab, setTab] = useState<"overview" | "contas" | "personais" | "alunos">("contas");

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
      const [overview, accountsData] = await Promise.all([
        api.get<{
          totals: typeof totals;
          personals: AdminPersonal[];
          students: AdminStudent[];
        }>("/api/admin/overview"),
        api.admin.accounts(),
      ]);
      setTotals(overview.totals);
      setPersonals(overview.personals);
      setStudents(overview.students);
      setAccounts(accountsData.users);
    } catch {
      setError("Erro ao carregar visao geral");
    } finally {
      setLoading(false);
    }
  }

  const overdueCount = useMemo(
    () =>
      accounts.filter(
        (a) => !a.isActive || (!a.lifetime && (!a.paidUntil || new Date(a.paidUntil).getTime() < Date.now()))
      ).length,
    [accounts]
  );

  async function updateAccount(id: string, data: Parameters<typeof api.admin.updateUser>[1]) {
    setError("");
    try {
      await api.admin.updateUser(id, data);
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar conta");
    }
  }

  async function toggleActive(acc: AdminAccount) {
    await updateAccount(acc.id, { isActive: !acc.isActive });
  }
  async function toggleLifetime(acc: AdminAccount) {
    await updateAccount(acc.id, { lifetime: !acc.lifetime });
  }
  async function addMonth(acc: AdminAccount) {
    await updateAccount(acc.id, { addMonth: true, isActive: true });
  }

  async function removeAccount(acc: AdminAccount) {
    if (!window.confirm(`Excluir definitivamente a conta de ${acc.name}?`)) return;
    setError("");
    try {
      await api.admin.deleteUser(acc.id);
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir conta");
    }
  }

  async function upgradePlan(acc: AdminAccount, slots: number, price: number) {
    if (
      !window.confirm(
        `Aplicar upgrade de +${slots} aluno(s) (+R$ ${price.toFixed(2).replace(".", ",")}/mes) no plano de ${acc.name}?`
      )
    ) {
      return;
    }
    setError("");
    try {
      await api.admin.updateUser(acc.id, { planUpgrade: { slots, price } });
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar plano");
    }
  }

  function paymentLabel(acc: AdminAccount): string {
    if (acc.lifetime) return "Vitalicio";
    if (acc.paidUntil) {
      const t = new Date(acc.paidUntil).getTime();
      if (t >= Date.now()) return `Pago ate ${new Date(acc.paidUntil).toLocaleDateString("pt-BR")}`;
      return "Pagamento pendente";
    }
    return "Pagamento pendente";
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
            <p className="text-muted text-sm">Visao geral e gestao de contas e mensalidades</p>
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

        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {([
            { id: "overview", label: "Visao Geral", icon: LayoutDashboard },
            { id: "contas", label: "Contas e Pagamentos", icon: CreditCard },
            { id: "personais", label: "Personal Trainers", icon: Dumbbell },
            { id: "alunos", label: "Alunos", icon: Users },
          ] as const).map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  active ? "bg-accent text-black" : "text-muted hover:text-white"
                }`}
              >
                <tb.icon className="w-4 h-4" />
                {tb.label}
              </button>
            );
          })}
        </div>

        {tab === "overview" && totals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Personal Trainers</p>
              <p className="text-3xl font-bold text-accent">{totals.personals}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Alunos</p>
              <p className="text-3xl font-bold text-green-400">{totals.students}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Contas cadastradas</p>
              <p className="text-3xl font-bold">{accounts.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Pagamentos em atraso</p>
              <p className={`text-3xl font-bold ${overdueCount > 0 ? "text-red-400" : "text-green-400"}`}>
                {overdueCount}
              </p>
            </Card>
          </div>
        )}

        {tab === "contas" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Contas e Pagamentos</h2>
            <p className="text-xs text-muted">
              Plano personal: base R$ {MONTHLY_FEE.toFixed(2).replace(".", ",")} (ate 10 alunos) &middot; +1 aluno +R$ {REFERRAL_DISCOUNT.toFixed(2).replace(".", ",")} &middot; +5 +R$ 6,00 &middot; +10 +R$ 14,00 &middot; aluno acessa gratis
            </p>
          </div>
          {accounts.length === 0 ? (
            <Card className="p-10 text-center">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted">Nenhuma conta cadastrada</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const paid = acc.lifetime || (!!acc.paidUntil && new Date(acc.paidUntil).getTime() >= Date.now());
                return (
                  <Card key={acc.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${acc.role === "PERSONAL" ? "bg-accent/15 text-accent" : "bg-green-500/15 text-green-400"}`}>
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-sm">{acc.name}</p>
                        <p className="text-xs text-muted flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />{acc.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        acc.isActive ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                      }`}>
                        {acc.isActive ? "Ativo" : "Inativo"}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        acc.lifetime ? "bg-amber-500/15 text-amber-400" : "bg-accent/15 text-accent"
                      }`}>
                        {acc.lifetime ? "Vitalicio" : acc.role === "PERSONAL" ? "Personal" : "Aluno"}
                      </span>
                      {!acc.lifetime && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          paid ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {paymentLabel(acc)}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted space-y-1 border-t border-border pt-2">
                      <p>Código: <span className="text-white font-mono">{acc.referralCode}</span></p>
                      {acc.role === "PERSONAL" && (
                        <p>
                          Plano: <span className="text-white">{acc.studentLimit} alunos</span> &middot; R$ {acc.monthlyPrice.toFixed(2).replace(".", ",")}/mes
                        </p>
                      )}
                      {acc._count.myReferrals > 0 && (
                        <p>
                          Indicou {acc._count.myReferrals} aluno(s) &middot; ganha R$ {REFERRAL_DISCOUNT.toFixed(2).replace(".", ",")}/mes por {REFERRAL_DISCOUNT_MONTHS} meses
                        </p>
                      )}
                      {acc._count.myReferrals === 0 && acc.referredByUser && (
                        <p>Indicado por {acc.referredByUser.name}</p>
                      )}
                      <p>
                        {acc.role === "STUDENT"
                          ? `${acc._count.students} aluno vinculado`
                          : `${acc._count.students} aluno(s)`}
                      </p>
                    </div>

                    <div className="flex gap-2 border-t border-border pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={acc.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        className="flex-1"
                        onClick={() => toggleActive(acc)}
                      >
                        {acc.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      {acc.role === "PERSONAL" && (
                        <>
                          {!acc.lifetime && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<CalendarPlus className="w-3.5 h-3.5" />}
                              className="flex-1"
                              onClick={() => addMonth(acc)}
                            >
                              +1 mes
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={acc.lifetime ? <Star className="w-3.5 h-3.5" /> : <InfinityIcon className="w-3.5 h-3.5" />}
                            onClick={() => toggleLifetime(acc)}
                          >
                            {acc.lifetime ? "Sair" : "Vitalicio"}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => removeAccount(acc)}
                      >
                        Excluir
                      </Button>
                    </div>

                    {acc.role === "PERSONAL" && acc.lifetime === false && (
                      <div className="flex gap-1.5 border-t border-border pt-2">
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => upgradePlan(acc, 1, 2)}>
                          +1 aluno (R$ {REFERRAL_DISCOUNT.toFixed(2).replace(".", ",")})
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => upgradePlan(acc, 5, 6)}>
                          +5 (R$ 6,00)
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => upgradePlan(acc, 10, 14)}>
                          +10 (R$ 14,00)
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        )}

        {tab === "personais" && personals.length > 0 && (
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
                  <div className="text-xs text-muted pt-2 border-t border-border space-y-0.5">
                    {pt._count.students} aluno{pt._count.students !== 1 ? "s" : ""} de {pt.studentLimit} do plano
                    <br />
                    R$ {pt.monthlyPrice.toFixed(2).replace(".", ",")}/mes
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab === "alunos" && (
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
        )}

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