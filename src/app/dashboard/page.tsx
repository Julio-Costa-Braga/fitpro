"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type StatsResponse, type StudentStatsResponse } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  Users,
  Dumbbell,
  Apple,
  Plus,
  Calendar,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function TrainerDashboard({ stats }: { stats: StatsResponse }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted">Visao geral da sua atividade</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Alunos" value={stats.totalStudents} />
        <StatCard icon={<Dumbbell className="w-5 h-5" />} label="Treinos Ativos" value={stats.activeWorkouts} />
        <StatCard icon={<Apple className="w-5 h-5" />} label="Dietas Ativas" value={stats.activeDiets} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/students/new"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Adicionar Aluno</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
        <Link
          href="/workouts/new"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Dumbbell className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Criar Treino</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
        <Link
          href="/diets/new"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Apple className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Criar Dieta</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h2 className="font-semibold">Atividade Recente</h2>
        </div>
        {stats.recentSessions.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted text-sm">
            Nenhuma atividade recente
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentSessions.map((session) => (
              <div key={session.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.workout.name}</p>
                  <p className="text-xs text-muted">
                    {session.student.name} &middot;{" "}
                    {new Date(session.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant={session.completed ? "success" : "warning"}>
                  {session.completed ? "Concluido" : "Pendente"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StudentDashboard({ stats }: { stats: StudentStatsResponse }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold mb-1">Meu Dashboard</h1>
        <p className="text-muted">Acompanhe seus treinos e progresso</p>
      </div>

      {stats.todayWorkout ? (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-lg">Treino do Dia</h2>
          </div>
          <h3 className="font-medium text-white mb-3">{stats.todayWorkout.name}</h3>
          <div className="space-y-2">
            {stats.todayWorkout.exercises.map((we, i) => (
              <div key={i} className="flex items-center justify-between bg-bg rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{we.exercise.name}</p>
                  <p className="text-xs text-muted">{we.exercise.muscleGroup}</p>
                </div>
                <p className="text-xs text-muted whitespace-nowrap">
                  {we.sets}x{we.reps}
                </p>
              </div>
            ))}
          </div>
          <Link
            href={`/workout-sessions/new?workoutId=${stats.todayWorkout.id}`}
            className="mt-4 w-full bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            Iniciar Treino
          </Link>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted">Nenhum treino programado para hoje</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted mb-1">Taxa de Conclusao</p>
          <p className="text-2xl font-bold">{stats.completionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted mb-1">Treinos</p>
          <p className="text-2xl font-bold">
            {stats.completedSessions}/{stats.totalSessions}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/diets"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Apple className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Ver Minha Dieta</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
        <Link
          href="/progress"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Meu Progresso</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trainerStats, setTrainerStats] = useState<StatsResponse | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    if (user.role === "ADMIN") {
      router.replace("/admin");
      return;
    }

    async function loadStats() {
      try {
        if (user!.role === "PERSONAL") {
          const data = await api.stats.get();
          setTrainerStats(data);
        } else {
          const me = await api.get<{ student: { id: string } }>(
            "/api/students/me"
          );
          const data = await api.stats.getStudent(me.student.id);
          setStudentStats(data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user, token, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title="Dashboard">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {user.role === "PERSONAL" && trainerStats && (
        <TrainerDashboard stats={trainerStats} />
      )}

      {user.role === "STUDENT" && studentStats && (
        <StudentDashboard stats={studentStats} />
      )}

      {user.role === "STUDENT" && !studentStats && !error && (
        <StudentDashboard
          stats={{
            totalWorkouts: 0,
            completedSessions: 0,
            totalSessions: 0,
            completionRate: 0,
            latestProgress: null,
            todayWorkout: null,
          }}
        />
      )}

      {user.role === "PERSONAL" && !trainerStats && !error && (
        <TrainerDashboard
          stats={{
            totalStudents: 0,
            activeWorkouts: 0,
            activeDiets: 0,
            recentSessions: [],
            studentsWithRecentActivity: [],
          }}
        />
      )}
    </AppLayout>
  );
}
