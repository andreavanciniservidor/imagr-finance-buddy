
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  categories: { name: string } | null;
}

const ReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState('Mês Atual');
  const [reportType, setReportType] = useState('Despesas por Categoria');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          amount,
          type,
          categories(name)
        `);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary data
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = income - expenses;

  // Calculate expenses by category
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const category = t.categories?.name || 'Outros';
      acc[category] = (acc[category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const categoryExpenses = Object.entries(expensesByCategory).map(([name, value], index) => ({
    name,
    value,
    color: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'][index % 5]
  }));

  const maxValue = Math.max(...categoryExpenses.map(cat => cat.value), 1);

  if (loading) {
    return <div className="p-6">Carregando relatórios...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Relatórios</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Filtros de Relatório</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <option value="Último Mês">Último Mês</option>
              <option value="Último Trimestre">Último Trimestre</option>
              <option value="Último Ano">Último Ano</option>
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
              <option value="Receitas vs Despesas">Receitas vs Despesas</option>
              <option value="Evolução Mensal">Evolução Mensal</option>
            </select>
          </div>

          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              Gerar Relatório
            </button>
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
                        className={`${category.color} h-4 rounded-full`}
                        style={{ width: `${(category.value / maxValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <span className="text-gray-900 font-medium text-right w-20">
                  R$ {category.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhuma despesa encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
