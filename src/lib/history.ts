import type { AiRecommendation } from "./places.functions";

export type SearchHistoryEntry = {
  id: string;
  query: string;
  timestamp: number;
  vendorCount: number;
  recommendedVendor: string | null;
};

const KEY = "procureai.history.v1";
const MAX = 25;

export function loadHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry: {
  query: string;
  vendorCount: number;
  recommendation: AiRecommendation | null;
}): SearchHistoryEntry {
  const item: SearchHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query: entry.query,
    timestamp: Date.now(),
    vendorCount: entry.vendorCount,
    recommendedVendor: entry.recommendation?.vendorName ?? null,
  };
  const existing = loadHistory();
  const next = [item, ...existing].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  return item;
}

export function clearHistory() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
