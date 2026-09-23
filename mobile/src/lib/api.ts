import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_API_URL, STORAGE_KEYS } from "../constants/config";

let cachedApiUrl: string | null = null;

export async function getBaseUrl(): Promise<string> {
  if (cachedApiUrl) return cachedApiUrl;
  const custom = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_API_URL);
  cachedApiUrl = custom || DEFAULT_API_URL;
  return cachedApiUrl;
}

export async function setBaseUrl(url: string) {
  cachedApiUrl = url;
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_API_URL, url);
}

async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(", ") : "An error occurred");
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: any) =>
    apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: any) =>
    apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  getMe: () => apiRequest("/me"),

  // Dashboard & Overview
  getDashboard: (messId: string) => apiRequest(`/messes/${messId}/dashboard`),

  // Meals & Sheet
  toggleMeal: (residencyId: string, payload: any) =>
    apiRequest(`/residencies/${residencyId}/meals`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMealHistory: (residencyId: string, month: string) =>
    apiRequest(`/residencies/${residencyId}/meals?month=${month}`),
  getLiveMealRate: (messId: string) => apiRequest(`/messes/${messId}/meal-rate/today`),
  getMessDailyMeals: (messId: string, date?: string) =>
    apiRequest(`/messes/${messId}/meals${date ? `?date=${date}` : ""}`),
  getMessVacations: (messId: string) => apiRequest(`/messes/${messId}/vacations`),
  submitVacation: (residencyId: string, payload: any) =>
    apiRequest(`/residencies/${residencyId}/vacation`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveVacation: (vacationId: string, status: "approved" | "rejected") =>
    apiRequest(`/vacation/${vacationId}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Expenses, Settlements, Bazar & Roster
  getExpenses: (messId: string, month: string) =>
    apiRequest(`/messes/${messId}/expenses?month=${month}`),
  getSettlements: (messId: string, month: string) =>
    apiRequest(`/messes/${messId}/settlements?month=${month}`),
  logExpense: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/expenses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addFixedBill: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/fixed-bills`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getBazarSchedules: (messId: string, month: string) =>
    apiRequest(`/messes/${messId}/bazar-schedules?month=${month}`),
  assignBazarSchedule: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/bazar-schedules`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteBazarSchedule: (scheduleId: string) =>
    apiRequest(`/bazar-schedules/${scheduleId}`, { method: "DELETE" }),

  // Bills & Invoices
  getResidentBills: (residencyId: string) => apiRequest(`/residencies/${residencyId}/bills`),
  getMessBills: (messId: string, month: string) =>
    apiRequest(`/messes/${messId}/bills?month=${month}`),
  getBillInvoice: (billId: string) => apiRequest(`/bills/${billId}`),
  generateBills: (messId: string, billingMonth: string) =>
    apiRequest(`/messes/${messId}/generate-bills`, {
      method: "POST",
      body: JSON.stringify({ billing_month: billingMonth }),
    }),
  recordPayment: (billId: string, payload: any) =>
    apiRequest(`/bills/${billId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Rooms & Beds
  getBeds: (messId: string) => apiRequest(`/messes/${messId}/beds`),
  addFloor: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/floors`, { method: "POST", body: JSON.stringify(payload) }),
  addRoom: (floorId: string, payload: any) =>
    apiRequest(`/floors/${floorId}/rooms`, { method: "POST", body: JSON.stringify(payload) }),
  addBed: (roomId: string, payload: any) =>
    apiRequest(`/rooms/${roomId}/beds`, { method: "POST", body: JSON.stringify(payload) }),

  // Residents & Invites
  getResidents: (messId: string) => apiRequest(`/messes/${messId}/residents`),
  getInvite: (code: string) => apiRequest(`/invites/${code}`),
  acceptInvite: (code: string, payload: any) =>
    apiRequest(`/invites/${code}/accept`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createInvite: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/invites`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveInvite: (code: string) => apiRequest(`/invites/${code}/approve`, { method: "POST" }),
  approveResidency: (residencyId: string, payload?: any) =>
    apiRequest(`/residencies/${residencyId}/approve`, {
      method: "POST",
      body: payload ? JSON.stringify(payload) : undefined,
    }),

  // Notices
  getNotices: (messId: string) => apiRequest(`/messes/${messId}/notices`),
  postNotice: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/notices`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Complaints
  getComplaints: (messId: string) => apiRequest(`/messes/${messId}/complaints`),
  fileComplaint: (residencyId: string, payload: any) =>
    apiRequest(`/residencies/${residencyId}/complaints`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateComplaint: (complaintId: string, payload: any) =>
    apiRequest(`/complaints/${complaintId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // Leave & Clearance
  submitLeave: (residencyId: string, payload: any) =>
    apiRequest(`/residencies/${residencyId}/leave`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMessLeaves: (messId: string) => apiRequest(`/messes/${messId}/leaves`),
  finalizeClearance: (leaveId: string) =>
    apiRequest(`/leave/${leaveId}/clear`, { method: "POST" }),

  // Notifications
  getNotifications: () => apiRequest("/notifications"),
  markNotificationRead: (id: string) =>
    apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),

  // Platform Superadmin SaaS APIs
  getAdminStats: () => apiRequest("/admin/stats"),
  getAdminMesses: () => apiRequest("/admin/messes"),
  updateMessStatus: (messId: string, status: string) =>
    apiRequest(`/admin/messes/${messId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getAdminUsers: () => apiRequest("/admin/users"),
  updateUserStatus: (userId: string, isSuspended: boolean) =>
    apiRequest(`/admin/users/${userId}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ is_suspended: isSuspended }),
    }),
  impersonateMess: (messId: string) =>
    apiRequest(`/admin/impersonate/${messId}`, { method: "POST" }),

  // Marketplace & Vacancies (#23 to #28)
  getListings: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") query.append(key, String(val));
    });
    return apiRequest(`/marketplace/listings?${query.toString()}`);
  },
  getListing: (id: string) => apiRequest(`/marketplace/listings/${id}`),
  toggleFavoriteListing: (id: string) =>
    apiRequest(`/marketplace/listings/${id}/favorite`, { method: "POST" }),
  getFavoriteListings: () => apiRequest("/marketplace/favorites"),
  createListing: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/listings`, { method: "POST", body: JSON.stringify(payload) }),
  getMessListings: (messId: string) => apiRequest(`/messes/${messId}/listings`),

  // Applications & Waiting List (#29, #33, #34, #35)
  applyListing: (id: string, payload: any) =>
    apiRequest(`/marketplace/listings/${id}/apply`, { method: "POST", body: JSON.stringify(payload) }),
  getMyApplications: () => apiRequest("/booking-applications/my"),
  getMessApplications: (messId: string) => apiRequest(`/messes/${messId}/applications`),
  decideApplication: (id: string, payload: any) =>
    apiRequest(`/booking-applications/${id}/decision`, { method: "POST", body: JSON.stringify(payload) }),
  joinWaitingList: (messId: string, payload: any) =>
    apiRequest(`/messes/${messId}/waiting-list`, { method: "POST", body: JSON.stringify(payload) }),

  // Inquiries / In-App Chat (#31)
  getInquiries: () => apiRequest("/inquiries"),
  getInquiryThread: (id: string) => apiRequest(`/inquiries/${id}`),
  sendInquiry: (listingId: string, payload: any) =>
    apiRequest(`/marketplace/listings/${listingId}/inquire`, { method: "POST", body: JSON.stringify(payload) }),
  replyInquiry: (threadId: string, payload: any) =>
    apiRequest(`/inquiries/${threadId}/messages`, { method: "POST", body: JSON.stringify(payload) }),

  // Physical Visits (#32)
  scheduleVisit: (listingId: string, payload: any) =>
    apiRequest(`/marketplace/listings/${listingId}/visits`, { method: "POST", body: JSON.stringify(payload) }),
  getMyVisits: () => apiRequest("/visits/my"),
  getMessVisits: (messId: string) => apiRequest(`/messes/${messId}/visits`),
  updateVisitStatus: (visitId: string, payload: any) =>
    apiRequest(`/visits/${visitId}/status`, { method: "PATCH", body: JSON.stringify(payload) }),

  // Smart Security: Dining QR, Visitor Passes, Digital Agreements (#36, #37, #38)
  getDiningToken: (messId: string, mealType?: string) =>
    apiRequest(`/messes/${messId}/dining-token${mealType ? `?meal_type=${mealType}` : ""}`),
  checkInMeal: (messId: string, data: any = {}) =>
    apiRequest(`/messes/${messId}/meal-checkin`, { method: "POST", body: JSON.stringify(data) }),
  getMealCheckInRoster: (messId: string, params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && query.append(k, String(v)));
    return apiRequest(`/messes/${messId}/meal-checkins?${query.toString()}`);
  },
  createVisitorPass: (messId: string, data: any) =>
    apiRequest(`/messes/${messId}/visitor-passes`, { method: "POST", body: JSON.stringify(data) }),
  getMyVisitorPasses: () => apiRequest("/visitor-passes/my"),
  verifyVisitorPass: (messId: string, passCode: string) =>
    apiRequest(`/messes/${messId}/visitor-passes/verify`, { method: "POST", body: JSON.stringify({ pass_code: passCode }) }),
  getMessVisitorPasses: (messId: string) => apiRequest(`/messes/${messId}/visitor-passes`),
  getResidencyAgreement: (residencyId: string) => apiRequest(`/residencies/${residencyId}/agreement`),
  signResidencyAgreement: (residencyId: string, data: any) =>
    apiRequest(`/residencies/${residencyId}/agreement/sign`, { method: "POST", body: JSON.stringify(data) }),
  getMessAgreements: (messId: string) => apiRequest(`/messes/${messId}/agreements`),

  // Trust & Community (#39, #40, #41)
  submitReview: (data: any) => apiRequest("/reviews", { method: "POST", body: JSON.stringify(data) }),
  getUserTrustScore: (userId: string) => apiRequest(`/users/${userId}/trust-score`),
  getMessTrustScore: (messId: string) => apiRequest(`/messes/${messId}/trust-score`),
  getLifestyleProfile: () => apiRequest("/lifestyle/profile"),
  saveLifestyleProfile: (data: any) => apiRequest("/lifestyle/profile", { method: "POST", body: JSON.stringify(data) }),
  getMessCompatibility: (messId: string) => apiRequest(`/messes/${messId}/compatibility`),

  // AI & Advanced Analytics (#42 to #46)
  scanReceipt: (messId: string, data: any) =>
    apiRequest(`/messes/${messId}/ai/scan-receipt`, { method: "POST", body: JSON.stringify(data) }),
  getFinancialAndWaste: (messId: string, month?: string) =>
    apiRequest(`/messes/${messId}/analytics/financial-waste${month ? `?month=${month}` : ""}`),
  generateAiNotice: (messId: string, data: any) =>
    apiRequest(`/messes/${messId}/ai/generate-notice`, { method: "POST", body: JSON.stringify(data) }),
  getPredictiveBudget: (messId: string) =>
    apiRequest(`/messes/${messId}/analytics/predictive-budget`),
  getOccupancyAnalytics: (messId: string) =>
    apiRequest(`/messes/${messId}/analytics/occupancy`),
};
