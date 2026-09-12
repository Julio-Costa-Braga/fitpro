"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Users, Mail, Phone, Dumbbell, Apple, Ban, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  user?: { id: string; isActive: boolean } | null;
  _count?: { workouts: number; dietPlans: number };
}

export default function StudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [accessBusy, setAccessBusy] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }
    loadStudents();
  }, [user, authLoading, router]);

  async function loadStudents() {
    try {
      const data = await api.get<{ students: Student[] }>("/api/students");
      setStudents(data.students);
    } catch {
      setError(t("stu.errLoad"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleAccess(student: Student) {
    if (!student.user) return;
    setAccessBusy(student.id);
    setError("");
    try {
      const next = !student.user.isActive;
      const data = await api.put<{ user: { id: string; isActive: boolean } }>(
        `/api/students/${student.id}/access`,
        { isActive: next }
      );
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, user: { ...s.user!, isActive: data.user.isActive } } : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("stu.errAccess"));
    } finally {
      setAccessBusy(null);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const data = await api.post<{ student: Student }>("/api/students", {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      setStudents((prev) => [{ ...data.student, _count: { workouts: 0, dietPlans: 0 } }, ...prev]);
      setForm({ name: "", email: "", phone: "", password: "" });
      setShowCreate(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("stu.errCreate"));
    } finally {
      setCreating(false);
    }
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title={t("nav.students")}>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("nav.students")}</h1>
            <p className="text-muted text-sm">{t("stu.count", { n: students.length, s: students.length !== 1 ? "s" : "" })}</p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            {t("stu.new")}
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder={t("stu.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">{students.length === 0 ? t("stu.empty") : t("stu.noResults")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((student) => (
              <Card
                key={student.id}
                hover
                onClick={() => router.push(`/students/${student.id}`)}
                className="p-5"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent font-semibold text-sm shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{student.name}</h3>
                    {student.email && (
                      <p className="text-xs text-muted flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {student.email}
                      </p>
                    )}
                    {student.phone && (
                      <p className="text-xs text-muted flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        {student.phone}
                      </p>
                    )}
                  </div>
                  <div className="ml-auto flex flex-col items-end gap-2 shrink-0">
                    {student.user ? (
                      <Badge variant={student.user.isActive ? "success" : "danger"}>
                        {student.user.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    ) : (
                      <Badge variant="default">{t("stu.noAccount")}</Badge>
                    )}
                    {student.user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAccess(student);
                        }}
                        disabled={accessBusy === student.id}
                        title={student.user.isActive ? t("stu.deactivateAccess") : t("stu.activateAccess")}
                        className={`p-1.5 rounded-lg transition-colors ${
                          student.user.isActive
                            ? "text-muted hover:text-red-400 hover:bg-red-500/10"
                            : "text-green-400/80 hover:text-green-400 hover:bg-green-500/10"
                        }`}
                      >
                        {accessBusy === student.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : student.user.isActive ? (
                          <Ban className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted pt-3 border-t border-border">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" />
                    {t("stu.workoutsCount", { n: student._count?.workouts ?? 0 })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Apple className="w-3 h-3" />
                    {t("stu.dietsCount", { n: student._count?.dietPlans ?? 0 })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("stu.new")} size="md">
          <div className="space-y-4">
            <Input
              label={t("stu.formName")}
              placeholder={t("auth.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label={t("auth.email")}
              type="email"
              placeholder={t("stu.emailPlaceholder")}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label={t("stu.phoneLabel")}
              placeholder={t("stu.phonePlaceholder")}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label={t("stu.accessPassLabel")}
              type="password"
              placeholder={t("stu.accessPassPlaceholder")}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} loading={creating} className="flex-1">
                {t("stu.new")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
