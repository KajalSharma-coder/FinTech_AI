export const MAX_AD_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface AdvertisementImageMetadata {
  fileName: string;
  mimeType: string;
  size: number;
  sha256: string;
  ocrAvailable: boolean;
}

export function validateAdvertisementImage(file: File): void {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size === 0) throw new Error('The selected image is empty.');
  if (file.size > MAX_AD_IMAGE_BYTES) throw new Error('Images must be 5 MB or smaller.');
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashAdvertisementImage(file: File): Promise<AdvertisementImageMetadata> {
  validateAdvertisementImage(file);
  if (!globalThis.crypto?.subtle) throw new Error('Browser SHA-256 support is unavailable.');

  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return { fileName: file.name, mimeType: file.type, size: file.size, sha256: bytesToHex(digest), ocrAvailable: false };
}

