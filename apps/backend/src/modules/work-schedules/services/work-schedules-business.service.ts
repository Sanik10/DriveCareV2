// apps/backend/src/modules/work-schedules/services/work-schedules-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { WorkSchedulesDataService } from './work-schedules-data.service';
import { WorkSchedule } from '../../../database/entities';

@Injectable()
export class WorkSchedulesBusinessService {
  private readonly logger = new Logger(WorkSchedulesBusinessService.name);

  constructor(private readonly dataService: WorkSchedulesDataService) {}

  /**
   * Базовая "оптимизация" расписаний:
   * - анализ распределения эффективности по дням/мастерам,
   * - рекомендации по балансировке (выравнивание efficiency),
   * - выявление смен без перерыва > 6 часов.
   */
  async optimizeSchedules(
    request: { targetDayOfWeek?: number } | undefined,
    companyId: string,
  ): Promise<{
    success: boolean;
    improvements: { utilizationIncrease: number; overtimeReduction: number; workloadBalance: number };
    recommendations: string[];
    conflicts: Array<{ userId: string; issue: string; dayOfWeek: number }>;
    executionTime: number;
  }> {
    const started = Date.now();
    const schedules = await this.dataService.findActiveByCompany(companyId);

    const dayFilter = typeof request?.targetDayOfWeek === 'number' ? request!.targetDayOfWeek : undefined;
    const filtered = typeof dayFilter === 'number' ? schedules.filter((s) => s.dayOfWeek === dayFilter) : schedules;

    if (filtered.length === 0) {
      return {
        success: true,
        improvements: { utilizationIncrease: 0, overtimeReduction: 0, workloadBalance: 0 },
        recommendations: ['Нет активных расписаний для оптимизации'],
        conflicts: [],
        executionTime: Date.now() - started,
      };
    }

    // Вычисляем суммарные часы и среднюю эффективность
    let totalEffHours = 0;
    let totalHours = 0;
    const conflicts: Array<{ userId: string; issue: string; dayOfWeek: number }> = [];
    const recommendations: string[] = [];

    const perUser: Record<string, { hours: number; eff: number[] }> = {};

    for (const s of filtered) {
      // избегаем затенения переменной totalHours
      const { totalHours: localTotalHours, effectiveHours, breakHours } = this.calculateWorkingHours(s);
      const eff = this.toNumericEfficiency(s.efficiency);
      totalEffHours += effectiveHours * eff;
      totalHours += effectiveHours;

      // Перерывы: если рабочее время > 6 часов и (нет перерыва или он < 30 минут) — рекомендация
      if (effectiveHours > 6) {
        const hasLongEnoughBreak = breakHours >= 0.5;
        if (!hasLongEnoughBreak) {
          conflicts.push({
            userId: s.userId,
            issue: 'Недостаточный перерыв при длительной смене (> 6ч)',
            dayOfWeek: s.dayOfWeek,
          });
        }
      }

      perUser[s.userId] ??= { hours: 0, eff: [] };
      perUser[s.userId].hours += effectiveHours;
      perUser[s.userId].eff.push(eff);
    }

    // Балансировка нагрузки: стандартное отклонение эффективности
    const effAll = Object.values(perUser)
      .map((u) => u.eff)
      .flat();
    const avgEff = effAll.reduce<number>((a, b) => a + b, 0) / Math.max(1, effAll.length);
    const variance = effAll.reduce<number>((a, b) => a + Math.pow(b - avgEff, 2), 0) / Math.max(1, effAll.length);
    const stdev = Math.sqrt(variance);

    if (stdev > 0.2) {
      recommendations.push('Сбалансировать коэффициент эффективности между сотрудниками (разброс > 0.2).');
    }

    const utilization = totalHours > 0 ? totalEffHours / totalHours : 0;
    const improvements = {
      utilizationIncrease: Math.round(Math.max(0, (1 - utilization) * 10)) / 10, // грубая оценка
      overtimeReduction: conflicts.length > 0 ? 0.1 : 0, // условно
      workloadBalance: Math.round((1 - Math.min(1, stdev)) * 100) / 100,
    };

    return {
      success: true,
      improvements,
      recommendations,
      conflicts,
      executionTime: Date.now() - started,
    };
  }

  /**
   * Анализ покрытия на конкретную дату:
   * - суммарные доступные человеко‑часы,
   * - средняя эффективность,
   * - влияние исключений в этот день.
   */
  async analyzeCapacity(date: Date, companyId: string): Promise<{
    date: Date;
    overallUtilization: number;
    totalEffectiveHours: number;
    mechanics: Array<{ userId: string; effectiveHours: number; efficiency: number }>;
    recommendations: string[];
    warnings: string[];
  }> {
    const dayOfWeek = date.getDay(); // 0-6
    const schedules = await this.dataService.findActiveByCompanyAndDayOfWeek(companyId, dayOfWeek);

    if (schedules.length === 0) {
      return {
        date,
        overallUtilization: 0,
        totalEffectiveHours: 0,
        mechanics: [],
        recommendations: ['Нет активных расписаний на выбранную дату'],
        warnings: [],
      };
    }

    const userIds = Array.from(new Set(schedules.map((s) => s.userId)));
    const exceptions = await this.dataService.findExceptionsForDate(companyId, date, userIds);

    const mechanics: Array<{ userId: string; effectiveHours: number; efficiency: number }> = [];
    let totalEffectiveHours = 0;
    let weightedEff = 0;

    for (const s of schedules) {
      const { effectiveHours } = this.calculateWorkingHours(s);
      const eff = this.toNumericEfficiency(s.efficiency);

      const userExceptions = exceptions.filter((e) => e.userId === s.userId);
      // Если есть полно‑дневные исключения — нулевая доступность
      const hasFullDay = userExceptions.some((e) => e.isFullDay);
      const adjustedHours = hasFullDay ? 0 : effectiveHours; // точная корректировка частичных исключений опущена для MVP

      mechanics.push({ userId: s.userId, effectiveHours: adjustedHours, efficiency: eff });
      totalEffectiveHours += adjustedHours;
      weightedEff += adjustedHours * eff;
    }

    const overallUtilization = totalEffectiveHours > 0 ? weightedEff / totalEffectiveHours : 0;

    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (overallUtilization < 0.7) {
      recommendations.push('Рассмотреть возможность перераспределения смен для повышения загрузки.');
    }
    if (mechanics.some((m) => m.effectiveHours > 8)) {
      warnings.push('Обнаружены смены свыше 8 часов — проверьте соблюдение норм труда и перерывов.');
    }

    return { date, overallUtilization, totalEffectiveHours, mechanics, recommendations, warnings };
  }

  /**
   * Базовая статистика по расписаниям компании.
   */
  async getScheduleStats(
    companyId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<{
    total: number;
    active: number;
    inactive: number;
    byShiftType: Array<{ shiftType: string; count: number }>;
    averageEfficiency: number;
    utilizationEstimate: number;
  }> {
    const all = await this.dataService.findActiveByCompany(companyId);
    const total = all.length;
    const active = all.filter((s) => s.isActive).length;
    const inactive = total - active;

    // По типам смен
    const map: Record<string, number> = {};
    for (const s of all) {
      const t = s.shiftType || 'unknown';
      map[t] = (map[t] || 0) + 1;
    }
    const byShiftType = Object.entries(map).map(([shiftType, count]) => ({ shiftType, count }));

    const efficiencies = all.map((s) => this.toNumericEfficiency(s.efficiency));
    const averageEfficiency =
      efficiencies.length > 0 ? Math.round((efficiencies.reduce<number>((a, b) => a + b, 0) / efficiencies.length) * 100) / 100 : 0;

    // Оценка «утилизации» (грубая): средняя эффективность × средние часы
    const hours = all.map((s) => this.calculateWorkingHours(s).effectiveHours);
    const avgHours = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
    const utilizationEstimate = Math.round(averageEfficiency * (avgHours / 8) * 100) / 100;

    return { total, active, inactive, byShiftType, averageEfficiency, utilizationEstimate };
  }

  // Helpers

  private calculateWorkingHours(schedule: WorkSchedule): {
    totalHours: number;
    effectiveHours: number;
    breakHours: number;
  } {
    if (schedule.isDayOff) {
      return { totalHours: 0, effectiveHours: 0, breakHours: 0 };
    }

    const startMinutes = this.timeToMinutes(schedule.startTime!);
    const endMinutes = this.timeToMinutes(schedule.endTime!);
    const totalMinutes = Math.max(0, endMinutes - startMinutes);
    const totalHours = totalMinutes / 60;

    let breakHours = 0;
    if (schedule.breakStartTime && schedule.breakEndTime) {
      const bStart = this.timeToMinutes(schedule.breakStartTime);
      const bEnd = this.timeToMinutes(schedule.breakEndTime);
      breakHours = Math.max(0, (bEnd - bStart) / 60);
    }

    const effectiveHours = Math.max(0, totalHours - breakHours);
    return { totalHours, effectiveHours, breakHours };
  }

  private timeToMinutes(time: string): number {
    const [hh, mm] = time.split(':').map(Number);
    return (hh || 0) * 60 + (mm || 0);
  }

  /**
   * Приведение efficiency из entity (decimal как string) к числу с безопасным дефолтом.
   */
  private toNumericEfficiency(eff: string | number | null | undefined): number {
    if (typeof eff === 'number') return eff;
    const n = Number(eff);
    return Number.isFinite(n) && !Number.isNaN(n) ? n : 1;
  }
}
