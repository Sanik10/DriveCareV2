// src/modules/work-schedules/constants/work-schedules.constants.ts
export const WORK_SCHEDULES_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // 🔥 Working hours constraints
  MIN_SHIFT_HOURS: 2,
  MAX_SHIFT_HOURS: 12,
  MIN_BREAK_MINUTES: 15,
  MAX_BREAK_MINUTES: 120,
  
  // 🔥 Efficiency bounds
  MIN_EFFICIENCY: 0.5,
  MAX_EFFICIENCY: 2.0,
  DEFAULT_EFFICIENCY: 1.0,
  
  // 🔥 Capacity planning
  MAX_CONSECUTIVE_DAYS: 14,
  MIN_STAFF_PER_HOUR: 1,
  OPTIMAL_UTILIZATION_RATE: 0.85, // 85%
  
  // 🔥 Exception limits
  MAX_VACATION_DAYS_PER_YEAR: 28,
  MAX_SICK_DAYS_PER_MONTH: 10,
  MIN_ADVANCE_NOTICE_DAYS: 14,
  
  // 🔥 Optimization parameters
  OPTIMIZATION_TIME_WINDOW_WEEKS: 4,
  MAX_OPTIMIZATION_ITERATIONS: 100,
  
  DEFAULT_SORT_BY: 'dayOfWeek',
  DEFAULT_SORT_ORDER: 'ASC' as const,
} as const;

export const WORK_SCHEDULES_VALIDATION_MESSAGES = {
  INVALID_DAY_OF_WEEK: 'День недели должен быть от 0 до 6',
  INVALID_TIME_FORMAT: 'Неверный формат времени',
  INVALID_TIME_RANGE: 'Время окончания должно быть позже времени начала',
  INVALID_EFFICIENCY: `Коэффициент эффективности должен быть от ${WORK_SCHEDULES_CONSTANTS.MIN_EFFICIENCY} до ${WORK_SCHEDULES_CONSTANTS.MAX_EFFICIENCY}`,
  SCHEDULE_CONFLICT: 'Конфликт с существующим расписанием',
  INSUFFICIENT_BREAK_TIME: `Перерыв должен быть минимум ${WORK_SCHEDULES_CONSTANTS.MIN_BREAK_MINUTES} минут`,
  TOO_MANY_CONSECUTIVE_DAYS: `Максимальное количество рабочих дней подряд: ${WORK_SCHEDULES_CONSTANTS.MAX_CONSECUTIVE_DAYS}`,
  INVALID_EXCEPTION_DATE_RANGE: 'Дата окончания должна быть позже или равна дате начала',
  INSUFFICIENT_ADVANCE_NOTICE: `Заявка должна подаваться минимум за ${WORK_SCHEDULES_CONSTANTS.MIN_ADVANCE_NOTICE_DAYS} дней`,
} as const;

// 🔥 Day of week mapping
export const DAY_NAMES = {
  0: 'Воскресенье',
  1: 'Понедельник', 
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
} as const;

// 🔥 Shift types
export const SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon', 
  EVENING: 'evening',
  NIGHT: 'night',
  FLEXIBLE: 'flexible',
} as const;
