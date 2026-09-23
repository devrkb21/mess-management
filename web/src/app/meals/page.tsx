"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  UtensilsCrossed,
  Sun,
  Coffee,
  Moon,
  Plane,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function MealsPage() {
  const { currentResidency, currentMessId } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [activeTab, setActiveTab] = useState<"sheet" | "my" | "vacations">("sheet");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Personal Meals State
  const [meals, setMeals] = useState<Record<string, { isOn: boolean; guestCount: number }>>({
    breakfast: { isOn: true, guestCount: 0 },
    lunch: { isOn: true, guestCount: 0 },
    dinner: { isOn: true, guestCount: 0 },
  });
  const [history, setHistory] = useState<any[]>([]);
  const [historyMonth, setHistoryMonth] = useState(() => new Date().toISOString().substring(0, 7));

  // Collective Meal Sheet State
  const [dailySheet, setDailySheet] = useState<any>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Vacations State
  const [vacations, setVacations] = useState<any[]>([]);
  const [vacationModal, setVacationModal] = useState(false);
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [vacationReason, setVacationReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load personal history
  useEffect(() => {
    if (currentResidency?.id) {
      loadHistory();
    }
  }, [currentResidency, historyMonth]);

  // Load collective sheet when date or mess changes
  useEffect(() => {
    if (currentMessId) {
      loadMessDailyMeals();
    }
  }, [currentMessId, selectedDate]);

  // Load vacations
  useEffect(() => {
    if (currentMessId) {
      loadVacations();
    }
  }, [currentMessId]);

  const loadHistory = async () => {
    try {
      if (!currentResidency?.id) return;
      const res = await api.getMealHistory(currentResidency.id, historyMonth);
      setHistory(res.meals || []);

      const todayLogs = (res.meals || []).filter((m: any) => m.date.startsWith(selectedDate));
      if (todayLogs.length > 0) {
        const nextMeals = { ...meals };
        todayLogs.forEach((log: any) => {
          if (nextMeals[log.meal_type]) {
            nextMeals[log.meal_type] = {
              isOn: Boolean(log.is_on),
              guestCount: log.guest_count || 0,
            };
          }
        });
        setMeals(nextMeals);
      }
    } catch {
      // ignore
    }
  };

  const loadMessDailyMeals = async () => {
    if (!currentMessId) return;
    setSheetLoading(true);
    try {
      const res = await api.getMessDailyMeals(currentMessId, selectedDate);
      setDailySheet(res);
    } catch (err: any) {
      // ignore
    } finally {
      setSheetLoading(false);
    }
  };

  const loadVacations = async () => {
    if (!currentMessId) return;
    try {
      const res = await api.getMessVacations(currentMessId);
      setVacations(res.vacations || []);
    } catch {
      // ignore
    }
  };

  // Personal meal toggle
  const handleToggle = async (mealType: string, newIsOn: boolean) => {
    if (!currentResidency?.id) return;
    setError(null);
    setMessage(null);

    const currentGuest = meals[mealType]?.guestCount || 0;
    setMeals((prev) => ({
      ...prev,
      [mealType]: { isOn: newIsOn, guestCount: newIsOn ? currentGuest : 0 },
    }));

    try {
      await api.toggleMeal(currentResidency.id, {
        date: selectedDate,
        meal_type: mealType,
        is_on: newIsOn,
        guest_count: newIsOn ? currentGuest : 0,
      });
      setMessage(`${mealType.toUpperCase()} marked ${newIsOn ? "ON" : "OFF"}.`);
      loadHistory();
      loadMessDailyMeals();
    } catch (err: any) {
      setError(err.message || "Failed to toggle meal.");
      setMeals((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], isOn: !newIsOn },
      }));
    }
  };

  // Personal guest count
  const handleGuestCountChange = async (mealType: string, delta: number) => {
    if (!currentResidency?.id) return;
    const current = meals[mealType];
    const newCount = Math.max(0, (current.guestCount || 0) + delta);

    setMeals((prev) => ({
      ...prev,
      [mealType]: { ...prev[mealType], guestCount: newCount, isOn: true },
    }));

    try {
      await api.toggleMeal(currentResidency.id, {
        date: selectedDate,
        meal_type: mealType,
        is_on: true,
        guest_count: newCount,
      });
      loadHistory();
      loadMessDailyMeals();
    } catch (err: any) {
      setError(err.message || "Failed to update guest meal.");
    }
  };

  // Manager toggling ANY resident's meal
  const handleAdminToggleResidentMeal = async (
    residencyId: string,
    mealType: string,
    newIsOn: boolean,
    guestCount: number = 0
  ) => {
    setError(null);
    setMessage(null);
    try {
      await api.toggleMeal(residencyId, {
        date: selectedDate,
        meal_type: mealType,
        is_on: newIsOn,
        guest_count: newIsOn ? guestCount : 0,
      });
      setMessage(`Updated ${mealType} status.`);
      loadMessDailyMeals();
      if (residencyId === currentResidency?.id) {
        loadHistory();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update resident meal.");
    }
  };

  // Manager adjusting ANY resident's guest meals
  const handleAdminAdjustGuestCount = async (
    residencyId: string,
    mealType: string,
    delta: number,
    currentGuests: number,
    isOn: boolean
  ) => {
    const newCount = Math.max(0, currentGuests + delta);
    setError(null);
    try {
      await api.toggleMeal(residencyId, {
        date: selectedDate,
        meal_type: mealType,
        is_on: true,
        guest_count: newCount,
      });
      loadMessDailyMeals();
      if (residencyId === currentResidency?.id) {
        loadHistory();
      }
    } catch (err: any) {
      setError(err.message || "Failed to adjust guest meal.");
    }
  };

  // Vacation application
  const handleVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentResidency?.id) return;
    setLoading(true);
    setError(null);

    try {
      await api.submitVacation(currentResidency.id, {
        start_date: vacationStart,
        end_date: vacationEnd,
        reason: vacationReason,
      });
      setVacationModal(false);
      setMessage("Vacation request submitted for manager approval.");
      loadVacations();
    } catch (err: any) {
      setError(err.message || "Failed to submit vacation.");
    } finally {
      setLoading(false);
    }
  };

  // Vacation approval/rejection by manager
  const handleApproveVacation = async (vacationId: string, status: "approved" | "rejected") => {
    setError(null);
    setMessage(null);
    try {
      await api.approveVacation(vacationId, status);
      setMessage(`Vacation request ${status} successfully.`);
      loadVacations();
      loadMessDailyMeals();
    } catch (err: any) {
      setError(err.message || `Failed to ${status} vacation.`);
    }
  };

  const mealCards = [
    { type: "breakfast", label: "Breakfast (নাস্তা)", icon: Coffee, color: "amber" },
    { type: "lunch", label: "Lunch (দুপুরের খাবার)", icon: Sun, color: "emerald" },
    { type: "dinner", label: "Dinner (রাতের খাবার)", icon: Moon, color: "indigo" },
  ];

  const getCutoffStatus = (mealType: string) => {
    const rawCutoff =
      dailySheet?.cutoffs?.[mealType] ||
      (currentResidency?.mess as any)?.[`meal_cutoff_${mealType}`] ||
      (mealType === "breakfast" ? "07:00" : mealType === "lunch" ? "11:00" : "18:00");
    const cutoffTime = rawCutoff.length === 5 ? rawCutoff + ":00" : rawCutoff;

    const targetDate = new Date(`${selectedDate}T${cutoffTime}`);
    const now = new Date();
    const isPast = targetDate.getTime() <= now.getTime();

    let timeLabel = "";
    if (!isPast) {
      const diffMs = targetDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      if (hours > 0) {
        timeLabel = `Locks in ${hours}h ${mins}m`;
      } else {
        timeLabel = `Locks in ${mins}m`;
      }
    } else {
      timeLabel = "Cutoff passed";
    }

    return {
      cutoffTime: rawCutoff,
      isLocked: isPast && !isManager,
      isManagerOverride: isPast && isManager,
      isPast,
      timeLabel,
    };
  };

  const pendingVacations = vacations.filter((v) => v.status === "pending");

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meal Management & Sheet</h1>
          <p className="text-sm text-gray-500">
            View collective mess meal sheet, toggle personal meals, and review vacation leaves.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-xs">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm text-gray-700 bg-transparent focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => setVacationModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 transition shadow-xs"
          >
            <Plane className="h-4 w-4" /> Apply for Vacation
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("sheet")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === "sheet"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="h-4 w-4" />
          Mess Meal Sheet (সবার মিল)
          {dailySheet?.total_meals !== undefined && (
            <span className="ml-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              {dailySheet.total_meals} meals
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === "my"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
          My Meal Control (আমার মিল)
        </button>

        <button
          onClick={() => setActiveTab("vacations")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === "vacations"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Plane className="h-4 w-4" />
          Vacation Requests (ছুটির আবেদন)
          {pendingVacations.length > 0 && (
            <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
              {pendingVacations.length} pending
            </span>
          )}
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* TAB 1: COLLECTIVE MESS MEAL SHEET */}
      {activeTab === "sheet" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Transparent Meal Sheet for {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {isManager
                  ? "As Manager/Admin, you can click ON/OFF or adjust guests directly to edit any resident's meal."
                  : "All members can view everyone's meal status transparently."}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">Total Serving Count</span>
              <div className="text-2xl font-black text-emerald-700">
                {dailySheet?.total_meals ?? 0} Meals
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Resident</th>
                    <th className="py-3 px-4">Bed / Role</th>
                    <th className="py-3 px-4 text-center">
                      <div>Breakfast (নাস্তা)</div>
                      <div className="text-[10px] font-medium text-gray-500 normal-case tracking-normal">
                        Cutoff: {getCutoffStatus("breakfast").cutoffTime}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div>Lunch (দুপুর)</div>
                      <div className="text-[10px] font-medium text-gray-500 normal-case tracking-normal">
                        Cutoff: {getCutoffStatus("lunch").cutoffTime}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div>Dinner (রাত)</div>
                      <div className="text-[10px] font-medium text-gray-500 normal-case tracking-normal">
                        Cutoff: {getCutoffStatus("dinner").cutoffTime}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Total Daily</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sheetLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Loading meal sheet for {selectedDate}...
                      </td>
                    </tr>
                  ) : !dailySheet?.sheet || dailySheet.sheet.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No active residents found in this mess.
                      </td>
                    </tr>
                  ) : (
                    dailySheet.sheet.map((res: any) => {
                      const b = res.meals?.breakfast || { is_on: true, guest_count: 0 };
                      const l = res.meals?.lunch || { is_on: true, guest_count: 0 };
                      const d = res.meals?.dinner || { is_on: true, guest_count: 0 };

                      const bTotal = b.is_on ? 1 + (b.guest_count || 0) : 0;
                      const lTotal = l.is_on ? 1 + (l.guest_count || 0) : 0;
                      const dTotal = d.is_on ? 1 + (d.guest_count || 0) : 0;
                      const residentGrandTotal = bTotal + lTotal + dTotal;

                      return (
                        <tr key={res.residency_id} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{res.user_name}</div>
                            <div className="text-xs text-gray-400">{res.user_phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                              {res.bed_label}
                            </span>
                            <span className="ml-2 text-xs text-gray-400 capitalize">
                              ({res.role})
                            </span>
                          </td>

                          {/* Breakfast */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isManager ? (
                                <button
                                  onClick={() =>
                                    handleAdminToggleResidentMeal(
                                      res.residency_id,
                                      "breakfast",
                                      !b.is_on,
                                      b.guest_count
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                                    b.is_on
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                  }`}
                                  title="Click to toggle meal as Manager"
                                >
                                  {b.is_on ? "ON" : "OFF"}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                    b.is_on
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {b.is_on ? "ON" : "OFF"}
                                </span>
                              )}

                              {b.is_on && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  {isManager && (
                                    <button
                                      onClick={() =>
                                        handleAdminAdjustGuestCount(
                                          res.residency_id,
                                          "breakfast",
                                          -1,
                                          b.guest_count,
                                          b.is_on
                                        )
                                      }
                                      disabled={b.guest_count <= 0}
                                      className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 text-[10px]"
                                    >
                                      -
                                    </button>
                                  )}
                                  <span className={b.guest_count > 0 ? "font-bold text-amber-700" : ""}>
                                    {b.guest_count > 0 ? `+${b.guest_count}g` : "0g"}
                                  </span>
                                  {isManager && (
                                    <button
                                      onClick={() =>
                                        handleAdminAdjustGuestCount(
                                          res.residency_id,
                                          "breakfast",
                                          1,
                                          b.guest_count,
                                          b.is_on
                                        )
                                      }
                                      className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-[10px]"
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Lunch */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isManager ? (
                                <button
                                  onClick={() =>
                                    handleAdminToggleResidentMeal(
                                      res.residency_id,
                                      "lunch",
                                      !l.is_on,
                                      l.guest_count
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                                    l.is_on
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                  }`}
                                  title="Click to toggle meal as Manager"
                                >
                                  {l.is_on ? "ON" : "OFF"}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                    l.is_on
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {l.is_on ? "ON" : "OFF"}
                                </span>
                              )}

                              {l.is_on && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  {isManager && (
                                    <button
                                      onClick={() =>
                                        handleAdminAdjustGuestCount(
                                          res.residency_id,
                                          "lunch",
                                          -1,
                                          l.guest_count,
                                          l.is_on
                                        )
                                      }
                                      disabled={l.guest_count <= 0}
                                      className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 text-[10px]"
                                    >
                                      -
                                    </button>
                                  )}
                                  <span className={l.guest_count > 0 ? "font-bold text-amber-700" : ""}>
                                    {l.guest_count > 0 ? `+${l.guest_count}g` : "0g"}
                                  </span>
                                  {isManager && (
                                    <button
                                      onClick={() =>
                                        handleAdminAdjustGuestCount(
                                          res.residency_id,
                                          "lunch",
                                          1,
                                          l.guest_count,
                                          l.is_on
                                        )
                                      }
                                      className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-[10px]"
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Dinner */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isManager ? (
                                <button
                                  onClick={() =>
                                    handleAdminToggleResidentMeal(
                                      res.residency_id,
                                      "dinner",
                                      !d.is_on,
                                      d.guest_count
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                                    d.is_on
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                  }`}
                                  title="Click to toggle meal as Manager"
                                >
                                  {d.is_on ? "ON" : "OFF"}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                    d.is_on
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {d.is_on ? "ON" : "OFF"}
                                </span>
                              )}

                              {d.is_on && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  {isManager && (
                                    <button
                                      onClick={() =>
                                        handleAdminAdjustGuestCount(
                                          res.residency_id,
                                          "dinner",
                                          -1,
                                          d.guest_count,
                                          d.is_on
                                        )
                                      }
                                      disabled={d.guest_count <= 0}
                                      className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 text-[10px]"
                                    >
                                      -
                                    </button>
                                  )}
                                  <span className={d.guest_count > 0 ? "font-bold text-amber-700" : ""}>
                                    {d.guest_count > 0 ? `+${d.guest_count}g` : "0g"}
                                  </span>
                                  {isManager && (
                                    <button
                                      onClick={() =>
                                        handleAdminAdjustGuestCount(
                                          res.residency_id,
                                          "dinner",
                                          1,
                                          d.guest_count,
                                          d.is_on
                                        )
                                      }
                                      className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-[10px]"
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-3 px-4 text-right font-black text-gray-900 text-base">
                            {residentGrandTotal}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL MEAL CONTROL */}
      {activeTab === "my" && (
        <div className="space-y-6">
          {/* 3 Meal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mealCards.map((card) => {
              const Icon = card.icon;
              const current = meals[card.type] || { isOn: true, guestCount: 0 };
              const cutoffInfo = getCutoffStatus(card.type);

              return (
                <div
                  key={card.type}
                  className={`rounded-2xl border p-6 shadow-xs transition ${
                    current.isOn
                      ? "bg-white border-emerald-500/50 ring-1 ring-emerald-500/20"
                      : "bg-gray-50/70 border-gray-200 opacity-80"
                  } ${cutoffInfo.isLocked ? "bg-gray-50/90 border-gray-300 opacity-80" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          cutoffInfo.isLocked
                            ? "bg-gray-200 text-gray-500"
                            : current.isOn
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{card.label}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-400 capitalize">{card.type}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs font-semibold text-gray-500">
                            Cutoff: {cutoffInfo.cutoffTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ON / OFF Switch */}
                    <button
                      onClick={() => !cutoffInfo.isLocked && handleToggle(card.type, !current.isOn)}
                      disabled={cutoffInfo.isLocked}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:cursor-not-allowed ${
                        current.isOn ? "bg-emerald-600" : "bg-gray-300"
                      } ${cutoffInfo.isLocked ? "opacity-60" : ""}`}
                      title={cutoffInfo.isLocked ? `Locked after ${cutoffInfo.cutoffTime}. Contact manager to modify.` : ""}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          current.isOn ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Cutoff Status Banner */}
                  <div className="mt-3">
                    {cutoffInfo.isLocked ? (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>🔒 <strong>Locked</strong> ({cutoffInfo.cutoffTime}). Contact manager for changes.</span>
                      </div>
                    ) : cutoffInfo.isManagerOverride ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>⚠️ <strong>Manager Override:</strong> Cutoff ({cutoffInfo.cutoffTime}) passed.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        <span>⏳ {cutoffInfo.timeLabel} (Cutoff: {cutoffInfo.cutoffTime})</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Status:{" "}
                      <span className={`font-semibold ${current.isOn ? "text-emerald-700" : "text-gray-500"}`}>
                        {current.isOn ? "MEAL ON (খাবেন)" : "MEAL OFF (খাবেন না)"}
                      </span>
                    </div>

                    {/* Guest Meals Control */}
                    {current.isOn && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Guests:</span>
                        <button
                          onClick={() => !cutoffInfo.isLocked && handleGuestCountChange(card.type, -1)}
                          disabled={cutoffInfo.isLocked || current.guestCount <= 0}
                          className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold text-gray-800 w-4 text-center">
                          {current.guestCount}
                        </span>
                        <button
                          onClick={() => !cutoffInfo.isLocked && handleGuestCountChange(card.type, 1)}
                          disabled={cutoffInfo.isLocked}
                          className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly History Table */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Your Monthly Meal History Log</h2>
              <input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Meal Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Guest Meals</th>
                    <th className="py-3 px-4">Total Eaten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">
                        No meal records logged for this month.
                      </td>
                    </tr>
                  ) : (
                    history.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-medium text-gray-800">
                          {new Date(log.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 px-4 capitalize text-gray-600">{log.meal_type}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              log.is_on
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {log.is_on ? "ON" : "OFF"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600">
                          {log.guest_count > 0 ? `+${log.guest_count} guests` : "—"}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-gray-900">
                          {log.is_on ? 1 + (log.guest_count || 0) : 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VACATIONS & LEAVES */}
      {activeTab === "vacations" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Vacation Requests & Approvals (ছুটির আবেদন ও অনুমোদন)
                </h2>
                <p className="text-xs text-gray-500">
                  {isManager
                    ? "Managers can review pending vacation requests and approve or reject them."
                    : "Track your submitted vacation applications and meal pause approvals."}
                </p>
              </div>

              <button
                onClick={() => setVacationModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" /> Apply for Vacation
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Resident</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    {isManager && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vacations.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 6 : 5} className="py-8 text-center text-gray-400">
                        No vacation requests found for this mess.
                      </td>
                    </tr>
                  ) : (
                    vacations.map((vac: any) => (
                      <tr key={vac.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {vac.residency?.user?.name || "Resident"}
                          </div>
                          <div className="text-xs text-gray-400">{vac.residency?.user?.phone}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {new Date(vac.start_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {new Date(vac.end_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">{vac.reason || "—"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              vac.status === "approved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : vac.status === "rejected"
                                ? "bg-red-100 text-red-800 border border-red-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {vac.status}
                          </span>
                        </td>
                        {isManager && (
                          <td className="py-3 px-4 text-right">
                            {vac.status === "pending" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveVacation(vac.id, "approved")}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => handleApproveVacation(vac.id, "rejected")}
                                  className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-100"
                                >
                                  <XCircle className="h-3.5 w-3.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Decided</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vacation Modal */}
      {vacationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plane className="h-5 w-5 text-purple-600" /> Apply for Vacation
            </h3>
            <p className="text-xs text-gray-500">
              Your meals will be automatically paused during this approved date range.
            </p>

            <form onSubmit={handleVacationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  required
                  value={vacationStart}
                  onChange={(e) => setVacationStart(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  required
                  value={vacationEnd}
                  onChange={(e) => setVacationEnd(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Reason (Optional)</label>
                <textarea
                  rows={2}
                  value={vacationReason}
                  onChange={(e) => setVacationReason(e.target.value)}
                  placeholder="Going home for semester break..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setVacationModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Vacation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
