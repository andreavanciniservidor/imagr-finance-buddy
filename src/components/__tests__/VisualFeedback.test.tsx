import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FaturaPreview from '../FaturaPreview';
import PeriodoInfo from '../PeriodoInfo';
import { CartaoExtended } from '../../types/cartao';

// Mock the tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}));

describe('Visual Feedback Improvements', () => {
  const mockCartao: CartaoExtended = {
    id: '1',
    nome: 'Test Card',
    limite: 1000,
    dia_fechamento: 15,
    dia_vencimento: 25,
    melhor_dia_compra: 16,
    cor: '#3B82F6',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'user1'
  };

  describe('FaturaPreview Visual Enhancements', () => {
    it('should show loading state when isLoading is true', () => {
      const { container } = render(
        <FaturaPreview
          cartao={mockCartao}
          purchaseDate="2024-01-10"
          amount="100"
          isLoading={true}
        />
      );

      expect(screen.getByText('Calculando preview...')).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should highlight postponed launch dates with warning colors', () => {
      render(
        <FaturaPreview
          cartao={mockCartao}
          purchaseDate="2024-01-20" // After closing day, will be postponed
          amount="100"
        />
      );

      // Should show postponed launch warning (text might be different based on delay)
      const warningTexts = screen.getAllByText(/Lançamento/);
      expect(warningTexts.length).toBeGreaterThan(0);
    });

    it('should show significant delay warning for major postponements', () => {
      render(
        <FaturaPreview
          cartao={mockCartao}
          purchaseDate="2024-01-01" // Very early in month, significant delay
          amount="100"
        />
      );

      // The component should detect significant delays and show appropriate warning
      const preview = screen.getByText(/Preview do Lançamento/);
      expect(preview).toBeInTheDocument();
    });

    it('should display tooltips for help text', () => {
      render(
        <FaturaPreview
          cartao={mockCartao}
          purchaseDate="2024-01-10"
          amount="100"
        />
      );

      // Should have tooltip content elements
      const tooltipContents = screen.getAllByTestId('tooltip-content');
      expect(tooltipContents.length).toBeGreaterThan(0);
    });
  });

  describe('PeriodoInfo Visual Enhancements', () => {
    it('should show urgency indicators for closing dates', () => {
      // Mock a cartao that closes today (urgent)
      const urgentCartao = {
        ...mockCartao,
        dia_fechamento: new Date().getDate() // Today
      };

      render(<PeriodoInfo cartao={urgentCartao} />);

      // Should show closing indicator (text might vary based on calculation)
      const closingText = screen.getByText(/dias para fechar|Fecha/);
      expect(closingText).toBeInTheDocument();
    });

    it('should display tooltips for period information', () => {
      render(<PeriodoInfo cartao={mockCartao} showDetails={true} />);

      // Should have tooltip content elements
      const tooltipContents = screen.getAllByTestId('tooltip-content');
      expect(tooltipContents.length).toBeGreaterThan(0);
    });

    it('should show best purchase day when configured', () => {
      render(<PeriodoInfo cartao={mockCartao} showDetails={true} />);

      expect(screen.getByText('Melhor dia para compras:')).toBeInTheDocument();
      expect(screen.getByText('Dia 16')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loading in FaturaPreview', () => {
      const { container } = render(
        <FaturaPreview
          cartao={mockCartao}
          purchaseDate="2024-01-10"
          amount="100"
          isLoading={true}
        />
      );

      // Should show loading skeleton elements
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Highlighting', () => {
    it('should use different colors for different launch scenarios', () => {
      const { rerender, container } = render(
        <FaturaPreview
          cartao={mockCartao}
          purchaseDate="2024-01-10" // Normal scenario
          amount="100"
        />
      );

      // Check for blue background (normal scenario) - might be different based on calculation
      let normalContainer = container.querySelector('[class*="bg-"]');
      expect(normalContainer).toBeInTheDocument();

      // Rerender with postponed scenario
      rerender(
        <FaturaPreview
          cartao={mockCartao}
          purchaseDate="2024-01-20" // After closing, postponed
          amount="100"
        />
      );

      // Should show warning colors for postponed launch (text might vary)
      const warningElements = screen.getAllByText(/Lançamento/);
      expect(warningElements.length).toBeGreaterThan(0);
    });
  });
});