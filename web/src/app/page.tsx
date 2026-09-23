"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  UtensilsCrossed,
  Receipt,
  FileCheck2,
  Users2,
  ShieldCheck,
  Building,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 sm:py-24 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-6">
          <CheckCircle2 className="h-3.5 w-3.5" /> Built for Mess & Shared Living in Bangladesh
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Manage Your Mess Meals, Bazar & Bills <span className="text-emerald-600">Without Disputes.</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          Automate daily meal toggles with cutoff locks, track daily grocery expenses, calculate live per-meal rates, and generate itemized monthly invoices instantly.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md hover:bg-emerald-700 transition"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md hover:bg-emerald-700 transition"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-white border border-gray-300 px-6 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="w-full py-12 border-t border-gray-100 max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Run a Mess Smoothly
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Daily Meal Toggle</h3>
            <p className="mt-2 text-sm text-gray-600">
              Residents turn meals ON or OFF daily. Automatic cutoff lock prevents retroactive changes and meal count disputes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Live Meal Rate</h3>
            <p className="mt-2 text-sm text-gray-600">
              Managers enter market grocery expenses. System calculates: daily cost ÷ total meals eaten = live per-meal rate in real time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Automated Monthly Bills</h3>
            <p className="mt-2 text-sm text-gray-600">
              Generates itemized invoices with exact meal cost, equal/prorated fixed bills (rent, WiFi, buya), and previous dues carry-forward.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Building className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Floor → Room → Bed Mapping</h3>
            <p className="mt-2 text-sm text-gray-600">
              Visual bed inventory tracking vacant, booked, and occupied status with instant bed reassignments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Users2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Invite Code Onboarding</h3>
            <p className="mt-2 text-sm text-gray-600">
              Generate invite links/QR codes. Applicants submit verified profiles (NID, emergency contact, institution) for manager approval.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Clearance & Settlement</h3>
            <p className="mt-2 text-sm text-gray-600">
              When a resident leaves, system calculates final dues, deducts from security deposit, and produces a clearance record.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
