// path: apps/frontend/lib/api/appointments.ts
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';
import type {
  Appointment,
  AppointmentsQuery,
  AvailabilitySlot,
  CreateAppointmentRequest,
  PaginatedAppointmentsResponse,
  SmartScheduleRequest,
  SmartScheduleResponse,
  AppointmentTracking,
} from '@/lib/types/appointments';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class AppointmentsAPI {
  async list(query: AppointmentsQuery = {}): Promise<PaginatedAppointmentsResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return apiRequest<PaginatedAppointmentsResponse>(`/appointments${qs}`, { method: 'GET' });
  }

  async get(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/appointments/${id}`, { method: 'GET' });
  }

  async create(payload: CreateAppointmentRequest): Promise<Appointment> {
    return apiRequest<Appointment>('/appointments', {
      method: 'POST',
      json: payload,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  // Actions
  async confirm(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/appointments/${id}/confirm`, {
      method: 'POST',
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async cancel(id: string, reason?: string): Promise<Appointment> {
    const qs = buildQuery({ reason });
    return apiRequest<Appointment>(`/appointments/${id}/cancel${qs}`, {
      method: 'POST',
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async reschedule(id: string, startTime: string, endTime: string): Promise<Appointment> {
    const qs = buildQuery({ startTime, endTime });
    return apiRequest<Appointment>(`/appointments/${id}/reschedule${qs}`, {
      method: 'POST',
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async complete(
    id: string,
    completionData?: { finalCost?: number; mechanicNotes?: string; [k: string]: unknown },
  ): Promise<Appointment> {
    return apiRequest<Appointment>(`/appointments/${id}/complete`, {
      method: 'POST',
      json: completionData,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async addRating(id: string, rating: number, feedback?: string): Promise<Appointment> {
    const qs = buildQuery({ rating, feedback });
    return apiRequest<Appointment>(`/appointments/${id}/rating${qs}`, {
      method: 'POST',
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  // Tracking & availability
  async tracking(id: string): Promise<AppointmentTracking> {
    return apiRequest<AppointmentTracking>(`/appointments/${id}/tracking`, { method: 'GET' });
  }

  async checkAvailability(payload: {
    serviceIds: string[];
    date: string; // YYYY-MM-DD or ISO
    timeRange?: { start: string; end: string };
  }): Promise<AvailabilitySlot[]> {
    return apiRequest<AvailabilitySlot[]>('/appointments/check-availability', {
      method: 'POST',
      json: payload,
    });
  }

  async smartSchedule(payload: SmartScheduleRequest): Promise<SmartScheduleResponse> {
    return apiRequest<SmartScheduleResponse>('/appointments/smart-schedule', {
      method: 'POST',
      json: payload,
    });
  }

  // Scoped listings
  async findByCustomer(customerId: string): Promise<Appointment[]> {
    return apiRequest<Appointment[]>(`/appointments/customer/${customerId}`, { method: 'GET' });
  }

  async findByMechanic(mechanicId: string, dateFrom: string, dateTo: string): Promise<Appointment[]> {
    const qs = buildQuery({ dateFrom, dateTo });
    return apiRequest<Appointment[]>(`/appointments/mechanic/${mechanicId}${qs}`, { method: 'GET' });
  }
}

export const appointmentsAPI = new AppointmentsAPI();
