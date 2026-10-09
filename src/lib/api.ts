/* ──────────────────────────────────────────
   TicketIQ — Resilient Unified API Layer
   Calls real backend at VITE_API_BASE_URL.
   Gracefully falls back to mock data when backend
   is offline or unreachable (e.g. Failed to fetch).
   ────────────────────────────────────────── */
import type {
  PredictionResponse,
  InsightsResponse,
  ModelsResponse,
  ModelPredictResponse,
  FeedbackPayload,
  ReviewItem,
  RetrainResult,
  HealthResponse,
} from '../types';

import { getMockPrediction } from '../mocks/predict';
import { getMockInsights } from '../mocks/insights';
import { getMockModels, getMockModelPredict } from '../mocks/models';
import { getMockReviewQueue, getMockRetrainResult } from '../mocks/review';
import { startFirstCallTracking } from './serverStatus';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export type ApiMode = 'live' | 'mock-fallback' | 'mock';
type ApiModeListener = (mode: ApiMode) => void;
const apiModeListeners = new Set<ApiModeListener>();
let currentApiMode: ApiMode = USE_MOCK ? 'mock' : 'live';

export function getApiMode(): ApiMode {
  return currentApiMode;
}

export function subscribeApiMode(cb: ApiModeListener): () => void {
  apiModeListeners.add(cb);
  cb(currentApiMode);
  return () => {
    apiModeListeners.delete(cb);
  };
}

function setApiMode(mode: ApiMode) {
  if (currentApiMode !== mode) {
    currentApiMode = mode;
    apiModeListeners.forEach(cb => cb(currentApiMode));
  }
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('load failed') ||
      msg.includes('connection refused')
    );
  }
  return false;
}

/* ── helpers ── */
async function delay(ms = 350): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const finishTracking = !USE_MOCK ? startFirstCallTracking(BASE_URL) : () => {};
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${body || res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    finishTracking();
  }
}

/* ── public API with auto-fallback ── */

export async function predictTicket(text: string): Promise<PredictionResponse> {
  if (USE_MOCK) {
    await delay(500);
    return getMockPrediction(text);
  }
  try {
    const res = await request<PredictionResponse>('/api/predict', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable at ${BASE_URL || window.location.origin}. Using local mock prediction.`);
      await delay(400);
      return getMockPrediction(text);
    }
    throw err;
  }
}

export async function fetchInsights(): Promise<InsightsResponse> {
  if (USE_MOCK) {
    await delay(300);
    return getMockInsights();
  }
  try {
    const res = await request<InsightsResponse>('/api/insights');
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable at ${BASE_URL || window.location.origin}. Using mock insights.`);
      await delay(200);
      return getMockInsights();
    }
    throw err;
  }
}

export async function fetchModels(): Promise<ModelsResponse> {
  if (USE_MOCK) {
    await delay(300);
    return getMockModels();
  }
  try {
    const res = await request<ModelsResponse>('/api/models');
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable at ${BASE_URL || window.location.origin}. Using mock model lab.`);
      await delay(200);
      return getMockModels();
    }
    throw err;
  }
}

export async function predictWithModel(model: string, text: string): Promise<ModelPredictResponse> {
  if (USE_MOCK) {
    await delay(400);
    return getMockModelPredict(model, text);
  }
  try {
    const res = await request<ModelPredictResponse>('/api/models/predict', {
      method: 'POST',
      body: JSON.stringify({ model, text }),
    });
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable. Using mock model prediction.`);
      await delay(300);
      return getMockModelPredict(model, text);
    }
    throw err;
  }
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ status: string }> {
  if (USE_MOCK) {
    await delay(200);
    return { status: 'ok' };
  }
  try {
    const res = await request<{ status: string }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable. Simulated feedback received.`);
      await delay(200);
      return { status: 'ok' };
    }
    throw err;
  }
}

export async function fetchReviewQueue(): Promise<ReviewItem[]> {
  if (USE_MOCK) {
    await delay(300);
    return getMockReviewQueue();
  }
  try {
    const res = await request<ReviewItem[]>('/api/review');
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable. Using mock review queue.`);
      await delay(200);
      return getMockReviewQueue();
    }
    throw err;
  }
}

export async function addToReviewQueue(ticket: {
  ticket_id: string;
  text: string;
  predicted_category: string;
  predicted_urgency: string;
  confidence: number;
}): Promise<{ status: string; id: string }> {
  if (USE_MOCK) {
    await delay(200);
    return { status: 'added', id: `RV-${ticket.ticket_id.slice(-4)}` };
  }
  try {
    const res = await request<{ status: string; id: string }>('/api/review/add', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable. Simulated review item added.`);
      await delay(200);
      return { status: 'added', id: `RV-${ticket.ticket_id.slice(-4)}` };
    }
    throw err;
  }
}

export async function triggerRetrain(): Promise<RetrainResult> {
  if (USE_MOCK) {
    await delay(2500);
    return getMockRetrainResult();
  }
  try {
    const res = await request<RetrainResult>('/api/retrain', { method: 'POST' });
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      console.warn(`[TicketIQ API] Backend unreachable. Simulating retrain result.`);
      await delay(2000);
      return getMockRetrainResult();
    }
    throw err;
  }
}

export async function healthCheck(): Promise<HealthResponse> {
  if (USE_MOCK) {
    return { status: 'healthy', version: '1.0.0-mock' };
  }
  try {
    const res = await request<HealthResponse>('/api/health');
    setApiMode('live');
    return res;
  } catch (err) {
    if (isNetworkError(err)) {
      setApiMode('mock-fallback');
      return { status: 'offline-fallback', version: '1.0.0-mock-fallback' };
    }
    throw err;
  }
}
