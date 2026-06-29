import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { logError } from "../lib/error-logger";
import { publicMutationHeaders } from "../lib/admin-helpers";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch("/api/auth/session", { credentials: "include", signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setUser(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Login failed" };
      }

      setUser(data.user);
      return {};
    } catch (e) {
      logError("AuthLogin", e);
      return { error: "Network error, please try again" };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Registration failed" };
      }

      setUser(data.user);
      return {};
    } catch (e) {
      logError("AuthRegister", e);
      return { error: "Network error, please try again" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: publicMutationHeaders,
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
