"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, Users, UserPlus, User, Mail, X, Power, Star, CalendarPlus,
  Trash2, Infinity as InfinityIcon, Ban, CheckCircle2, LayoutDashboard, CreditCard, Dumbbell,
  Apple,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type AdminAccount } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { MODULES, DEFAULT_PERMISSIONS, MODULE_LABEL_KEYS, type ModuleName } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { dateLocale } from "@/lib/i18n/dictionaries";
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
    nutritionists: number;
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
    role: "STUDENT" as "PERSONAL" | "NUTRITIONIST" | "STUDENT",
    trainerId: "",
  });
  const [tab, setTab] = useState<"overview" | "contas" | "personais" | "alunos" | "permissoes">("contas");
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [permsLoading, setPermsLoading] = useState(false);
  const [permUser, setPermUser] = useState<AdminAccount | null>(null);
  const [userPermData, setUserPermData] = useState<{
    role: string;
    rolePerms: Record<string, boolean>;
    overrides: Record<string, boolean>;
    effective: Record<string, boolean>;
  } | null>(null);
  const [userPermBusy, setUserPermBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    loadOverview();
    loadPermissions();
  }, [user, authLoading, router]);

  async function loadPermissions() {
    try {
      const data = await api.get<{ roles: Record<string, Record<string, boolean>> }>("/api/admin/permissions");
      setPerms(data.roles);
    } catch {
      setError(t("admin.errLoad"));
    }
  }

  async function togglePermission(role: string, module: ModuleName, enabled: boolean) {
    setPermsLoading(true);
    try {
      await api.put("/api/admin/permissions", { role, module, enabled });
      setPerms((p) => ({ ...p, [role]: { ...p[role], [module]: enabled } }));
    } catch {
      setError(t("admin.errLoad"));
    } finally {
      setPermsLoading(false);
    }
  }

  async function openUserPerms(acc: AdminAccount) {
    setPermUser(acc);
    setUserPermData(null);
    try {
      const data = await api.get<{
        role: string;
        rolePerms: Record<string, boolean>;
        overrides: Record<string, boolean>;
        effective: Record<string, boolean>;
      }>(`/api/admin/users/${acc.id}/permissions`);
      setUserPermData(data);
    } catch {
      setError(t("admin.errLoad"));
    }
  }

  async function saveUserPerm(module: ModuleName, value: boolean | "default") {
    if (!permUser) return;
    setUserPermBusy(true);
    try {
      if (value === "default") {
        await api.delete(`/api/admin/users/${permUser.id}/permissions?module=${module}`);
      } else {
        await api.put(`/api/admin/users/${permUser.id}/permissions`, { module, value });
      }
      const data = await api.get<{
        role: string;
        rolePerms: Record<string, boolean>;
        overrides: Record<string, boolean>;
        effective: Record<string, boolean>;
      }>(`/api/admin/users/${permUser.id}/permissions`);
      setUserPermData(data);
    } catch {
      setError(t("admin.errLoad"));
    } finally {
      setUserPermBusy(false);
    }
  }

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
  async function recordPayment(acc: AdminAccount) {
    setError("");
    try {
      await api.billing.recordPayment(acc.id, { status: "PAID" });
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("admin.errUpdate"));
    }
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
          date: new Date(acc.paidUntil).toLocaleDateString(dateLocale(lang)),
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
            { id: "permissoes", label: t("admin.tabPermissions"), icon: Shield },
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("admin.tabTrainers")}</p>
              <p className="text-3xl font-bold text-accent">{totals.personals}</p>
            </Card>
            <Card className="p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("admin.roleNutritionist")}</p>
              <p className="text-3xl font-bold text-purple-400">{totals.nutritionists}</p>
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
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
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
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${acc.role === "PERSONAL" ? "bg-accent/15 text-accent" : acc.role === "NUTRITIONIST" ? "bg-purple-500/15 text-purple-400" : "bg-green-500/15 text-green-400"}`}>
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
                        acc.role === "PERSONAL" ? "bg-accent/15 text-accent" : acc.role === "NUTRITIONIST" ? "bg-purple-500/15 text-purple-400" : "bg-green-500/15 text-green-400"
                      }`}>
                        {acc.role === "PERSONAL"
                          ? <Dumbbell className="w-3 h-3" />
                          : acc.role === "NUTRITIONIST"
                            ? <Apple className="w-3 h-3" />
                            : <User className="w-3 h-3" />}
                        {acc.role === "PERSONAL"
                          ? t("admin.rolePersonal")
                          : acc.role === "NUTRITIONIST"
                            ? t("admin.roleNutritionist")
                            : t("admin.roleStudent")}
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
                      {(acc.role === "PERSONAL" || acc.role === "NUTRITIONIST") && (
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
                          : t("admin.studentsCount", { n: acc.role === "NUTRITIONIST" ? acc._count.nutritionStudents : acc._count.students })}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={acc.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        className="flex-1 min-w-[110px]"
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
                        variant="secondary"
                        size="sm"
                        icon={<Shield className="w-3.5 h-3.5" />}
                        onClick={() => openUserPerms(acc)}
                      >
                        {t("admin.permsUser")}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => removeAccount(acc)}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>

                    {(acc.role === "PERSONAL" || acc.role === "NUTRITIONIST") && acc.lifetime === false && (
                      <div className="flex gap-1.5 border-t border-border pt-2 flex-wrap">
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

                    {(acc.role === "PERSONAL" || acc.role === "NUTRITIONIST") && (
                      <div className="border-t border-border pt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<CreditCard className="w-3.5 h-3.5" />}
                          className="w-full"
                          onClick={() => recordPayment(acc)}
                        >
                          {t("admin.recordPayment")}
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

        {tab === "permissoes" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-accent" />
              <h2 className="text-lg font-semibold">{t("perm.title")}</h2>
            </div>
            <p className="text-sm text-muted mb-4">{t("perm.subtitle")}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["NUTRITIONIST", "PERSONAL", "STUDENT"] as const).map((role) => (
                <Card key={role} className="p-5">
                  <p className="font-semibold mb-3">{t(`perm.role${role}`)}</p>
                  <div className="space-y-2">
                    {MODULES.map((m) => {
                      const enabled = perms[role]?.[m] ?? DEFAULT_PERMISSIONS[role][m];
                      return (
                        <button
                          key={m}
                          disabled={permsLoading}
                          onClick={() => togglePermission(role, m, !enabled)}
                          className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border hover:border-muted transition-all"
                        >
                          <span className="text-sm font-medium">{t(MODULE_LABEL_KEYS[m])}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            enabled ? "bg-green-500/15 text-green-400" : "bg-card border border-border text-muted"
                          }`}>
                            {enabled ? t("perm.enabled") : t("perm.disabled")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Modal
          open={!!permUser}
          onClose={() => setPermUser(null)}
          title={permUser ? t("perm.userTitle", { name: permUser.name }) : ""}
          size="md"
        >
          {userPermData ? (
            <div className="space-y-2">
              <p className="text-xs text-muted mb-3">
                {t("perm.userSubtitle", { role: t(`perm.role${userPermData.role}`) })}
              </p>
              {MODULES.map((m) => {
                const choice = m in userPermData.overrides ? (userPermData.overrides[m] ? true : false) : "default";
                const custom = choice !== "default";
                const roleDefault = userPermData.rolePerms[m];
                return (
                  <div key={m} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t(MODULE_LABEL_KEYS[m])}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        roleDefault ? "bg-accent/15 text-accent" : "bg-card border border-border text-muted"
                      }`}>
                        {roleDefault ? t("perm.profileVisible") : t("perm.profileHidden")}
                      </span>
                      {custom && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                          {t("perm.custom")}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {([["default", t("perm.default")], [true, t("perm.enabled")], [false, t("perm.disabled")]] as const).map(([v, label]) => (
                        <button
                          key={String(v)}
                          disabled={userPermBusy}
                          onClick={() => saveUserPerm(m, v)}
                          className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${
                            choice === v
                              ? v === true
                                ? "bg-green-500/15 border-green-500/40 text-green-400"
                                : v === false
                                  ? "bg-red-500/15 border-red-500/40 text-red-400"
                                  : "bg-accent/15 border-accent text-accent"
                              : "bg-card border-border text-muted hover:border-muted"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          )}
        </Modal>

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
                {(["STUDENT", "PERSONAL", "NUTRITIONIST"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, role: r, trainerId: "" }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.role === r
                        ? "bg-accent/15 border-accent text-accent"
                        : "bg-card border-border text-muted hover:border-muted"
                    }`}
                  >
                    {r === "STUDENT" ? t("admin.roleStudent") : r === "PERSONAL" ? t("admin.rolePersonal") : t("admin.roleNutritionist")}
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