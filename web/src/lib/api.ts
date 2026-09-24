function getApiBase(): string {
  return "https://mess.czbd.dev/api/v1";
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("mess_token") : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${getApiBase()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(", ") : "An error occurred");
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (data: any) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  getMe: () => apiRequest("/me"),

  // Messes
  createMess: (data: any) => apiRequest("/messes", { method: "POST", body: JSON.stringify(data) }),
  getMess: (messId: string) => apiRequest(`/messes/${messId}`),
  updateMess: (messId: string, data: any) => apiRequest(`/messes/${messId}`, { method: "PATCH", body: JSON.stringify(data) }),
  getDashboard: (messId: string) => apiRequest(`/messes/${messId}/dashboard`),

  // Structure
  addFloor: (messId: string, data: any) => apiRequest(`/messes/${messId}/floors`, { method: "POST", body: JSON.stringify(data) }),
  addRoom: (floorId: string, data: any) => apiRequest(`/floors/${floorId}/rooms`, { method: "POST", body: JSON.stringify(data) }),
  addBed: (roomId: string, data: any) => apiRequest(`/rooms/${roomId}/beds`, { method: "POST", body: JSON.stringify(data) }),
  getBeds: (messId: string) => apiRequest(`/messes/${messId}/beds`),

  // Residents & Invites
  createInvite: (messId: string, data: any) => apiRequest(`/messes/${messId}/invites`, { method: "POST", body: JSON.stringify(data) }),
  getInvite: (code: string) => apiRequest(`/invites/${code}`),
  acceptInvite: (code: string, data: any) => apiRequest(`/invites/${code}/accept`, { method: "POST", body: JSON.stringify(data) }),
  approveInvite: (code: string) => apiRequest(`/invites/${code}/approve`, { method: "POST" }),
  approveResidency: (residencyId: string, data?: any) =>
    apiRequest(`/residencies/${residencyId}/approve`, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  getResidents: (messId: string) => apiRequest(`/messes/${messId}/residents`),
  getResidency: (residencyId: string) => apiRequest(`/residencies/${residencyId}`),

  // Meals
  toggleMeal: (residencyId: string, data: any) => apiRequest(`/residencies/${residencyId}/meals`, { method: "POST", body: JSON.stringify(data) }),
  getMealHistory: (residencyId: string, month: string) => apiRequest(`/residencies/${residencyId}/meals?month=${month}`),
  getLiveMealRate: (messId: string) => apiRequest(`/messes/${messId}/meal-rate/today`),
  submitVacation: (residencyId: string, data: any) => apiRequest(`/residencies/${residencyId}/vacation`, { method: "POST", body: JSON.stringify(data) }),
  approveVacation: (vacationId: string, status: "approved" | "rejected") =>
    apiRequest(`/vacation/${vacationId}/approve`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Expenses, Settlements & Bills
  logExpense: (messId: string, data: any) => apiRequest(`/messes/${messId}/expenses`, { method: "POST", body: JSON.stringify(data) }),
  getExpenses: (messId: string, month: string) => apiRequest(`/messes/${messId}/expenses?month=${month}`),
  getSettlements: (messId: string, month: string) => apiRequest(`/messes/${messId}/settlements?month=${month}`),
  addFixedBill: (messId: string, data: any) => apiRequest(`/messes/${messId}/fixed-bills`, { method: "POST", body: JSON.stringify(data) }),
  generateBills: (messId: string, billingMonth: string) =>
    apiRequest(`/messes/${messId}/generate-bills`, { method: "POST", body: JSON.stringify({ billing_month: billingMonth }) }),
  getResidentBills: (residencyId: string) => apiRequest(`/residencies/${residencyId}/bills`),
  getMessBills: (messId: string, month: string) => apiRequest(`/messes/${messId}/bills?month=${month}`),
  getBillInvoice: (billId: string) => apiRequest(`/bills/${billId}`),
  recordPayment: (billId: string, data: any) => apiRequest(`/bills/${billId}/payments`, { method: "POST", body: JSON.stringify(data) }),

  // Notices
  getNotices: (messId: string) => apiRequest(`/messes/${messId}/notices`),
  postNotice: (messId: string, data: any) => apiRequest(`/messes/${messId}/notices`, { method: "POST", body: JSON.stringify(data) }),

  // Complaints
  getComplaints: (messId: string) => apiRequest(`/messes/${messId}/complaints`),
  fileComplaint: (residencyId: string, data: any) => apiRequest(`/residencies/${residencyId}/complaints`, { method: "POST", body: JSON.stringify(data) }),
  updateComplaint: (complaintId: string, data: any) => apiRequest(`/complaints/${complaintId}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Leave Clearance
  submitLeave: (residencyId: string, data: any) => apiRequest(`/residencies/${residencyId}/leave`, { method: "POST", body: JSON.stringify(data) }),
  getMessLeaves: (messId: string) => apiRequest(`/messes/${messId}/leaves`),
  finalizeClearance: (leaveId: string) => apiRequest(`/leave/${leaveId}/clear`, { method: "POST" }),

  // Notifications
  getNotifications: () => apiRequest("/notifications"),
  markNotificationRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),

  // Collective Meal Sheet & Vacations
  getMessDailyMeals: (messId: string, date?: string) =>
    apiRequest(`/messes/${messId}/meals${date ? `?date=${date}` : ""}`),
  getMessVacations: (messId: string) => apiRequest(`/messes/${messId}/vacations`),

  // Bazar Duty Roster
  getBazarSchedules: (messId: string, month: string) =>
    apiRequest(`/messes/${messId}/bazar-schedules?month=${month}`),
  assignBazarSchedule: (messId: string, data: any) =>
    apiRequest(`/messes/${messId}/bazar-schedules`, { method: "POST", body: JSON.stringify(data) }),
  deleteBazarSchedule: (scheduleId: string) =>
    apiRequest(`/bazar-schedules/${scheduleId}`, { method: "DELETE" }),

  // Platform Superadmin SaaS APIs
  getAdminStats: () => apiRequest("/admin/stats"),
  getAdminMesses: () => apiRequest("/admin/messes"),
  updateMessStatus: (messId: string, status: string) =>
    apiRequest(`/admin/messes/${messId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getAdminUsers: () => apiRequest("/admin/users"),
  updateUserStatus: (userId: string, isSuspended: boolean) =>
    apiRequest(`/admin/users/${userId}/suspend`, { method: "PATCH", body: JSON.stringify({ is_suspended: isSuspended }) }),
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
  getListingShareQr: (id: string) => apiRequest(`/marketplace/listings/${id}/share-qr`),
  toggleFavoriteListing: (id: string) => apiRequest(`/marketplace/listings/${id}/favorite`, { method: "POST" }),
  getFavoriteListings: () => apiRequest("/marketplace/favorites"),
  createListing: (messId: string, data: any) => apiRequest(`/messes/${messId}/listings`, { method: "POST", body: JSON.stringify(data) }),
  updateListing: (id: string, data: any) => apiRequest(`/marketplace/listings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteListing: (id: string) => apiRequest(`/marketplace/listings/${id}`, { method: "DELETE" }),
  getMessListings: (messId: string) => apiRequest(`/messes/${messId}/listings`),

  // Applications & Waiting List (#29, #33, #34, #35)
  applyListing: (id: string, data: any) => apiRequest(`/marketplace/listings/${id}/apply`, { method: "POST", body: JSON.stringify(data) }),
  getMyApplications: () => apiRequest("/booking-applications/my"),
  getMessApplications: (messId: string) => apiRequest(`/messes/${messId}/applications`),
  decideApplication: (id: string, data: any) => apiRequest(`/booking-applications/${id}/decision`, { method: "POST", body: JSON.stringify(data) }),
  joinWaitingList: (messId: string, data: any) => apiRequest(`/messes/${messId}/waiting-list`, { method: "POST", body: JSON.stringify(data) }),
  getMessWaitingList: (messId: string) => apiRequest(`/messes/${messId}/waiting-list`),

  // Inquiries / In-App Chat (#31)
  getInquiries: () => apiRequest("/inquiries"),
  getInquiryThread: (id: string) => apiRequest(`/inquiries/${id}`),
  sendInquiry: (listingId: string, data: any) => apiRequest(`/marketplace/listings/${listingId}/inquire`, { method: "POST", body: JSON.stringify(data) }),
  replyInquiry: (threadId: string, data: any) => apiRequest(`/inquiries/${threadId}/messages`, { method: "POST", body: JSON.stringify(data) }),

  // Physical Visits (#32)
  scheduleVisit: (listingId: string, data: any) => apiRequest(`/marketplace/listings/${listingId}/visits`, { method: "POST", body: JSON.stringify(data) }),
  getMyVisits: () => apiRequest("/visits/my"),
  getMessVisits: (messId: string) => apiRequest(`/messes/${messId}/visits`),
  updateVisitStatus: (visitId: string, data: any) => apiRequest(`/visits/${visitId}/status`, { method: "PATCH", body: JSON.stringify(data) }),

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
