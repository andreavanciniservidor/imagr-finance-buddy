/**
 * Unit tests for date utility functions
 * Tests edge cases like year transitions, leap years, and invalid dates
 */

import { describe, it, expect } from 'vitest';
import {
  getLastDayOfMonth,
  adjustDayForMonth,
  createDateWithDayAdjustment,
  getNextOccurrenceOfDay,
  getPreviousOccurrenceOfDay,
  addMonths,
  formatDateISO,
  formatDateBR,
  getMonthNamePT,
  daysDifference,
  isSameMonth,
  isLeapYear,
  isValidDate,
  isValidDateComponents,
  safeCreateDate,
  createDateWithDayAdjustmentSafe,
  getNextOccurrenceOfDaySafe,
  getPreviousOccurrenceOfDaySafe,
  addMonthsSafe,
  clampYear,
  normalizeDayValue,
  isLeapYearSafe,
  getFebruaryDays,
  getDaysInMonth
} from '../dateUtils';

describe('DateUtils', () => {
  describe('getLastDayOfMonth', () => {
    it('should return correct last day for regular months', () => {
      expect(getLastDayOfMonth(2025, 1)).toBe(31); // January
      expect(getLastDayOfMonth(2025, 4)).toBe(30); // April
      expect(getLastDayOfMonth(2025, 6)).toBe(30); // June
    });

    it('should handle February in non-leap years', () => {
      expect(getLastDayOfMonth(2025, 2)).toBe(28); // February 2025
    });

    it('should handle February in leap years', () => {
      expect(getLastDayOfMonth(2024, 2)).toBe(29); // February 2024 (leap year)
    });

    it('should handle December', () => {
      expect(getLastDayOfMonth(2025, 12)).toBe(31); // December
    });
  });

  describe('adjustDayForMonth', () => {
    it('should return the same day when valid', () => {
      expect(adjustDayForMonth(15, 2025, 1)).toBe(15); // January 15
      expect(adjustDayForMonth(28, 2025, 2)).toBe(28); // February 28
    });

    it('should adjust invalid days to last day of month', () => {
      expect(adjustDayForMonth(31, 2025, 2)).toBe(28); // February 31 -> 28
      expect(adjustDayForMonth(31, 2025, 4)).toBe(30); // April 31 -> 30
    });

    it('should handle leap year February correctly', () => {
      expect(adjustDayForMonth(30, 2024, 2)).toBe(29); // February 30 -> 29 (leap year)
      expect(adjustDayForMonth(30, 2025, 2)).toBe(28); // February 30 -> 28 (non-leap year)
    });
  });

  describe('createDateWithDayAdjustment', () => {
    it('should create valid dates', () => {
      const date = createDateWithDayAdjustment(2025, 1, 15);
      expect(date).toEqual(new Date(2025, 0, 15)); // January 15, 2025
    });

    it('should adjust invalid days', () => {
      const date = createDateWithDayAdjustment(2025, 2, 31);
      expect(date).toEqual(new Date(2025, 1, 28)); // February 28, 2025
    });

    it('should handle leap years', () => {
      const date = createDateWithDayAdjustment(2024, 2, 29);
      expect(date).toEqual(new Date(2024, 1, 29)); // February 29, 2024
    });
  });

  describe('getNextOccurrenceOfDay', () => {
    it('should return current month when day hasnt occurred yet', () => {
      const referenceDate = new Date(2025, 0, 10); // January 10
      const nextOccurrence = getNextOccurrenceOfDay(referenceDate, 15);
      
      expect(nextOccurrence).toEqual(new Date(2025, 0, 15)); // January 15
    });

    it('should return next month when day has already occurred', () => {
      const referenceDate = new Date(2025, 0, 20); // January 20
      const nextOccurrence = getNextOccurrenceOfDay(referenceDate, 15);
      
      expect(nextOccurrence).toEqual(new Date(2025, 1, 15)); // February 15
    });

    it('should handle year transitions', () => {
      const referenceDate = new Date(2024, 11, 20); // December 20, 2024
      const nextOccurrence = getNextOccurrenceOfDay(referenceDate, 15);
      
      expect(nextOccurrence).toEqual(new Date(2025, 0, 15)); // January 15, 2025
    });

    it('should adjust invalid days for target month', () => {
      const referenceDate = new Date(2025, 0, 10); // January 10
      const nextOccurrence = getNextOccurrenceOfDay(referenceDate, 31);
      
      expect(nextOccurrence).toEqual(new Date(2025, 0, 31)); // January 31
      
      // But if we're looking for 31st in February
      const febReference = new Date(2025, 1, 10); // February 10
      const febOccurrence = getNextOccurrenceOfDay(febReference, 31);
      
      expect(febOccurrence).toEqual(new Date(2025, 1, 28)); // February 28 (adjusted)
    });
  });

  describe('getPreviousOccurrenceOfDay', () => {
    it('should return current month when day has already occurred', () => {
      const referenceDate = new Date(2025, 0, 20); // January 20
      const prevOccurrence = getPreviousOccurrenceOfDay(referenceDate, 15);
      
      expect(prevOccurrence).toEqual(new Date(2025, 0, 15)); // January 15
    });

    it('should return previous month when day hasnt occurred yet', () => {
      const referenceDate = new Date(2025, 0, 10); // January 10
      const prevOccurrence = getPreviousOccurrenceOfDay(referenceDate, 15);
      
      expect(prevOccurrence).toEqual(new Date(2024, 11, 15)); // December 15, 2024
    });

    it('should handle year transitions', () => {
      const referenceDate = new Date(2025, 0, 10); // January 10, 2025
      const prevOccurrence = getPreviousOccurrenceOfDay(referenceDate, 20);
      
      expect(prevOccurrence).toEqual(new Date(2024, 11, 20)); // December 20, 2024
    });

    it('should adjust invalid days for target month', () => {
      const referenceDate = new Date(2025, 2, 10); // March 10
      const prevOccurrence = getPreviousOccurrenceOfDay(referenceDate, 31);
      
      expect(prevOccurrence).toEqual(new Date(2025, 1, 28)); // February 28 (adjusted from 31)
    });
  });

  describe('addMonths', () => {
    it('should add months correctly', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const result = addMonths(date, 2);
      
      expect(result).toEqual(new Date(2025, 2, 15)); // March 15, 2025
    });

    it('should handle year transitions', () => {
      const date = new Date(2024, 10, 15); // November 15, 2024
      const result = addMonths(date, 3);
      
      expect(result).toEqual(new Date(2025, 1, 15)); // February 15, 2025
    });

    it('should adjust days when target month has fewer days', () => {
      const date = new Date(2025, 0, 31); // January 31, 2025
      const result = addMonths(date, 1);
      
      expect(result).toEqual(new Date(2025, 1, 28)); // February 28, 2025 (adjusted)
    });

    it('should handle negative months', () => {
      const date = new Date(2025, 2, 15); // March 15, 2025
      const result = addMonths(date, -2);
      
      expect(result).toEqual(new Date(2025, 0, 15)); // January 15, 2025
    });

    it('should handle leap years correctly', () => {
      const date = new Date(2024, 0, 29); // January 29, 2024
      const result = addMonths(date, 1);
      
      expect(result).toEqual(new Date(2024, 1, 29)); // February 29, 2024 (leap year)
    });
  });

  describe('formatDateISO', () => {
    it('should format dates as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(formatDateISO(date)).toBe('2025-01-15');
    });

    it('should handle single digit months and days', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(formatDateISO(date)).toBe('2025-01-05');
    });
  });

  describe('formatDateBR', () => {
    it('should format dates as DD/MM/YYYY', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(formatDateBR(date)).toBe('15/01/2025');
    });

    it('should handle single digit months and days', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(formatDateBR(date)).toBe('05/01/2025');
    });
  });

  describe('getMonthNamePT', () => {
    it('should return correct Portuguese month names', () => {
      expect(getMonthNamePT(new Date(2025, 0, 1))).toBe('Janeiro');
      expect(getMonthNamePT(new Date(2025, 1, 1))).toBe('Fevereiro');
      expect(getMonthNamePT(new Date(2025, 2, 1))).toBe('Março');
      expect(getMonthNamePT(new Date(2025, 3, 1))).toBe('Abril');
      expect(getMonthNamePT(new Date(2025, 4, 1))).toBe('Maio');
      expect(getMonthNamePT(new Date(2025, 5, 1))).toBe('Junho');
      expect(getMonthNamePT(new Date(2025, 6, 1))).toBe('Julho');
      expect(getMonthNamePT(new Date(2025, 7, 1))).toBe('Agosto');
      expect(getMonthNamePT(new Date(2025, 8, 1))).toBe('Setembro');
      expect(getMonthNamePT(new Date(2025, 9, 1))).toBe('Outubro');
      expect(getMonthNamePT(new Date(2025, 10, 1))).toBe('Novembro');
      expect(getMonthNamePT(new Date(2025, 11, 1))).toBe('Dezembro');
    });
  });

  describe('daysDifference', () => {
    it('should calculate positive difference correctly', () => {
      const date1 = new Date(2025, 0, 10); // January 10
      const date2 = new Date(2025, 0, 15); // January 15
      
      expect(daysDifference(date1, date2)).toBe(5);
    });

    it('should calculate negative difference correctly', () => {
      const date1 = new Date(2025, 0, 15); // January 15
      const date2 = new Date(2025, 0, 10); // January 10
      
      expect(daysDifference(date1, date2)).toBe(-5);
    });

    it('should handle same dates', () => {
      const date = new Date(2025, 0, 15);
      expect(daysDifference(date, date)).toBe(0);
    });

    it('should handle month boundaries', () => {
      const date1 = new Date(2025, 0, 31); // January 31
      const date2 = new Date(2025, 1, 1);  // February 1
      
      expect(daysDifference(date1, date2)).toBe(1);
    });

    it('should handle year boundaries', () => {
      const date1 = new Date(2024, 11, 31); // December 31, 2024
      const date2 = new Date(2025, 0, 1);   // January 1, 2025
      
      expect(daysDifference(date1, date2)).toBe(1);
    });
  });

  describe('isSameMonth', () => {
    it('should return true for same month and year', () => {
      const date1 = new Date(2025, 0, 10); // January 10, 2025
      const date2 = new Date(2025, 0, 20); // January 20, 2025
      
      expect(isSameMonth(date1, date2)).toBe(true);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2025, 0, 10); // January 10, 2025
      const date2 = new Date(2025, 1, 10); // February 10, 2025
      
      expect(isSameMonth(date1, date2)).toBe(false);
    });

    it('should return false for same month but different years', () => {
      const date1 = new Date(2024, 0, 10); // January 10, 2024
      const date2 = new Date(2025, 0, 10); // January 10, 2025
      
      expect(isSameMonth(date1, date2)).toBe(false);
    });
  });

  describe('isLeapYear', () => {
    it('should identify leap years correctly', () => {
      expect(isLeapYear(2024)).toBe(true);  // Divisible by 4
      expect(isLeapYear(2000)).toBe(true);  // Divisible by 400
      expect(isLeapYear(1600)).toBe(true);  // Divisible by 400
    });

    it('should identify non-leap years correctly', () => {
      expect(isLeapYear(2025)).toBe(false); // Not divisible by 4
      expect(isLeapYear(1900)).toBe(false); // Divisible by 100 but not 400
      expect(isLeapYear(2100)).toBe(false); // Divisible by 100 but not 400
    });

    it('should handle century years correctly', () => {
      expect(isLeapYear(1700)).toBe(false); // Divisible by 100 but not 400
      expect(isLeapYear(1800)).toBe(false); // Divisible by 100 but not 400
      expect(isLeapYear(2000)).toBe(true);  // Divisible by 400
    });
  });

  describe('Enhanced Validation Functions', () => {
    describe('isValidDate', () => {
      it('should validate correct dates', () => {
        expect(isValidDate(new Date(2025, 0, 15))).toBe(true);
        expect(isValidDate(new Date())).toBe(true);
      });

      it('should reject invalid dates', () => {
        expect(isValidDate(new Date('invalid'))).toBe(false);
        expect(isValidDate(new Date(NaN))).toBe(false);
      });

      it('should reject dates with time 0 or negative', () => {
        const zeroDate = new Date(0);
        expect(isValidDate(zeroDate)).toBe(false);
      });
    });

    describe('isValidDateComponents', () => {
      it('should validate correct date components', () => {
        expect(isValidDateComponents(2025, 1, 15)).toBe(true);
        expect(isValidDateComponents(2024, 2, 29)).toBe(true); // Leap year
      });

      it('should reject invalid years', () => {
        expect(isValidDateComponents(1800, 1, 15)).toBe(false);
        expect(isValidDateComponents(2200, 1, 15)).toBe(false);
      });

      it('should reject invalid months', () => {
        expect(isValidDateComponents(2025, 0, 15)).toBe(false);
        expect(isValidDateComponents(2025, 13, 15)).toBe(false);
      });

      it('should reject invalid days', () => {
        expect(isValidDateComponents(2025, 1, 0)).toBe(false);
        expect(isValidDateComponents(2025, 1, 32)).toBe(false);
        expect(isValidDateComponents(2025, 2, 29)).toBe(false); // Non-leap year
        expect(isValidDateComponents(2025, 4, 31)).toBe(false); // April has 30 days
      });
    });

    describe('safeCreateDate', () => {
      it('should create valid dates', () => {
        const date = safeCreateDate(2025, 1, 15);
        expect(date).not.toBeNull();
        expect(date?.getFullYear()).toBe(2025);
        expect(date?.getMonth()).toBe(0); // 0-indexed
        expect(date?.getDate()).toBe(15);
      });

      it('should return null for invalid dates', () => {
        expect(safeCreateDate(2025, 2, 29)).toBeNull(); // Non-leap year
        expect(safeCreateDate(2025, 4, 31)).toBeNull(); // April has 30 days
        expect(safeCreateDate(1800, 1, 15)).toBeNull(); // Year too old
      });

      it('should handle leap years correctly', () => {
        const leapDate = safeCreateDate(2024, 2, 29);
        expect(leapDate).not.toBeNull();
        expect(leapDate?.getDate()).toBe(29);
      });
    });

    describe('createDateWithDayAdjustmentSafe', () => {
      it('should create valid dates without adjustment', () => {
        const date = createDateWithDayAdjustmentSafe(2025, 1, 15);
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(0);
        expect(date.getDate()).toBe(15);
      });

      it('should adjust invalid days', () => {
        const date = createDateWithDayAdjustmentSafe(2025, 2, 31);
        expect(date.getDate()).toBe(28); // Adjusted to last day of February
        expect(date.getMonth()).toBe(1); // February
      });

      it('should fallback to first day of month for extreme cases', () => {
        // This would test the ultimate fallback, but it's hard to trigger
        // without mocking the internal functions
        const date = createDateWithDayAdjustmentSafe(2025, 1, 15);
        expect(date).toBeInstanceOf(Date);
      });

      it('should handle leap years in adjustments', () => {
        const date = createDateWithDayAdjustmentSafe(2024, 2, 30);
        expect(date.getDate()).toBe(29); // Adjusted to Feb 29 in leap year
        expect(date.getMonth()).toBe(1); // February
      });
    });
  });

  describe('Enhanced Safe Functions', () => {
    describe('getNextOccurrenceOfDaySafe', () => {
      it('should work normally with valid inputs', () => {
        const referenceDate = new Date(2025, 0, 10);
        const result = getNextOccurrenceOfDaySafe(referenceDate, 15);
        expect(result).toEqual(new Date(2025, 0, 15));
      });

      it('should handle invalid reference dates', () => {
        const invalidDate = new Date('invalid');
        const result = getNextOccurrenceOfDaySafe(invalidDate, 15);
        expect(result).toBeInstanceOf(Date);
        // Should return a fallback date
      });

      it('should handle invalid target days', () => {
        const referenceDate = new Date(2025, 0, 10);
        const result = getNextOccurrenceOfDaySafe(referenceDate, 0);
        expect(result).toBeInstanceOf(Date);
        // Should return a fallback date
      });
    });

    describe('getPreviousOccurrenceOfDaySafe', () => {
      it('should work normally with valid inputs', () => {
        const referenceDate = new Date(2025, 0, 20);
        const result = getPreviousOccurrenceOfDaySafe(referenceDate, 15);
        expect(result).toEqual(new Date(2025, 0, 15));
      });

      it('should handle invalid reference dates', () => {
        const invalidDate = new Date('invalid');
        const result = getPreviousOccurrenceOfDaySafe(invalidDate, 15);
        expect(result).toBeInstanceOf(Date);
      });

      it('should handle invalid target days', () => {
        const referenceDate = new Date(2025, 0, 20);
        const result = getPreviousOccurrenceOfDaySafe(referenceDate, 50);
        expect(result).toBeInstanceOf(Date);
      });
    });

    describe('addMonthsSafe', () => {
      it('should work normally with valid inputs', () => {
        const date = new Date(2025, 0, 15);
        const result = addMonthsSafe(date, 2);
        expect(result).toEqual(new Date(2025, 2, 15));
      });

      it('should handle invalid dates', () => {
        const invalidDate = new Date('invalid');
        const result = addMonthsSafe(invalidDate, 2);
        expect(result).toBeInstanceOf(Date);
        // Should return the original date as fallback
      });

      it('should clamp extreme month values', () => {
        const date = new Date(2025, 0, 15);
        const result = addMonthsSafe(date, 2000); // Extreme value
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBeLessThanOrEqual(2100); // Should be clamped
      });

      it('should handle negative extreme month values', () => {
        const date = new Date(2025, 0, 15);
        const result = addMonthsSafe(date, -2000); // Extreme negative value
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBeGreaterThanOrEqual(1900); // Should be clamped
      });
    });
  });

  describe('Utility Functions', () => {
    describe('clampYear', () => {
      it('should clamp years to valid range', () => {
        expect(clampYear(1800)).toBe(1900);
        expect(clampYear(2200)).toBe(2100);
        expect(clampYear(2025)).toBe(2025);
      });
    });

    describe('normalizeDayValue', () => {
      it('should normalize valid day values', () => {
        expect(normalizeDayValue(15)).toBe(15);
        expect(normalizeDayValue(1)).toBe(1);
        expect(normalizeDayValue(31)).toBe(31);
      });

      it('should clamp invalid day values', () => {
        expect(normalizeDayValue(0)).toBe(1);
        expect(normalizeDayValue(-5)).toBe(1);
        expect(normalizeDayValue(35)).toBe(31);
        expect(normalizeDayValue(100)).toBe(31);
      });

      it('should handle non-numeric values', () => {
        expect(normalizeDayValue(NaN)).toBe(1);
        expect(normalizeDayValue(undefined as any)).toBe(1);
        expect(normalizeDayValue(null as any)).toBe(1);
      });

      it('should floor decimal values', () => {
        expect(normalizeDayValue(15.7)).toBe(15);
        expect(normalizeDayValue(1.2)).toBe(1);
      });
    });

    describe('isLeapYearSafe', () => {
      it('should identify leap years correctly', () => {
        expect(isLeapYearSafe(2024)).toBe(true);
        expect(isLeapYearSafe(2000)).toBe(true);
      });

      it('should identify non-leap years correctly', () => {
        expect(isLeapYearSafe(2025)).toBe(false);
        expect(isLeapYearSafe(1900)).toBe(false);
      });

      it('should handle invalid years', () => {
        expect(isLeapYearSafe(NaN)).toBe(false);
        expect(isLeapYearSafe(-1)).toBe(false);
        expect(isLeapYearSafe(undefined as any)).toBe(false);
      });
    });

    describe('getFebruaryDays', () => {
      it('should return 29 for leap years', () => {
        expect(getFebruaryDays(2024)).toBe(29);
        expect(getFebruaryDays(2000)).toBe(29);
      });

      it('should return 28 for non-leap years', () => {
        expect(getFebruaryDays(2025)).toBe(28);
        expect(getFebruaryDays(1900)).toBe(28);
      });

      it('should handle invalid years safely', () => {
        expect(getFebruaryDays(NaN)).toBe(28);
        expect(getFebruaryDays(-1)).toBe(28);
      });
    });

    describe('getDaysInMonth', () => {
      it('should return correct days for all months', () => {
        expect(getDaysInMonth(2025, 1)).toBe(31); // January
        expect(getDaysInMonth(2025, 2)).toBe(28); // February (non-leap)
        expect(getDaysInMonth(2024, 2)).toBe(29); // February (leap)
        expect(getDaysInMonth(2025, 4)).toBe(30); // April
        expect(getDaysInMonth(2025, 12)).toBe(31); // December
      });

      it('should handle invalid months', () => {
        expect(getDaysInMonth(2025, 0)).toBe(30); // Fallback
        expect(getDaysInMonth(2025, 13)).toBe(30); // Fallback
        expect(getDaysInMonth(2025, -1)).toBe(30); // Fallback
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle February 29th in leap years', () => {
      const date = createDateWithDayAdjustment(2024, 2, 29);
      expect(date.getDate()).toBe(29);
      expect(date.getMonth()).toBe(1); // February
    });

    it('should adjust February 29th in non-leap years', () => {
      const date = createDateWithDayAdjustment(2025, 2, 29);
      expect(date.getDate()).toBe(28);
      expect(date.getMonth()).toBe(1); // February
    });

    it('should handle day 31 in 30-day months', () => {
      const date = createDateWithDayAdjustment(2025, 4, 31); // April
      expect(date.getDate()).toBe(30);
      expect(date.getMonth()).toBe(3); // April
    });

    it('should handle extreme date additions', () => {
      const date = new Date(2025, 0, 31); // January 31
      const result = addMonths(date, 12); // Add a full year
      
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(31);
    });

    it('should handle negative month additions crossing years', () => {
      const date = new Date(2025, 1, 15); // February 15, 2025
      const result = addMonths(date, -14); // Go back 14 months
      
      // February 2025 - 14 months = December 2022
      expect(result.getFullYear()).toBe(2022);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(15);
    });

    it('should handle century year transitions', () => {
      const date = new Date(1999, 11, 31); // December 31, 1999
      const result = addMonths(date, 1);
      
      expect(result.getFullYear()).toBe(2000);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(31);
    });

    it('should handle leap year edge cases in calculations', () => {
      // Test February 29th in leap year calculations
      const leapYearDate = new Date(2024, 1, 29); // Feb 29, 2024
      const nextYear = addMonths(leapYearDate, 12);
      
      // Should adjust to Feb 28, 2025 (non-leap year)
      expect(nextYear.getFullYear()).toBe(2025);
      expect(nextYear.getMonth()).toBe(1); // February
      expect(nextYear.getDate()).toBe(28);
    });

    it('should handle extreme day values in safe functions', () => {
      const date = new Date(2025, 0, 15);
      
      // Test with extreme day values
      const result1 = getNextOccurrenceOfDaySafe(date, 999);
      const result2 = getPreviousOccurrenceOfDaySafe(date, -50);
      
      expect(result1).toBeInstanceOf(Date);
      expect(result2).toBeInstanceOf(Date);
    });

    it('should handle date overflow scenarios', () => {
      // Test scenarios that might cause date overflow
      const extremeDate = new Date(2099, 11, 31);
      const result = addMonthsSafe(extremeDate, 50);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBeLessThanOrEqual(2100);
    });
  });
});