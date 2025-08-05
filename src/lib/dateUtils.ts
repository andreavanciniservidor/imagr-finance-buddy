/**
 * Core date utility functions for credit card billing period calculations
 * These utilities handle edge cases like year transitions, leap years, and invalid dates
 * Enhanced with comprehensive validation and fallback mechanisms
 */

/**
 * Gets the last day of a given month, handling leap years correctly
 */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Adjusts a day to be valid for the given month/year
 * If the day doesn't exist in the month (e.g., day 31 in February), returns the last day of the month
 */
export function adjustDayForMonth(day: number, year: number, month: number): number {
  const lastDay = getLastDayOfMonth(year, month);
  return Math.min(day, lastDay);
}

/**
 * Creates a date with day adjustment for the given month
 * Handles cases where the specified day doesn't exist in the target month
 */
export function createDateWithDayAdjustment(year: number, month: number, day: number): Date {
  const adjustedDay = adjustDayForMonth(day, year, month);
  return new Date(year, month - 1, adjustedDay); // month is 0-indexed in Date constructor
}

/**
 * Gets the next occurrence of a specific day in the month
 * If the day has already passed this month, returns the next month's occurrence
 */
export function getNextOccurrenceOfDay(referenceDate: Date, targetDay: number): Date {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1; // Convert to 1-indexed
  const currentDay = referenceDate.getDate();
  
  // Try current month first
  const adjustedDay = adjustDayForMonth(targetDay, year, month);
  
  if (currentDay < adjustedDay) {
    // Target day hasn't occurred this month yet
    return createDateWithDayAdjustment(year, month, targetDay);
  } else {
    // Target day has passed, get next month's occurrence
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return createDateWithDayAdjustment(nextYear, nextMonth, targetDay);
  }
}

/**
 * Gets the previous occurrence of a specific day in the month
 * If the day hasn't occurred this month yet, returns the previous month's occurrence
 */
export function getPreviousOccurrenceOfDay(referenceDate: Date, targetDay: number): Date {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1; // Convert to 1-indexed
  const currentDay = referenceDate.getDate();
  
  // Try current month first
  const adjustedDay = adjustDayForMonth(targetDay, year, month);
  
  if (currentDay >= adjustedDay) {
    // Target day has already occurred this month
    return createDateWithDayAdjustment(year, month, targetDay);
  } else {
    // Target day hasn't occurred this month yet, get previous month's occurrence
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return createDateWithDayAdjustment(prevYear, prevMonth, targetDay);
  }
}

/**
 * Adds months to a date, handling day adjustments correctly
 * If the target day doesn't exist in the target month, uses the last day of that month
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // Keep 0-indexed
  const day = date.getDate();
  
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  
  // Handle negative months
  if (normalizedMonth < 0) {
    return createDateWithDayAdjustment(targetYear - 1, normalizedMonth + 12 + 1, day);
  }
  
  return createDateWithDayAdjustment(targetYear, normalizedMonth + 1, day);
}

/**
 * Formats a date as YYYY-MM-DD string
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formats a date as DD/MM/YYYY string (Brazilian format)
 */
export function formatDateBR(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Gets the month name in Portuguese
 */
export function getMonthNamePT(date: Date): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[date.getMonth()];
}

/**
 * Calculates the difference in days between two dates
 */
export function daysDifference(date1: Date, date2: Date): number {
  const timeDiff = date2.getTime() - date1.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Checks if a date is in the same month and year as another date
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && 
         date1.getMonth() === date2.getMonth();
}

/**
 * Checks if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Validates if a date is valid and not NaN
 * Enhanced validation for edge cases
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
}

/**
 * Validates if year, month, and day combination is valid
 * Handles leap years and month boundaries correctly
 */
export function isValidDateComponents(year: number, month: number, day: number): boolean {
  // Basic range validation
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Check if day exists in the given month/year
  const lastDayOfMonth = getLastDayOfMonth(year, month);
  return day <= lastDayOfMonth;
}

/**
 * Safely creates a date with comprehensive validation
 * Returns null if the date components are invalid
 */
export function safeCreateDate(year: number, month: number, day: number): Date | null {
  try {
    if (!isValidDateComponents(year, month, day)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day);
    
    // Double-check that the created date matches the input
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day) {
      return null;
    }
    
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Enhanced version of createDateWithDayAdjustment with validation and fallback
 */
export function createDateWithDayAdjustmentSafe(year: number, month: number, day: number): Date {
  try {
    // First try with validation
    const safeDate = safeCreateDate(year, month, day);
    if (safeDate) {
      return safeDate;
    }
    
    // If invalid, adjust the day and try again
    const adjustedDay = adjustDayForMonth(day, year, month);
    const adjustedDate = safeCreateDate(year, month, adjustedDay);
    if (adjustedDate) {
      return adjustedDate;
    }
    
    // Ultimate fallback: use the first day of the month
    return new Date(year, month - 1, 1);
  } catch (error) {
    // Emergency fallback: current date
    console.error('createDateWithDayAdjustmentSafe failed:', error);
    return new Date();
  }
}

/**
 * Enhanced getNextOccurrenceOfDay with comprehensive error handling
 */
export function getNextOccurrenceOfDaySafe(referenceDate: Date, targetDay: number): Date {
  try {
    if (!isValidDate(referenceDate)) {
      throw new Error('Invalid reference date');
    }
    
    if (targetDay < 1 || targetDay > 31) {
      throw new Error('Target day must be between 1 and 31');
    }
    
    return getNextOccurrenceOfDay(referenceDate, targetDay);
  } catch (error) {
    console.warn('getNextOccurrenceOfDaySafe failed, using fallback:', error);
    
    // Fallback: add 30 days to reference date
    const fallbackDate = new Date(referenceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    return fallbackDate;
  }
}

/**
 * Enhanced getPreviousOccurrenceOfDay with comprehensive error handling
 */
export function getPreviousOccurrenceOfDaySafe(referenceDate: Date, targetDay: number): Date {
  try {
    if (!isValidDate(referenceDate)) {
      throw new Error('Invalid reference date');
    }
    
    if (targetDay < 1 || targetDay > 31) {
      throw new Error('Target day must be between 1 and 31');
    }
    
    return getPreviousOccurrenceOfDay(referenceDate, targetDay);
  } catch (error) {
    console.warn('getPreviousOccurrenceOfDaySafe failed, using fallback:', error);
    
    // Fallback: subtract 30 days from reference date
    const fallbackDate = new Date(referenceDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    return fallbackDate;
  }
}

/**
 * Handles extreme year transitions (e.g., year 9999 to 10000)
 * Clamps years to reasonable bounds
 */
export function clampYear(year: number): number {
  return Math.max(1900, Math.min(2100, year));
}

/**
 * Enhanced addMonths with better error handling for extreme cases
 */
export function addMonthsSafe(date: Date, months: number): Date {
  try {
    if (!isValidDate(date)) {
      throw new Error('Invalid input date');
    }
    
    // Clamp months to reasonable bounds to prevent overflow
    const clampedMonths = Math.max(-1200, Math.min(1200, months)); // ±100 years
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    const targetMonth = month + clampedMonths;
    let targetYear = year + Math.floor(targetMonth / 12);
    let normalizedMonth = targetMonth % 12;
    
    // Handle negative months
    if (normalizedMonth < 0) {
      normalizedMonth += 12;
      targetYear -= 1;
    }
    
    // Clamp year to reasonable bounds
    targetYear = clampYear(targetYear);
    
    return createDateWithDayAdjustmentSafe(targetYear, normalizedMonth + 1, day);
  } catch (error) {
    console.error('addMonthsSafe failed:', error);
    // Fallback: return original date
    return new Date(date);
  }
}

/**
 * Validates and normalizes day values for date calculations
 * Handles edge cases like day 0, negative days, or days > 31
 */
export function normalizeDayValue(day: number): number {
  if (typeof day !== 'number' || isNaN(day)) {
    return 1; // Default to first day of month
  }
  
  return Math.max(1, Math.min(31, Math.floor(day)));
}

/**
 * Enhanced leap year calculation with validation
 * Handles edge cases and invalid years
 */
export function isLeapYearSafe(year: number): boolean {
  try {
    if (typeof year !== 'number' || isNaN(year) || year < 1) {
      return false;
    }
    
    return isLeapYear(year);
  } catch (error) {
    console.warn('isLeapYearSafe failed:', error);
    return false;
  }
}

/**
 * Calculates the number of days in February for a given year
 * Handles leap years and validation
 */
export function getFebruaryDays(year: number): number {
  return isLeapYearSafe(year) ? 29 : 28;
}

/**
 * Gets the number of days in a specific month, handling all edge cases
 */
export function getDaysInMonth(year: number, month: number): number {
  try {
    if (month < 1 || month > 12) {
      return 30; // Default fallback
    }
    
    const daysInMonth = [31, getFebruaryDays(year), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth[month - 1];
  } catch (error) {
    console.warn('getDaysInMonth failed:', error);
    return 30; // Safe fallback
  }
}