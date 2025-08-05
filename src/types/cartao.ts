/**
 * TypeScript interfaces for extended cartao types
 * These interfaces extend the base Supabase types with additional functionality
 */

import { Tables, Database } from '../integrations/supabase/types';

// Base cartao type from Supabase
export type Cartao = Tables<'cartoes'>;

// Extended cartao interface with computed properties and methods
export interface CartaoExtended extends Cartao {
  // All base properties are inherited from Cartao
  // dia_vencimento and melhor_dia_compra are already included as optional fields
}

// Interface for fatura period calculations
export interface FaturaPeriod {
  inicio: Date;
  fim: Date;
  mesReferencia: string;
  diasRestantes: number;
}

// Interface for comprehensive fatura calculations
export interface FaturaCalculation {
  periodoAtual: FaturaPeriod;
  proximoFechamento: Date;
  proximoVencimento: Date;
  diasParaFechamento: number;
  melhorDiaCompra: number;
}

// Interface for transaction preview calculations
export interface TransactionPreview {
  dataLancamento: Date;
  mesLancamento: string;
  periodoFatura: FaturaPeriod;
  diasAteVencimento: number;
  isLancamentoPostergado?: boolean; // true if launch date is different from purchase date month
}

// Interface for cartao form data (used in modals and forms)
export interface CartaoFormData {
  nome: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento?: number | null;
  melhor_dia_compra?: number | null;
  cor: string;
}

// Interface for cartao validation errors
export interface CartaoValidationErrors {
  nome?: string;
  limite?: string;
  dia_fechamento?: string;
  dia_vencimento?: string;
  melhor_dia_compra?: string;
  cor?: string;
}

// Interface for cartao display information
export interface CartaoDisplayInfo {
  cartao: CartaoExtended;
  periodoAtual: FaturaPeriod;
  proximoFechamento: Date;
  proximoVencimento: Date;
  diasRestantes: number;
  melhorDiaCompra: number;
  utilizacao?: number; // percentage of limit used (if available)
}

// Type for cartao creation payload
export type CartaoCreatePayload = Omit<Database['public']['Tables']['cartoes']['Insert'], 'id' | 'created_at' | 'updated_at' | 'user_id'>;

// Type for cartao update payload
export type CartaoUpdatePayload = Omit<Database['public']['Tables']['cartoes']['Update'], 'id' | 'created_at' | 'updated_at' | 'user_id'>;

// Enum for cartao-related date calculation types
export enum DateCalculationType {
  CURRENT_PERIOD = 'current_period',
  NEXT_CLOSING = 'next_closing',
  NEXT_DUE = 'next_due',
  LAUNCH_DATE = 'launch_date',
  BEST_PURCHASE_DAY = 'best_purchase_day'
}

// Interface for date calculation options
export interface DateCalculationOptions {
  type: DateCalculationType;
  referenceDate?: Date;
  purchaseDate?: Date;
}

// Interface for cartao statistics (for reporting/analytics)
export interface CartaoStatistics {
  cartaoId: string;
  totalTransactions: number;
  totalAmount: number;
  averageTransactionAmount: number;
  utilizacaoMedia: number;
  diasMediosAteVencimento: number;
}

// Type guard to check if a cartao has extended billing fields
export function hasExtendedBillingFields(cartao: Cartao): cartao is CartaoExtended {
  return cartao.dia_vencimento !== null || cartao.melhor_dia_compra !== null;
}

// Type guard to check if a cartao has complete billing configuration
export function hasCompleteBillingConfig(cartao: Cartao): boolean {
  return cartao.dia_fechamento > 0 && 
         cartao.dia_vencimento !== null && 
         cartao.dia_vencimento > 0;
}

// Default values for cartao fields
export const CARTAO_DEFAULTS = {
  cor: '#3B82F6',
  limite: 0,
  dia_vencimento_offset: 10, // Default offset from closing date
} as const;

// Validation constraints
export const CARTAO_CONSTRAINTS = {
  nome: {
    minLength: 1,
    maxLength: 100,
  },
  limite: {
    min: 0,
    max: 999999.99,
  },
  dia_fechamento: {
    min: 1,
    max: 31,
  },
  dia_vencimento: {
    min: 1,
    max: 31,
  },
  melhor_dia_compra: {
    min: 1,
    max: 31,
  },
} as const;