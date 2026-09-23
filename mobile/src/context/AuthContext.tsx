import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/config";
import { api } from "../lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  is_superadmin?: boolean;
  residencies?: Residency[];
}

export interface Residency {
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
  currentMessId: string | null;
  currentResidency: Residency | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentMessId: (messId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentMessId, setCurrentMessIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedMessId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_MESS_ID);

      if (storedToken) {
        setToken(storedToken);
        if (storedMessId) setCurrentMessIdState(storedMessId);

        // Fetch user profile
        try {
          const res = await api.getMe();
          if (res?.user) {
            setUser(res.user);
            if (!storedMessId && res.user.residencies?.length > 0) {
              const defaultMessId = res.user.residencies[0].mess_id;
              setCurrentMessIdState(defaultMessId);
              await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_MESS_ID, defaultMessId);
            }
          }
        } catch {
          // Token expired or invalid
          await logout();
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(newUser));

    if (newUser.residencies && newUser.residencies.length > 0) {
      const messId = newUser.residencies[0].mess_id;
      setCurrentMessIdState(messId);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_MESS_ID, messId);
    }
  };

  const logout = async () => {
    try {
      if (token) await api.logout();
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_MESS_ID);
    setToken(null);
    setUser(null);
    setCurrentMessIdState(null);
  };

  const setCurrentMessId = async (messId: string) => {
    setCurrentMessIdState(messId);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_MESS_ID, messId);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
      }
    } catch {
      // ignore
    }
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
        currentMessId,
        currentResidency,
        isLoading,
        login,
        logout,
        setCurrentMessId,
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
