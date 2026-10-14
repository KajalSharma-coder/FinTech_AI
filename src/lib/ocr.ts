import { createWorker, OEM, type Worker } from 'tesseract.js';
import { validateAdvertisementImage } from './imageHash.ts';
import { normalizeOcrText } from './textVerification.ts';

export interface OcrProgress { status: string; progress: number; }
export interface OcrResult { text: string; confidence: number; extractedAt: string; }

let workerPromise: Promise<Worker> | null = null;

export function isSupportedOcrImage(file: File): boolean {
  try { validateAdvertisementImage(file); return true; } catch { return false; }
}

async function getWorker(onProgress?: (progress: OcrProgress) => void): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', OEM.LSTM_ONLY, {
      logger: message => onProgress?.({ status: message.status, progress: Math.round(message.progress * 100) }),
    });
  }
  const worker = await workerPromise;
  return worker;
}

export async function recognizeAdvertisementImage(file: File, onProgress?: (progress: OcrProgress) => void, signal?: AbortSignal): Promise<OcrResult> {
  validateAdvertisementImage(file);
  if (signal?.aborted) throw new DOMException('OCR cancelled.', 'AbortError');
  const worker = await getWorker(onProgress);
  if (signal?.aborted) throw new DOMException('OCR cancelled.', 'AbortError');
  const result = await worker.recognize(file);
  if (signal?.aborted) throw new DOMException('OCR cancelled.', 'AbortError');
  const text = normalizeOcrText(result.data.text);
  if (!text) throw new Error('No readable text was found in this image.');
  return { text, confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : 0, extractedAt: new Date().toISOString() };
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  await worker?.terminate();
}
