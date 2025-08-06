# Library Documentation

## FaturaCalculator

The `FaturaCalculator` class is the core component for calculating credit card billing periods and transaction launch dates. It provides improved accuracy over the legacy calculation methods and includes comprehensive caching and error handling.

### Key Features

- **Precise Period Calculations**: Calculates exact billing periods considering card closing and due dates
- **Launch Date Calculation**: Determines when purchases will appear on credit card bills
- **Caching System**: Implements intelligent caching to improve performance
- **Error Handling**: Includes fallback logic for edge cases
- **Performance Monitoring**: Integrated with performance monitoring for optimization

### Performance Optimizations

1. **Caching**: 
   - Fatura periods cached for 1 hour
   - Launch dates cached for 30 minutes
   - Automatic cache cleanup and card-specific cache clearing

2. **Memoization**: 
   - Expensive calculations are memoized in React components
   - Date formatting functions are cached

3. **Database Optimizations**:
   - Specific field selection in queries
   - Proper ordering for consistent results
   - Optimized indexes on frequently queried fields

### Usage Examples

```typescript
import { FaturaCalculator } from '@/lib/faturaCalculator';

// Get current billing period
const period = FaturaCalculator.getFaturaPeriod(cartao);

// Calculate when a purchase will be billed
const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDate, cartao);

// Get comprehensive calculation with all info
const calculation = FaturaCalculator.getComprehensiveCalculation(cartao);

// Get transaction preview
const preview = FaturaCalculator.getTransactionPreview(purchaseDate, cartao);
```

### Cache Management

```typescript
// Clear all cache
FaturaCalculator.clearCache();

// Clear cache for specific card
FaturaCalculator.clearCacheForCard(cartaoId);
```

## DateUtils

Utility functions for date manipulation with proper handling of edge cases like leap years, month boundaries, and invalid dates.

### Key Functions

- `getNextOccurrenceOfDay`: Find next occurrence of a specific day
- `getPreviousOccurrenceOfDay`: Find previous occurrence of a specific day
- `adjustDayForMonth`: Adjust day for months with different day counts
- `formatDateBR`: Format dates in Brazilian format

## PerformanceMonitor

Development utility for monitoring performance of expensive operations.

### Features

- **Timing Functions**: Time synchronous and asynchronous operations
- **Statistics**: Get performance statistics for specific operations
- **Development Only**: Automatically disabled in production
- **Automatic Logging**: Warns about slow operations (>10ms)

### Usage

```typescript
import PerformanceMonitor from '@/lib/performanceMonitor';

// Time a function
const result = PerformanceMonitor.timeFunction('myOperation', () => {
  // expensive operation
  return calculation();
});

// Time async function
const result = await PerformanceMonitor.timeAsyncFunction('myAsyncOp', async () => {
  return await fetchData();
});

// Get statistics
const stats = PerformanceMonitor.getStats('myOperation');
console.log(`Average: ${stats.avgDuration}ms`);
```

## Component Optimizations

### React.memo Usage

Components that perform expensive calculations are wrapped with `React.memo`:

- `FaturaPreview`: Memoized with dependency on cartao and purchase date
- `PeriodoInfo`: Memoized with dependency on cartao properties

### useMemo and useCallback

Expensive calculations and functions are memoized:

- Date parsing and formatting
- Currency formatting
- Complex calculations
- Event handlers that depend on props

### Database Query Optimizations

1. **Specific Field Selection**: Only select needed fields
2. **Proper Indexing**: Ensure queries use appropriate indexes
3. **Consistent Ordering**: Add ORDER BY for consistent results
4. **Connection Pooling**: Leverage Supabase connection pooling

## Best Practices

1. **Always use caching** for expensive calculations
2. **Clear cache** when card data changes
3. **Use fallback logic** for error handling
4. **Monitor performance** in development
5. **Memoize expensive operations** in React components
6. **Optimize database queries** with specific field selection

## Migration Notes

The improved calculation system maintains backward compatibility with existing cards while providing enhanced functionality for new cards with extended fields (`dia_vencimento`, `melhor_dia_compra`).

Legacy cards automatically use calculated default values, ensuring seamless operation without requiring user intervention.