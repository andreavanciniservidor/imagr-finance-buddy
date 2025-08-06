
/**
 * End-to-end tests for complete transaction flow with improved calculations
 * Tests the full user journey from cartao creation to transaction processing
 */

import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaturaCalculator } from '@/lib/faturaCalculator';
import { CartaoExtended } from '@/types/cartao';

// Mock components and dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    loading: false
  })
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-trigger">{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="button" {...props}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <div data-testid="select" onClick={() => onValueChange?.('1')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>
}));

describe('End-to-End Transaction Flow Tests', () => {
  const mockCartao: CartaoExtended = {
    id: '1',
    user_id: 'test-user',
    nome: 'Cartão Teste',
    limite: 5000,
    dia_fechamento: 15,
    dia_vencimento: 25,
    melhor_dia_compra: 16,
    cor: '#3B82F6',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    it('should handle complete cartao creation and transaction flow', async () => {
      // Mock the cartao creation process
      const mockCartaoCreation = {
        nome: 'Novo Cartão',
        limite: 3000,
        dia_fechamento: 20,
        dia_vencimento: 30,
        melhor_dia_compra: 21,
        cor: '#10B981'
      };

      // Simulate cartao creation
      const createdCartao: CartaoExtended = {
        id: '2',
        user_id: 'test-user',
        ...mockCartaoCreation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Test that the cartao can be used for calculations immediately
      const purchaseDate = new Date(2025, 0, 25); // January 25, 2025
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, createdCartao);

      expect(launchDate).toBeInstanceOf(Date);
      expect(launchDate.getTime()).toBeGreaterThan(purchaseDate.getTime());

      // Test that the fatura period can be calculated
      const period = FaturaCalculator.getFaturaPeriod(createdCartao, purchaseDate);
      expect(period.inicio).toBeInstanceOf(Date);
      expect(period.fim).toBeInstanceOf(Date);
      expect(period.mesReferencia).toBeTruthy();
    });

    it('should handle transaction creation with improved date calculation', async () => {
      const transactionData = {
        descricao: 'Compra Teste',
        valor: 150.00,
        data: '2025-01-10', // Before closing date
        cartao_id: mockCartao.id,
        categoria: 'Alimentação',
        tipo: 'despesa'
      };

      // Calculate expected launch date
      const purchaseDate = new Date(2025, 0, 10); // January 10, 2025
      const expectedLaunchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, mockCartao);

      // Verify the calculation is correct
      expect(expectedLaunchDate.getMonth()).toBe(1); // February (next month after closing)
      expect(expectedLaunchDate.getDate()).toBe(25); // Due date

      // Test transaction preview
      const preview = FaturaCalculator.getTransactionPreview(purchaseDate, mockCartao);
      expect(preview.dataLancamento).toEqual(expectedLaunchDate);
      expect(preview.mesLancamento).toBe('Fevereiro 2025');
      expect(preview.diasAteVencimento).toBeGreaterThan(0);
    });

    it('should handle installment transactions correctly', async () => {
      const installmentData = {
        descricao: 'Compra Parcelada',
        valor: 600.00,
        data: '2025-01-20', // After closing date
        cartao_id: mockCartao.id,
        categoria: 'Eletrônicos',
        tipo: 'despesa',
        parcelas: 3
      };

      const purchaseDate = new Date(2025, 0, 20); // January 20, 2025

      // Calculate launch dates for each installment
      const installmentDates = [];
      for (let i = 0; i < installmentData.parcelas; i++) {
        const installmentPurchaseDate = new Date(purchaseDate);
        installmentPurchaseDate.setMonth(installmentPurchaseDate.getMonth() + i);
        
        const launchDate = FaturaCalculator.calculateLaunchDate(installmentPurchaseDate, mockCartao);
        installmentDates.push(launchDate);
      }

      // Verify each installment has correct launch date
      expect(installmentDates).toHaveLength(3);
      installmentDates.forEach((date, index) => {
        expect(date).toBeInstanceOf(Date);
        expect(date.getDate()).toBe(25); // Due date
        
        // Each installment should be in consecutive months
        if (index > 0) {
          const prevMonth = installmentDates[index - 1].getMonth();
          const currentMonth = date.getMonth();
          const expectedMonth = (prevMonth + 1) % 12;
          expect(currentMonth).toBe(expectedMonth);
        }
      });
    });

    it('should handle edge cases in transaction flow', async () => {
      // Test transaction on closing day
      const closingDayPurchase = new Date(2025, 0, 15); // January 15 (closing day)
      const closingDayLaunch = FaturaCalculator.calculateLaunchDate(closingDayPurchase, mockCartao);
      
      // Should be treated as after closing, so launch in March
      expect(closingDayLaunch.getMonth()).toBe(2); // March
      expect(closingDayLaunch.getDate()).toBe(25); // Due date

      // Test transaction on due date
      const dueDayPurchase = new Date(2025, 0, 25); // January 25 (due date)
      const dueDayLaunch = FaturaCalculator.calculateLaunchDate(dueDayPurchase, mockCartao);
      
      // Should launch in March (next cycle)
      expect(dueDayLaunch.getMonth()).toBe(2); // March
      expect(dueDayLaunch.getDate()).toBe(25); // Due date

      // Test year boundary transaction
      const yearBoundaryPurchase = new Date(2024, 11, 20); // December 20, 2024
      const yearBoundaryLaunch = FaturaCalculator.calculateLaunchDate(yearBoundaryPurchase, mockCartao);
      
      // Should launch in February 2025
      expect(yearBoundaryLaunch.getFullYear()).toBe(2025);
      expect(yearBoundaryLaunch.getMonth()).toBe(1); // February
    });
  });

  describe('User Experience Flow', () => {
    it('should provide real-time feedback during transaction creation', async () => {
      const purchaseDate = new Date(2025, 0, 10);
      
      // Test preview calculation
      const preview = FaturaCalculator.getTransactionPreview(purchaseDate, mockCartao);
      
      expect(preview).toHaveProperty('dataLancamento');
      expect(preview).toHaveProperty('mesLancamento');
      expect(preview).toHaveProperty('periodoFatura');
      expect(preview).toHaveProperty('diasAteVencimento');
      expect(preview).toHaveProperty('isLancamentoPostergado');

      // Verify preview data is meaningful
      expect(preview.mesLancamento).toMatch(/\w+ \d{4}/); // Format: "Month Year"
      expect(preview.diasAteVencimento).toBeGreaterThanOrEqual(0);
      expect(typeof preview.isLancamentoPostergado).toBe('boolean');
    });

    it('should show appropriate warnings for postponed launches', async () => {
      // Purchase after closing date (will be postponed)
      const postponedPurchase = new Date(2025, 0, 20); // January 20 (after closing on 15th)
      const preview = FaturaCalculator.getTransactionPreview(postponedPurchase, mockCartao);
      
      // Should detect postponement
      expect(preview.isLancamentoPostergado).toBe(true);
      expect(preview.dataLancamento.getMonth()).toBe(2); // March (postponed)
      
      // Purchase before closing date (not postponed)
      const normalPurchase = new Date(2025, 0, 10); // January 10 (before closing)
      const normalPreview = FaturaCalculator.getTransactionPreview(normalPurchase, mockCartao);
      
      // Should be postponed (launches in next month)
      expect(normalPreview.isLancamentoPostergado).toBe(true);
      expect(normalPreview.dataLancamento.getMonth()).toBe(1); // February (next month)
    });

    it('should handle cartao selection changes in transaction form', async () => {
      const purchaseDate = new Date(2025, 0, 15);
      
      // Test with first cartao
      const preview1 = FaturaCalculator.getTransactionPreview(purchaseDate, mockCartao);
      
      // Test with different cartao
      const differentCartao: CartaoExtended = {
        ...mockCartao,
        id: '2',
        dia_fechamento: 10,
        dia_vencimento: 20,
        melhor_dia_compra: 11
      };
      
      const preview2 = FaturaCalculator.getTransactionPreview(purchaseDate, differentCartao);
      
      // Should have different launch dates due to different closing dates
      expect(preview1.dataLancamento.getTime()).not.toBe(preview2.dataLancamento.getTime());
      
      // First cartao: purchase on closing day (15th), should postpone
      expect(preview1.dataLancamento.getMonth()).toBe(2); // March
      
      // Second cartao: purchase after closing day (10th), should postpone more
      expect(preview2.dataLancamento.getMonth()).toBe(2); // March
      expect(preview2.dataLancamento.getDate()).toBe(20); // Different due date
    });
  });

  describe('Error Handling in Flow', () => {
    it('should handle calculation errors gracefully', async () => {
      // Create cartao with invalid configuration
      const invalidCartao: CartaoExtended = {
        ...mockCartao,
        dia_fechamento: 0, // Invalid
        dia_vencimento: 35 // Invalid
      };

      // Should not throw errors, but use fallback logic
      expect(() => {
        const preview = FaturaCalculator.getTransactionPreview(new Date(), invalidCartao);
        expect(preview).toHaveProperty('dataLancamento');
      }).not.toThrow();
    });

    it('should handle missing cartao data', async () => {
      const purchaseDate = new Date(2025, 0, 15);
      
      // Test with null cartao (should not crash)
      expect(() => {
        FaturaCalculator.calculateLaunchDate(purchaseDate, null as any);
      }).not.toThrow();
      
      // Test with undefined cartao (should not crash)
      expect(() => {
        FaturaCalculator.calculateLaunchDate(purchaseDate, undefined as any);
      }).not.toThrow();
    });

    it('should handle invalid dates in transaction flow', async () => {
      const invalidDate = new Date('invalid-date');
      
      // Should not crash with invalid dates
      expect(() => {
        const preview = FaturaCalculator.getTransactionPreview(invalidDate, mockCartao);
        expect(preview).toHaveProperty('dataLancamento');
      }).not.toThrow();
    });
  });

  describe('Performance in Flow', () => {
    it('should handle multiple rapid calculations efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate rapid calculations (like user typing in form)
      const dates = [];
      for (let i = 1; i <= 31; i++) {
        const date = new Date(2025, 0, i);
        dates.push(date);
      }
      
      // Calculate previews for all dates
      const previews = dates.map(date => 
        FaturaCalculator.getTransactionPreview(date, mockCartao)
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete all calculations quickly (under 100ms)
      expect(duration).toBeLessThan(100);
      expect(previews).toHaveLength(31);
      
      // All previews should be valid
      previews.forEach(preview => {
        expect(preview).toHaveProperty('dataLancamento');
        expect(preview).toHaveProperty('mesLancamento');
        expect(preview.dataLancamento).toBeInstanceOf(Date);
      });
    });

    it('should handle concurrent calculations without interference', async () => {
      const cartoes = [
        mockCartao,
        { ...mockCartao, id: '2', dia_fechamento: 10, dia_vencimento: 20 },
        { ...mockCartao, id: '3', dia_fechamento: 25, dia_vencimento: 5 }
      ];
      
      const purchaseDate = new Date(2025, 0, 15);
      
      // Run calculations concurrently
      const promises = cartoes.map(cartao => 
        Promise.resolve(FaturaCalculator.getTransactionPreview(purchaseDate, cartao))
      );
      
      const results = await Promise.all(promises);
      
      // All results should be valid and different
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toHaveProperty('dataLancamento');
        expect(result.dataLancamento).toBeInstanceOf(Date);
        
        // Each cartao should have different launch dates
        if (index > 0) {
          expect(result.dataLancamento.getTime()).not.toBe(results[0].dataLancamento.getTime());
        }
      });
    });
  });

  describe('Integration with Legacy Data', () => {
    it('should handle mixed legacy and new cartoes in transaction flow', async () => {
      const legacyCartao: CartaoExtended = {
        id: '1',
        user_id: 'test-user',
        nome: 'Legacy Card',
        limite: 2000,
        dia_fechamento: 15,
        dia_vencimento: null, // Legacy - no due date
        melhor_dia_compra: null, // Legacy - no best purchase day
        cor: '#6B7280',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const newCartao: CartaoExtended = {
        id: '2',
        user_id: 'test-user',
        nome: 'New Card',
        limite: 3000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        melhor_dia_compra: 16,
        cor: '#3B82F6',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const purchaseDate = new Date(2025, 0, 10);

      // Both should work without errors
      const legacyPreview = FaturaCalculator.getTransactionPreview(purchaseDate, legacyCartao);
      const newPreview = FaturaCalculator.getTransactionPreview(purchaseDate, newCartao);

      expect(legacyPreview).toHaveProperty('dataLancamento');
      expect(newPreview).toHaveProperty('dataLancamento');

      // Both should have valid launch dates
      expect(legacyPreview.dataLancamento).toBeInstanceOf(Date);
      expect(newPreview.dataLancamento).toBeInstanceOf(Date);

      // New cartao should use configured due date, legacy should use default
      expect(newPreview.dataLancamento.getDate()).toBe(25); // Configured due date
      expect(legacyPreview.dataLancamento.getDate()).toBe(25); // Default calculated due date (15 + 10)
    });

    it('should migrate legacy cartao data during transaction flow', async () => {
      const legacyCartao: CartaoExtended = {
        id: '1',
        user_id: 'test-user',
        nome: 'Legacy Card',
        limite: 2000,
        dia_fechamento: 20,
        dia_vencimento: null,
        melhor_dia_compra: null,
        cor: '#6B7280',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Get compatibility defaults
      const defaults = FaturaCalculator.getCompatibilityDefaults(legacyCartao);

      expect(defaults.dia_vencimento).toBe(30); // 20 + 10
      expect(defaults.melhor_dia_compra).toBe(21); // 20 + 1

      // Use defaults in calculations
      const enhancedCartao = { ...legacyCartao, ...defaults };
      const purchaseDate = new Date(2025, 0, 15);
      const preview = FaturaCalculator.getTransactionPreview(purchaseDate, enhancedCartao);

      expect(preview.dataLancamento.getDate()).toBe(28); // Using calculated due date (adjusted for February)
    });
  });
});
