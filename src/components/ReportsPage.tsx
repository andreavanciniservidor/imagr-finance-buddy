
import React, { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  payment_method: string | null;
  categories?: {
    name: string;
    color: string;
  };
}

interface CategoryExpense {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

const ReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [reportType, setReportType] = useState('expenses_by_category');

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedPeriod]);

  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (selectedPeriod) {
      case 'current_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'next_month':
        startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        break;
      case 'last_year':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last_quarter':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
        startDate = new Date(lastQuarterYear, lastQuarter * 3, 1);
        endDate = new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          description,
          date,
          type,
          payment_method,
          categories:category_id(name, color)
        `)
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []).map(transaction => ({
        ...transaction,
        type: transaction.type as 'income' | 'expense'
      })));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações para relatórios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (type: 'income' | 'expense') => {
    return transactions.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0);
  };

  const incomeTotal = calculateTotal('income');
  const expenseTotal = calculateTotal('expense');
  const balance = incomeTotal - expenseTotal;

  const getCategoryExpenses = (): CategoryExpense[] => {
    const categoryTotals: { [key: string]: { amount: number; color: string } } = {};
    
    transactions.forEach(transaction => {
      if (transaction.type === 'expense' && transaction.categories) {
        const categoryName = transaction.categories.name;
        const categoryColor = transaction.categories.color;
        
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = { amount: 0, color: categoryColor };
        }
        categoryTotals[categoryName].amount += transaction.amount;
      }
    });

    const totalExpenses = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.amount, 0);

    return Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        color: data.color,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const exportToCSV = () => {
    const categoryExpenses = getCategoryExpenses();
    const csvContent = [
      ['Categoria', 'Valor', 'Percentual'],
      ...categoryExpenses.map(cat => [
        cat.name,
        `R$ ${cat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `${cat.percentage.toFixed(1)}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-despesas-categoria.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const categoryExpenses = getCategoryExpenses();
      
      // Configurar fonte para suportar caracteres especiais
      doc.setFont('helvetica');
      
      // Título do relatório
      doc.setFontSize(20);
      doc.text('Relatório Financeiro', 20, 20);
      
      // Informações do período
      const periodText = selectedPeriod === 'current_month' ? 'Mês Atual' : 
                        selectedPeriod === 'last_month' ? 'Último Mês' :
                        selectedPeriod === 'next_month' ? 'Próximo Mês' :
                        selectedPeriod === 'last_year' ? 'Último Ano' :
                        selectedPeriod === 'last_quarter' ? 'Último Trimestre' : 'Período Selecionado';
      
      doc.setFontSize(12);
      doc.text(`Período: ${periodText}`, 20, 35);
      doc.text(`Tipo: Despesas por Categoria`, 20, 45);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 20, 55);
      
      // Resumo financeiro
      doc.setFontSize(16);
      doc.text('Resumo do Período', 20, 75);
      
      doc.setFontSize(12);
      doc.text(`Receitas: R$ ${incomeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 90);
      doc.text(`Despesas: R$ ${expenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 100);
      doc.text(`Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, signDisplay: 'always' })}`, 20, 110);
      
      // Tabela de despesas por categoria
      if (categoryExpenses.length > 0) {
        doc.setFontSize(16);
        doc.text('Despesas por Categoria', 20, 130);
        
        // Preparar dados da tabela
        const tableData = categoryExpenses.map(category => [
          category.name,
          `R$ ${category.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `${category.percentage.toFixed(1)}%`
        ]);
        
        // Adicionar tabela usando autoTable
        autoTable(doc, {
          head: [['Categoria', 'Valor', 'Percentual']],
          body: tableData,
          startY: 140,
          styles: {
            fontSize: 10,
            cellPadding: 5,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' }
          }
        });
      }
      
      // Salvar o PDF
      const fileName = `relatorio-despesas-categoria-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado com sucesso!",
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório PDF",
        variant: "destructive"
      });
    }
  };

  const categoryExpenses = getCategoryExpenses();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Relatórios</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Filtros de Relatório */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Relatório</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PERÍODO:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="current_month">Mês Atual</option>
                <option value="next_month">Próximo Mês</option>
                <option value="last_year">Último Ano</option>
                <option value="last_month">Último Mês</option>
                <option value="last_quarter">Último Trimestre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">TIPO DE RELATÓRIO:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="expenses_by_category">Despesas por Categoria</option>
                <option value="payment_method">Método de Pagamento</option>
                <option value="monthly_transactions">Transações do Mês</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumo do Período */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Período</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-gray-700">Receitas</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                R$ {incomeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-gray-700">Despesas</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                R$ {expenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-gray-700">Saldo</span>
              </div>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, signDisplay: 'always' })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-blue-600">
              Relatório gerado para: {selectedPeriod === 'current_month' ? 'Mês Atual' : selectedPeriod === 'last_month' ? 'Mês Anterior' : 'Ano Atual'} - Despesas por Categoria
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Despesas por Categoria</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando relatório...</div>
          ) : categoryExpenses.length > 0 ? (
            <div className="space-y-4">
              {categoryExpenses.map((category, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-24 text-sm text-gray-700 font-medium">
                    {category.name}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-6 relative">
                      <div
                        className="h-6 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: category.color,
                          width: `${category.percentage}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      R$ {category.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhuma despesa encontrada para o período selecionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
