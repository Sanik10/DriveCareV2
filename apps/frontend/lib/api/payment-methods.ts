// path: apps/frontend/lib/api/payment-methods.ts
import { buildApiUrl } from "@/lib/api/core";
import type {
  PaymentMethodsQuery,
  PaginatedPaymentMethodsResponse,
  PaginatedPaymentMethodsUI,
  PaymentMethodResponse,
  PaymentMethodCreateRequest,
  PaymentMethodUpdateRequest,
} from "@/lib/types/payment-methods";

function toQueryString(params: Record<string, any>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  return qs.toString();
}

function authHeaders(base?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(base as Record<string, string>),
  };
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore
  }
  return headers;
}

export const paymentMethodsAPI = {
  async getPaymentMethods(query: PaymentMethodsQuery): Promise<PaginatedPaymentMethodsUI> {
    const qs = toQueryString(query);
    const url = buildApiUrl(`/payment-methods${qs ? `?${qs}` : ""}`);

    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: authHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        JSON.stringify({
          message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
        }),
      );
    }

    const json = await res.json();

    // Ожидаемый DTO: { data, pagination }
    if (json && Array.isArray(json.data) && json.pagination) {
      const p = json.pagination as PaginatedPaymentMethodsResponse["pagination"];
      return {
        items: json.data as PaymentMethodResponse[],
        total: p.total,
        page: p.page,
        limit: p.limit,
        totalPages: p.totalPages,
      };
    }

    // Fallback: { items, meta } или другие формы
    const items = Array.isArray(json?.items) ? (json.items as PaymentMethodResponse[]) : [];
    const total =
      typeof json?.total === "number"
        ? json.total
        : typeof json?.meta?.total === "number"
        ? json.meta.total
        : items.length;
    const page =
      typeof json?.page === "number"
        ? json.page
        : typeof json?.meta?.page === "number"
        ? json.meta.page
        : Number(query.page || 1);
    const limit =
      typeof json?.limit === "number"
        ? json.limit
        : typeof json?.meta?.limit === "number"
        ? json.meta.limit
        : Number(query.limit || 10);
    const totalPages =
      typeof json?.totalPages === "number"
        ? json.totalPages
        : typeof json?.meta?.totalPages === "number"
        ? json.meta.totalPages
        : Math.max(1, Math.ceil(total / (limit || 1)));

    return { items, total, page, limit, totalPages };
  },

  async getPaymentMethod(id: string): Promise<PaymentMethodResponse> {
    const url = buildApiUrl(`/payment-methods/${id}`);
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}` }));
    }
    return res.json();
  },

  async create(payload: PaymentMethodCreateRequest): Promise<PaymentMethodResponse> {
    const url = buildApiUrl(`/payment-methods`);
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}` }));
    }
    return res.json();
  },

  async update(id: string, payload: PaymentMethodUpdateRequest): Promise<PaymentMethodResponse> {
    const url = buildApiUrl(`/payment-methods/${id}`);
    const res = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}` }));
    }
    return res.json();
  },

  async remove(id: string): Promise<void> {
    const url = buildApiUrl(`/payment-methods/${id}`);
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => "");
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}` }));
    }
  },

  async toggleStatus(id: string): Promise<PaymentMethodResponse> {
    const url = buildApiUrl(`/payment-methods/${id}/toggle-status`);
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}` }));
    }
    return res.json();
  },
};
