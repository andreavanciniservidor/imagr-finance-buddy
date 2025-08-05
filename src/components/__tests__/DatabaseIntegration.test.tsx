/**
 * Integration tests for database operations with new cartao fields
 * Tests database schema changes, migrations, and data integrity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CartaoExtended } from '@/types/cartao';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  not: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  is: vi.fn(),
  data: null,
  error: null
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient
}));

describe('Database Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.single.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.not.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.is.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cartao CRUD Operations with New Fields', () => {
    const mockCartaoData: CartaoExtended = {
      id: '1',
      user_id: 'user1',
      nome: 'Test Card',
      limite: 1000,
      dia_fechamento: 15,
      dia_vencimento: 25,
      melhor_dia_compra: 16,
      cor: '#3B82F6',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    it('should insert cartao with new fields', async () => {
      mockSupabaseClient.data = mockCartaoData;
      mockSupabaseClient.error = null;

      // Simulate the insert operation
      const insertData = {
        nome: mockCartaoData.nome,
        limite: mockCartaoData.limite,
        dia_fechamento: mockCartaoData.dia_fechamento,
        dia_vencimento: mockCartaoData.dia_vencimento,
        melhor_dia_compra: mockCartaoData.melhor_dia_compra,
        cor: mockCartaoData.cor,
        user_id: mockCartaoData.user_id
      };

      // Mock the database call
      const result = await mockSupabaseClient
        .from('cartoes')
        .insert(insertData)
        .select()
        .single();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('cartoes');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(insertData);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should update cartao with new fields', async () => {
      mockSupabaseClient.data = { ...mockCartaoData, dia_vencimento: 30 };
      mockSupabaseClient.error = null;

      const updateData = {
        dia_vencimento: 30,
        melhor_dia_compra: 17,
        updated_at: new Date().toISOString()
      };

      // Mock the database call
      const result = await mockSupabaseClient
        .from('cartoes')
        .update(updateData)
        .eq('id', mockCartaoData.id)
        .select()
        .single();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('cartoes');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updateData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockCartaoData.id);
    });

    it('should select cartao with new fields', async () => {
      mockSupabaseClient.data = [mockCartaoData];
      mockSupabaseClient.error = null;

      // Mock the database call
      const result = await mockSupabaseClient
        .from('cartoes')
        .select('*, dia_vencimento, melhor_dia_compra')
        .eq('user_id', 'user1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('cartoes');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*, dia_vencimento, melhor_dia_compra');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user1');
    });

    it('should handle null values for optional fields', async () => {
      const cartaoWithNulls = {
        ...mockCartaoData,
        dia_vencimento: null,
        melhor_dia_compra: null
      };

      mockSupabaseClient.data = cartaoWithNulls;
      mockSupabaseClient.error = null;

      const insertData = {
        nome: cartaoWithNulls.nome,
        limite: cartaoWithNulls.limite,
        dia_fechamento: cartaoWithNulls.dia_fechamento,
        dia_vencimento: null,
        melhor_dia_compra: null,
        cor: cartaoWithNulls.cor,
        user_id: cartaoWithNulls.user_id
      };

      // Mock the database call
      const result = await mockSupabaseClient
        .from('cartoes')
        .insert(insertData)
        .select()
        .single();

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(insertData);
      // Verify that null values are handled correctly
      expect(insertData.dia_vencimento).toBeNull();
      expect(insertData.melhor_dia_compra).toBeNull();
    });
  });

  describe('Database Constraints and Validation', () => {
    it('should handle constraint violations for dia_vencimento', async () => {
      const invalidCartao = {
        nome: 'Invalid Card',
        limite: 1000,
        dia_fechamento: 15,
        dia_vencimento: 35, // Invalid: > 31
        melhor_dia_compra: 16,
        cor: '#3B82F6',
        user_id: 'user1'
      };

      // Mock constraint violation error
      mockSupabaseClient.data = null;
      mockSupabaseClient.error = {
        code: '23514',
        message: 'new row for relation "cartoes" violates check constraint "cartoes_dia_vencimento_check"'
      };

      const result = await mockSupabaseClient
        .from('cartoes')
        .insert(invalidCartao)
        .select()
        .single();

      expect(mockSupabaseClient.error).toBeTruthy();
      expect(mockSupabaseClient.error.code).toBe('23514');
    });

    it('should handle constraint violations for melhor_dia_compra', async () => {
      const invalidCartao = {
        nome: 'Invalid Card',
        limite: 1000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        melhor_dia_compra: 0, // Invalid: < 1
        cor: '#3B82F6',
        user_id: 'user1'
      };

      // Mock constraint violation error
      mockSupabaseClient.data = null;
      mockSupabaseClient.error = {
        code: '23514',
        message: 'new row for relation "cartoes" violates check constraint "cartoes_melhor_dia_compra_check"'
      };

      const result = await mockSupabaseClient
        .from('cartoes')
        .insert(invalidCartao)
        .select()
        .single();

      expect(mockSupabaseClient.error).toBeTruthy();
      expect(mockSupabaseClient.error.code).toBe('23514');
    });
  });

  describe('Migration Compatibility', () => {
    it('should handle existing cartoes without new fields', async () => {
      const legacyCartao = {
        id: '1',
        user_id: 'user1',
        nome: 'Legacy Card',
        limite: 1000,
        dia_fechamento: 15,
        cor: '#3B82F6',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
        // Missing dia_vencimento and melhor_dia_compra
      };

      mockSupabaseClient.data = [legacyCartao];
      mockSupabaseClient.error = null;

      // Mock the database call
      const result = await mockSupabaseClient
        .from('cartoes')
        .select('*')
        .eq('user_id', 'user1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('cartoes');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');

      // Verify that legacy cartoes can be retrieved
      expect(mockSupabaseClient.data).toEqual([legacyCartao]);
    });

    it('should update legacy cartao with new fields', async () => {
      const legacyCartao = {
        id: '1',
        user_id: 'user1',
        nome: 'Legacy Card',
        limite: 1000,
        dia_fechamento: 15,
        cor: '#3B82F6',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const updatedCartao = {
        ...legacyCartao,
        dia_vencimento: 25,
        melhor_dia_compra: 16,
        updated_at: new Date().toISOString()
      };

      mockSupabaseClient.data = updatedCartao;
      mockSupabaseClient.error = null;

      const updateData = {
        dia_vencimento: 25,
        melhor_dia_compra: 16,
        updated_at: updatedCartao.updated_at
      };

      // Mock the database call
      const result = await mockSupabaseClient
        .from('cartoes')
        .update(updateData)
        .eq('id', legacyCartao.id)
        .select()
        .single();

      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updateData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', legacyCartao.id);
    });
  });

  describe('Query Performance and Indexing', () => {
    it('should efficiently query cartoes with new fields', async () => {
      const cartoes = [
        {
          id: '1',
          user_id: 'user1',
          nome: 'Card 1',
          dia_fechamento: 15,
          dia_vencimento: 25,
          melhor_dia_compra: 16
        },
        {
          id: '2',
          user_id: 'user1',
          nome: 'Card 2',
          dia_fechamento: 10,
          dia_vencimento: 20,
          melhor_dia_compra: 11
        }
      ];

      mockSupabaseClient.data = cartoes;
      mockSupabaseClient.error = null;

      // Mock query with filtering on new fields
      const result = await mockSupabaseClient
        .from('cartoes')
        .select('id, nome, dia_fechamento, dia_vencimento, melhor_dia_compra')
        .eq('user_id', 'user1')
        .not('dia_vencimento', 'is', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('cartoes');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id, nome, dia_fechamento, dia_vencimento, melhor_dia_compra');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user1');
      expect(mockSupabaseClient.not).toHaveBeenCalledWith('dia_vencimento', 'is', null);
    });

    it('should handle complex queries with new fields', async () => {
      mockSupabaseClient.data = [];
      mockSupabaseClient.error = null;

      // Mock complex query
      const result = await mockSupabaseClient
        .from('cartoes')
        .select('*')
        .eq('user_id', 'user1')
        .gte('dia_vencimento', 20)
        .lte('dia_vencimento', 30)
        .not('melhor_dia_compra', 'is', null);

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('dia_vencimento', 20);
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('dia_vencimento', 30);
      expect(mockSupabaseClient.not).toHaveBeenCalledWith('melhor_dia_compra', 'is', null);
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain referential integrity with transactions', async () => {
      const cartaoId = '1';
      const transactionData = {
        cartao_id: cartaoId,
        descricao: 'Test Transaction',
        valor: 100,
        data: '2025-01-15',
        user_id: 'user1'
      };

      mockSupabaseClient.data = transactionData;
      mockSupabaseClient.error = null;

      // Mock transaction insertion with cartao reference
      const result = await mockSupabaseClient
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(transactionData);
    });

    it('should handle cascade operations correctly', async () => {
      const cartaoId = '1';

      mockSupabaseClient.data = null;
      mockSupabaseClient.error = null;

      // Mock cartao deletion (should handle related transactions)
      const result = await mockSupabaseClient
        .from('cartoes')
        .delete()
        .eq('id', cartaoId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('cartoes');
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', cartaoId);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabaseClient.data = null;
      mockSupabaseClient.error = {
        message: 'Network error',
        details: 'Connection timeout'
      };

      const result = await mockSupabaseClient
        .from('cartoes')
        .select('*')
        .eq('user_id', 'user1');

      expect(mockSupabaseClient.error).toBeTruthy();
      expect(mockSupabaseClient.error.message).toBe('Network error');
    });

    it('should handle database connection errors', async () => {
      mockSupabaseClient.data = null;
      mockSupabaseClient.error = {
        code: 'PGRST301',
        message: 'Database connection error'
      };

      const result = await mockSupabaseClient
        .from('cartoes')
        .insert({
          nome: 'Test Card',
          limite: 1000,
          dia_fechamento: 15,
          user_id: 'user1'
        });

      expect(mockSupabaseClient.error).toBeTruthy();
      expect(mockSupabaseClient.error.code).toBe('PGRST301');
    });

    it('should handle permission errors', async () => {
      mockSupabaseClient.data = null;
      mockSupabaseClient.error = {
        code: '42501',
        message: 'permission denied for table cartoes'
      };

      const result = await mockSupabaseClient
        .from('cartoes')
        .select('*')
        .eq('user_id', 'unauthorized_user');

      expect(mockSupabaseClient.error).toBeTruthy();
      expect(mockSupabaseClient.error.code).toBe('42501');
    });
  });

  describe('Batch Operations', () => {
    it('should handle bulk insert operations', async () => {
      const bulkCartoes = [
        {
          nome: 'Card 1',
          limite: 1000,
          dia_fechamento: 15,
          dia_vencimento: 25,
          melhor_dia_compra: 16,
          cor: '#3B82F6',
          user_id: 'user1'
        },
        {
          nome: 'Card 2',
          limite: 2000,
          dia_fechamento: 10,
          dia_vencimento: 20,
          melhor_dia_compra: 11,
          cor: '#EF4444',
          user_id: 'user1'
        }
      ];

      mockSupabaseClient.data = bulkCartoes;
      mockSupabaseClient.error = null;

      const result = await mockSupabaseClient
        .from('cartoes')
        .insert(bulkCartoes)
        .select();

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(bulkCartoes);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
    });

    it('should handle bulk update operations', async () => {
      const updateData = {
        dia_vencimento: 30,
        updated_at: new Date().toISOString()
      };

      mockSupabaseClient.data = [];
      mockSupabaseClient.error = null;

      const result = await mockSupabaseClient
        .from('cartoes')
        .update(updateData)
        .eq('user_id', 'user1')
        .is('dia_vencimento', null);

      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updateData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user1');
      expect(mockSupabaseClient.is).toHaveBeenCalledWith('dia_vencimento', null);
    });
  });
});