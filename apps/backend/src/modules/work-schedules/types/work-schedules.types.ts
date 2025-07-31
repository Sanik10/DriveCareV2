// src/modules/work-schedules/types/work-schedules.types.ts
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { ExceptionType, ExceptionStatus } from '../../../database/entities/schedule-exception.entity';

export interface WorkSchedulesFilter {
  companyId?: string;
  userId?: string;
  dayOfWeek?: number;
  isActive?: boolean;
  shiftType?: string;
  efficiencyMin?: number;
  efficiencyMax?: number;
  hasSkills?: string[]; // Filter by required skills
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  sortBy?: 'dayOfWeek' | 'startTime' | 'endTime' | 'efficiency' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  offset?: number;
}

export interface ScheduleExceptionsFilter {
  companyId?: string;
  userId?: string;
  type?: ExceptionType;
  status?: ExceptionStatus;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  isFullDay?: boolean;
  sortBy?: 'startDate' | 'type' | 'status' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  offset?: number;
}

// 🔥 Advanced Types
export interface MechanicCapacity {
  userId: string;
  userName: string;
  specialization: string;
  date: Date;
  workingHours: {
    start: string;
    end: string;
    breakStart?: string;
    breakEnd?: string;
    totalHours: number;
    effectiveHours: number;
  };
  skillMatrix: string[]; // Service IDs the mechanic can handle
  efficiency: number;
  currentLoad: {
    scheduledAppointments: number;
    estimatedWorkload: number; // In hours
    availableHours: number;
    utilizationRate: number; // 0-1
  };
  preferences: {
    shiftType: string;
    maxConsecutiveDays: number;
    preferredDaysOff: number[];
  };
}

export interface OptimizationRequest {
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  objectives: {
    maximizeUtilization: boolean;
    minimizeOvertime: boolean;
    balanceWorkload: boolean;
    respectPreferences: boolean;
  };
  constraints: {
    minStaffPerHour: number;
    maxConsecutiveHours: number;
    requiredSkillMatrix: string[];
    mandatoryBreaks: boolean;
  };
  userIds?: string[]; // Specific users to optimize for
}

export interface OptimizationResult {
  success: boolean;
  improvements: {
    utilizationIncrease: number; // Percentage
    overtimeReduction: number;   // Hours
    workloadBalance: number;     // Standard deviation reduction
  };
  recommendations: ScheduleRecommendation[];
  conflicts: ScheduleConflict[];
  executionTime: number; // Milliseconds
}

export interface ScheduleRecommendation {
  type: 'shift_change' | 'additional_staff' | 'skill_training' | 'break_adjustment';
  userId?: string;
  description: string;
  impact: {
    utilizationChange: number;
    workloadChange: number;
    customerSatisfactionChange: number;
  };
  priority: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
}

export interface ScheduleConflict {
  type: 'time_overlap' | 'skill_shortage' | 'excessive_workload' | 'break_violation';
  userId?: string;
  date: Date;
  timeRange?: { start: string; end: string };
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedResolution: string[];
}

export interface CoverageAnalysis {
  date: Date;
  timeSlots: CoverageTimeSlot[];
  skillCoverage: SkillCoverage[];
  risks: CoverageRisk[];
  recommendations: string[];
}

export interface CoverageTimeSlot {
  startTime: string;
  endTime: string;
  requiredStaff: number;
  availableStaff: number;
  skillsRequired: string[];
  skillsAvailable: string[];
  utilizationRate: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SkillCoverage {
  skillId: string;
  skillName: string;
  totalRequired: number;
  totalAvailable: number;
  coverageRate: number; // 0-1
  criticalTimeSlots: string[];
}

export interface CoverageRisk {
  type: 'understaffed' | 'skill_shortage' | 'single_point_failure' | 'overtime_risk';
  timeRange: { start: string; end: string };
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  mitigation: string[];
}

export interface WorkScheduleStats {
  total: number;
  active: number;
  inactive: number;
  byShiftType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  averageEfficiency: number;
  utilizationRate: number;
  mostProductiveDay: number;
  leastProductiveDay: number;
}

export interface ExceptionStats {
  total: number;
  byType: {
    type: ExceptionType;
    count: number;
    percentage: number;
  }[];
  byStatus: {
    status: ExceptionStatus;
    count: number;
    percentage: number;
  }[];
  averageProcessingTime: number; // Hours
  approvalRate: number; // Percentage
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  total: number;
  successRate: number;
  errors: string[];
  message: string;
}

export type UserWithCompany = RequestWithUser['user'];
