import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

// Função utilitária para formatar datas sem problemas de fuso horário
const formatDateForDisplay = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('pt-BR');
};

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categories: { name: string } | null;
  payment_method: string;
}

const ReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState('Mês Atual');
  const [reportType, setReportType] = useState('Despesas por Categoria');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  // Auto-generate report when period or reportType changes
  useEffect(() => {
    if (transactions.length > 0) {
      const { startDate, endDate } = getDateRange(period);

      const filtered = transactions.filter(transaction => {
        // Parse manual da data para evitar problemas de fuso horário
        const [year, month, day] = transaction.date.split('-').map(Number);
        const transactionDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      setFilteredTransactions(filtered);
    }
  }, [transactions, period, reportType]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          type,
          payment_method,
          categories(name)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Type assertion for transactions to ensure proper typing
      const typedTransactions = (data || []).map(t => ({
        ...t,
        type: t.type as 'income' | 'expense'
      }));

      setTransactions(typedTransactions);
      setFilteredTransactions(typedTransactions); // Initialize with all transactions
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (period) {
      case 'Mês Atual':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'Próximo Mês':
        startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        break;
      case 'Último Mês':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'Último Trimestre':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3 - 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case 'Último Ano':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  };

  const generateReport = () => {
    const { startDate, endDate } = getDateRange(period);

    const filtered = transactions.filter(transaction => {
      // Parse manual da data para evitar problemas de fuso horário
      const [year, month, day] = transaction.date.split('-').map(Number);
      const transactionDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    setFilteredTransactions(filtered);
    setReportGenerated(true);

    toast({
      title: "Sucesso",
      description: `Relatório gerado para ${period.toLowerCase()}`,
    });
  };

  const exportToCSV = () => {
    if (!reportGenerated) {
      toast({
        title: "Erro",
        description: "Gere um relatório primeiro antes de exportar",
        variant: "destructive"
      });
      return;
    }

    let csvData: any[] = [];
    const fileName = `relatorio_${reportType.toLowerCase().replace(/\s+/g, '_')}_${period.toLowerCase().replace(/\s+/g, '_')}.csv`;

    switch (reportType) {
      case 'Despesas por Categoria':
        csvData = categoryExpenses.map(cat => ({
          'Categoria': cat.name,
          'Valor (R$)': cat.value.toFixed(2),
          'Percentual (%)': ((cat.value / expenses) * 100).toFixed(1)
        }));
        break;

      case 'Receitas vs Despesas':
        csvData = [
          { 'Tipo': 'Receitas', 'Valor (R$)': income.toFixed(2) },
          { 'Tipo': 'Despesas', 'Valor (R$)': expenses.toFixed(2) },
          { 'Tipo': 'Saldo Final', 'Valor (R$)': balance.toFixed(2) }
        ];
        break;

      case 'Evolução Mensal':
        csvData = monthlyEvolution.map(month => ({
          'Mês': month.month,
          'Receitas (R$)': month.income.toFixed(2),
          'Despesas (R$)': month.expenses.toFixed(2),
          'Saldo (R$)': month.balance.toFixed(2)
        }));
        break;

      case 'Método de Pagamento':
        csvData = paymentMethodExpenses.map(pm => ({
          'Método de Pagamento': pm.name,
          'Valor (R$)': pm.value.toFixed(2),
          'Percentual (%)': ((pm.value / expenses) * 100).toFixed(1)
        }));
        break;

      case 'Transações do Mês':
        csvData = filteredTransactions.map(transaction => ({
          'Data': formatDateForDisplay(transaction.date),
          'Descrição': transaction.description && transaction.description.trim() !== ''
            ? transaction.description
            : transaction.categories?.name || (transaction.type === 'income' ? 'Receita' : 'Despesa'),
          'Categoria': transaction.categories?.name || 'Outros',
          'Tipo': transaction.type === 'income' ? 'Receita' : 'Despesa',
          'Valor (R$)': transaction.amount.toFixed(2)
        }));
        break;
    }

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Sucesso",
      description: "Relatório CSV baixado com sucesso!",
    });
  };

  const exportToPDF = async () => {
    if (!reportGenerated || !reportRef.current) {
      toast({
        title: "Erro",
        description: "Gere um relatório primeiro antes de exportar",
        variant: "destructive"
      });
      return;
    }

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Adicionar título
      pdf.setFontSize(16);
      pdf.text(`Relatório Financeiro - ${reportType}`, 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Período: ${period}`, 20, 30);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);

      // Adicionar resumo
      pdf.text(`Receitas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 55);
      pdf.text(`Despesas: R$ ${expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 65);
      pdf.text(`Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 75);

      // Calcular dimensões da imagem
      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Adicionar imagem do relatório
      pdf.addImage(imgData, 'PNG', 20, 85, imgWidth, imgHeight);

      const fileName = `relatorio_${reportType.toLowerCase().replace(/\s+/g, '_')}_${period.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Sucesso",
        description: "Relatório PDF baixado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Calculate summary data based on filtered transactions
  const dataToUse = reportGenerated ? filteredTransactions : transactions;

  const income = dataToUse
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = dataToUse
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = income - expenses;

  // Calculate expenses by category
  const expensesByCategory = dataToUse
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const category = t.categories?.name || 'Outros';
      acc[category] = (acc[category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const categoryExpenses = Object.entries(expensesByCategory)
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR')) // Ordenação alfabética
    .map(([name, value], index) => ({
      name,
      value,
      color: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'][index % 5]
    }));

  const maxValue = Math.max(...categoryExpenses.map(cat => cat.value), 1);

  // Calculate expenses by payment method
  const expensesByPaymentMethod = dataToUse
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const paymentMethod = getPaymentMethodName(t.payment_method) || 'Outros';
      acc[paymentMethod] = (acc[paymentMethod] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const paymentMethodExpenses = Object.entries(expensesByPaymentMethod)
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR')) // Ordenação alfabética
    .map(([name, value], index) => ({
      name,
      value,
      color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'][index % 5]
    }));

  const maxPaymentMethodValue = Math.max(...paymentMethodExpenses.map(pm => pm.value), 1);

  // Function to get payment method display name
  function getPaymentMethodName(paymentMethod: string): string {
    const paymentMethods: Record<string, string> = {
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'cash': 'Dinheiro',
      'pix': 'Pix',
      'transfer': 'Transferência'
    };
    return paymentMethods[paymentMethod] || paymentMethod || 'Outros';
  }

  // Calculate monthly evolution data
  const getMonthlyEvolution = () => {
    const monthlyData: Record<string, { income: number; expenses: number }> = {};

    dataToUse.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += Number(transaction.amount);
      } else {
        monthlyData[monthKey].expenses += Number(transaction.amount);
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        ...data,
        balance: data.income - data.expenses
      }));
  };

  const monthlyEvolution = getMonthlyEvolution();
  const maxMonthlyValue = Math.max(
    ...monthlyEvolution.flatMap(m => [m.income, m.expenses]),
    1
  );

  const renderReportContent = () => {
    switch (reportType) {
      case 'Receitas vs Despesas':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Receitas vs Despesas</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-700 font-medium">Receitas</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">
                    R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-gray-700 font-medium">Despesas</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-red-600">
                    R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-gray-700 font-medium">Saldo Final</span>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Visual comparison */}
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">Comparação Visual</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Receitas</span>
                      <span>{income > 0 ? ((income / (income + expenses)) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: income > 0 ? `${(income / (income + expenses)) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Despesas</span>
                      <span>{expenses > 0 ? ((expenses / (income + expenses)) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-red-500 h-3 rounded-full"
                        style={{ width: expenses > 0 ? `${(expenses / (income + expenses)) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Evolução Mensal':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Evolução Mensal</h2>
            <div className="space-y-4">
              {monthlyEvolution.length > 0 ? (
                monthlyEvolution.map((month, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">{month.month}</h4>
                      <span className={`font-bold ${month.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Saldo: R$ {month.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-600">Receitas</span>
                        </div>
                        <span className="text-sm font-medium">
                          R$ {month.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(month.income / maxMonthlyValue) * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-600">Despesas</span>
                        </div>
                        <span className="text-sm font-medium">
                          R$ {month.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(month.expenses / maxMonthlyValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum dado encontrado para o período selecionado</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'Transações do Mês':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Transações do Mês</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateForDisplay(transaction.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.description || transaction.categories?.name || (transaction.type === 'income' ? 'Receita' : 'Despesa')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {transaction.categories?.name || 'Outros'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'income'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}>
                              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'income' ? '+' : '-'} R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Nenhuma transação encontrada para o período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo das transações */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total de Transações</p>
                <p className="text-lg font-bold text-gray-900">{filteredTransactions.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Receitas</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {filteredTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Despesas</p>
                <p className="text-lg font-bold text-red-600">
                  R$ {filteredTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        );

      case 'Método de Pagamento':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Despesas por Método de Pagamento</h2>
            <div className="space-y-4">
              {paymentMethodExpenses.length > 0 ? (
                paymentMethodExpenses.map((paymentMethod, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <span className="text-gray-700 w-32">{paymentMethod.name}</span>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`${paymentMethod.color} h-4 rounded-full transition-all duration-300`}
                            style={{ width: `${(paymentMethod.value / maxPaymentMethodValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-900 font-medium">
                        R$ {paymentMethod.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="text-xs text-gray-500">
                        {((paymentMethod.value / expenses) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma despesa encontrada para o período selecionado</p>
                </div>
              )}
            </div>
          </div>
        );

      default: // Despesas por Categoria
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Despesas por Categoria</h2>
            <div className="space-y-4">
              {categoryExpenses.length > 0 ? (
                categoryExpenses.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <span className="text-gray-700 w-24">{category.name}</span>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`${category.color} h-4 rounded-full transition-all duration-300`}
                            style={{ width: `${(category.value / maxValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-900 font-medium">
                        R$ {category.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="text-xs text-gray-500">
                        {((category.value / expenses) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma despesa encontrada para o período selecionado</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return <div className="p-6">Carregando relatórios...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Relatórios</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Filtros de Relatório</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PERÍODO:
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Mês Atual">Mês Atual</option>
              <option value="Próximo Mês">Próximo Mês</option>
              <option value="Último Ano">Último Ano</option>
              <option value="Último Mês">Último Mês</option>
              <option value="Último Trimestre">Último Trimestre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TIPO DE RELATÓRIO:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Despesas por Categoria">Despesas por Categoria</option>
              <option value="Método de Pagamento">Método de Pagamento</option>
              <option value="Transações do Mês">Transações do Mês</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Resumo do Período</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Receitas</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Despesas</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Saldo</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Indicador de status do relatório e botões de exportação */}
      {reportGenerated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-blue-800 font-medium">
                Relatório gerado para: {period} - {reportType}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                title="Exportar para CSV"
              >
                <FileSpreadsheet size={16} />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                title="Exportar para PDF"
              >
                <FileText size={16} />
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo dinâmico do relatório */}
      <div ref={reportRef}>
        {renderReportContent()}
      </div>
    </div>
  );
};

export default ReportsPage;