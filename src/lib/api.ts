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

const AUTH_REDIRECT_EXEMPT = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
]);

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse seguro: respostas 204/empty/HTML nao podem ir para JSON.parse.
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !AUTH_REDIRECT_EXEMPT.has(path)) {
      window.location.href = "/";
    }
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "Erro na requisicao";
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PERSONAL" | "NUTRITIONIST" | "STUDENT";
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
  studentLimit?: number;
  monthlyPrice?: number;
}

export interface AuthResponse {
  user: User;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: "PERSONAL" | "NUTRITIONIST" | "STUDENT";
  isActive: boolean;
  lifetime: boolean;
  paidUntil: string | null;
  referralCode: string | null;
  referralDiscountMonths: number;
  createdAt: string;
  referredByUser: { id: string; name: string } | null;
  myTrainer: { id: string; name: string } | null;
  studentRecord: { personal: { id: string; name: string } | null } | null;
  _count: { students: number; myReferrals: number; nutritionStudents: number };
  studentLimit: number;
  monthlyPrice: number;
}

export type PaymentStatus = "PAID" | "PENDING";

export interface PaymentRecord {
  id: string;
  amount: number;
  status: PaymentStatus;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface BillingInfo {
  plan: {
    lifetime: boolean;
    paidUntil: string | null;
    studentLimit: number;
    monthlyPrice: number;
    referralCode: string | null;
    referralDiscountMonths: number;
    role?: "PERSONAL" | "NUTRITIONIST";
    extraStudents: number;
    baseFee: number;
    extraFee: number;
    totalFee: number;
  };
  studentsCount: number;
  payments: PaymentRecord[];
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
      role: "PERSONAL" | "NUTRITIONIST" | "STUDENT";
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
      role: "PERSONAL" | "NUTRITIONIST" | "STUDENT";
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

    logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  },

  admin: {
    accounts: () => request<{ users: AdminAccount[] }>("/api/admin/accounts"),
    updateUser: (id: string, data: {
      isActive?: boolean;
      lifetime?: boolean;
      addMonth?: boolean;
      role?: "PERSONAL" | "NUTRITIONIST" | "STUDENT";
      planUpgrade?: { slots: number; price: number };
    }) => request<{ user: AdminAccount }>(`/api/admin/users/${id}`, { method: "PUT", body: data }),
    deleteUser: (id: string) => request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }),
  },

  stats: {
    get: () => request<StatsResponse>("/api/stats"),
    getStudent: (studentId: string) =>
      request<StudentStatsResponse>(`/api/stats/student?studentId=${studentId}`),
  },

  billing: {
    get: () => request<BillingInfo>("/api/billing"),
    recordPayment: (userId: string, data: {
      status?: "PAID" | "PENDING";
      reference?: string;
      amount?: number;
    }) =>
      request<{ payment: PaymentRecord }>("/api/billing/payments", {
        method: "POST",
        body: { userId, ...data },
      }),
  },

  profile: {
    update: (data: { avatarUrl?: string | null; name?: string }) =>
      request<{ user: User }>("/api/profile", { method: "PUT", body: data }),
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
