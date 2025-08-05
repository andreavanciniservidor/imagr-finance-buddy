import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

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

const ReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDayOfMonth.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, startDate, endDate]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
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
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
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

  const categoryData = () => {
    const categoryTotals: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      if (transaction.type === 'expense' && transaction.categories) {
        const categoryName = transaction.categories.name;
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + transaction.amount;
      }
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#9cafff', '#d8b4fe'];

  const dailyData = () => {
    const dailyTotals: { [key: string]: { income: number; expense: number } } = {};
  
    transactions.forEach(transaction => {
      const date = transaction.date;
      if (!dailyTotals[date]) {
        dailyTotals[date] = { income: 0, expense: 0 };
      }
  
      if (transaction.type === 'income') {
        dailyTotals[date].income += transaction.amount;
      } else {
        dailyTotals[date].expense += transaction.amount;
      }
    });
  
    return Object.entries(dailyTotals).map(([date, totals]) => ({
      date,
      income: totals.income,
      expense: totals.expense,
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios</h1>
        <p className="text-gray-600">Análise detalhada das suas finanças</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center text-gray-600 mb-2">
            <TrendingUp className="w-4 h-4 mr-2" />
            Receitas
          </div>
          <div className="text-2xl font-bold text-green-500">R$ {incomeTotal.toFixed(2)}</div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center text-gray-600 mb-2">
            <TrendingDown className="w-4 h-4 mr-2" />
            Despesas
          </div>
          <div className="text-2xl font-bold text-red-500">R$ {expenseTotal.toFixed(2)}</div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center text-gray-600 mb-2">
            <DollarSign className="w-4 h-4 mr-2" />
            Saldo
          </div>
          <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            R$ {balance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filtrar por período</h2>
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Data de início</label>
            <div className="relative">
              <input
                type="date"
                id="start-date"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Data de término</label>
            <div className="relative">
              <input
                type="date"
                id="end-date"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Despesas por Categoria</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData()}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {
                  categoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))
                }
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Receitas vs Despesas Diárias</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="income" stroke="#82ca9d" strokeWidth={2} name="Receitas" />
              <Line type="monotone" dataKey="expense" stroke="#e57373" strokeWidth={2} name="Despesas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
