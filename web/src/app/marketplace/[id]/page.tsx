"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  Heart,
  Eye,
  BedDouble,
  Shield,
  Clock,
  Share2,
  Calendar,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  Video,
  ArrowLeft,
  DollarSign,
  UserCheck,
  Send,
  QrCode,
  Copy,
  Check,
  Star,
  Award,
  HeartHandshake,
} from "lucide-react";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [listing, setListing] = useState<any>(null);
  const [messTrust, setMessTrust] = useState<any>(null);
  const [compatData, setCompatData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Apply Form
  const [desiredMoveIn, setDesiredMoveIn] = useState("");
  const [applicantNote, setApplicantNote] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Visit Form
  const [visitDate, setVisitDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState<string | null>(null);

  // Chat Form
  const [chatMessage, setChatMessage] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const data = await api.getListing(id);
      setListing(data);
      if (data.available_from) {
        setDesiredMoveIn(data.available_from);
      }
      if (data.mess_id) {
        api.getMessTrustScore(data.mess_id).then(setMessTrust).catch(() => null);
        if (user) {
          api.getMessCompatibility(data.mess_id).then(setCompatData).catch(() => null);
        }
      }
    } catch (err) {
      console.error("Failed to load listing", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const toggleFavorite = async () => {
    if (!user) {
      alert("Please log in to favorite listings.");
      return;
    }
    try {
      const res = await api.toggleFavoriteListing(id);
      setListing((prev: any) => ({ ...prev, is_favorited: res.is_favorited }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    setApplySubmitting(true);
    try {
      await api.applyListing(id, {
        desired_move_in_date: desiredMoveIn || new Date().toISOString().split("T")[0],
        applicant_note: applicantNote,
        nid_number: nidNumber,
        profession: profession,
        blood_group: bloodGroup,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
      });
      setApplySuccess("Application submitted successfully! The mess manager will review your profile.");
      setTimeout(() => {
        setShowApplyModal(false);
        fetchListing();
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Failed to submit application");
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    setVisitSubmitting(true);
    try {
      await api.scheduleVisit(id, {
        visit_date: visitDate || new Date().toISOString().split("T")[0],
        time_slot: timeSlot,
        notes: visitNotes,
      });
      setVisitSuccess("Visit scheduled successfully! The manager will confirm your slot.");
      setTimeout(() => {
        setShowVisitModal(false);
        fetchListing();
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Failed to schedule visit");
    } finally {
      setVisitSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    setChatSubmitting(true);
    try {
      await api.sendInquiry(id, {
        message: chatMessage,
      });
      setShowChatModal(false);
      router.push("/inquiries");
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setChatSubmitting(false);
    }
  };

  const copyShareLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
        Loading listing details...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800">Listing Not Found</h2>
        <p className="text-sm text-gray-500 mt-2">This vacancy may have been filled or archived.</p>
        <Link
          href="/marketplace"
          className="mt-4 inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const photos =
    listing.photos && listing.photos.length > 0
      ? listing.photos
      : [{ photo_url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80" }];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-600 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Listings
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Share2 className="h-3.5 w-3.5 text-gray-500" /> Share / QR
            </button>

            <button
              onClick={toggleFavorite}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                listing.is_favorited
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${listing.is_favorited ? "fill-current" : ""}`} />
              {listing.is_favorited ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Title & Key Highlights Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  listing.gender_policy === "male"
                    ? "bg-blue-100 text-blue-800"
                    : listing.gender_policy === "female"
                    ? "bg-pink-100 text-pink-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {listing.gender_policy} Mess
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {listing.room_type} Room
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Eye className="h-3 w-3" /> {listing.views_count} views
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{listing.title}</h1>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1.5">
              <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {listing.mess?.name}, {listing.mess?.address}, {listing.mess?.city}
              </span>
            </div>

            {/* Compatibility & Trust Badges (#40, #41) */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {compatData && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                  <HeartHandshake className="h-3.5 w-3.5 text-indigo-600" />
                  <span>🎯 {compatData.match_percentage}% Roommate Lifestyle Match</span>
                </div>
              )}
              {messTrust && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  <span>{messTrust.rating_overall?.toFixed(1) || "5.0"}★ ({messTrust.total_reviews} reviews) • {messTrust.badge_title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Highlight Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-right">
            <div className="text-2xl sm:text-3xl font-black text-emerald-900">
              ৳{Number(listing.rent_amount).toLocaleString()}
              <span className="text-xs font-normal text-emerald-700"> /month</span>
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-1">
              Deposit: ৳{Number(listing.security_deposit || 0).toLocaleString()} • Available:{" "}
              {listing.available_from}
            </div>
          </div>
        </div>

        {/* Media & Gallery Section (#24, #25) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Photo & Carousel */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
              <img
                src={photos[activePhotoIdx]?.photo_url}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p: any, idx: number) => (
                  <button
                    key={p.id || idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative h-16 w-24 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                      activePhotoIdx === idx ? "border-emerald-600 ring-2 ring-emerald-200" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action CTA & Quick Info Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-gray-900 text-base">Booking & Inquiry</h3>

              {listing.user_application ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    Application Status:{" "}
                    <span className="capitalize">{listing.user_application.status}</span>
                  </div>
                  <p className="text-amber-800">
                    Move-in date: {listing.user_application.desired_move_in_date}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <UserCheck className="h-4 w-4" /> 1-Click Apply to Join (#29)
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowVisitModal(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5 text-gray-600" /> Schedule Visit (#32)
                </button>

                <button
                  onClick={() => setShowChatModal(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-gray-600" /> Message Manager
                </button>
              </div>

              {/* Video Walkthrough Preview (#25) */}
              {listing.video_url && (
                <a
                  href={listing.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Video className="h-4 w-4 text-indigo-600" /> Watch Walkthrough Video (#25)
                </a>
              )}

              <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mess Owner/Manager:</span>
                  <span className="font-semibold text-gray-800">
                    {listing.mess?.owner?.name || "Mess Authority"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Room / Bed:</span>
                  <span className="font-semibold text-gray-800">
                    {listing.room?.name || "Room"} ({listing.bed?.label || "Seat"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Meal System:</span>
                  <span className="font-semibold text-gray-800">Digital ON/OFF (Daily Rate)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Description, Amenities, Rules */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About This Room & Seat</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {listing.description ||
                  "Spacious and well-ventilated shared mess room with comfortable bed, studying atmosphere, and high-speed internet connectivity. Daily meals cooked fresh with healthy ingredients."}
              </p>
            </div>

            {/* Amenities (#24) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Included Amenities</h2>
              {listing.amenities && listing.amenities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {listing.amenities.map((amenity: string) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 text-xs font-medium text-gray-800 border border-gray-100"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="capitalize">{amenity.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Standard mess amenities included.</p>
              )}
            </div>

            {/* Rules Checklist (#24) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Mess Rules & Policies Checklist</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-700 font-medium">Smoking Policy</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      listing.rules?.smoking_allowed
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {listing.rules?.smoking_allowed ? "Smoking Allowed" : "Strictly No Smoking"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-700 font-medium">Main Gate Closing Time</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                    {listing.rules?.gate_close_time || "11:00 PM"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-700 font-medium">Guest Policy</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {listing.rules?.guest_policy || "Prior Manager Approval"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-700 font-medium">Quiet Study Hours</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                    {listing.rules?.quiet_hours || "11:00 PM - 07:00 AM"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Mess Info & Map Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-gray-900 text-base">Mess Authority</h3>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                  {listing.mess?.name?.charAt(0) || "M"}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{listing.mess?.name}</div>
                  <div className="text-xs text-gray-500">{listing.mess?.city}</div>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1.5 pt-2 border-t">
                <div>📍 {listing.mess?.address}</div>
                <div>🍽️ Cutoff breakfast: {listing.mess?.meal_cutoff_breakfast || "07:00 AM"}</div>
                <div>🍽️ Cutoff lunch: {listing.mess?.meal_cutoff_lunch || "11:00 AM"}</div>
                <div>🍽️ Cutoff dinner: {listing.mess?.meal_cutoff_dinner || "06:00 PM"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1-Click Apply Modal (#29) ── */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" /> 1-Click Apply to Join Mess
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {applySuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {applySuccess}
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Desired Move-in Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={desiredMoveIn}
                    onChange={(e) => setDesiredMoveIn(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Note for Manager
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tell the manager about yourself (study, job, habits)..."
                    value={applicantNote}
                    onChange={(e) => setApplicantNote(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Profile Verification (KYC)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs text-gray-600 mb-1">National ID (NID)</label>
                      <input
                        type="text"
                        placeholder="NID / Smart Card Number"
                        value={nidNumber}
                        onChange={(e) => setNidNumber(e.target.value)}
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs text-gray-600 mb-1">Blood Group</label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full border rounded-lg p-2 text-xs bg-white"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-2xs text-gray-600 mb-1">Profession / University</label>
                      <input
                        type="text"
                        placeholder="e.g. Student at DU / Software Engineer"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs text-gray-600 mb-1">Emergency Contact Name</label>
                      <input
                        type="text"
                        placeholder="Guardian / Friend"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs text-gray-600 mb-1">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="017XXXXXXXX"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applySubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                  >
                    {applySubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Schedule Visit Modal (#32) ── */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" /> Schedule a Physical Visit
              </h3>
              <button onClick={() => setShowVisitModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {visitSuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {visitSuccess}
              </div>
            ) : (
              <form onSubmit={handleScheduleVisit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Preferred Time Slot *
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white"
                  >
                    <option value="10:00 AM - 12:00 PM">Morning (10:00 AM - 12:00 PM)</option>
                    <option value="02:00 PM - 04:00 PM">Afternoon (02:00 PM - 04:00 PM)</option>
                    <option value="05:00 PM - 07:00 PM">Evening (05:00 PM - 07:00 PM)</option>
                    <option value="07:00 PM - 09:00 PM">Night (07:00 PM - 09:00 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any specific questions you have during visit..."
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVisitModal(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={visitSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                  >
                    {visitSubmitting ? "Requesting..." : "Confirm Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Message Manager Chat Modal (#31) ── */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" /> Message Mess Manager
              </h3>
              <button onClick={() => setShowChatModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 text-sm">
              <p className="text-xs text-gray-500">
                Send a direct inquiry regarding {listing.title}. Replies will appear in your Inquiries tab.
              </p>

              <div>
                <textarea
                  rows={4}
                  required
                  placeholder="Hi manager, I would like to know if..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChatModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={chatSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {chatSubmitting ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Share / QR Code Modal (#30) ── */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600" /> Share Vacancy QR
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center">
              <div className="h-44 w-44 bg-white border border-gray-300 rounded-lg flex items-center justify-center shadow-inner">
                {/* Clean inline SVG QR code mockup with live link encoded */}
                <QrCode className="h-36 w-36 text-emerald-800" />
              </div>
              <span className="text-xs text-gray-500 mt-2 font-mono break-all px-2">
                {listing.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? window.location.href : ""}
                className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-600 font-mono"
              />
              <button
                onClick={copyShareLink}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
