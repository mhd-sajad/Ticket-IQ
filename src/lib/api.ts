/* ──────────────────────────────────────────
   TicketIQ — Unified API layer
   All network calls go through this module.
   When VITE_USE_MOCK=true, mock data is returned
   instead of calling the real backend.
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

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/* ── helpers ── */
async function delay(ms = 600): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 400));
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

/* ── public API ── */

export async function predictTicket(text: string): Promise<PredictionResponse> {
  if (USE_MOCK) {
    await delay(800);
    return getMockPrediction(text);
  }
  return request<PredictionResponse>('/api/predict', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function fetchInsights(): Promise<InsightsResponse> {
  if (USE_MOCK) {
    await delay(500);
    return getMockInsights();
  }
  return request<InsightsResponse>('/api/insights');
}

export async function fetchModels(): Promise<ModelsResponse> {
  if (USE_MOCK) {
    await delay(400);
    return getMockModels();
  }
  return request<ModelsResponse>('/api/models');
}

export async function predictWithModel(model: string, text: string): Promise<ModelPredictResponse> {
  if (USE_MOCK) {
    await delay(600);
    return getMockModelPredict(model, text);
  }
  return request<ModelPredictResponse>('/api/models/predict', {
    method: 'POST',
    body: JSON.stringify({ model, text }),
  });
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ status: string }> {
  if (USE_MOCK) {
    await delay(300);
    return { status: 'ok' };
  }
  return request<{ status: string }>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchReviewQueue(): Promise<ReviewItem[]> {
  if (USE_MOCK) {
    await delay(400);
    return getMockReviewQueue();
  }
  return request<ReviewItem[]>('/api/review');
}

export async function addToReviewQueue(ticket: {
  ticket_id: string;
  text: string;
  predicted_category: string;
  predicted_urgency: string;
  confidence: number;
}): Promise<{ status: string; id: string }> {
  if (USE_MOCK) {
    await delay(300);
    return { status: 'added', id: `RV-${ticket.ticket_id.slice(-4)}` };
  }
  return request<{ status: string; id: string }>('/api/review/add', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
}

export async function triggerRetrain(): Promise<RetrainResult> {
  if (USE_MOCK) {
    await delay(3000); // simulate longer retraining
    return getMockRetrainResult();
  }
  return request<RetrainResult>('/api/retrain', { method: 'POST' });
}

export async function healthCheck(): Promise<HealthResponse> {
  if (USE_MOCK) {
    return { status: 'healthy', version: '1.0.0-mock' };
  }
  return request<HealthResponse>('/api/health');
}
