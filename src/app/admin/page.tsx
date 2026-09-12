"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, Users, UserPlus, User, Mail, X, Power, Star, CalendarPlus,
  Trash2, Infinity as InfinityIcon, Ban, CheckCircle2, LayoutDashboard, CreditCard, Dumbbell,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type AdminAccount } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  MONTHLY_FEE, EXTRA_STUDENT_PRICE, PACK5_PRICE, PACK10_PRICE,
  REFERRAL_DISCOUNT, REFERRAL_DISCOUNT_MONTHS,
} from "@/lib/billing";

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
  const { t, lang } = useLanguage();
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
      setError(t("admin.errLoad"));
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
      setError(err instanceof Error ? err.message : t("admin.errUpdate"));
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
    if (!window.confirm(t("admin.confirmDelete", { name: acc.name }))) return;
    setError("");
    try {
      await api.admin.deleteUser(acc.id);
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("admin.errDelete"));
    }
  }

  async function upgradePlan(acc: AdminAccount, slots: number, price: number) {
    if (
      !window.confirm(t("admin.confirmUpgrade", { slots, price: price.toFixed(2).replace(".", ","), name: acc.name }))
    ) {
      return;
    }
    setError("");
    try {
      await api.admin.updateUser(acc.id, { planUpgrade: { slots, price } });
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("admin.errPlan"));
    }
  }

  function paymentLabel(acc: AdminAccount): string {
    if (acc.lifetime) return t("common.lifetime");
    if (acc.paidUntil) {
      const time = new Date(acc.paidUntil).getTime();
      if (time >= Date.now())
        return t("admin.paidUntil", {
          date: new Date(acc.paidUntil).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "en" ? "en-US" : "es-ES"),
        });
      return t("admin.pendingPayment");
    }
    return t("admin.pendingPayment");
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
      setError(err instanceof Error ? err.message : t("admin.errCreate"));
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
    <AppLayout title={t("nav.admin")}>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent" />
              {t("admin.panelTitle")}
            </h1>
            <p className="text-muted text-sm">{t("admin.subtitle")}</p>
          </div>
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            {t("admin.createAccount")}
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {([
            { id: "overview", label: t("admin.tabOverview"), icon: LayoutDashboard },
            { id: "contas", label: t("admin.tabAccounts"), icon: CreditCard },
            { id: "personais", label: t("admin.tabTrainers"), icon: Dumbbell },
            { id: "alunos", label: t("nav.students"), icon: Users },
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
              <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("admin.tabTrainers")}</p>
              <p className="text-3xl font-bold text-accent">{totals.personals}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("nav.students")}</p>
              <p className="text-3xl font-bold text-green-400">{totals.students}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("admin.statsAccounts")}</p>
              <p className="text-3xl font-bold">{accounts.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("admin.statsOverdue")}</p>
              <p className={`text-3xl font-bold ${overdueCount > 0 ? "text-red-400" : "text-green-400"}`}>
                {overdueCount}
              </p>
            </Card>
          </div>
        )}

        {tab === "contas" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{t("admin.tabAccounts")}</h2>
            <p className="text-xs text-muted">
              {t("admin.planSummary", {
                fee: MONTHLY_FEE.toFixed(2).replace(".", ","),
                fee1: EXTRA_STUDENT_PRICE.toFixed(2).replace(".", ","),
                fee2: PACK5_PRICE.toFixed(2).replace(".", ","),
                fee3: PACK10_PRICE.toFixed(2).replace(".", ","),
              })}
            </p>
          </div>
          {accounts.length === 0 ? (
            <Card className="p-10 text-center">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted">{t("admin.noAccounts")}</p>
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
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        acc.role === "PERSONAL" ? "bg-accent/15 text-accent" : "bg-green-500/15 text-green-400"
                      }`}>
                        {acc.role === "PERSONAL" ? <Dumbbell className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {acc.role === "PERSONAL" ? t("admin.rolePersonal") : t("admin.roleStudent")}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        acc.isActive ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"
                      }`}>
                        {acc.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        acc.lifetime ? "bg-amber-500/15 text-amber-400" : "bg-card border border-border text-muted"
                      }`}>
                        {acc.lifetime ? t("common.lifetime") : t("admin.subscription")}
                      </span>
                      {!acc.lifetime && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          paid ? "bg-teal-500/15 text-teal-300" : "bg-red-500/15 text-red-400"
                        }`}>
                          {paymentLabel(acc)}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted space-y-1 border-t border-border pt-2">
                      <p>{t("admin.code")} <span className="text-white font-mono">{acc.referralCode}</span></p>
                      {acc.role === "PERSONAL" && (
                        <p>
                          {t("admin.planLine", { n: acc.studentLimit, price: acc.monthlyPrice.toFixed(2).replace(".", ",") })}
                        </p>
                      )}
                      {acc._count.myReferrals > 0 && (
                        <p>
                          {t("admin.referralGot", { n: acc._count.myReferrals, price: REFERRAL_DISCOUNT.toFixed(2).replace(".", ","), months: REFERRAL_DISCOUNT_MONTHS })}
                        </p>
                      )}
                      {acc._count.myReferrals === 0 && acc.referredByUser && (
                        <p>{t("admin.referredBy", { name: acc.referredByUser.name })}</p>
                      )}
                      <p>
                        {acc.role === "STUDENT"
                          ? ((acc.studentRecord?.personal?.name ?? acc.myTrainer?.name)
                              ? t("admin.studentOf", { name: acc.studentRecord?.personal?.name ?? acc.myTrainer?.name ?? "" })
                              : t("admin.noTrainerLinked"))
                          : t("admin.studentsCount", { n: acc._count.students })}
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
                        {acc.isActive ? t("admin.deactivate") : t("admin.activate")}
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
                              {t("admin.addMonth")}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={acc.lifetime ? <Star className="w-3.5 h-3.5" /> : <InfinityIcon className="w-3.5 h-3.5" />}
                            onClick={() => toggleLifetime(acc)}
                          >
                            {acc.lifetime ? t("header.logout") : t("common.lifetime")}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => removeAccount(acc)}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>

                    {acc.role === "PERSONAL" && acc.lifetime === false && (
                      <div className="flex gap-1.5 border-t border-border pt-2">
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => upgradePlan(acc, 1, EXTRA_STUDENT_PRICE)}>
                          {t("admin.upgradeSlots1", { fee: EXTRA_STUDENT_PRICE.toFixed(2).replace(".", ",") })}
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => upgradePlan(acc, 5, PACK5_PRICE)}>
                          {t("admin.upgradeSlots5", { fee: PACK5_PRICE.toFixed(2).replace(".", ",") })}
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => upgradePlan(acc, 10, PACK10_PRICE)}>
                          {t("admin.upgradeSlots10", { fee: PACK10_PRICE.toFixed(2).replace(".", ",") })}
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
            <h2 className="text-lg font-semibold mb-3">{t("admin.tabTrainers")}</h2>
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
                    {t("admin.trainerStudents", { n: pt._count.students, s: pt._count.students !== 1 ? "s" : "", limit: pt.studentLimit })}
                    <br />
                    {t("admin.trainerFee", { fee: pt.monthlyPrice.toFixed(2).replace(".", ",") })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab === "alunos" && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("nav.students")}</h2>
          {students.length === 0 ? (
            <Card className="p-10 text-center">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted">{t("admin.noStudents")}</p>
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
                        {st.personal ? t("admin.trainerOwner", { name: st.personal.name }) : t("admin.noTrainerLinked")}
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
          title={t("admin.createAccount")}
          size="md"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">{t("auth.accountType")}</label>
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
                    {r === "STUDENT" ? t("admin.roleStudent") : t("admin.rolePersonal")}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={t("admin.formName")}
              placeholder={t("auth.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label={t("admin.formEmail")}
              type="email"
              placeholder={t("admin.emailPlaceholder")}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label={t("admin.formPassword")}
              type="password"
              placeholder={t("auth.passwordMin")}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <Input
              label={t("stu.phoneLabel")}
              placeholder={t("stu.phonePlaceholder")}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />

            {form.role === "STUDENT" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">{t("admin.formTrainer")}</label>
                <select
                  value={form.trainerId}
                  onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">{t("admin.noTrainerLinked")}</option>
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
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} loading={creating} className="flex-1">
                {t("admin.createAccount")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}