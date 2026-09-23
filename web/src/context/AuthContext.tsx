"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  is_superadmin?: boolean;
  is_suspended?: boolean;
  residencies?: Residency[];
}

interface Residency {
  id: string;
  mess_id: string;
  role: "owner" | "manager" | "resident";
  status: "active" | "invited" | "on_leave" | "left";
  bed?: { id: string; label: string };
  mess?: { id: string; name: string; city: string; status: string };
  security_deposit_amount?: number | string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentResidency: Residency | null;
  currentMessId: string | null;
  setCurrentMessId: (id: string) => void;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentMessId, setCurrentMessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      if (data?.user) {
        setUser(data.user);
        // Default to first active mess if none selected
        if (!currentMessId && data.user.residencies?.length > 0) {
          setCurrentMessId(data.user.residencies[0].mess_id);
        }
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("mess_token");
    if (savedToken) {
      setToken(savedToken);
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("mess_token", newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser.residencies && newUser.residencies.length > 0) {
      setCurrentMessId(newUser.residencies[0].mess_id);
    }
  };

  const logout = async () => {
    try {
      if (token) await api.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("mess_token");
    setToken(null);
    setUser(null);
    setCurrentMessId(null);
  };

  const currentResidency =
    user?.residencies?.find((r) => r.mess_id === currentMessId) ||
    user?.residencies?.[0] ||
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentResidency,
        currentMessId,
        setCurrentMessId,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
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
