"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Building2, Clock, Split } from "lucide-react";

export default function CreateMessPage() {
  const router = useRouter();
  const { refreshUser, setCurrentMessId } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [genderPolicy, setGenderPolicy] = useState<"male" | "female" | "mixed">("male");
  const [cutoffBreakfast, setCutoffBreakfast] = useState("07:30");
  const [cutoffLunch, setCutoffLunch] = useState("11:30");
  const [cutoffDinner, setCutoffDinner] = useState("18:30");
  const [billSplitDefault, setBillSplitDefault] = useState<"equal" | "prorated">("equal");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createMess({
        name,
        address,
        city,
        gender_policy: genderPolicy,
        meal_cutoff_breakfast: cutoffBreakfast,
        meal_cutoff_lunch: cutoffLunch,
        meal_cutoff_dinner: cutoffDinner,
        bill_split_default: billSplitDefault,
      });

      await refreshUser();
      setCurrentMessId(res.mess.id);
      router.push("/rooms");
    } catch (err: any) {
      setError(err.message || "Failed to create mess. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Set Up Your Mess</h1>
            <p className="text-sm text-gray-500">Configure your mess details and meal cutoff rules.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mess Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Farmgate Bachelor Mess"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Dhaka, Chattogram..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Gender Policy</label>
                <select
                  value={genderPolicy}
                  onChange={(e: any) => setGenderPolicy(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                >
                  <option value="male">Male Only (ছেলেদের মেস)</option>
                  <option value="female">Female Only (মেয়েদের মেস)</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Physical Address</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House 14, Road 5, Block C, Farmgate"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock className="h-4 w-4 text-emerald-600" /> Meal Cutoff Times (Auto-lock)
            </div>
            <p className="text-xs text-gray-500">
              Residents cannot change meal toggle after these times each day.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Breakfast Cutoff</label>
                <input
                  type="time"
                  required
                  value={cutoffBreakfast}
                  onChange={(e) => setCutoffBreakfast(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Lunch Cutoff</label>
                <input
                  type="time"
                  required
                  value={cutoffLunch}
                  onChange={(e) => setCutoffLunch(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Dinner Cutoff</label>
                <input
                  type="time"
                  required
                  value={cutoffDinner}
                  onChange={(e) => setCutoffDinner(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Split className="h-4 w-4 text-emerald-600" /> Default Fixed Bill Split Method
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex cursor-pointer flex-col rounded-lg border p-4 text-sm ${
                  billSplitDefault === "equal"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="split"
                  value="equal"
                  checked={billSplitDefault === "equal"}
                  onChange={() => setBillSplitDefault("equal")}
                  className="sr-only"
                />
                <span className="font-semibold">Equal Split (সমান ভাগ)</span>
                <span className="text-xs text-gray-500 mt-1">
                  Total fixed costs divided equally among all active residents.
                </span>
              </label>

              <label
                className={`flex cursor-pointer flex-col rounded-lg border p-4 text-sm ${
                  billSplitDefault === "prorated"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="split"
                  value="prorated"
                  checked={billSplitDefault === "prorated"}
                  onChange={() => setBillSplitDefault("prorated")}
                  className="sr-only"
                />
                <span className="font-semibold">Prorated (উপস্থিত দিন অনুযায়ী)</span>
                <span className="text-xs text-gray-500 mt-1">
                  Adjusted by how many days the resident lived in the mess during the month.
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {loading ? "Creating Mess..." : "Create Mess & Proceed to Bed Setup →"}
          </button>
        </form>
      </div>
    </div>
  );
}
