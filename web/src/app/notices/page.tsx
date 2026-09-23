"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Bell, Pin, Plus } from "lucide-react";

export default function NoticesPage() {
  const { currentMessId, currentResidency } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  useEffect(() => {
    if (currentMessId) {
      loadNotices();
    }
  }, [currentMessId]);

  const loadNotices = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getNotices(currentMessId);
      setNotices(res.notices || []);
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setLoading(true);

    try {
      await api.postNotice(currentMessId, { title, body, pinned });
      setShowModal(false);
      setTitle("");
      setBody("");
      setPinned(false);
      setMessage("Notice posted successfully!");
      loadNotices();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notice Board</h1>
          <p className="text-sm text-gray-500">
            Important announcements, rules, and schedules for mess members.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Post New Notice
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          {message}
        </div>
      )}

      {/* Notices List */}
      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Bell className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800">No notices posted yet</h3>
            <p className="text-xs text-gray-500 mt-1">Check back later for mess announcements.</p>
          </div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-2xl p-6 shadow-xs border ${
                notice.pinned
                  ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {notice.pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    <h2 className="text-lg font-bold text-gray-900">{notice.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{notice.body}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(notice.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Posted by {notice.posted_by_user?.name || "Manager"}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Post Notice</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Notice Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. WiFi Maintenance, Holiday Meal Schedule..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Message Content</label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write notice details here..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="pinNotice" className="text-xs font-medium text-gray-700">
                  Pin this notice to top of board
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
                >
                  Post Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
