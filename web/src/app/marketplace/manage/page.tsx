"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  Plus,
  BedDouble,
  Users,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Video,
  ArrowRight,
  Filter,
  Check,
  X,
  Phone,
  Mail,
  User,
  ShieldCheck,
} from "lucide-react";

export default function ManageMarketplacePage() {
  const { currentMessId, currentResidency } = useAuth();

  const [activeTab, setActiveTab] = useState<"listings" | "applications" | "visits" | "waitlist">("listings");
  const [loading, setLoading] = useState(true);

  // Mess Listings State
  const [listings, setListings] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Applications State
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<"accepted" | "rejected">("accepted");
  const [managerRemarks, setManagerRemarks] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");

  // Visits State
  const [visits, setVisits] = useState<any[]>([]);

  // Waitlist State
  const [waitlist, setWaitlist] = useState<any[]>([]);

  // New Listing Form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRent, setNewRent] = useState("");
  const [newDeposit, setNewDeposit] = useState("");
  const [newAvailable, setNewAvailable] = useState(new Date().toISOString().split("T")[0]);
  const [newBedId, setNewBedId] = useState("");
  const [newRoomType, setNewRoomType] = useState("double");
  const [newGender, setNewGender] = useState("male");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newAmenities, setNewAmenities] = useState<string[]>(["wifi"]);
  const [newPhotos, setNewPhotos] = useState<string>("https://images.unsplash.com/photo-1555854877-bab0e564b8d5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const loadData = async () => {
    if (!currentMessId) return;
    setLoading(true);
    try {
      const [listRes, appRes, visitRes, waitRes, bedRes] = await Promise.all([
        api.getMessListings(currentMessId),
        api.getMessApplications(currentMessId),
        api.getMessVisits(currentMessId),
        api.getMessWaitingList(currentMessId),
        api.getBeds(currentMessId),
      ]);

      setListings(listRes || []);
      setApplications(appRes.data || []);
      setVisits(visitRes.data || []);
      setWaitlist(waitRes || []);
      setBeds(bedRes.beds || []);
    } catch (err) {
      console.error("Failed to load manager marketplace data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMessId]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;

    setIsSubmitting(true);
    try {
      const photoArray = newPhotos
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      await api.createListing(currentMessId, {
        title: newTitle,
        description: newDesc,
        rent_amount: Number(newRent),
        security_deposit: Number(newDeposit || 0),
        available_from: newAvailable,
        bed_id: newBedId || null,
        room_type: newRoomType,
        gender_policy: newGender,
        video_url: newVideoUrl || null,
        area_name: newArea || null,
        amenities: newAmenities,
        photos: photoArray,
      });

      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewRent("");
    setNewDeposit("");
    setNewBedId("");
    setNewVideoUrl("");
    setNewArea("");
  };

  const handleToggleListingActive = async (listingId: string, currentStatus: boolean) => {
    try {
      await api.updateListing(listingId, { is_active: !currentStatus });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update listing status");
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await api.deleteListing(listingId);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete listing");
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      await api.decideApplication(selectedApp.id, {
        decision: decisionType,
        manager_remarks: managerRemarks,
        bed_id: selectedBedId || undefined,
      });

      setShowDecisionModal(false);
      setSelectedApp(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to submit decision");
    }
  };

  const handleVisitStatusUpdate = async (visitId: string, status: string) => {
    try {
      await api.updateVisitStatus(visitId, { status });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update visit status");
    }
  };

  if (!isManager) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-sm text-gray-500 mt-1">Only Mess Owners and Managers can access this portal.</p>
        <Link href="/marketplace" className="mt-4 inline-block text-emerald-600 font-semibold text-sm">
          Browse Vacancy Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-6">
        <div>
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            Manager Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            Vacancy Postings & Booking Applications (#23–#35)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish vacant seats, review applicant profiles, auto-assign beds, and schedule on-site visits.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow transition text-sm"
        >
          <Plus className="h-4 w-4" /> Post New Vacancy
        </button>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6 mb-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("listings")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "listings"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Building2 className="h-4 w-4" /> Vacancy Listings ({listings.length})
        </button>

        <button
          onClick={() => setActiveTab("applications")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "applications"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Users className="h-4 w-4" /> Booking Applications ({applications.length})
        </button>

        <button
          onClick={() => setActiveTab("visits")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "visits"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Calendar className="h-4 w-4" /> Mess Visits ({visits.length})
        </button>

        <button
          onClick={() => setActiveTab("waitlist")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "waitlist"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Clock className="h-4 w-4" /> Waiting List ({waitlist.length})
        </button>
      </div>

      {/* ── Tab 1: Listings ── */}
      {activeTab === "listings" && (
        <div className="space-y-4">
          {listings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <BedDouble className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800">No Vacancy Listings Yet</h3>
              <p className="text-xs text-gray-500 mt-1">
                Post empty beds to attract prospective residents from university campuses and professionals.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
              >
                Post First Vacancy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${
                              item.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.is_active ? "Active Online" : "Archived / Filled"}
                          </span>
                          <span className="text-2xs text-gray-400 flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {item.views_count} views
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Room: {item.room?.name || "Shared"} • Bed: {item.bed?.label || "Seat"}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-900">
                          ৳{Number(item.rent_amount).toLocaleString()}
                        </div>
                        <div className="text-2xs text-gray-400">Deposit: ৳{Number(item.security_deposit || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1 text-2xs">
                      {item.amenities?.map((a: string) => (
                        <span key={a} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm capitalize">
                          {a.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-gray-500">
                      <span>Applications: <strong>{item.applications_count || 0}</strong></span>
                      <span>Visits: <strong>{item.visits_count || 0}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleListingActive(item.id, item.is_active)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                          item.is_active
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {item.is_active ? "Mark Filled / Hide" : "Re-activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteListing(item.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded-md"
                        title="Delete listing"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Applications (#33, #34) ── */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
              No booking applications received yet.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                        {app.user?.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          {app.user?.name}
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-bold capitalize ${
                              app.status === "accepted"
                                ? "bg-emerald-100 text-emerald-800"
                                : app.status === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {app.user?.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {app.user?.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700 space-y-1">
                      <div>
                        Applied for: <strong>{app.listing?.title}</strong> (Move-in:{" "}
                        <strong>{app.desired_move_in_date}</strong>)
                      </div>
                      {app.applicant_note && (
                        <div className="italic text-gray-600">"{app.applicant_note}"</div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1 text-2xs text-gray-500">
                        {app.nid_number && <span>NID: {app.nid_number}</span>}
                        {app.blood_group && <span>Blood: {app.blood_group}</span>}
                        {app.profession && <span>Job/Study: {app.profession}</span>}
                        {app.emergency_contact_phone && (
                          <span>Emergency: {app.emergency_contact_name} ({app.emergency_contact_phone})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {app.status === "pending" && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setDecisionType("accepted");
                          setShowDecisionModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xs flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept & Assign Bed
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setDecisionType("rejected");
                          setShowDecisionModal(true);
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Visits (#32) ── */}
      {activeTab === "visits" && (
        <div className="space-y-4">
          {visits.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
              No physical visits requested yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visits.map((visit) => (
                <div key={visit.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{visit.user?.name}</div>
                      <div className="text-xs text-gray-500">{visit.user?.phone}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-2xs font-bold capitalize ${
                        visit.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : visit.status === "cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {visit.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                    <div>
                      Listing: <strong>{visit.listing?.title}</strong>
                    </div>
                    <div className="font-semibold text-emerald-800">
                      📅 {visit.visit_date} • {visit.time_slot}
                    </div>
                    {visit.notes && <div className="text-gray-500 italic">"{visit.notes}"</div>}
                  </div>

                  {visit.status === "requested" && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <button
                        onClick={() => handleVisitStatusUpdate(visit.id, "confirmed")}
                        className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-500"
                      >
                        Confirm Slot
                      </button>
                      <button
                        onClick={() => handleVisitStatusUpdate(visit.id, "cancelled")}
                        className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Waiting List (#35) ── */}
      {activeTab === "waitlist" && (
        <div className="space-y-4">
          {waitlist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
              No seekers on the waiting list currently.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Seeker Name</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Preferred Room</th>
                    <th className="px-4 py-3 text-left">Max Budget</th>
                    <th className="px-4 py-3 text-left">Date Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {waitlist.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900">{w.user?.name}</td>
                      <td className="px-4 py-3 text-gray-600">{w.user?.phone}</td>
                      <td className="px-4 py-3 capitalize">{w.preferred_room_type || "Any"}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        {w.max_budget ? `৳${Number(w.max_budget).toLocaleString()}` : "Flexible"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {w.created_at?.split("T")[0] || "Recently"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Post Vacancy Modal (#23, #24, #25) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" /> Post New Vacant Seat
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bed Seat in Mirpur 10 near Metro"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Monthly Rent (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="4500"
                    value={newRent}
                    onChange={(e) => setNewRent(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Security Deposit (৳)
                  </label>
                  <input
                    type="number"
                    placeholder="3000"
                    value={newDeposit}
                    onChange={(e) => setNewDeposit(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Available From *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAvailable}
                    onChange={(e) => setNewAvailable(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Specific Bed Link (Optional)
                  </label>
                  <select
                    value={newBedId}
                    onChange={(e) => setNewBedId(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white"
                  >
                    <option value="">Auto-assign or Unlinked</option>
                    {beds.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.room?.name} - {b.label} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Room Type
                  </label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white"
                  >
                    <option value="single">Single Room</option>
                    <option value="double">Double Seat Room</option>
                    <option value="triple">Triple Seat Room</option>
                    <option value="4-seat">4-Seat Room</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Gender Policy
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white"
                  >
                    <option value="male">Male Mess</option>
                    <option value="female">Female Mess</option>
                    <option value="mixed">Mixed Mess</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Walkthrough Video URL (#25)
                </label>
                <input
                  type="url"
                  placeholder="https://youtu.be/... (YouTube, Vimeo or Stream)"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Photo URLs (One per line) (#24)
                </label>
                <textarea
                  rows={2}
                  value={newPhotos}
                  onChange={(e) => setNewPhotos(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe room environment, light, breeze, study desk, meal schedule..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                >
                  {isSubmitting ? "Publishing..." : "Publish Vacancy Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Decision Modal (#33, #34) ── */}
      {showDecisionModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                {decisionType === "accepted" ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600" />
                )}
                {decisionType === "accepted" ? "Accept Booking Application" : "Reject Application"}
              </h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-4 text-sm">
              <p className="text-xs text-gray-600">
                Applicant: <strong>{selectedApp.user?.name}</strong> ({selectedApp.desired_move_in_date})
              </p>

              {decisionType === "accepted" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Assign Bed (#34 Auto Bed Assignment)
                  </label>
                  <select
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white"
                  >
                    <option value="">Auto-Assign First Vacant Bed</option>
                    {beds
                      .filter((b: any) => b.status === "empty")
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.room?.name} - {b.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Manager Remarks / Welcome Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Any move-in instructions, rules recap, or reason..."
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg text-xs font-bold shadow transition ${
                    decisionType === "accepted"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  Confirm {decisionType === "accepted" ? "Acceptance" : "Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
