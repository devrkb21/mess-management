"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Heart,
  Eye,
  BedDouble,
  Wifi,
  Sparkles,
  Shield,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  X,
  Plus,
} from "lucide-react";

export default function MarketplacePage() {
  const { user, currentResidency } = useAuth();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [genderPolicy, setGenderPolicy] = useState("");
  const [roomType, setRoomType] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const availableAmenities = [
    { id: "wifi", label: "WiFi" },
    { id: "ac", label: "Air Conditioner" },
    { id: "attached_bath", label: "Attached Bath" },
    { id: "balcony", label: "Balcony" },
    { id: "generator", label: "Generator / IPS" },
    { id: "maid", label: "Maid Service" },
    { id: "filter_water", label: "Pure Filtered Water" },
  ];

  const fetchListings = async () => {
    setLoading(true);
    try {
      if (onlyFavorites) {
        const res = await api.getFavoriteListings();
        const favListings = res.data?.map((f: any) => ({
          ...f.listing,
          is_favorited: true,
        })) || [];
        setListings(favListings);
        setTotalCount(res.total || favListings.length);
      } else {
        const params: Record<string, any> = {
          query: searchQuery,
          city: city,
          min_rent: minRent,
          max_rent: maxRent,
          gender_policy: genderPolicy,
          room_type: roomType,
          sort_by: sortBy,
        };
        if (selectedAmenities.length > 0) {
          params.amenities = selectedAmenities.join(",");
        }
        const res = await api.getListings(params);
        setListings(res.data || []);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load listings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [city, minRent, maxRent, genderPolicy, roomType, sortBy, onlyFavorites, selectedAmenities]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const toggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert("Please log in to save favorite listings.");
      return;
    }

    try {
      const res = await api.toggleFavoriteListing(listingId);
      setListings((prev) =>
        prev.map((item) =>
          item.id === listingId ? { ...item, is_favorited: res.is_favorited } : item
        )
      );
    } catch (err) {
      console.error("Favorite toggle failed", err);
    }
  };

  const handleAmenityToggle = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCity("");
    setMinRent("");
    setMaxRent("");
    setGenderPolicy("");
    setRoomType("");
    setSelectedAmenities([]);
    setSortBy("newest");
    setOnlyFavorites(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Hero Search Section */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Mess & Vacancy Marketplace (#23–#28)
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Find Your Ideal Mess Seat in Bangladesh
              </h1>
              <p className="mt-2 text-emerald-100 text-sm sm:text-base max-w-2xl">
                Verified seats, transparent meal costs, photos, rules checklist, and 1-click booking without broker fees.
              </p>
            </div>

            {isManager && (
              <Link
                href="/marketplace/manage"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-4 py-2.5 rounded-lg shadow transition"
              >
                <Plus className="h-4 w-4" /> Post a Vacancy
              </Link>
            )}
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-xl p-2 shadow-xl flex flex-col sm:flex-row items-center gap-2"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by area, mess name, or university (e.g. Dhanmondi, Mirpur, DU, NSU)..."
                className="w-full pl-11 pr-4 py-2.5 text-gray-800 placeholder-gray-400 text-sm focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto px-2">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2.5 focus:outline-hidden"
              >
                <option value="">All Cities</option>
                <option value="Dhaka">Dhaka</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Khulna">Khulna</option>
              </select>

              <button
                type="button"
                onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                  selectedAmenities.length > 0 || minRent || maxRent || genderPolicy || roomType
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow transition"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Filters Row */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-emerald-200 font-medium">Quick Filters:</span>
            <button
              onClick={() => setGenderPolicy(genderPolicy === "male" ? "" : "male")}
              className={`px-3 py-1 rounded-full border transition ${
                genderPolicy === "male"
                  ? "bg-white text-emerald-900 border-white font-bold"
                  : "border-emerald-700 hover:bg-emerald-800 text-emerald-100"
              }`}
            >
              Male Mess Only
            </button>
            <button
              onClick={() => setGenderPolicy(genderPolicy === "female" ? "" : "female")}
              className={`px-3 py-1 rounded-full border transition ${
                genderPolicy === "female"
                  ? "bg-white text-emerald-900 border-white font-bold"
                  : "border-emerald-700 hover:bg-emerald-800 text-emerald-100"
              }`}
            >
              Female Mess Only
            </button>
            <button
              onClick={() => handleAmenityToggle("wifi")}
              className={`px-3 py-1 rounded-full border transition ${
                selectedAmenities.includes("wifi")
                  ? "bg-white text-emerald-900 border-white font-bold"
                  : "border-emerald-700 hover:bg-emerald-800 text-emerald-100"
              }`}
            >
              WiFi Included
            </button>
            <button
              onClick={() => handleAmenityToggle("attached_bath")}
              className={`px-3 py-1 rounded-full border transition ${
                selectedAmenities.includes("attached_bath")
                  ? "bg-white text-emerald-900 border-white font-bold"
                  : "border-emerald-700 hover:bg-emerald-800 text-emerald-100"
              }`}
            >
              Attached Bath
            </button>
            {user && (
              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`px-3 py-1 rounded-full border transition flex items-center gap-1 ${
                  onlyFavorites
                    ? "bg-rose-500 text-white border-rose-500 font-bold"
                    : "border-emerald-700 hover:bg-emerald-800 text-emerald-100"
                }`}
              >
                <Heart className="h-3 w-3 fill-current" /> Saved Listings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Filter Drawer / Accordion */}
        {showFiltersDrawer && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-600" /> Smart Filters (#26)
              </h3>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              {/* Rent Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Monthly Rent (৳)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minRent}
                    onChange={(e) => setMinRent(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Room / Seat Type
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm bg-white"
                >
                  <option value="">Any Room Type</option>
                  <option value="single">Single Room</option>
                  <option value="double">Double Seat Room</option>
                  <option value="triple">Triple Seat Room</option>
                  <option value="4-seat">4-Seat Room</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm bg-white"
                >
                  <option value="newest">Newest Vacancies</option>
                  <option value="rent_asc">Rent: Low to High</option>
                  <option value="rent_desc">Rent: High to Low</option>
                  <option value="views">Most Viewed</option>
                </select>
              </div>

              {/* Gender Policy */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Gender Policy
                </label>
                <select
                  value={genderPolicy}
                  onChange={(e) => setGenderPolicy(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm bg-white"
                >
                  <option value="">Any Policy</option>
                  <option value="male">Male Mess</option>
                  <option value="female">Female Mess</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div className="mt-6 pt-6 border-t">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-3">
                Included Amenities
              </label>
              <div className="flex flex-wrap gap-3">
                {availableAmenities.map((amenity) => {
                  const isSelected = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${isSelected ? "text-emerald-600" : "text-gray-300"}`}
                      />
                      {amenity.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersDrawer(false)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-500"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {onlyFavorites ? "Your Saved Listings" : "Available Vacancies"}
            </h2>
            <p className="text-sm text-gray-500">
              {loading ? "Searching..." : `${totalCount} vacancies available`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-2 shadow-2xs font-medium"
            >
              <option value="newest">Sort: Newest</option>
              <option value="rent_asc">Rent: Low to High</option>
              <option value="rent_desc">Rent: High to Low</option>
              <option value="views">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse shadow-xs"
              >
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded-sm w-3/4" />
                  <div className="h-4 bg-gray-200 rounded-sm w-1/2" />
                  <div className="h-8 bg-gray-100 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-xl mx-auto my-12">
            <BedDouble className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800">No Vacancies Found</h3>
            <p className="text-sm text-gray-500 mt-2">
              No vacancies match your current filter criteria. Try adjusting your budget or area.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition"
              >
                Reset Filters
              </button>
              {user && (
                <Link
                  href="/join"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition"
                >
                  Join Mess with Private Code
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => {
              const mainPhoto =
                item.photos && item.photos.length > 0
                  ? item.photos[0].photo_url
                  : "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80";

              return (
                <Link
                  key={item.id}
                  href={`/marketplace/${item.id}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-400 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Card Image */}
                    <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                      <img
                        src={mainPhoto}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, item.id)}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition ${
                          item.is_favorited
                            ? "bg-rose-50 text-rose-600"
                            : "bg-black/30 text-white hover:bg-black/50"
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${item.is_favorited ? "fill-current" : ""}`}
                        />
                      </button>

                      {/* Gender Badge */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${
                            item.gender_policy === "male"
                              ? "bg-blue-600 text-white"
                              : item.gender_policy === "female"
                              ? "bg-pink-600 text-white"
                              : "bg-purple-600 text-white"
                          }`}
                        >
                          {item.gender_policy} Mess
                        </span>
                      </div>

                      {/* Rent Badge */}
                      <div className="absolute bottom-3 left-3 text-white">
                        <div className="text-xl font-extrabold drop-shadow-sm">
                          ৳{Number(item.rent_amount).toLocaleString()}
                          <span className="text-xs font-normal text-gray-200"> /month</span>
                        </div>
                      </div>

                      {/* Views Count */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-gray-200 font-medium bg-black/40 px-2 py-0.5 rounded-sm backdrop-blur-xs">
                        <Eye className="h-3 w-3" /> {item.views_count || 0}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-base line-clamp-1 group-hover:text-emerald-600 transition">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {item.area_name || item.mess?.city}, {item.mess?.name}
                        </span>
                      </div>

                      {/* Amenities chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-sm capitalize">
                          <BedDouble className="h-3 w-3 text-emerald-600" />
                          {item.room_type || "Shared Room"}
                        </span>
                        {item.amenities?.slice(0, 3).map((amenity: string) => (
                          <span
                            key={amenity}
                            className="bg-emerald-50 text-emerald-800 text-2xs font-semibold px-2 py-0.5 rounded-sm capitalize"
                          >
                            {amenity.replace("_", " ")}
                          </span>
                        ))}
                        {item.amenities?.length > 3 && (
                          <span className="text-2xs text-gray-400 self-center">
                            +{item.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Available:{" "}
                      <span className="font-semibold text-gray-700">
                        {item.available_from || "Immediately"}
                      </span>
                    </span>
                    <span className="font-bold text-emerald-600 group-hover:translate-x-0.5 transition inline-flex items-center gap-0.5">
                      Details <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
