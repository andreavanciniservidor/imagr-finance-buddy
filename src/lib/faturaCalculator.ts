/**
 * FaturaCalculator - Core logic for credit card billing period calculations
 * This class handles all calculations related to credit card billing periods,
 * including launch dates, due dates, and period boundaries.
 * 
 * Performance optimizations:
 * - Caching for frequently calculated periods
 * - Memoization of expensive calculations
 * - Efficient date operations
 */

import { 
  CartaoExtended, 
  FaturaPeriod, 
  TransactionPreview, 
  FaturaCalculation,
  CARTAO_DEFAULTS 
} from '../types/cartao';
import {
  getNextOccurrenceOfDay,
  getPreviousOccurrenceOfDay,
  getMonthNamePT,
  daysDifference,
  adjustDayForMonth,
  createDateWithDayAdjustment
} from './dateUtils';
import PerformanceMonitor from './performanceMonitor';

// Cache interface for storing calculated periods
interface CacheEntry {
  result: FaturaPeriod;
  timestamp: number;
}

// Cache for fatura periods - expires after 1 hour
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const faturaCache = new Map<string, CacheEntry>();

// Cache for launch date calculations - expires after 30 minutes
const launchDateCache = new Map<string, { result: Date; timestamp: number }>();
const LAUNCH_DATE_CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export class FaturaCalculator {
  /**
   * Generates a cache key for fatura period calculations
   * @private
   */
  private static generateFaturaCacheKey(cartao: CartaoExtended, referenceDate: Date): string {
    const dateKey = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}-${referenceDate.getDate()}`;
    return `fatura_${cartao.id}_${cartao.dia_fechamento}_${cartao.dia_vencimento || 'null'}_${dateKey}`;
  }

  /**
   * Generates a cache key for launch date calculations
   * @private
   */
  private static generateLaunchDateCacheKey(purchaseDate: Date, cartao: CartaoExtended): string {
    const dateKey = `${purchaseDate.getFullYear()}-${purchaseDate.getMonth()}-${purchaseDate.getDate()}`;
    return `launch_${cartao.id}_${cartao.dia_fechamento}_${cartao.dia_vencimento || 'null'}_${dateKey}`;
  }

  /**
   * Clears expired entries from cache
   * @private
   */
  private static cleanupCache(): void {
    const now = Date.now();
    
    // Clean fatura cache
    for (const [key, entry] of faturaCache.entries()) {
      if (now - entry.timestamp > CACHE_EXPIRY_MS) {
        faturaCache.delete(key);
      }
    }
    
    // Clean launch date cache
    for (const [key, entry] of launchDateCache.entries()) {
      if (now - entry.timestamp > LAUNCH_DATE_CACHE_EXPIRY_MS) {
        launchDateCache.delete(key);
      }
    }
  }

  /**
   * Clears all cached data (useful for testing or when card data changes)
   */
  static clearCache(): void {
    faturaCache.clear();
    launchDateCache.clear();
  }

  /**
   * Clears cache entries for a specific card
   */
  static clearCacheForCard(cartaoId: string): void {
    // Clear fatura cache entries for this card
    for (const [key] of faturaCache.entries()) {
      if (key.includes(`_${cartaoId}_`)) {
        faturaCache.delete(key);
      }
    }
    
    // Clear launch date cache entries for this card
    for (const [key] of launchDateCache.entries()) {
      if (key.includes(`_${cartaoId}_`)) {
        launchDateCache.delete(key);
      }
    }
  }
  /**
   * Calculates the billing period for a specific reference date
   * Returns the period that contains the reference date
   * Includes fallback logic for calculation errors and caching for performance
   */
  static getFaturaPeriod(cartao: CartaoExtended, referenceDate: Date = new Date()): FaturaPeriod {
    return PerformanceMonitor.timeFunction('FaturaCalculator.getFaturaPeriod', () => {
      // Validate inputs first - handle null/undefined cartao
      if (!cartao) {
        console.warn('FaturaCalculator.getFaturaPeriod: null/undefined cartao provided, using fallback');
        return this.getFallbackFaturaPeriod({ dia_fechamento: 15 } as CartaoExtended, referenceDate);
      }
      
      // Check cache first
      const cacheKey = this.generateFaturaCacheKey(cartao, referenceDate);
      const cachedEntry = faturaCache.get(cacheKey);
      
      if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CACHE_EXPIRY_MS) {
        return cachedEntry.result;
      }
      
      // Cleanup expired cache entries periodically
      if (Math.random() < 0.1) { // 10% chance to cleanup on each call
        this.cleanupCache();
      }

      try {
        // Validate inputs
        if (!this.isValidDate(referenceDate)) {
          throw new Error('Invalid reference date provided');
        }
        
        const validation = this.validateCardConfiguration(cartao);
        if (!validation.isValid) {
          throw new Error(`Invalid card configuration: ${validation.errors.join(', ')}`);
        }

        const closingDay = cartao.dia_fechamento;
        
        // Get the current month's closing date
        const currentClosing = getPreviousOccurrenceOfDay(referenceDate, closingDay);
        
        // Get the next month's closing date (end of current period)
        const nextClosing = getNextOccurrenceOfDay(currentClosing, closingDay);
        
        // Period starts the day after previous closing and ends on next closing
        const inicio = new Date(currentClosing);
        inicio.setDate(inicio.getDate() + 1);
        
        const fim = nextClosing;
        
        // Calculate reference month (the month when the bill is due)
        const mesReferencia = `${getMonthNamePT(nextClosing)} ${nextClosing.getFullYear()}`;
        
        // Calculate days remaining until closing
        const diasRestantes = Math.max(0, daysDifference(referenceDate, fim));
        
        const result = {
          inicio,
          fim,
          mesReferencia,
          diasRestantes
        };
        
        // Cache the result
        faturaCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        // Fallback to simple calculation if advanced calculation fails
        console.warn('FaturaCalculator.getFaturaPeriod failed, using fallback:', error);
        const fallbackResult = this.getFallbackFaturaPeriod(cartao, referenceDate);
        
        // Cache fallback result too (with shorter expiry)
        faturaCache.set(cacheKey, {
          result: fallbackResult,
          timestamp: Date.now()
        });
        
        return fallbackResult;
      }
    });
  }

  /**
   * Validates if a date is valid and not NaN
   */
  static isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Fallback calculation for getFaturaPeriod when main calculation fails
   * Uses simple logic without complex date adjustments
   */
  static getFallbackFaturaPeriod(cartao: CartaoExtended, referenceDate: Date): FaturaPeriod {
    try {
      const closingDay = Math.min(Math.max(cartao.dia_fechamento || 15, 1), 31);
      const currentYear = referenceDate.getFullYear();
      const currentMonth = referenceDate.getMonth();
      const currentDay = referenceDate.getDate();
      
      // Simple logic: if we're past closing day, use next month's period
      let periodStartMonth = currentMonth;
      let periodStartYear = currentYear;
      
      if (currentDay > closingDay) {
        periodStartMonth++;
        if (periodStartMonth > 11) {
          periodStartMonth = 0;
          periodStartYear++;
        }
      }
      
      // Create simple dates without complex adjustments
      const inicio = new Date(periodStartYear, periodStartMonth, closingDay + 1);
      const fim = new Date(periodStartYear, periodStartMonth + 1, closingDay);
      
      // Handle year wrap for fim
      if (fim.getMonth() === 0 && periodStartMonth === 11) {
        fim.setFullYear(periodStartYear + 1);
      }
      
      const mesReferencia = `${getMonthNamePT(fim)} ${fim.getFullYear()}`;
      const diasRestantes = Math.max(0, Math.ceil((fim.getTime() - referenceDate.getTime()) / (1000 * 3600 * 24)));
      
      return {
        inicio,
        fim,
        mesReferencia,
        diasRestantes
      };
    } catch (error) {
      // Ultimate fallback with hardcoded values
      console.error('Even fallback calculation failed:', error);
      const now = new Date();
      return {
        inicio: now,
        fim: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        mesReferencia: `${getMonthNamePT(now)} ${now.getFullYear()}`,
        diasRestantes: 30
      };
    }
  }

  /**
   * Calculates when a purchase will be launched (appear on the bill)
   * Based on the purchase date and the card's billing cycle
   * Includes error handling, fallback logic, and caching for performance
   */
  static calculateLaunchDate(purchaseDate: Date, cartao: CartaoExtended): Date {
    return PerformanceMonitor.timeFunction('FaturaCalculator.calculateLaunchDate', () => {
      // Validate inputs first - handle null/undefined cartao
      if (!cartao) {
        console.warn('FaturaCalculator.calculateLaunchDate: null/undefined cartao provided, using fallback');
        return this.getFallbackLaunchDate(purchaseDate, { dia_fechamento: 15 } as CartaoExtended);
      }
      
      // Check cache first
      const cacheKey = this.generateLaunchDateCacheKey(purchaseDate, cartao);
      const cachedEntry = launchDateCache.get(cacheKey);
      
      if (cachedEntry && (Date.now() - cachedEntry.timestamp) < LAUNCH_DATE_CACHE_EXPIRY_MS) {
        return cachedEntry.result;
      }

      try {
        // Validate inputs
        if (!this.isValidDate(purchaseDate)) {
          throw new Error('Invalid purchase date provided');
        }
        
        const validation = this.validateCardConfiguration(cartao);
        if (!validation.isValid) {
          throw new Error(`Invalid card configuration: ${validation.errors.join(', ')}`);
        }

        const closingDay = cartao.dia_fechamento;
        
        // Get the next closing date after the purchase
        const nextClosing = getNextOccurrenceOfDay(purchaseDate, closingDay);
        
        // The launch date is typically the month after the closing
        // But we need to consider the due date for the actual billing month
        const dueDay = cartao.dia_vencimento || (closingDay + CARTAO_DEFAULTS.dia_vencimento_offset);
        const adjustedDueDay = adjustDayForMonth(dueDay, nextClosing.getFullYear(), nextClosing.getMonth() + 1);
        
        // Create the launch date in the month after closing
        const launchYear = nextClosing.getMonth() === 11 ? nextClosing.getFullYear() + 1 : nextClosing.getFullYear();
        const launchMonth = nextClosing.getMonth() === 11 ? 1 : nextClosing.getMonth() + 2; // +2 because getMonth() is 0-indexed
        
        const result = createDateWithDayAdjustment(launchYear, launchMonth, adjustedDueDay);
        
        // Cache the result
        launchDateCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        // Fallback to simple calculation if advanced calculation fails
        console.warn('FaturaCalculator.calculateLaunchDate failed, using fallback:', error);
        const fallbackResult = this.getFallbackLaunchDate(purchaseDate, cartao);
        
        // Cache fallback result too
        launchDateCache.set(cacheKey, {
          result: fallbackResult,
          timestamp: Date.now()
        });
        
        return fallbackResult;
      }
    });
  }

  /**
   * Fallback calculation for calculateLaunchDate when main calculation fails
   * Uses simple logic without complex date adjustments
   */
  static getFallbackLaunchDate(purchaseDate: Date, cartao: CartaoExtended): Date {
    try {
      const closingDay = Math.min(Math.max(cartao.dia_fechamento || 15, 1), 31);
      const dueDay = Math.min(Math.max(cartao.dia_vencimento || (closingDay + 10), 1), 31);
      
      // Simple logic: add 1-2 months to purchase date and use due day
      const launchDate = new Date(purchaseDate);
      launchDate.setMonth(launchDate.getMonth() + 2);
      launchDate.setDate(Math.min(dueDay, new Date(launchDate.getFullYear(), launchDate.getMonth() + 1, 0).getDate()));
      
      return launchDate;
    } catch (error) {
      // Ultimate fallback: 45 days from purchase date
      console.error('Even fallback launch date calculation failed:', error);
      const fallbackDate = new Date(purchaseDate);
      fallbackDate.setDate(fallbackDate.getDate() + 45);
      return fallbackDate;
    }
  }

  /**
   * Checks if a date is within the current billing period
   */
  static isInCurrentPeriod(date: Date, cartao: CartaoExtended): boolean {
    const period = this.getFaturaPeriod(cartao, date);
    return date >= period.inicio && date <= period.fim;
  }

  /**
   * Gets the next closing date from a reference date
   */
  static getNextClosingDate(cartao: CartaoExtended, referenceDate: Date = new Date()): Date {
    return getNextOccurrenceOfDay(referenceDate, cartao.dia_fechamento);
  }

  /**
   * Gets the next due date from a reference date
   */
  static getNextDueDate(cartao: CartaoExtended, referenceDate: Date = new Date()): Date {
    const dueDay = cartao.dia_vencimento || (cartao.dia_fechamento + CARTAO_DEFAULTS.dia_vencimento_offset);
    return getNextOccurrenceOfDay(referenceDate, dueDay);
  }

  /**
   * Calculates the best day to make purchases for maximum payment term
   */
  static getBestPurchaseDay(cartao: CartaoExtended): number {
    if (cartao.melhor_dia_compra) {
      return cartao.melhor_dia_compra;
    }
    
    // If not configured, calculate as the day after closing
    // This gives the maximum time until the next closing
    const bestDay = cartao.dia_fechamento + 1;
    return bestDay > 31 ? 1 : bestDay; // Wrap to next month if needed
  }

  /**
   * Creates a comprehensive calculation with all relevant information
   */
  static getComprehensiveCalculation(cartao: CartaoExtended, referenceDate: Date = new Date()): FaturaCalculation {
    const periodoAtual = this.getFaturaPeriod(cartao, referenceDate);
    const proximoFechamento = this.getNextClosingDate(cartao, referenceDate);
    const proximoVencimento = this.getNextDueDate(cartao, referenceDate);
    const diasParaFechamento = daysDifference(referenceDate, proximoFechamento);
    const melhorDiaCompra = this.getBestPurchaseDay(cartao);

    return {
      periodoAtual,
      proximoFechamento,
      proximoVencimento,
      diasParaFechamento,
      melhorDiaCompra
    };
  }

  /**
   * Creates a transaction preview showing when and how a purchase will be billed
   */
  static getTransactionPreview(
    purchaseDate: Date, 
    cartao: CartaoExtended
  ): TransactionPreview {
    const dataLancamento = this.calculateLaunchDate(purchaseDate, cartao);
    const periodoFatura = this.getFaturaPeriod(cartao, purchaseDate);
    const mesLancamento = `${getMonthNamePT(dataLancamento)} ${dataLancamento.getFullYear()}`;
    const diasAteVencimento = daysDifference(purchaseDate, dataLancamento);
    
    // Check if the launch is postponed (different month than purchase)
    const isLancamentoPostergado = purchaseDate.getMonth() !== dataLancamento.getMonth() ||
                                   purchaseDate.getFullYear() !== dataLancamento.getFullYear();

    return {
      dataLancamento,
      mesLancamento,
      periodoFatura,
      diasAteVencimento,
      isLancamentoPostergado
    };
  }

  /**
   * Validates if the card configuration is valid for calculations
   */
  static validateCardConfiguration(cartao: CartaoExtended): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!cartao.dia_fechamento || cartao.dia_fechamento < 1 || cartao.dia_fechamento > 31) {
      errors.push('Dia de fechamento deve estar entre 1 e 31');
    }

    if (cartao.dia_vencimento !== null) {
      if (cartao.dia_vencimento < 1 || cartao.dia_vencimento > 31) {
        errors.push('Dia de vencimento deve estar entre 1 e 31');
      }
      
      if (cartao.dia_vencimento === cartao.dia_fechamento) {
        errors.push('Dia de vencimento não pode ser igual ao dia de fechamento');
      }
    }

    if (cartao.melhor_dia_compra !== null) {
      if (cartao.melhor_dia_compra < 1 || cartao.melhor_dia_compra > 31) {
        errors.push('Melhor dia de compra deve estar entre 1 e 31');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Handles backward compatibility for cards without extended fields
   * Returns calculated default values for missing fields
   */
  static getCompatibilityDefaults(cartao: CartaoExtended): {
    dia_vencimento: number;
    melhor_dia_compra: number;
  } {
    const dia_vencimento = cartao.dia_vencimento || 
      (cartao.dia_fechamento + CARTAO_DEFAULTS.dia_vencimento_offset > 31 
        ? (cartao.dia_fechamento + CARTAO_DEFAULTS.dia_vencimento_offset) - 31
        : cartao.dia_fechamento + CARTAO_DEFAULTS.dia_vencimento_offset);

    const melhor_dia_compra = cartao.melhor_dia_compra || this.getBestPurchaseDay(cartao);

    return {
      dia_vencimento,
      melhor_dia_compra
    };
  }
}