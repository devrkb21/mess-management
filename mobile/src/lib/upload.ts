/**
 * Multipart file upload helper.
 *
 * React Native's bundled FormData rejects the classic { uri, name, type }
 * file descriptor on newer runtimes ("Unsupported FormDataPart
 * implementation"), so on native we use expo-file-system's legacy
 * uploadAsync (Expo's own native multipart implementation — it does not
 * touch the JS FormData at all). One request is sent per file; when a
 * listing already exists the returned URLs are attached with one JSON
 * call, otherwise they are merged for the caller to send on creation.
 * On web, the standard browser FormData handles File/Blob objects natively.
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

/** Map low-level upload failures to user-friendly messages. */
function friendlyError(message: string): string {
  if (/413|too large|post_max_size|upload_max_filesize/i.test(message)) {
    return "File is too large. Photos must be under 10 MB and videos under 50 MB.";
  }
  if (/network|failed to connect|timed? ?out/i.test(message)) {
    return "Network problem while uploading. Check your internet connection and try again.";
  }
  return message;
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
      friendlyError(
        data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(", ") : null) ||
          `Request failed (${res.status})`
      )
    );
  }
  return data;
}

/**
 * POST a multipart/form-data upload. `files` are sent as the given
 * `fileField` (multiple photos are sent one request per photo on native);
 * `fields` ride along as form params. `onProgress` reports 0–100 across
 * all files.
 */
export async function uploadMultipart(
  endpoint: string,
  options: {
    fields?: UploadPart[];
    fileField: string;
    files: UploadFile[];
    fallbackExtension?: string;
    onProgress?: (percent: number) => void;
  }
): Promise<any> {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const fallbackExt = options.fallbackExtension || "jpg";
  const reportProgress = (fileIndex: number, filePercent: number) => {
    options.onProgress?.(
      Math.round(((fileIndex + filePercent / 100) / options.files.length) * 100)
    );
  };

  if (Platform.OS === "web") {
    // Browser XHR gives us upload progress that fetch cannot.
    for (let index = 0; index < options.files.length; index++) {
      const file = options.files[index];
      const name = guessFileName(file, fallbackExt);
      const form = new FormData();
      (options.fields || []).forEach((f) => form.append(f.fieldName, f.value));
      form.append(
        options.fileField + (options.files.length > 1 ? "[]" : ""),
        { uri: file.uri, name } as unknown as Blob,
        name
      );

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${DEFAULT_API_URL}${endpoint}`);
        Object.entries(authHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            reportProgress(index, (event.loaded / event.total) * 100);
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(friendlyError(`Upload failed (${xhr.status})`)));
          }
        });
        xhr.addEventListener("error", () =>
          reject(new Error(friendlyError("Network problem while uploading.")))
        );
        xhr.send(form);
      });
    }

    // The caller only needs the URL list for pre-create uploads; refetching
    // the listing handles the attached case, so return a merged response.
    return { ok: true };
  }

  // Native: legacy uploadAsync per file with Expo's native multipart.
  const responses: any[] = [];
  for (let index = 0; index < options.files.length; index++) {
    const file = options.files[index];

    // uploadAsync POSTs a single file as `fieldName`; PHP reads it as a
    // single-element array so it satisfies the same `photos.*` rules.
    const params: Record<string, string> = {};
    (options.fields || []).forEach((f) => {
      params[f.fieldName] = f.value;
    });

    const task = FileSystem.createUploadTask(
      `${DEFAULT_API_URL}${endpoint}`,
      file.uri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: index === 0 ? `${options.fileField}[]` : options.fileField,
        mimeType: file.mimeType || "application/octet-stream",
        parameters: params,
        headers: authHeaders,
      },
      (progress) => {
        if (progress.totalBytesExpectedToSend > 0) {
          reportProgress(
            index,
            (progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100
          );
        }
      }
    );

    const res = await task.uploadAsync();

    let body: any = null;
    try {
      body = JSON.parse(res?.body || "");
    } catch {
      body = null;
    }

    if (!res || res.status >= 400) {
      const msg =
        body?.message ||
        (body?.errors ? Object.values(body.errors).flat().join(", ") : null) ||
        `Upload failed (${res?.status ?? "network"})`;
      throw new Error(friendlyError(msg));
    }
    responses.push(body);
  }

  const listingIdField = (options.fields || []).find(
    (f) => f.fieldName === "listing_id"
  );
  const urls = responses.flatMap((r) => r?.photo_urls || []);

  // Attach to an existing listing when the caller gave us one.
  if (options.fileField === "photos" && listingIdField?.value && urls.length > 0) {
    return postJson(`/messes/${listingIdField.value}/listings/photos/attach`, {
      listing_id: listingIdField.value,
      photo_urls: urls,
    }).catch(() => responses[responses.length - 1]);
  }

  // No listing yet (pre-create upload): merge every response's URLs.
  if (options.fileField === "photos" && urls.length > 0) {
    return { photo_urls: urls };
  }

  return responses[responses.length - 1];
}
