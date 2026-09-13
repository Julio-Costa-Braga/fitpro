"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: "PERSONAL" | "NUTRITIONIST" | "STUDENT";
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (updater: (prev: User | null) => User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        if (res.user.mustChangePassword && typeof window !== "undefined") {
          if (window.location.pathname !== "/change-password") {
            window.location.assign("/change-password");
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login(email, password);
      setUser(res.user);
      router.push(
        res.user.mustChangePassword ? "/change-password" : "/dashboard"
      );
    },
    [router]
  );

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      role: "PERSONAL" | "NUTRITIONIST" | "STUDENT";
    }) => {
      const res = await api.auth.register(data);
      setUser(res.user);
      router.push(
        res.user.mustChangePassword ? "/change-password" : "/dashboard"
      );
    },
    [router]
  );

  const logout = useCallback(() => {
    api.auth.logout().catch(() => {});
    setUser(null);
    router.push("/");
  }, [router]);

  const updateUser = useCallback((updater: (prev: User | null) => User | null) => {
    setUser(updater);
  }, []);

  const token = user ? "session" : null;

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}