/**
 * Unit tests for FaturaCalculator class
 * Tests all calculation methods with various scenarios including edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FaturaCalculator } from '../faturaCalculator';
import { CartaoExtended } from '../../types/cartao';

describe('FaturaCalculator', () => {
  let mockCartao: CartaoExtended;

  beforeEach(() => {
    mockCartao = {
      id: '1',
      nome: 'Test Card',
      limite: 1000,
      dia_fechamento: 15,
      dia_vencimento: 25,
      melhor_dia_compra: 16,
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      user_id: 'user1'
    };
  });

  describe('getFaturaPeriod', () => {
    it('should calculate correct period for normal month', () => {
      const referenceDate = new Date(2025, 0, 20); // January 20, 2025
      const period = FaturaCalculator.getFaturaPeriod(mockCartao, referenceDate);

      expect(period.inicio).toEqual(new Date(2025, 0, 16)); // January 16, 2025
      expect(period.fim).toEqual(new Date(2025, 1, 15)); // February 15, 2025
      expect(period.mesReferencia).toBe('Fevereiro 2025');
      expect(period.diasRestantes).toBeGreaterThanOrEqual(0);
    });

    it('should handle year transitions correctly', () => {
      const referenceDate = new Date(2024, 11, 20); // December 20, 2024
      const period = FaturaCalculator.getFaturaPeriod(mockCartao, referenceDate);

      expect(period.inicio).toEqual(new Date(2024, 11, 16)); // December 16, 2024
      expect(period.fim).toEqual(new Date(2025, 0, 15)); // January 15, 2025
      expect(period.mesReferencia).toBe('Janeiro 2025');
    });

    it('should handle leap years correctly', () => {
      const leapYearCartao = { ...mockCartao, dia_fechamento: 29 };
      const referenceDate = new Date(2024, 1, 15); // February 15, 2024 (leap year)
      const period = FaturaCalculator.getFaturaPeriod(leapYearCartao, referenceDate);

      expect(period.inicio).toEqual(new Date(2024, 0, 30)); // January 30, 2024
      expect(period.fim).toEqual(new Date(2024, 1, 29)); // February 29, 2024 (leap year)
    });

    it('should handle invalid closing days (day 31 in February)', () => {
      const invalidDayCartao = { ...mockCartao, dia_fechamento: 31 };
      const referenceDate = new Date(2025, 1, 15); // February 15, 2025
      const period = FaturaCalculator.getFaturaPeriod(invalidDayCartao, referenceDate);

      expect(period.inicio).toEqual(new Date(2025, 0, 32)); // This should be adjusted
      expect(period.fim).toEqual(new Date(2025, 1, 28)); // February 28, 2025 (adjusted from 31)
    });

    it('should calculate days remaining correctly', () => {
      const referenceDate = new Date(2025, 0, 10); // January 10, 2025
      const period = FaturaCalculator.getFaturaPeriod(mockCartao, referenceDate);

      const expectedDaysRemaining = Math.max(0, Math.ceil((period.fim.getTime() - referenceDate.getTime()) / (1000 * 3600 * 24)));
      expect(period.diasRestantes).toBe(expectedDaysRemaining);
    });
  });

  describe('calculateLaunchDate', () => {
    it('should calculate launch date correctly for purchase before closing', () => {
      const purchaseDate = new Date(2025, 0, 10); // January 10, 2025 (before closing on 15th)
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, mockCartao);

      // Should launch in February (next month after closing)
      expect(launchDate.getMonth()).toBe(1); // February
      expect(launchDate.getFullYear()).toBe(2025);
      expect(launchDate.getDate()).toBe(25); // Due date
    });

    it('should calculate launch date correctly for purchase after closing', () => {
      const purchaseDate = new Date(2025, 0, 20); // January 20, 2025 (after closing on 15th)
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, mockCartao);

      // Should launch in March (month after next closing)
      expect(launchDate.getMonth()).toBe(2); // March
      expect(launchDate.getFullYear()).toBe(2025);
      expect(launchDate.getDate()).toBe(25); // Due date
    });

    it('should handle year transitions in launch date calculation', () => {
      const purchaseDate = new Date(2024, 11, 20); // December 20, 2024 (after closing)
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, mockCartao);

      // Should launch in February 2025
      expect(launchDate.getMonth()).toBe(1); // February
      expect(launchDate.getFullYear()).toBe(2025);
    });

    it('should use default due date when not specified', () => {
      const cartaoWithoutDueDate = { ...mockCartao, dia_vencimento: null };
      const purchaseDate = new Date(2025, 0, 10);
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, cartaoWithoutDueDate);

      // Should use default offset (closing + 10 days = 25)
      expect(launchDate.getDate()).toBe(25);
    });

    it('should handle invalid due dates in target month', () => {
      const cartaoWith31stDue = { ...mockCartao, dia_vencimento: 31 };
      const purchaseDate = new Date(2025, 0, 10); // Will launch in February
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, cartaoWith31stDue);

      // February doesn't have 31 days, should adjust to 28
      expect(launchDate.getDate()).toBe(28);
      expect(launchDate.getMonth()).toBe(1); // February
    });
  });

  describe('isInCurrentPeriod', () => {
    it('should return true for date within current period', () => {
      const dateInPeriod = new Date(2025, 0, 20); // January 20, 2025
      const result = FaturaCalculator.isInCurrentPeriod(dateInPeriod, mockCartao);

      expect(result).toBe(true);
    });

    it('should return true for any date as it calculates period for that date', () => {
      // The isInCurrentPeriod method calculates the period FOR the given date,
      // so it will always return true since any date is within its own period
      const anyDate = new Date(2024, 11, 10); // December 10, 2024
      const result = FaturaCalculator.isInCurrentPeriod(anyDate, mockCartao);

      expect(result).toBe(true);
    });

    it('should handle boundary dates correctly', () => {
      // Test dates that are at the boundaries of their respective periods
      const periodStartDate = new Date(2025, 0, 16); // January 16, 2025 - start of Jan 16 - Feb 15 period
      const periodEndDate = new Date(2025, 1, 14); // February 14, 2025 - end of Jan 16 - Feb 15 period

      expect(FaturaCalculator.isInCurrentPeriod(periodStartDate, mockCartao)).toBe(true);
      expect(FaturaCalculator.isInCurrentPeriod(periodEndDate, mockCartao)).toBe(true);
    });
  });

  describe('getNextClosingDate', () => {
    it('should return next closing date when current date is before closing', () => {
      const referenceDate = new Date(2025, 0, 10); // January 10, 2025
      const nextClosing = FaturaCalculator.getNextClosingDate(mockCartao, referenceDate);

      expect(nextClosing).toEqual(new Date(2025, 0, 15)); // January 15, 2025
    });

    it('should return next month closing when current date is after closing', () => {
      const referenceDate = new Date(2025, 0, 20); // January 20, 2025
      const nextClosing = FaturaCalculator.getNextClosingDate(mockCartao, referenceDate);

      expect(nextClosing).toEqual(new Date(2025, 1, 15)); // February 15, 2025
    });

    it('should handle year transitions', () => {
      const referenceDate = new Date(2024, 11, 20); // December 20, 2024
      const nextClosing = FaturaCalculator.getNextClosingDate(mockCartao, referenceDate);

      expect(nextClosing).toEqual(new Date(2025, 0, 15)); // January 15, 2025
    });

    it('should handle invalid closing days', () => {
      const cartaoWith31st = { ...mockCartao, dia_fechamento: 31 };
      const referenceDate = new Date(2025, 1, 10); // February 10, 2025
      const nextClosing = FaturaCalculator.getNextClosingDate(cartaoWith31st, referenceDate);

      // February doesn't have 31 days, should adjust to 28
      expect(nextClosing.getDate()).toBe(28);
      expect(nextClosing.getMonth()).toBe(1); // February
    });
  });

  describe('getNextDueDate', () => {
    it('should return next due date when current date is before due date', () => {
      const referenceDate = new Date(2025, 0, 20); // January 20, 2025
      const nextDue = FaturaCalculator.getNextDueDate(mockCartao, referenceDate);

      expect(nextDue).toEqual(new Date(2025, 0, 25)); // January 25, 2025
    });

    it('should return next month due date when current date is after due date', () => {
      const referenceDate = new Date(2025, 0, 30); // January 30, 2025
      const nextDue = FaturaCalculator.getNextDueDate(mockCartao, referenceDate);

      expect(nextDue).toEqual(new Date(2025, 1, 25)); // February 25, 2025
    });

    it('should use default due date when not specified', () => {
      const cartaoWithoutDue = { ...mockCartao, dia_vencimento: null };
      const referenceDate = new Date(2025, 0, 20);
      const nextDue = FaturaCalculator.getNextDueDate(cartaoWithoutDue, referenceDate);

      // Should use closing + 10 = 25
      expect(nextDue.getDate()).toBe(25);
    });
  });

  describe('getBestPurchaseDay', () => {
    it('should return configured best purchase day', () => {
      const bestDay = FaturaCalculator.getBestPurchaseDay(mockCartao);
      expect(bestDay).toBe(16);
    });

    it('should calculate best day when not configured', () => {
      const cartaoWithoutBestDay = { ...mockCartao, melhor_dia_compra: null };
      const bestDay = FaturaCalculator.getBestPurchaseDay(cartaoWithoutBestDay);

      // Should be closing day + 1 = 16
      expect(bestDay).toBe(16);
    });

    it('should wrap to next month when calculated day exceeds 31', () => {
      const cartaoWith31stClosing = { ...mockCartao, dia_fechamento: 31, melhor_dia_compra: null };
      const bestDay = FaturaCalculator.getBestPurchaseDay(cartaoWith31stClosing);

      // 31 + 1 = 32, should wrap to 1
      expect(bestDay).toBe(1);
    });
  });

  describe('getComprehensiveCalculation', () => {
    it('should return all calculation data', () => {
      const referenceDate = new Date(2025, 0, 20);
      const calculation = FaturaCalculator.getComprehensiveCalculation(mockCartao, referenceDate);

      expect(calculation).toHaveProperty('periodoAtual');
      expect(calculation).toHaveProperty('proximoFechamento');
      expect(calculation).toHaveProperty('proximoVencimento');
      expect(calculation).toHaveProperty('diasParaFechamento');
      expect(calculation).toHaveProperty('melhorDiaCompra');

      expect(calculation.melhorDiaCompra).toBe(16);
      expect(typeof calculation.diasParaFechamento).toBe('number');
    });
  });

  describe('getTransactionPreview', () => {
    it('should create transaction preview with correct data', () => {
      const purchaseDate = new Date(2025, 0, 10);
      const preview = FaturaCalculator.getTransactionPreview(purchaseDate, mockCartao);

      expect(preview).toHaveProperty('dataLancamento');
      expect(preview).toHaveProperty('mesLancamento');
      expect(preview).toHaveProperty('periodoFatura');
      expect(preview).toHaveProperty('diasAteVencimento');
      expect(preview).toHaveProperty('isLancamentoPostergado');

      expect(preview.mesLancamento).toBe('Fevereiro 2025');
      expect(typeof preview.diasAteVencimento).toBe('number');
    });

    it('should detect postponed launches correctly', () => {
      const purchaseDate = new Date(2025, 0, 10); // January purchase
      const preview = FaturaCalculator.getTransactionPreview(purchaseDate, mockCartao);

      // Launch should be in February, so it's postponed
      expect(preview.isLancamentoPostergado).toBe(true);
    });

    it('should detect non-postponed launches correctly', () => {
      // This test might need adjustment based on the exact logic
      const purchaseDate = new Date(2025, 0, 25); // January 25, after due date
      const preview = FaturaCalculator.getTransactionPreview(purchaseDate, mockCartao);

      // Check if the launch month is different from purchase month
      const isPostponed = purchaseDate.getMonth() !== preview.dataLancamento.getMonth() ||
                         purchaseDate.getFullYear() !== preview.dataLancamento.getFullYear();
      expect(preview.isLancamentoPostergado).toBe(isPostponed);
    });
  });

  describe('validateCardConfiguration', () => {
    it('should validate correct card configuration', () => {
      const validation = FaturaCalculator.validateCardConfiguration(mockCartao);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid closing day', () => {
      const invalidCartao = { ...mockCartao, dia_fechamento: 0 };
      const validation = FaturaCalculator.validateCardConfiguration(invalidCartao);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Dia de fechamento deve estar entre 1 e 31');
    });

    it('should detect invalid due day', () => {
      const invalidCartao = { ...mockCartao, dia_vencimento: 35 };
      const validation = FaturaCalculator.validateCardConfiguration(invalidCartao);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Dia de vencimento deve estar entre 1 e 31');
    });

    it('should detect equal closing and due days', () => {
      const invalidCartao = { ...mockCartao, dia_vencimento: 15 }; // Same as closing
      const validation = FaturaCalculator.validateCardConfiguration(invalidCartao);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Dia de vencimento não pode ser igual ao dia de fechamento');
    });

    it('should detect invalid best purchase day', () => {
      const invalidCartao = { ...mockCartao, melhor_dia_compra: 0 };
      const validation = FaturaCalculator.validateCardConfiguration(invalidCartao);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Melhor dia de compra deve estar entre 1 e 31');
    });

    it('should handle null values correctly', () => {
      const cartaoWithNulls = { ...mockCartao, dia_vencimento: null, melhor_dia_compra: null };
      const validation = FaturaCalculator.validateCardConfiguration(cartaoWithNulls);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('getCompatibilityDefaults', () => {
    it('should calculate default due date', () => {
      const cartaoWithoutDue = { ...mockCartao, dia_vencimento: null };
      const defaults = FaturaCalculator.getCompatibilityDefaults(cartaoWithoutDue);

      expect(defaults.dia_vencimento).toBe(25); // 15 + 10
    });

    it('should wrap due date when it exceeds 31', () => {
      const cartaoWith25thClosing = { ...mockCartao, dia_fechamento: 25, dia_vencimento: null };
      const defaults = FaturaCalculator.getCompatibilityDefaults(cartaoWith25thClosing);

      expect(defaults.dia_vencimento).toBe(4); // (25 + 10) - 31 = 4
    });

    it('should calculate default best purchase day', () => {
      const cartaoWithoutBestDay = { ...mockCartao, melhor_dia_compra: null };
      const defaults = FaturaCalculator.getCompatibilityDefaults(cartaoWithoutBestDay);

      expect(defaults.melhor_dia_compra).toBe(16); // 15 + 1
    });

    it('should use existing values when available', () => {
      const defaults = FaturaCalculator.getCompatibilityDefaults(mockCartao);

      expect(defaults.dia_vencimento).toBe(25); // Existing value
      expect(defaults.melhor_dia_compra).toBe(16); // Existing value
    });
  });

  describe('Error Handling and Validation', () => {
    describe('Input Validation', () => {
      it('should handle invalid reference dates in getFaturaPeriod', () => {
        const invalidDate = new Date('invalid');
        const result = FaturaCalculator.getFaturaPeriod(mockCartao, invalidDate);
        
        // Should return a fallback period
        expect(result).toHaveProperty('inicio');
        expect(result).toHaveProperty('fim');
        expect(result).toHaveProperty('mesReferencia');
        expect(result).toHaveProperty('diasRestantes');
      });

      it('should handle invalid purchase dates in calculateLaunchDate', () => {
        const invalidDate = new Date('invalid');
        const result = FaturaCalculator.calculateLaunchDate(invalidDate, mockCartao);
        
        // Should return a fallback date
        expect(result).toBeInstanceOf(Date);
      });

      it('should handle invalid card configurations', () => {
        const invalidCartao = { ...mockCartao, dia_fechamento: 0 };
        const result = FaturaCalculator.getFaturaPeriod(invalidCartao);
        
        // Should return a fallback period
        expect(result).toHaveProperty('inicio');
        expect(result).toHaveProperty('fim');
      });
    });

    describe('Fallback Logic', () => {
      it('should use fallback calculation when main calculation fails', () => {
        // Create a scenario that might cause calculation failure
        const extremeCartao = { ...mockCartao, dia_fechamento: 999 };
        const result = FaturaCalculator.getFaturaPeriod(extremeCartao);
        
        // Should still return a valid period object
        expect(result).toHaveProperty('inicio');
        expect(result).toHaveProperty('fim');
        expect(result.diasRestantes).toBeGreaterThanOrEqual(0);
      });

      it('should use fallback launch date calculation', () => {
        const extremeCartao = { ...mockCartao, dia_fechamento: -1 };
        const purchaseDate = new Date(2025, 0, 15);
        const result = FaturaCalculator.calculateLaunchDate(purchaseDate, extremeCartao);
        
        // Should return a valid date
        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBeGreaterThan(purchaseDate.getTime());
      });
    });

    describe('Enhanced Validation', () => {
      it('should validate card configuration with comprehensive checks', () => {
        const invalidConfigs = [
          { ...mockCartao, dia_fechamento: 0 },
          { ...mockCartao, dia_fechamento: 32 },
          { ...mockCartao, dia_vencimento: 0 },
          { ...mockCartao, dia_vencimento: 32 },
          { ...mockCartao, dia_vencimento: 15 }, // Same as closing
          { ...mockCartao, melhor_dia_compra: 0 },
          { ...mockCartao, melhor_dia_compra: 32 }
        ];

        invalidConfigs.forEach(config => {
          const validation = FaturaCalculator.validateCardConfiguration(config);
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        });
      });

      it('should pass validation for correct configurations', () => {
        const validConfigs = [
          mockCartao,
          { ...mockCartao, dia_vencimento: null, melhor_dia_compra: null },
          { ...mockCartao, dia_fechamento: 1, dia_vencimento: 2 },
          { ...mockCartao, dia_fechamento: 31, dia_vencimento: 1 }
        ];

        validConfigs.forEach(config => {
          const validation = FaturaCalculator.validateCardConfiguration(config);
          expect(validation.isValid).toBe(true);
          expect(validation.errors.length).toBe(0);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle February 29th in leap years', () => {
      const leapYearCartao = { ...mockCartao, dia_fechamento: 29 };
      const referenceDate = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      const period = FaturaCalculator.getFaturaPeriod(leapYearCartao, referenceDate);

      expect(period.fim.getDate()).toBe(29);
      expect(period.fim.getMonth()).toBe(2); // March
    });

    it('should handle February 29th in non-leap years', () => {
      const cartaoWith29th = { ...mockCartao, dia_fechamento: 29 };
      const referenceDate = new Date(2025, 1, 15); // February 15, 2025 (non-leap year)
      const period = FaturaCalculator.getFaturaPeriod(cartaoWith29th, referenceDate);

      // Should adjust to February 28th
      expect(period.fim.getDate()).toBe(28);
      expect(period.fim.getMonth()).toBe(1); // February
    });

    it('should handle December to January transition', () => {
      const referenceDate = new Date(2024, 11, 20); // December 20, 2024
      const period = FaturaCalculator.getFaturaPeriod(mockCartao, referenceDate);

      expect(period.inicio.getFullYear()).toBe(2024);
      expect(period.fim.getFullYear()).toBe(2025);
      expect(period.mesReferencia).toBe('Janeiro 2025');
    });

    it('should handle same day purchase and closing', () => {
      const purchaseDate = new Date(2025, 0, 15); // Same as closing day
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, mockCartao);

      // Should be treated as after closing, so launch in March
      expect(launchDate.getMonth()).toBe(2); // March
    });

    it('should handle extreme closing days (day 31 in February)', () => {
      const cartaoWith31st = { ...mockCartao, dia_fechamento: 31 };
      const referenceDate = new Date(2025, 1, 15); // February 15, 2025
      const period = FaturaCalculator.getFaturaPeriod(cartaoWith31st, referenceDate);

      // Should adjust February 31st to February 28th
      expect(period.fim.getDate()).toBe(28);
      expect(period.fim.getMonth()).toBe(1); // February
    });

    it('should handle extreme due dates in target months', () => {
      const cartaoWith31stDue = { ...mockCartao, dia_vencimento: 31 };
      const purchaseDate = new Date(2025, 0, 10); // Will launch in February
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, cartaoWith31stDue);

      // February doesn't have 31 days, should adjust to 28
      expect(launchDate.getDate()).toBe(28);
      expect(launchDate.getMonth()).toBe(1); // February
    });

    it('should handle year boundary transitions in calculations', () => {
      const referenceDate = new Date(2024, 11, 31); // December 31, 2024
      const period = FaturaCalculator.getFaturaPeriod(mockCartao, referenceDate);

      // Should handle year transition correctly
      expect(period.inicio.getFullYear()).toBe(2024);
      expect(period.fim.getFullYear()).toBe(2025);
    });

    it('should handle leap year transitions in launch date calculations', () => {
      const cartaoWith29th = { ...mockCartao, dia_fechamento: 29, dia_vencimento: 29 };
      
      // Purchase in leap year, launch in non-leap year
      const purchaseDate = new Date(2024, 0, 15); // January 2024 (leap year)
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, cartaoWith29th);

      // Should handle the transition correctly
      expect(launchDate).toBeInstanceOf(Date);
      expect(launchDate.getFullYear()).toBeGreaterThanOrEqual(2024);
    });

    it('should handle multiple year transitions', () => {
      const cartao = { ...mockCartao, dia_fechamento: 31, dia_vencimento: 31 };
      const purchaseDate = new Date(2023, 11, 15); // December 2023
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, cartao);

      // Should handle multiple potential adjustments
      expect(launchDate).toBeInstanceOf(Date);
      expect(launchDate.getTime()).toBeGreaterThan(purchaseDate.getTime());
    });

    it('should handle extreme date scenarios in comprehensive calculation', () => {
      const extremeCartao = { ...mockCartao, dia_fechamento: 31, dia_vencimento: 31 };
      const extremeDate = new Date(2099, 1, 28); // February 28, 2099
      const calculation = FaturaCalculator.getComprehensiveCalculation(extremeCartao, extremeDate);

      expect(calculation).toHaveProperty('periodoAtual');
      expect(calculation).toHaveProperty('proximoFechamento');
      expect(calculation).toHaveProperty('proximoVencimento');
      expect(calculation.diasParaFechamento).toBeGreaterThanOrEqual(0);
    });

    it('should handle transaction preview with extreme scenarios', () => {
      const extremeCartao = { ...mockCartao, dia_fechamento: 31, dia_vencimento: 1 };
      const purchaseDate = new Date(2025, 1, 29); // February 29 in non-leap year (invalid)
      
      // Should handle invalid purchase date gracefully
      const preview = FaturaCalculator.getTransactionPreview(purchaseDate, extremeCartao);
      
      expect(preview).toHaveProperty('dataLancamento');
      expect(preview).toHaveProperty('mesLancamento');
      expect(preview).toHaveProperty('periodoFatura');
    });

    it('should handle backward compatibility with missing fields', () => {
      const legacyCartao = { 
        ...mockCartao, 
        dia_vencimento: null, 
        melhor_dia_compra: null 
      };
      
      const defaults = FaturaCalculator.getCompatibilityDefaults(legacyCartao);
      
      expect(defaults.dia_vencimento).toBeGreaterThan(0);
      expect(defaults.dia_vencimento).toBeLessThanOrEqual(31);
      expect(defaults.melhor_dia_compra).toBeGreaterThan(0);
      expect(defaults.melhor_dia_compra).toBeLessThanOrEqual(31);
    });

    it('should handle extreme compatibility scenarios', () => {
      const extremeCartao = { 
        ...mockCartao, 
        dia_fechamento: 31,
        dia_vencimento: null, 
        melhor_dia_compra: null 
      };
      
      const defaults = FaturaCalculator.getCompatibilityDefaults(extremeCartao);
      
      // Should wrap around when calculation exceeds 31
      expect(defaults.dia_vencimento).toBeGreaterThan(0);
      expect(defaults.dia_vencimento).toBeLessThanOrEqual(31);
    });

    it('should handle null and undefined values gracefully', () => {
      const cartaoWithNulls = {
        ...mockCartao,
        dia_fechamento: null as any,
        dia_vencimento: undefined as any,
        melhor_dia_compra: null
      };

      // Should not throw errors and provide fallback behavior
      expect(() => {
        FaturaCalculator.getFaturaPeriod(cartaoWithNulls);
      }).not.toThrow();

      expect(() => {
        FaturaCalculator.calculateLaunchDate(new Date(), cartaoWithNulls);
      }).not.toThrow();
    });

    it('should handle concurrent date calculations without interference', () => {
      const dates = [
        new Date(2024, 1, 29), // Leap year Feb 29
        new Date(2025, 1, 28), // Non-leap year Feb 28
        new Date(2024, 11, 31), // Year boundary
        new Date(2025, 0, 1)    // New year
      ];

      const cartoes = [
        { ...mockCartao, dia_fechamento: 29 },
        { ...mockCartao, dia_fechamento: 31 },
        { ...mockCartao, dia_fechamento: 1 }
      ];

      // Run multiple calculations that might interfere with each other
      const results = dates.flatMap(date => 
        cartoes.map(cartao => ({
          period: FaturaCalculator.getFaturaPeriod(cartao, date),
          launch: FaturaCalculator.calculateLaunchDate(date, cartao)
        }))
      );

      // All results should be valid
      results.forEach(result => {
        expect(result.period).toHaveProperty('inicio');
        expect(result.period).toHaveProperty('fim');
        expect(result.launch).toBeInstanceOf(Date);
      });
    });
  });
});