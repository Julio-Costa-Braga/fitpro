"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { MODULES, type ModuleName } from "@/lib/permissions";

interface PermissionsContextType {
  modules: ModuleName[];
  can: (module: ModuleName) => boolean;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined
);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [modules, setModules] = useState<ModuleName[]>(() => [...MODULES]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ modules: ModuleName[] }>("/api/permissions/me");
      setModules(res.modules);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setModules([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setModules([]);
      return;
    }
    refresh();
  }, [user, authLoading, refresh]);

  const can = useCallback(
    (module: ModuleName) => modules.includes(module),
    [modules]
  );

  return (
    <PermissionsContext.Provider value={{ modules, can, refresh }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error(
      "usePermissions deve ser usado dentro de um PermissionsProvider"
    );
  }
  return context;
}