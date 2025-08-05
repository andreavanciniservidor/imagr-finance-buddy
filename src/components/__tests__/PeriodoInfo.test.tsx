import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PeriodoInfo from '../PeriodoInfo';
import { CartaoExtended } from '@/types/cartao';

// Mock cartao for testing
const mockCartao: CartaoExtended = {
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

describe('PeriodoInfo', () => {
  it('should render period information correctly', () => {
    render(<PeriodoInfo cartao={mockCartao} />);
    
    // Check if period information is displayed
    expect(screen.getByText('Período atual:')).toBeInTheDocument();
    expect(screen.getByText('Próximo fechamento:')).toBeInTheDocument();
    expect(screen.getByText('Próximo vencimento:')).toBeInTheDocument();
  });

  it('should show best purchase day when configured', () => {
    render(<PeriodoInfo cartao={mockCartao} showDetails={true} />);
    
    expect(screen.getByText('Melhor dia para compras:')).toBeInTheDocument();
    expect(screen.getByText('Dia 16')).toBeInTheDocument();
  });

  it('should not show best purchase day when not configured', () => {
    const cartaoWithoutBestDay = { ...mockCartao, melhor_dia_compra: null };
    render(<PeriodoInfo cartao={cartaoWithoutBestDay} showDetails={true} />);
    
    expect(screen.queryByText('Melhor dia para compras:')).not.toBeInTheDocument();
  });

  it('should hide details when showDetails is false', () => {
    render(<PeriodoInfo cartao={mockCartao} showDetails={false} />);
    
    // Should show basic info
    expect(screen.getByText('Período atual:')).toBeInTheDocument();
    
    // Should not show detailed info
    expect(screen.queryByText('Próximo fechamento:')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximo vencimento:')).not.toBeInTheDocument();
  });

  it('should display days until closing correctly', () => {
    render(<PeriodoInfo cartao={mockCartao} />);
    
    // Should show some variation of days remaining text
    const daysText = screen.getByText(/dias para fechar|Fecha hoje|Fecha amanhã/);
    expect(daysText).toBeInTheDocument();
  });
});
