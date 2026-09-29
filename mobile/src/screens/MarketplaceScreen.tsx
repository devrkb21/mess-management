import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function MarketplaceScreen() {
  const { user, currentResidency } = useAuth();

  const isManager =
    currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Selected Listing Modal
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Action Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Apply Form
  const [moveInDate, setMoveInDate] = useState("2026-10-01");
  const [applicantNote, setApplicantNote] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);

  // Visit Form
  const [visitDate, setVisitDate] = useState("2026-09-22");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [visitNotes, setVisitNotes] = useState("");
  const [submittingVisit, setSubmittingVisit] = useState(false);

  // Chat Form
  const [chatMessage, setChatMessage] = useState("");
  const [submittingChat, setSubmittingChat] = useState(false);

  // Manager: Publish Vacancy (#23, #24, #25)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRent, setNewRent] = useState("");
  const [newDeposit, setNewDeposit] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newAvailable, setNewAvailable] = useState(new Date().toISOString().split("T")[0]);
  const [pickedPhotos, setPickedPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [pickedVideo, setPickedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState("");

  const fetchListings = async () => {
    setLoading(true);
    try {
      if (onlyFavorites) {
        const res = await api.getFavoriteListings();
        const items = res.data?.map((f: any) => ({ ...f.listing, is_favorited: true })) || [];
        setListings(items);
      } else {
        const params: Record<string, any> = {
          query: searchQuery,
          gender_policy: selectedGender || undefined,
          max_rent: maxBudget || undefined,
        };
        const res = await api.getListings(params);
        setListings(res.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load listings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedGender, maxBudget, onlyFavorites]);

  const toggleFavorite = async (listingId: string) => {
    try {
      const res = await api.toggleFavoriteListing(listingId);
      setListings((prev) =>
        prev.map((item) =>
          item.id === listingId ? { ...item, is_favorited: res.is_favorited } : item
        )
      );
      if (selectedListing && selectedListing.id === listingId) {
        setSelectedListing((prev: any) => ({ ...prev, is_favorited: res.is_favorited }));
      }
    } catch (err: any) {
      Alert.alert("Favorite", err.message || "Failed to toggle favorite");
    }
  };

  const handleApply = async () => {
    if (!selectedListing) return;
    setSubmittingApply(true);
    try {
      await api.applyListing(selectedListing.id, {
        desired_move_in_date: moveInDate,
        applicant_note: applicantNote,
        nid_number: nidNumber,
        profession: profession,
        blood_group: bloodGroup,
        emergency_contact_phone: emergencyPhone,
      });
      Alert.alert("Application Sent! 🎉", "The mess manager has received your booking application.");
      setShowApplyModal(false);
      setShowDetailModal(false);
      fetchListings();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit application");
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!selectedListing) return;
    setSubmittingVisit(true);
    try {
      await api.scheduleVisit(selectedListing.id, {
        visit_date: visitDate,
        time_slot: timeSlot,
        notes: visitNotes,
      });
      Alert.alert("Visit Requested! 📅", "The mess manager will confirm your physical visit slot.");
      setShowVisitModal(false);
      setShowDetailModal(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to schedule visit");
    } finally {
      setSubmittingVisit(false);
    }
  };

  const handleSendChat = async () => {
    if (!selectedListing || !chatMessage.trim()) return;
    setSubmittingChat(true);
    try {
      await api.sendInquiry(selectedListing.id, {
        message: chatMessage.trim(),
      });
      Alert.alert("Message Sent! 💬", "Manager has been notified of your message.");
      setChatMessage("");
      setShowChatModal(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send message");
    } finally {
      setSubmittingChat(false);
    }
  };

  // ── Manager: media pickers (#24 photos, #25 video) ──
  const takeInstantPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Allow camera access to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setPickedPhotos((prev) => [...prev, result.assets[0]].slice(0, 10));
    }
  };

  const pickPhotosFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Allow photo library access to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setPickedPhotos((prev) => [...prev, ...result.assets].slice(0, 10));
    }
  };

  const recordWalkthroughVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Allow camera access to record the walk-through video.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPickedVideo(result.assets[0]);
    }
  };

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewRent("");
    setNewDeposit("");
    setNewArea("");
    setNewAvailable(new Date().toISOString().split("T")[0]);
    setPickedPhotos([]);
    setPickedVideo(null);
  };

  const handleCreateListing = async () => {
    const messId = currentResidency?.mess_id || user?.residencies?.[0]?.mess_id;
    if (!messId) {
      Alert.alert("No Mess", "You need an active mess membership to publish a vacancy.");
      return;
    }
    if (!newTitle.trim() || !newRent.trim()) {
      Alert.alert("Required", "Please enter a title and the monthly rent.");
      return;
    }

    setSubmittingCreate(true);
    try {
      // Upload photos directly from the device first (#24)
      let photoUrls: string[] = [];
      if (pickedPhotos.length > 0) {
        setUploadStep(`Uploading ${pickedPhotos.length} photo${pickedPhotos.length > 1 ? "s" : ""}...`);
        setUploadProgress(0);
        const upRes = await api.uploadListingPhotos(messId, pickedPhotos, undefined, (p: number) =>
          setUploadProgress(p)
        );
        photoUrls = upRes?.photo_urls || [];
      }

      setUploadStep("Publishing listing...");
      const created = await api.createListing(messId, {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        rent_amount: Number(newRent),
        security_deposit: Number(newDeposit || 0),
        available_from: newAvailable,
        area_name: newArea.trim() || null,
        amenities: [],
        photos: photoUrls,
      });

      // Walk-through video recorded/selected on the phone (#25)
      const listingId = created?.listing?.id;
      if (pickedVideo && listingId) {
        setUploadStep("Uploading walk-through video...");
        setUploadProgress(0);
        await api.uploadListingVideo(messId, listingId, pickedVideo, (p: number) => setUploadProgress(p));
      }

      Alert.alert("Published! 🎉", "Your vacancy listing is now live on the marketplace.");
      setShowCreateModal(false);
      resetCreateForm();
      fetchListings();
    } catch (err: any) {
      Alert.alert("Upload Problem", err.message || "Failed to publish listing. Please try again.");
    } finally {
      setSubmittingCreate(false);
      setUploadStep("");
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Vacancy Marketplace</Text>
            <Text style={styles.headerSubtitle}>Explore verified mess seats in Bangladesh (#23–#28)</Text>
          </View>
          {isManager && (
            <TouchableOpacity style={styles.publishBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={16} color="#ffffff" />
              <Text style={styles.publishBtnText}>Publish</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Input */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search area, mess, or university..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchListings}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); fetchListings(); }}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedGender === "" && !maxBudget && !onlyFavorites && styles.filterChipActive]}
            onPress={() => { setSelectedGender(""); setMaxBudget(""); setOnlyFavorites(false); }}
          >
            <Text style={[styles.filterChipText, selectedGender === "" && !maxBudget && !onlyFavorites && styles.filterChipTextActive]}>
              All Seats
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedGender === "male" && styles.filterChipActive]}
            onPress={() => setSelectedGender(selectedGender === "male" ? "" : "male")}
          >
            <Text style={[styles.filterChipText, selectedGender === "male" && styles.filterChipTextActive]}>
              👨 Male Mess
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedGender === "female" && styles.filterChipActive]}
            onPress={() => setSelectedGender(selectedGender === "female" ? "" : "female")}
          >
            <Text style={[styles.filterChipText, selectedGender === "female" && styles.filterChipTextActive]}>
              👩 Female Mess
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, maxBudget === "4000" && styles.filterChipActive]}
            onPress={() => setMaxBudget(maxBudget === "4000" ? "" : "4000")}
          >
            <Text style={[styles.filterChipText, maxBudget === "4000" && styles.filterChipTextActive]}>
              ৳ Under 4,000
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, onlyFavorites && styles.filterChipActiveRose]}
            onPress={() => setOnlyFavorites(!onlyFavorites)}
          >
            <Ionicons name="heart" size={14} color={onlyFavorites ? "#ffffff" : "#f43f5e"} />
            <Text style={[styles.filterChipText, onlyFavorites && styles.filterChipTextActive]}>
              {" "}Saved
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Feed List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Searching available vacancies...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
          {listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bed-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Vacancies Found</Text>
              <Text style={styles.emptySubtitle}>Try changing your filter options or area keywords.</Text>
            </View>
          ) : (
            listings.map((item) => {
              const photoUrl = item.photos?.[0]?.photo_url || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80";

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => { setSelectedListing(item); setShowDetailModal(true); }}
                  activeOpacity={0.88}
                >
                  {/* Card Cover Image */}
                  <View style={styles.cardImageWrapper}>
                    <Image source={{ uri: photoUrl }} style={styles.cardImage} />

                    {/* Rent Badge */}
                    <View style={styles.rentBadge}>
                      <Text style={styles.rentAmount}>৳{Number(item.rent_amount).toLocaleString()}</Text>
                      <Text style={styles.rentPeriod}>/mo</Text>
                    </View>

                    {/* Gender Tag */}
                    <View
                      style={[
                        styles.genderBadge,
                        { backgroundColor: item.gender_policy === "male" ? "#2563eb" : "#db2777" },
                      ]}
                    >
                      <Text style={styles.genderBadgeText}>{item.gender_policy?.toUpperCase()} MESS</Text>
                    </View>

                    {/* Favorite Button */}
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(item.id)}
                    >
                      <Ionicons
                        name={item.is_favorited ? "heart" : "heart-outline"}
                        size={20}
                        color={item.is_favorited ? "#f43f5e" : "#ffffff"}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Card Info */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color="#059669" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {item.area_name || item.mess?.city}, {item.mess?.name}
                      </Text>
                    </View>

                    {/* Amenities tags */}
                    <View style={styles.amenitiesRow}>
                      <View style={styles.amenityChip}>
                        <Text style={styles.amenityText}>{item.room_type || "Shared"} Room</Text>
                      </View>
                      {item.amenities?.slice(0, 3).map((a: string) => (
                        <View key={a} style={styles.amenityChipLight}>
                          <Text style={styles.amenityTextLight}>{a.replace("_", " ")}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.availableText}>Available: {item.available_from || "Now"}</Text>
                      <View style={styles.viewDetailLink}>
                        <Text style={styles.viewDetailText}>Details</Text>
                        <Ionicons name="arrow-forward" size={14} color="#059669" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Detail Modal (#23, #24, #25) ── */}
      {selectedListing && (
        <Modal visible={showDetailModal} animationType="slide" transparent={false}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>{selectedListing.title}</Text>
            <TouchableOpacity onPress={() => toggleFavorite(selectedListing.id)} style={styles.closeBtn}>
              <Ionicons
                name={selectedListing.is_favorited ? "heart" : "heart-outline"}
                size={22}
                color={selectedListing.is_favorited ? "#f43f5e" : "#4b5563"}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Main Photo */}
            <Image
              source={{ uri: selectedListing.photos?.[0]?.photo_url || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5" }}
              style={styles.detailImage}
            />

            <View style={styles.detailBody}>
              {/* Rent & Deposit Box */}
              <View style={styles.priceCard}>
                <View>
                  <Text style={styles.priceLabel}>Monthly Rent</Text>
                  <Text style={styles.priceValue}>৳{Number(selectedListing.rent_amount).toLocaleString()}</Text>
                </View>
                <View style={styles.priceDivider} />
                <View>
                  <Text style={styles.priceLabel}>Security Deposit</Text>
                  <Text style={styles.priceValue}>৳{Number(selectedListing.security_deposit || 0).toLocaleString()}</Text>
                </View>
              </View>

              {/* Title & Location */}
              <Text style={styles.detailTitle}>{selectedListing.title}</Text>
              <View style={styles.locationRowLarge}>
                <Ionicons name="location" size={16} color="#059669" />
                <Text style={styles.locationTextLarge}>
                  {selectedListing.mess?.name}, {selectedListing.mess?.address}
                </Text>
              </View>

              {/* Walkthrough Video Link (#25) */}
              {selectedListing.video_url && (
                <TouchableOpacity
                  style={styles.videoButton}
                  onPress={() => Linking.openURL(selectedListing.video_url)}
                >
                  <Ionicons name="play-circle-outline" size={22} color="#4338ca" />
                  <Text style={styles.videoButtonText}>Watch Walkthrough Video (#25)</Text>
                </TouchableOpacity>
              )}

              {/* Description */}
              <Text style={styles.sectionHeader}>About This Seat</Text>
              <Text style={styles.descText}>
                {selectedListing.description || "Spacious bed in student/professional shared mess with healthy fresh food and quiet environment."}
              </Text>

              {/* Rules Checklist (#24) */}
              <Text style={styles.sectionHeader}>Rules & Checklist (#24)</Text>
              <View style={styles.rulesCard}>
                <View style={styles.ruleItem}>
                  <Ionicons name="ban-outline" size={16} color="#dc2626" />
                  <Text style={styles.ruleText}>
                    {selectedListing.rules?.smoking_allowed ? "Smoking Allowed" : "Strictly No Smoking"}
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons name="time-outline" size={16} color="#2563eb" />
                  <Text style={styles.ruleText}>
                    Gate Closes: {selectedListing.rules?.gate_close_time || "11:00 PM"}
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons name="people-outline" size={16} color="#059669" />
                  <Text style={styles.ruleText}>
                    Guests: {selectedListing.rules?.guest_policy || "Prior Approval"}
                  </Text>
                </View>
              </View>

              {/* Amenities */}
              <Text style={styles.sectionHeader}>Amenities Included</Text>
              <View style={styles.amenitiesWrap}>
                {selectedListing.amenities?.map((a: string) => (
                  <View key={a} style={styles.amenityBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.amenityBadgeText}>{a.replace("_", " ")}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Footer (#29, #31, #32) */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.chatActionBtn}
              onPress={() => setShowChatModal(true)}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#1f2937" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.visitActionBtn}
              onPress={() => setShowVisitModal(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#059669" />
              <Text style={styles.visitActionText}>Visit (#32)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyActionBtn}
              onPress={() => setShowApplyModal(true)}
            >
              <Ionicons name="person-add-outline" size={18} color="#ffffff" />
              <Text style={styles.applyActionText}>1-Click Apply (#29)</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* ── 1-Click Apply Modal (#29) ── */}
      <Modal visible={showApplyModal} animationType="slide" transparent>
        <View style={styles.darkBackdrop}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>1-Click Join Application (#29)</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.inputLabel}>Desired Move-in Date</Text>
              <TextInput
                style={styles.popupInput}
                value={moveInDate}
                onChangeText={setMoveInDate}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.inputLabel}>Profession / University</Text>
              <TextInput
                style={styles.popupInput}
                value={profession}
                onChangeText={setProfession}
                placeholder="e.g. Student at BUET / Engineer"
              />

              <Text style={styles.inputLabel}>National ID (NID)</Text>
              <TextInput
                style={styles.popupInput}
                value={nidNumber}
                onChangeText={setNidNumber}
                placeholder="NID Number"
              />

              <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
              <TextInput
                style={styles.popupInput}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="017XXXXXXXX"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Note for Manager</Text>
              <TextInput
                style={[styles.popupInput, { height: 60 }]}
                value={applicantNote}
                onChangeText={setApplicantNote}
                placeholder="Anything you'd like to mention..."
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleApply}
              disabled={submittingApply}
            >
              {submittingApply ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Visit Scheduling Modal (#32) ── */}
      <Modal visible={showVisitModal} animationType="slide" transparent>
        <View style={styles.darkBackdrop}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Schedule a Visit (#32)</Text>
              <TouchableOpacity onPress={() => setShowVisitModal(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Visit Date</Text>
            <TextInput
              style={styles.popupInput}
              value={visitDate}
              onChangeText={setVisitDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.inputLabel}>Time Slot</Text>
            <TextInput
              style={styles.popupInput}
              value={timeSlot}
              onChangeText={setTimeSlot}
              placeholder="e.g. 10:00 AM - 12:00 PM"
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.popupInput, { height: 60 }]}
              value={visitNotes}
              onChangeText={setVisitNotes}
              placeholder="Questions you have about the room..."
              multiline
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleScheduleVisit}
              disabled={submittingVisit}
            >
              {submittingVisit ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm Visit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Manager: Publish Vacancy Modal (#23, #24, #25) ── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.darkBackdrop}>
          <View style={[styles.popupCard, { maxHeight: "92%" }]}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Publish Vacancy (#23)</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <Text style={styles.inputLabel}>Listing Title *</Text>
              <TextInput
                style={styles.popupInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Sunny single seat near DU"
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Monthly Rent (৳) *</Text>
                  <TextInput
                    style={styles.popupInput}
                    value={newRent}
                    onChangeText={setNewRent}
                    placeholder="4500"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Deposit (৳)</Text>
                  <TextInput
                    style={styles.popupInput}
                    value={newDeposit}
                    onChangeText={setNewDeposit}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Area</Text>
              <TextInput
                style={styles.popupInput}
                value={newArea}
                onChangeText={setNewArea}
                placeholder="e.g. TSC, Dhaka University"
              />

              <Text style={styles.inputLabel}>Available From</Text>
              <TextInput
                style={styles.popupInput}
                value={newAvailable}
                onChangeText={setNewAvailable}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.popupInput, { height: 60 }]}
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Room environment, meals, rules..."
                multiline
              />

              {/* Photos (#24) — direct camera / gallery upload */}
              <Text style={styles.inputLabel}>Room Photos ({pickedPhotos.length}/10)</Text>
              <View style={styles.mediaRow}>
                <TouchableOpacity style={styles.mediaBtn} onPress={takeInstantPhoto}>
                  <Ionicons name="camera" size={18} color="#059669" />
                  <Text style={styles.mediaBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaBtn} onPress={pickPhotosFromGallery}>
                  <Ionicons name="images" size={18} color="#4338ca" />
                  <Text style={styles.mediaBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
              {pickedPhotos.length > 0 && (
                <View style={styles.thumbRow}>
                  {pickedPhotos.map((p, idx) => (
                    <View key={`${p.uri}-${idx}`} style={styles.thumbWrapper}>
                      <Image source={{ uri: p.uri }} style={styles.thumbImage} />
                      <TouchableOpacity
                        style={styles.thumbRemove}
                        onPress={() => setPickedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Ionicons name="close" size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Walk-through video (#25) — instant record from the app */}
              <Text style={styles.inputLabel}>Walk-through Video (max 60s)</Text>
              <View style={styles.mediaRow}>
                <TouchableOpacity style={styles.mediaBtn} onPress={recordWalkthroughVideo}>
                  <Ionicons name="videocam" size={18} color="#dc2626" />
                  <Text style={styles.mediaBtnText}>{pickedVideo ? "Re-record" : "Record"}</Text>
                </TouchableOpacity>
                {pickedVideo && (
                  <View style={[styles.mediaBtn, { backgroundColor: "#ecfdf5" }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    <Text style={[styles.mediaBtnText, { color: "#059669" }]}>Video Ready</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {submittingCreate && uploadStep ? (
              <View style={styles.progressWrap}>
                <Text style={styles.progressLabel}>{uploadStep}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(uploadProgress, 4)}%` }]} />
                </View>
              </View>
            ) : null}

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateListing} disabled={submittingCreate}>
              {submittingCreate ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.submitBtnText}>{uploadStep || "Working..."}</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Publish Listing</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Message Manager Chat Modal (#31) ── */}
      <Modal visible={showChatModal} animationType="slide" transparent>
        <View style={styles.darkBackdrop}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>In-App Chat (#31)</Text>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Your Message to Manager</Text>
            <TextInput
              style={[styles.popupInput, { height: 90 }]}
              value={chatMessage}
              onChangeText={setChatMessage}
              placeholder="Hi manager, I want to ask about..."
              multiline
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSendChat}
              disabled={submittingChat}
            >
              {submittingChat ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 2, marginBottom: 8 },
  headerTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  publishBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  mediaRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mediaBtnText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  thumbWrapper: { width: 54, height: 54, borderRadius: 8, overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  thumbRemove: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 9,
    padding: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: "#1f2937" },
  filterScroll: { flexDirection: "row", paddingBottom: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: "#059669" },
  filterChipActiveRose: { backgroundColor: "#e11d48" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  filterChipTextActive: { color: "#ffffff", fontWeight: "700" },
  scrollList: { flex: 1 },
  scrollContent: { padding: 14 },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 13, color: "#6b7280" },
  emptyState: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 8 },
  emptySubtitle: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 4 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImageWrapper: { height: 160, width: "100%", position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  rentBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "baseline",
  },
  rentAmount: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  rentPeriod: { color: "#d1d5db", fontSize: 11, marginLeft: 2 },
  genderBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genderBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 6,
    borderRadius: 20,
  },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  locationText: { fontSize: 12, color: "#6b7280", marginLeft: 4 },
  amenitiesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  amenityChip: { backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  amenityText: { fontSize: 11, color: "#374151", fontWeight: "600" },
  amenityChipLight: { backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  amenityTextLight: { fontSize: 11, color: "#065f46", textTransform: "capitalize" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  availableText: { fontSize: 11, color: "#9ca3af" },
  viewDetailLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewDetailText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeBtn: { padding: 6 },
  modalHeaderTitle: { flex: 1, fontSize: 15, fontWeight: "700", textAlign: "center", marginHorizontal: 8 },
  modalContent: { flex: 1 },
  detailImage: { width: "100%", height: 230 },
  detailBody: { padding: 16 },
  priceCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginBottom: 14,
  },
  priceLabel: { fontSize: 11, color: "#047857", fontWeight: "600" },
  priceValue: { fontSize: 18, fontWeight: "800", color: "#065f46", marginTop: 2 },
  priceDivider: { width: 1, backgroundColor: "#a7f3d0" },
  detailTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  locationRowLarge: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 12 },
  locationTextLarge: { fontSize: 13, color: "#4b5563", marginLeft: 4 },
  videoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e7ff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 6,
  },
  videoButtonText: { fontSize: 13, fontWeight: "700", color: "#4338ca" },
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#1f2937", marginTop: 14, marginBottom: 6 },
  descText: { fontSize: 13, color: "#4b5563", lineHeight: 20 },
  rulesCard: { backgroundColor: "#f9fafb", borderRadius: 10, padding: 10, gap: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  ruleItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  amenitiesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 4 },
  amenityBadgeText: { fontSize: 12, color: "#374151", textTransform: "capitalize" },
  modalFooter: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    gap: 8,
  },
  chatActionBtn: { padding: 12, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  visitActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#ecfdf5", borderRadius: 10, gap: 4 },
  visitActionText: { fontSize: 13, fontWeight: "700", color: "#059669" },
  applyActionBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#059669", borderRadius: 10, gap: 4 },
  applyActionText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  darkBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  popupCard: { backgroundColor: "#ffffff", width: "100%", maxWidth: 360, borderRadius: 16, padding: 16 },
  popupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  popupTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  inputLabel: { fontSize: 11, fontWeight: "700", color: "#4b5563", marginTop: 8, marginBottom: 4 },
  popupInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 8, fontSize: 12, color: "#111827" },
  submitBtn: { backgroundColor: "#059669", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 14 },
  progressWrap: { marginTop: 14 },
  progressLabel: { fontSize: 11, fontWeight: "600", color: "#065f46", marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#059669", borderRadius: 3 },
  submitBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
});
