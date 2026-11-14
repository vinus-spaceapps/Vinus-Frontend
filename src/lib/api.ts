import type {
  AnalysisResponse,
  AnalyzeQuery,
  Category,
  Family,
  ChatMsg,
  Health,
  InsightResponse,
  Region,
  Variable,
  VariableChatResponse,
} from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Can’t reach the server. Please check that the backend (Vinus-Backend) is running.");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* no body */
    }
    throw new ApiError(detail);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => request<Health>("/api/health"),
  variables: () => request<{ categories: Category[]; families: Family[]; variables: Variable[] }>("/api/variables"),
  regions: () => request<Region[]>("/api/regions"),
  analyze: (q: AnalyzeQuery) => post<AnalysisResponse>("/api/analyze", q),
  variableChat: (messages: ChatMsg[], basket: string[]) => post<VariableChatResponse>("/api/ai/variables", { messages, basket }),
  insight: (query: AnalyzeQuery, variable_id: string, decision: string | null, question?: string) =>
    post<InsightResponse>("/api/ai/insight", { query, variable_id, context: { decision }, question: question || null }),
};
