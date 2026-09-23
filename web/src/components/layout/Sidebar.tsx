"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  FileText,
  BedDouble,
  Users,
  Bell,
  MessageSquareWarning,
  DoorOpen,
  Compass,
  MessageSquare,
  Building,
  ShieldCheck,
  Award,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { currentResidency, currentMessId } = useAuth();

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Daily Meals", href: "/meals", icon: UtensilsCrossed },
    { label: "Bazar & Expenses", href: "/expenses", icon: Receipt },
    { label: "Monthly Bills", href: "/bills", icon: FileText },
    ...(isManager
      ? [
          { label: "Rooms & Beds", href: "/rooms", icon: BedDouble },
          { label: "Residents & Invites", href: "/residents", icon: Users },
          { label: "Manage Vacancies", href: "/marketplace/manage", icon: Building },
        ]
      : []),
    { label: "Marketplace", href: "/marketplace", icon: Compass },
    { label: "Inquiries & Visits", href: "/inquiries", icon: MessageSquare },
    { label: "Smart Security", href: "/security", icon: ShieldCheck },
    { label: "Trust & Community", href: "/community", icon: Award },
    { label: "Analytics & AI", href: "/analytics", icon: Sparkles },
    { label: "Notice Board", href: "/notices", icon: Bell },
    { label: "Complaints", href: "/complaints", icon: MessageSquareWarning },
    { label: "Leave & Clearance", href: "/leave", icon: DoorOpen },
  ];

  if (!currentMessId) {
    return null;
  }

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50/50 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-emerald-600" : "text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-500">
        <div className="font-semibold text-gray-800 mb-1">Role: {currentResidency?.role}</div>
        <div>Status: {currentResidency?.status}</div>
        {currentResidency?.bed && <div>Bed: {currentResidency.bed.label}</div>}
      </div>
    </aside>
  );
}
