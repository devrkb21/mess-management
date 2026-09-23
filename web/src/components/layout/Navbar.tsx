"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Building2, LogOut, Plus, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { user, currentResidency, currentMessId, setCurrentMessId, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-lg">
              M
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              Mess<span className="text-emerald-600">Platform</span>
            </span>
          </Link>

          {/* Mess Switcher */}
          {user && (user.residencies?.length ?? 0) > 0 && (
            <div className="ml-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <select
                value={currentMessId || ""}
                onChange={(e) => setCurrentMessId(e.target.value)}
                className="rounded-md border border-gray-300 bg-white py-1.5 pl-2 pr-8 text-sm font-medium text-gray-700 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                {user.residencies?.map((r) => (
                  <option key={r.mess_id} value={r.mess_id}>
                    {r.mess?.name || "Mess"} ({r.role})
                  </option>
                ))}
              </select>

              <Link
                href="/messes/create"
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                title="Create New Mess"
              >
                <Plus className="h-3.5 w-3.5" /> New Mess
              </Link>
            </div>
          )}

          {user?.is_superadmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-md bg-indigo-100 text-indigo-800 px-2.5 py-1 text-xs font-bold hover:bg-indigo-200 transition"
            >
              Superadmin Portal
            </Link>
          )}

          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
          >
            <span>Vacancy Marketplace</span>
          </Link>
        </div>

        {/* User Profile / Logout */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-gray-800">{user.name}</span>
                <span className="text-xs text-gray-500 capitalize">
                  {currentResidency?.role || "Resident"}
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => logout()}
                className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-emerald-600 px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
