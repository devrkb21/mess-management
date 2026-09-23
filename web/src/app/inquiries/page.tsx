"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  MessageSquare,
  Send,
  Building2,
  User,
  Clock,
  ArrowLeft,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function InquiriesPage() {
  const { user } = useAuth();

  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchThreads = async () => {
    try {
      const res = await api.getInquiries();
      const list = res.data || [];
      setThreads(list);
      if (list.length > 0 && !selectedThread) {
        loadThreadDetails(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load threads", err);
    } finally {
      setLoading(false);
    }
  };

  const loadThreadDetails = async (threadId: string) => {
    try {
      const data = await api.getInquiryThread(threadId);
      setSelectedThread(data);
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to load thread details", err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim()) return;

    setSending(true);
    try {
      const res = await api.replyInquiry(selectedThread.id, {
        message: replyText.trim(),
      });
      setMessages((prev) => [...prev, res.new_message]);
      setReplyText("");
      fetchThreads();
    } catch (err: any) {
      alert(err.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
          <MessageSquare className="h-3.5 w-3.5" /> Feature #31: In-App Chat
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Inquiries & Direct Messages
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Chat directly with mess managers regarding vacancies, seat availability, and food arrangements.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading conversation threads...</div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-md mx-auto my-8">
          <MessageSquare className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800">No Messages Yet</h3>
          <p className="text-xs text-gray-500 mt-1">
            When you inquire about a vacancy or a seeker messages your mess, chat threads will appear here.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
          >
            Explore Vacancies
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px]">
          {/* Left Column: Thread List */}
          <div className="border-r border-gray-200 flex flex-col">
            <div className="p-3 bg-gray-50/70 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
              Conversations ({threads.length})
            </div>
            <div className="divide-y divide-gray-100 overflow-y-auto max-h-[600px] flex-1">
              {threads.map((t) => {
                const isSelected = selectedThread?.id === t.id;
                const otherParty = user?.id === t.applicant_id ? t.manager : t.applicant;
                const lastMsg = t.messages && t.messages.length > 0 ? t.messages[0] : null;

                return (
                  <button
                    key={t.id}
                    onClick={() => loadThreadDetails(t.id)}
                    className={`w-full text-left p-4 transition flex items-start gap-3 ${
                      isSelected ? "bg-emerald-50/80 border-l-4 border-emerald-600" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                      {otherParty?.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900 truncate">
                          {otherParty?.name || "Participant"}
                        </span>
                        <span className="text-2xs text-gray-400">
                          {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-700 font-medium truncate mt-0.5">
                        {t.listing?.title || "Vacancy Inquiry"}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {lastMsg ? lastMsg.message : "Click to view messages..."}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Conversation */}
          <div className="md:col-span-2 flex flex-col h-full">
            {selectedThread ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      {user?.id === selectedThread.applicant_id
                        ? selectedThread.manager?.name || "Mess Manager"
                        : selectedThread.applicant?.name || "Applicant"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>Ref: <strong>{selectedThread.listing?.title}</strong></span>
                      <Link
                        href={`/marketplace/${selectedThread.listing_id}`}
                        className="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                        target="_blank"
                      >
                        View Listing <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-gray-400">Rent: </span>
                    <strong className="text-emerald-700 font-black">
                      ৳{Number(selectedThread.listing?.rent_amount || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Message Bubble List */}
                <div className="p-4 flex-1 overflow-y-auto max-h-[440px] space-y-3 bg-gray-50/30">
                  {messages.map((m: any) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-2xs font-semibold text-gray-500">
                            {isMe ? "You" : m.sender?.name}
                          </span>
                          <span className="text-2xs text-gray-400">
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <div
                          className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-2xs leading-relaxed ${
                            isMe
                              ? "bg-emerald-600 text-white rounded-tr-none"
                              : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input Bar */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t border-gray-200 bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl shadow-xs transition flex items-center justify-center shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="p-12 text-center text-gray-400 my-auto">
                Select a conversation thread on the left to start chatting.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
