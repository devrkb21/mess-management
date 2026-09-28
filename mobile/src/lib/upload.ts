/**
 * Multipart file upload helper.
 *
 * React Native's bundled FormData rejects the classic { uri, name, type }
 * file descriptor on newer runtimes ("Unsupported FormDataPart
 * implementation"), so on native we build the multipart body ourselves from
 * real file bytes read with expo-file-system and send it with expo/fetch.
 * On web, the standard browser FormData handles File/Blob objects natively.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { DEFAULT_API_URL, STORAGE_KEYS } from "../constants/config";

const BOUNDARY = "messbari-form-boundary-7f3a9c";

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

function toUint8Array(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>;
}

function concatBytes(chunks: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * POST a multipart/form-data request. `fileField` entries are read from disk
 * on native (real bytes, no FormData) and appended as-is on web.
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
    const baseUrl = DEFAULT_API_URL;
    const form = new FormData();
    (options.fields || []).forEach((f) => form.append(f.fieldName, f.value));
    options.files.forEach((file, idx) => {
      const name = guessFileName(file, fallbackExt);
      form.append(
        options.fileField + (options.files.length > 1 ? "[]" : ""),
        { uri: file.uri, name } as unknown as Blob,
        name
      );
      void idx;
    });
    const res = await fetch(`${baseUrl}${endpoint}`, {
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

  // Native: build the multipart body from real file bytes.
  const chunks: Uint8Array[] = [];

  for (const field of options.fields || []) {
    chunks.push(
      toUint8Array(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${field.fieldName}"\r\n\r\n${field.value}\r\n`
      )
    );
  }

  for (const file of options.files) {
    const name = guessFileName(file, fallbackExt);
    const mimeType = file.mimeType || "application/octet-stream";
    const fileBytes = await new File(file.uri).bytes();

    chunks.push(
      toUint8Array(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${options.fileField}${
          options.files.length > 1 ? "[]" : ""
        }"; filename="${name}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    chunks.push(fileBytes);
    chunks.push(toUint8Array("\r\n"));
  }

  chunks.push(toUint8Array(`--${BOUNDARY}--\r\n`));

  const body = concatBytes(chunks);

  const res = await expoFetch(`${DEFAULT_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": `multipart/form-data; boundary=${BOUNDARY}`,
      "Content-Length": String(body.byteLength),
    },
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(", ") : null) ||
      `Upload failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
