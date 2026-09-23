import { Platform } from "react-native";

// Machine's Local LAN IP (accessible to all devices on 192.168.*.*)
export const LAN_HOST = "192.168.0.121";

// For physical devices on Wi-Fi, emulator, or web browser
export const DEFAULT_API_URL =
  typeof window !== "undefined" && window.location?.hostname
    ? `http://${window.location.hostname}:8000/api/v1`
    : `http://${LAN_HOST}:8000/api/v1`;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "mess_mobile_token",
  AUTH_USER: "mess_mobile_user",
  CURRENT_MESS_ID: "mess_mobile_current_mess_id",
  CUSTOM_API_URL: "mess_mobile_custom_api_url",
};
