/**
 * Durable object storage via Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 * audioUrl / videoUrl / zipUrl may hold either a local download proxy path
 * or a public https://*.blob.vercel-storage.com URL.
 */
import { put } from "@vercel/blob";
import fs from "fs";

export function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isRemoteUrl(urlOrPath: string): boolean {
  return /^https?:\/\//i.test(urlOrPath);
}

export type PutBytesResult = {
  url: string;
  pathname: string;
};

export async function putBytes(
  pathname: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<PutBytesResult> {
  if (!blobEnabled()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const body =
    typeof data === "string"
      ? data
      : Buffer.isBuffer(data)
        ? data
        : Buffer.from(data);
  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/** Upload a local file to Blob; returns the public URL. */
export async function putLocalFile(
  pathname: string,
  localPath: string,
  contentType: string,
): Promise<string> {
  const buf = fs.readFileSync(localPath);
  const blob = await putBytes(pathname, buf, contentType);
  return blob.url;
}
