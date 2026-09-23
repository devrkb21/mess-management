"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatBDT } from "@/lib/utils";
import {
  Users,
  UtensilsCrossed,
  Receipt,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { user, currentMessId, currentResidency } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentMessId) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [currentMessId]);

  const loadDashboard = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getDashboard(currentMessId);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to view your dashboard.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-600 font-semibold">
          Sign In →
        </Link>
      </div>
    );
  }

  if (!currentMessId) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
        <Sparkles className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Welcome, {user.name}!</h2>
        <p className="mt-2 text-sm text-gray-500">
          You don't have an active mess membership yet. You can create a new mess as an owner or accept an invite.
        </p>
        <Link
          href="/messes/create"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Create a New Mess
        </Link>
      </div>
    );
  }

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentResidency?.mess?.name || "Mess Dashboard"}
          </h1>
          <p className="text-sm text-gray-500">
            Role: <span className="font-semibold text-emerald-700 capitalize">{currentResidency?.role}</span>
            {currentResidency?.bed && ` • Bed: ${currentResidency.bed.label}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/meals"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <UtensilsCrossed className="h-4 w-4" /> Today's Meals
          </Link>
          {isManager && (
            <Link
              href="/expenses"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" /> Log Bazar
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Live Meal Rate</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-gray-900">
            {formatBDT(data?.today?.per_meal_rate || 0)}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Today: {data?.today?.total_meals || 0} meals • Bazar: {formatBDT(data?.today?.total_expense || 0)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Monthly Bazar</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-gray-900">
            {formatBDT(data?.monthly_expense_total || 0)}
          </div>
          <p className="mt-1 text-xs text-gray-500">Total grocery expenses this month</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Active Residents</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-gray-900">
            {data?.active_residents || 0}
          </div>
          <p className="mt-1 text-xs text-gray-500">Living in this mess right now</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Pending Dues</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-gray-900">
            {formatBDT(data?.pending_dues || 0)}
          </div>
          <p className="mt-1 text-xs text-gray-500">Uncollected bill balances</p>
        </div>
      </div>

      {/* Today's Meals & Bazar Live Board */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-gray-900">Today's Meals & Bazar Duty (আজকের খাবার ও বাজার)</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live collective headcounts for breakfast, lunch, and dinner, plus today's grocery shopper.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/meals"
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
            >
              View Full Meal Sheet →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Breakfast */}
          <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/60">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">Breakfast (নাস্তা)</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {data?.today_breakdown?.breakfast?.total ?? 0}
              </span>
              <span className="text-xs text-gray-500">meals</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Residents: {data?.today_breakdown?.breakfast?.count ?? 0}
              {(data?.today_breakdown?.breakfast?.guests ?? 0) > 0 && (
                <span className="text-amber-700 font-medium"> +{data?.today_breakdown?.breakfast?.guests} guests</span>
              )}
            </div>
          </div>

          {/* Lunch */}
          <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200/60">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Lunch (দুপুর)</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {data?.today_breakdown?.lunch?.total ?? 0}
              </span>
              <span className="text-xs text-gray-500">meals</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Residents: {data?.today_breakdown?.lunch?.count ?? 0}
              {(data?.today_breakdown?.lunch?.guests ?? 0) > 0 && (
                <span className="text-emerald-700 font-medium"> +{data?.today_breakdown?.lunch?.guests} guests</span>
              )}
            </div>
          </div>

          {/* Dinner */}
          <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-200/60">
            <div className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Dinner (রাত)</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {data?.today_breakdown?.dinner?.total ?? 0}
              </span>
              <span className="text-xs text-gray-500">meals</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Residents: {data?.today_breakdown?.dinner?.count ?? 0}
              {(data?.today_breakdown?.dinner?.guests ?? 0) > 0 && (
                <span className="text-indigo-700 font-medium"> +{data?.today_breakdown?.dinner?.guests} guests</span>
              )}
            </div>
          </div>

          {/* Total Meals */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Total Meals Today</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {data?.today_breakdown?.total_meals ?? 0}
              </span>
              <span className="text-xs text-gray-500">total servings</span>
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">
              Rate: {formatBDT(data?.today?.per_meal_rate || 0)}/meal
            </div>
          </div>
        </div>

        {/* Bazar Duty Banner */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              🛒
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Today's Bazar Duty (আজকের বাজার দায়িত্ব)
              </div>
              {data?.today_breakdown?.bazar_shoppers && data.today_breakdown.bazar_shoppers.length > 0 ? (
                <div className="text-sm font-bold text-gray-900 mt-0.5">
                  {data.today_breakdown.bazar_shoppers.map((shopper: any, idx: number) => (
                    <span key={shopper.id || idx}>
                      {shopper.name || "Resident"}{" "}
                      {shopper.phone && (
                        <span className="text-xs font-normal text-gray-600">({shopper.phone})</span>
                      )}
                      {idx < data.today_breakdown.bazar_shoppers.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Assigned
                  </span>
                </div>
              ) : (
                <div className="text-sm text-gray-600 mt-0.5">
                  No resident assigned for today's market yet.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/expenses"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 border border-gray-200 shadow-xs hover:bg-gray-50 shrink-0"
          >
            Bazar Roster & Ledger →
          </Link>
        </div>
      </div>

      {/* Quick Navigation / Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <h2 className="text-base font-bold text-gray-900 mb-4">Meal Operations</h2>
          <div className="space-y-3">
            <Link
              href="/meals"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Mark Today's Meals</div>
                  <div className="text-xs text-gray-500">Turn breakfast, lunch, or dinner ON/OFF</div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>

            <Link
              href="/bills"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">View Invoices & Bills</div>
                  <div className="text-xs text-gray-500">Itemized day-by-day bill breakdown</div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <h2 className="text-base font-bold text-gray-900 mb-4">Mess Administration</h2>
          <div className="space-y-3">
            {isManager ? (
              <>
                <Link
                  href="/residents"
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Invite Residents</div>
                      <div className="text-xs text-gray-500">Generate QR / link & approve members</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </Link>

                <Link
                  href="/rooms"
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Rooms & Bed Mapping</div>
                      <div className="text-xs text-gray-500">Configure floors, room capacity & beds</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </Link>
              </>
            ) : (
              <Link
                href="/complaints"
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Submit a Complaint</div>
                    <div className="text-xs text-gray-500">Report maintenance issues or feedback</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
