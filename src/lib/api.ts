const API_BASE = "";

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fitpro_token");
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("fitpro_token");
      window.location.href = "/";
    }
    throw new ApiError(data.error || "Erro na requisicao", res.status);
  }

  return data as T;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PERSONAL" | "STUDENT";
  avatarUrl?: string;
  phone?: string;
  mustChangePassword?: boolean;
  createdAt: string;
  referralCode?: string;
  referralDiscountMonths?: number;
  referredByUserId?: string;
  referredByUser?: { id: string; name: string } | null;
  isActive?: boolean;
  lifetime?: boolean;
  paidUntil?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: "PERSONAL" | "STUDENT";
  isActive: boolean;
  lifetime: boolean;
  paidUntil: string | null;
  referralCode: string | null;
  referralDiscountMonths: number;
  createdAt: string;
  referredByUser: { id: string; name: string } | null;
  _count: { students: number; myReferrals: number };
}

export interface WeekTemplateDay {
  id: string;
  weekday: string;
  workoutTemplateId: string | null;
  workoutTemplate?: { id: string; name: string; exercises: { id: string }[] } | null;
}

export interface WeekTemplate {
  id: string;
  name: string;
  description?: string | null;
  level: "INICIANTE" | "MODERADO" | "AVANCADO";
  isPreset?: boolean;
  days: WeekTemplateDay[];
}

export interface StatsResponse {
  totalStudents: number;
  activeWorkouts: number;
  activeDiets: number;
  recentSessions: {
    id: string;
    date: string;
    completed: boolean;
    workout: { name: string };
    student: { name: string };
  }[];
  studentsWithRecentActivity: { id: string; name: string }[];
}

export interface StudentStatsResponse {
  totalWorkouts: number;
  completedSessions: number;
  totalSessions: number;
  completionRate: number;
  latestProgress: {
    id: string;
    date: string;
    weight?: number;
    bodyFat?: number;
  } | null;
  todayWorkout: {
    id: string;
    name: string;
    exercises: {
      exercise: { name: string; muscleGroup: string };
      sets: number;
      reps: string;
    }[];
  } | null;
  workouts?: StudentWorkoutSummary[];
}

export interface StudentWorkoutSummary {
  id: string;
  name: string;
  dayLetter: string;
  dayOfWeek: string | null;
  createdAt: string;
  _count: { exercises: number };
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body: unknown) => request<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),

  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      }),

    register: (data: {
      name: string;
      email: string;
      password: string;
      role: "PERSONAL" | "STUDENT";
      referralCode?: string;
    }) =>
      request<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: data,
      }),

    createAccount: (data: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      role: "PERSONAL" | "STUDENT";
      trainerId?: string;
    }) =>
      request<{ user: User }>("/api/auth/accounts", {
        method: "POST",
        body: data,
      }),

    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: boolean }>("/api/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      }),

    me: () => request<{ user: User }>("/api/auth/me"),
  },

  admin: {
    accounts: () => request<{ users: AdminAccount[] }>("/api/admin/accounts"),
    updateUser: (id: string, data: {
      isActive?: boolean;
      lifetime?: boolean;
      addMonth?: boolean;
      role?: "PERSONAL" | "STUDENT";
    }) => request<{ user: AdminAccount }>(`/api/admin/users/${id}`, { method: "PUT", body: data }),
    deleteUser: (id: string) => request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }),
  },

  stats: {
    get: () => request<StatsResponse>("/api/stats"),
    getStudent: (studentId: string) =>
      request<StudentStatsResponse>(`/api/stats/student?studentId=${studentId}`),
  },

  weekTemplates: {
    list: () => request<{ weeks: WeekTemplate[] }>("/api/week-templates"),
    create: (data: {
      name: string;
      description?: string;
      level?: "INICIANTE" | "MODERADO" | "AVANCADO";
      days: { weekday: string; workoutTemplateId: string }[];
    }) => request<{ week: WeekTemplate }>("/api/week-templates", { method: "POST", body: data }),
    get: (id: string) => request<{ week: WeekTemplate }>(`/api/week-templates/${id}`),
    update: (id: string, data: {
      name: string;
      description?: string;
      level?: "INICIANTE" | "MODERADO" | "AVANCADO";
      days: { weekday: string; workoutTemplateId: string }[];
    }) => request<{ week: WeekTemplate }>(`/api/week-templates/${id}`, { method: "PUT", body: data }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/week-templates/${id}`, { method: "DELETE" }),
    apply: (id: string, studentId: string) =>
      request<{ weekName: string; created: number; workouts: { id: string; name: string; dayOfWeek: string }[] }>(
        `/api/week-templates/${id}/apply`,
        { method: "POST", body: { studentId } }
      ),
  },
};
