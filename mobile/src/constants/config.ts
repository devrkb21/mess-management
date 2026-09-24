const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

export const DEFAULT_API_URL = apiUrl;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "mess_mobile_token",
  AUTH_USER: "mess_mobile_user",
  CURRENT_MESS_ID: "mess_mobile_current_mess_id",
};
