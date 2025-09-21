// path: apps/frontend/lib/types/work-schedules.ts

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible' | 'unknown';

export interface WorkSchedule {
  id: string;
  companyId: string;
  userId: string;

  dayOfWeek: number; // 0..6 (0 = Sunday)
  dayName: string;

  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  isDayOff: boolean;

  breakStartTime?: string | null;
  breakEndTime?: string | null;

  efficiency: number; // 0.5 .. 2.0
  skillMatrix?: string[];

  shiftType: ShiftType;
  maxConsecutiveDays: number;
  preferredDaysOff?: number[];

  isActive: boolean;

  workingHours?: {
    totalHours: number;
    effectiveHours: number;
    breakHours: number;
  };

  currentLoad?: {
    scheduledAppointments: number;
    estimatedWorkload: number;
    availableHours: number;
    utilizationRate: number;
  };

  createdAt: string; // ISO
  updatedAt: string; // ISO

  user?: {
    firstName: string;
    lastName: string;
    specialization?: string;
    avatarUrl?: string;
  };
}

export interface PaginatedSchedulesResponse {
  items: WorkSchedule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface WorkSchedulesQuery {
  userId?: string;
  dayOfWeek?: number; // 0..6
  isActive?: boolean;
  page?: number;
  limit?: number;
  companyId?: string; // only for superadmin
  shiftType?: ShiftType;
  efficiencyMin?: number;
  efficiencyMax?: number;
  hasSkills?: string[];
  dateRange?: { startDate: string; endDate: string }; // controller may not support yet; keep for future
  sortBy?: 'dayOfWeek' | 'startTime' | 'endTime' | 'efficiency' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}
