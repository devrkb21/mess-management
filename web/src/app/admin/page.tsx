"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatBDT } from "@/lib/utils";
import {
  ShieldCheck,
  Building2,
  Users,
  AlertTriangle,
  LogIn,
  CheckCircle2,
  XCircle,
  Ban,
  Activity,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";

export default function SuperadminDashboardPage() {
  const router = useRouter();
  const { user, login, setCurrentMessId } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [messes, setMesses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"messes" | "users">("messes");

  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.is_superadmin) {
      router.push("/admin/login");
      return;
    }
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, messesRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminMesses(),
        api.getAdminUsers(),
      ]);
      setStats(statsRes.stats);
      setMesses(messesRes.messes || []);
      setUsers(usersRes.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load superadmin command center data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMessStatus = async (messId: string, status: string) => {
    setActionLoading(`mess-${messId}`);
    setError(null);
    setMessage(null);
    try {
      await api.updateMessStatus(messId, status);
      setMessage(`Mess status updated to ${status.toUpperCase()}.`);
      const messesRes = await api.getAdminMesses();
      setMesses(messesRes.messes || []);
      const statsRes = await api.getAdminStats();
      setStats(statsRes.stats);
    } catch (err: any) {
      setError(err.message || "Failed to update mess status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUserStatus = async (userId: string, isSuspended: boolean) => {
    setActionLoading(`user-${userId}`);
    setError(null);
    setMessage(null);
    try {
      await api.updateUserStatus(userId, isSuspended);
      setMessage(`User ${isSuspended ? "suspended" : "reactivated"} successfully.`);
      const usersRes = await api.getAdminUsers();
      setUsers(usersRes.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to update user status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonateMess = async (messId: string) => {
    setActionLoading(`impersonate-${messId}`);
    setError(null);
    try {
      const res = await api.impersonateMess(messId);
      login(res.token, res.user);
      setCurrentMessId(res.mess.id);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to enter mess as owner.");
      setActionLoading(null);
    }
  };

  if (!user?.is_superadmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-red-200 text-center shadow-sm">
        <ShieldCheck className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Restricted Access</h2>
        <p className="text-sm text-gray-500 mt-2">
          You must be authenticated as a Platform Superadmin to view this page.
        </p>
        <Link
          href="/admin/login"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Go to Superadmin Login →
        </Link>
      </div>
    );
  }

  const filteredMesses = messes.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Superadmin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-black text-xl shadow-md">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">SaaS Platform Command Center</h1>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Master Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as <span className="text-white font-medium">{user.name}</span> ({user.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Data
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            Go to User Dashboard →
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-600 font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Global SaaS Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Messes</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-gray-900">
            {stats?.total_messes ?? 0}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            <span className="font-semibold text-emerald-600">{stats?.active_messes ?? 0} active</span> •{" "}
            <span className="font-semibold text-amber-600">{stats?.pending_messes ?? 0} pending</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Registered Users</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-gray-900">
            {stats?.total_users ?? 0}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Active platform accounts across Bangladesh
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Living Residents</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-gray-900">
            {stats?.total_active_residencies ?? 0}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Currently residing with active meal accounts
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Monthly Platform Volume</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900">
            {formatBDT(stats?.monthly_expense_volume ?? 0)}
          </div>
          <p className="mt-1 text-xs text-gray-500">Total grocery & utility expense volume</p>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("messes")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === "messes"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Messes Control ({messes.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Users Control ({users.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={activeTab === "messes" ? "Search mess, city, owner..." : "Search user name, email, phone..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-indigo-500 shadow-xs"
          />
        </div>
      </div>

      {/* TAB 1: MESSES MANAGEMENT */}
      {activeTab === "messes" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Registered Mess Establishments</h2>
              <p className="text-xs text-gray-500">
                Review, approve, suspend, or directly impersonate as owner to inspect operations.
              </p>
            </div>
            <span className="text-xs text-gray-400">{filteredMesses.length} messes listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Mess Name & Location</th>
                  <th className="py-3 px-4">Owner / Contact</th>
                  <th className="py-3 px-4">Residents</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions & Impersonation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMesses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No messes matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMesses.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 text-base">{m.name}</div>
                        <div className="text-xs text-gray-500">
                          {m.city} • {m.address}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">{m.owner?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{m.owner?.email}</div>
                        <div className="text-xs text-gray-400">{m.owner?.phone}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {m.active_residents_count ?? 0} active
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                            m.status === "active"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : m.status === "suspended"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        {/* Impersonate */}
                        <button
                          onClick={() => handleImpersonateMess(m.id)}
                          disabled={actionLoading === `impersonate-${m.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs disabled:opacity-50"
                          title="Log in to this mess as Owner"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {actionLoading === `impersonate-${m.id}` ? "Entering..." : "Enter as Owner"}
                        </button>

                        {/* Status Change Buttons */}
                        {m.status !== "active" && (
                          <button
                            onClick={() => handleUpdateMessStatus(m.id, "active")}
                            disabled={actionLoading === `mess-${m.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}

                        {m.status !== "suspended" && (
                          <button
                            onClick={() => handleUpdateMessStatus(m.id, "suspended")}
                            disabled={actionLoading === `mess-${m.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-100 transition"
                          >
                            <Ban className="h-3.5 w-3.5" /> Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Platform User Accounts</h2>
              <p className="text-xs text-gray-500">
                View all registered accounts, verify roles, and suspend malicious users.
              </p>
            </div>
            <span className="text-xs text-gray-400">{filteredUsers.length} users listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Role & Messes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No users matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {u.name}
                          {u.is_superadmin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                              SUPERADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>

                      <td className="py-3 px-4 text-gray-700 font-mono text-xs">{u.phone || "—"}</td>

                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-600">
                          {u.residencies?.length ?? 0} Mess memberships
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                            u.is_suspended
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          {u.is_suspended ? "Suspended" : "Active"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!u.is_superadmin ? (
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, !u.is_suspended)}
                            disabled={actionLoading === `user-${u.id}`}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                              u.is_suspended
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                            }`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {u.is_suspended ? "Reactivate User" : "Suspend User"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Protected Master</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
