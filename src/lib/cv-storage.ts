import { del, get, put } from "@vercel/blob";
import { Buffer } from "node:buffer";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CV_DIRECTORY = path.join(process.cwd(), "storage", "cvs");
const CV_STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|docx)$/i;

function shouldUseBlobStorage() {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.BLOB_READ_WRITE_TOKEN) ||
    Boolean(process.env.BLOB_STORE_ID)
  );
}

function assertValidStorageKey(storageKey: string) {
  if (!CV_STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("Invalid stored CV key.");
  }
}

function blobPathname(storageKey: string) {
  return `cvs/${storageKey}`;
}

export async function saveCv(storageKey: string, bytes: Uint8Array, contentType: string) {
  assertValidStorageKey(storageKey);
  if (shouldUseBlobStorage()) {
    await put(blobPathname(storageKey), Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      contentType,
    });
    return;
  }

  await mkdir(CV_DIRECTORY, { recursive: true });
  await writeFile(path.join(CV_DIRECTORY, storageKey), bytes, { flag: "wx" });
}

export async function removeCv(storageKey: string | null) {
  if (!storageKey) return;
  assertValidStorageKey(storageKey);

  if (shouldUseBlobStorage()) {
    await del(blobPathname(storageKey));
    return;
  }

  try {
    await unlink(path.join(CV_DIRECTORY, storageKey));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function readCv(storageKey: string) {
  assertValidStorageKey(storageKey);

  if (shouldUseBlobStorage()) {
    const result = await get(blobPathname(storageKey), { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return {
      body: result.stream,
      contentLength: result.blob.size,
      contentType: result.blob.contentType,
    };
  }

  try {
    const file = await readFile(path.join(CV_DIRECTORY, storageKey));
    return {
      body: new Uint8Array(file),
      contentLength: file.byteLength,
      contentType: storageKey.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
