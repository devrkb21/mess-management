/**
 * Multipart file upload helper.
 *
 * React Native's bundled FormData rejects the classic { uri, name, type }
 * file descriptor on newer runtimes ("Unsupported FormDataPart
 * implementation"), so on native we use expo-file-system's legacy
 * uploadAsync (Expo's own native multipart implementation — it does not
 * touch the JS FormData at all). One request is sent per file and the
 * backend appends each upload to the listing. On web, the standard browser
 * FormData handles File/Blob objects natively.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { DEFAULT_API_URL, STORAGE_KEYS } from "../constants/config";

export interface UploadFile {
  uri: string;
  name?: string;
  mimeType?: string;
}

interface UploadPart {
  fieldName: string;
  value: string;
}

function guessFileName(file: UploadFile, fallbackExt: string): string {
  if (file.name) return file.name;
  const cleanUri = file.uri.split("?")[0];
  const lastSegment = cleanUri.split("/").pop();
  return lastSegment || `upload-${Date.now()}.${fallbackExt}`;
}

/** POST a JSON request (used for batched server-side appends on native). */
async function postJson(endpoint: string, payload: any): Promise<any> {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const res = await fetch(`${DEFAULT_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      data?.message ||
        (data?.errors ? Object.values(data.errors).flat().join(", ") : null) ||
        `Request failed (${res.status})`
    );
  }
  return data;
}

/**
 * POST a multipart/form-data upload. `files` are sent as the given
 * `fileField` (multiple photos are sent one request per photo on native —
 * the backend appends them in order); `fields` ride along as form params.
 */
export async function uploadMultipart(
  endpoint: string,
  options: {
    fields?: UploadPart[];
    fileField: string;
    files: UploadFile[];
    fallbackExtension?: string;
  }
): Promise<any> {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const fallbackExt = options.fallbackExtension || "jpg";

  if (Platform.OS === "web") {
    const form = new FormData();
    (options.fields || []).forEach((f) => form.append(f.fieldName, f.value));
    options.files.forEach((file) => {
      const name = guessFileName(file, fallbackExt);
      form.append(
        options.fileField + (options.files.length > 1 ? "[]" : ""),
        { uri: file.uri, name } as unknown as Blob,
        name
      );
    });
    const res = await fetch(`${DEFAULT_API_URL}${endpoint}`, {
      method: "POST",
      headers: authHeaders,
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || `Upload failed (${res.status})`);
    }
    return data;
  }

  // Native: legacy uploadAsync per file with Expo's native multipart.
  const responses: any[] = [];
  for (let index = 0; index < options.files.length; index++) {
    const file = options.files[index];
    const name = guessFileName(file, fallbackExt);

    // uploadAsync POSTs a single file as `fieldName`; PHP reads it as a
    // single-element array so it satisfies the same `photos.*` rules.
    const params: Record<string, string> = {};
    (options.fields || []).forEach((f) => {
      params[f.fieldName] = f.value;
    });

    const res = await FileSystem.uploadAsync(
      `${DEFAULT_API_URL}${endpoint}`,
      file.uri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: index === 0 ? `${options.fileField}[]` : options.fileField,
        mimeType: file.mimeType || "application/octet-stream",
        parameters: params,
        headers: authHeaders,
      }
    );

    let body: any = null;
    try {
      body = JSON.parse(res.body);
    } catch {
      body = null;
    }

    if (res.status >= 400) {
      const msg =
        body?.message ||
        (body?.errors ? Object.values(body.errors).flat().join(", ") : null) ||
        `Upload failed (${res.status})`;
      throw new Error(msg);
    }
    responses.push(body);
  }

  // Batch-append the uploaded URLs (e.g. to a listing) with one JSON call.
  const appendEndpoint =
    options.fileField === "photos" ? "/listings/photos/attach" : null;

  if (appendEndpoint && responses.length > 0) {
    const listingIdField = (options.fields || []).find(
      (f) => f.fieldName === "listing_id"
    );
    const urls = responses.flatMap((r) => r?.photo_urls || []);
    if (urls.length > 0) {
      return postJson(`/messes/${listingIdField?.value}${appendEndpoint}`, {
        listing_id: listingIdField?.value,
        photo_urls: urls,
      }).catch(() => responses[responses.length - 1]);
    }
  }

  return responses[responses.length - 1];
}
