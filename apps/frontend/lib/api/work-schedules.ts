// path: apps/frontend/lib/api/work-schedules.ts
import { apiRequest } from '@/lib/api/core';
import type { PaginatedSchedulesResponse, WorkSchedulesQuery } from '@/lib/types/work-schedules';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class WorkSchedulesAPI {
  async getSchedules(query: WorkSchedulesQuery = {}): Promise<PaginatedSchedulesResponse> {
    // Controller supports userId, dayOfWeek, isActive, page, limit, companyId (+ other optional fields in data service)
    const qs = buildQuery(query as Record<string, unknown>);
    return apiRequest<PaginatedSchedulesResponse>(`/work-schedules${qs}`, { method: 'GET' });
  }
}

export const workSchedulesAPI = new WorkSchedulesAPI();
