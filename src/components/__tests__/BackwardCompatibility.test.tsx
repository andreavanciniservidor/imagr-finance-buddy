/**
 * Tests for backward compatibility with existing cartoes
 * Verifies that cartoes without dia_vencimento and melhor_dia_compra still work
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaturaCalculator } from '@/lib/faturaCalculator';
import { CartaoExtended } from '@/types/cartao';

describe('Backward Compatibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle legacy cartao without dia_vencimento', () => {
    const legacyCartao: CartaoExtended = {
      id: '1',
      user_id: 'user1',
      nome: 'Cartão Legacy',
      limite: 1000,
      dia_fechamento: 15,
      dia_vencimento: null, // Legacy cartao without this field
      melhor_dia_compra: null, // Legacy cartao without this field
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    const purchaseDate = new Date(2025, 1, 10); // February 10, 2025

    // Should not throw an error
    expect(() => {
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, legacyCartao);
      expect(launchDate).toBeInstanceOf(Date);
    }).not.toThrow();
  });

  it('should calculate default values for legacy cartao', () => {
    const legacyCartao: CartaoExtended = {
      id: '1',
      user_id: 'user1',
      nome: 'Cartão Legacy',
      limite: 1000,
      dia_fechamento: 15,
      dia_vencimento: null,
      melhor_dia_compra: null,
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    const defaults = FaturaCalculator.getCompatibilityDefaults(legacyCartao);

    // Should calculate default due date (closing + 10 days)
    expect(defaults.dia_vencimento).toBe(25); // 15 + 10

    // Should calculate default best purchase day (closing + 1)
    expect(defaults.melhor_dia_compra).toBe(16); // 15 + 1
  });

  it('should handle edge case where default due date exceeds 31', () => {
    const legacyCartao: CartaoExtended = {
      id: '1',
      user_id: 'user1',
      nome: 'Cartão Legacy',
      limite: 1000,
      dia_fechamento: 25, // High closing day
      dia_vencimento: null,
      melhor_dia_compra: null,
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    const defaults = FaturaCalculator.getCompatibilityDefaults(legacyCartao);

    // Should wrap around when exceeding 31 (25 + 10 = 35, so 35 - 31 = 4)
    expect(defaults.dia_vencimento).toBe(4);
  });

  it('should preserve existing values when available', () => {
    const cartaoWithPartialData: CartaoExtended = {
      id: '1',
      user_id: 'user1',
      nome: 'Cartão Parcial',
      limite: 1000,
      dia_fechamento: 15,
      dia_vencimento: 20, // Has due date
      melhor_dia_compra: null, // Missing best purchase day
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    const defaults = FaturaCalculator.getCompatibilityDefaults(cartaoWithPartialData);

    // Should preserve existing due date
    expect(defaults.dia_vencimento).toBe(20);

    // Should calculate missing best purchase day
    expect(defaults.melhor_dia_compra).toBe(16); // 15 + 1
  });

  it('should validate legacy cartao configuration', () => {
    const legacyCartao: CartaoExtended = {
      id: '1',
      user_id: 'user1',
      nome: 'Cartão Legacy',
      limite: 1000,
      dia_fechamento: 15,
      dia_vencimento: null,
      melhor_dia_compra: null,
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    const validation = FaturaCalculator.validateCardConfiguration(legacyCartao);

    // Should be valid even without optional fields
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should calculate fatura period for legacy cartao', () => {
    const legacyCartao: CartaoExtended = {
      id: '1',
      user_id: 'user1',
      nome: 'Cartão Legacy',
      limite: 1000,
      dia_fechamento: 15,
      dia_vencimento: null,
      melhor_dia_compra: null,
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    const referenceDate = new Date(2025, 1, 10); // February 10, 2025
    const period = FaturaCalculator.getFaturaPeriod(legacyCartao, referenceDate);

    // Should calculate period correctly
    expect(period.inicio).toBeInstanceOf(Date);
    expect(period.fim).toBeInstanceOf(Date);
    expect(period.mesReferencia).toBeTruthy();
    expect(period.diasRestantes).toBeGreaterThanOrEqual(0);
  });
});