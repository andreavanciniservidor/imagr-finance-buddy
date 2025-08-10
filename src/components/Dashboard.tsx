
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CreditCard, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  payment_method: string | null;
  category_id: string | null;
  categories?: {
    name: string;
    color: string;
  };
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: string;
  alert_threshold: number;
  category_id: string | null;
  categories?: {
    name: string;
    color: string;
  };
}

interface CategoryExpense {
  name: string;
  amount: number;
  color: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [totalInstallments, setTotalInstallments] = useState(0);
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);

  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentDate]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchTransactions(),
        fetchBudgets()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, amount, description, date, type, payment_method, category_id,
          categories (name, color)
        `)
        .eq('user_id', user.id)
        .gte('date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('date', lastDayOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      
      const typedTransactions = (data || []).map(transaction => ({
        ...transaction,
        type: transaction.type as 'income' | 'expense'
      }));
      
      setTransactions(typedTransactions);
      
      // Calculate totals
      const totalIncome = typedTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      setIncome(totalIncome);

      const totalExpenses = typedTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      setExpenses(totalExpenses);

      // Calculate installments (assuming credit card transactions)
      const installments = typedTransactions
        .filter(t => t.type === 'expense' && t.payment_method === 'credit_card')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalInstallments(installments);

      // Calculate category expenses
      const categoryMap = new Map<string, { amount: number; color: string }>();
      
      typedTransactions
        .filter(t => t.type === 'expense' && t.categories)
        .forEach(t => {
          const categoryName = t.categories!.name;
          const existing = categoryMap.get(categoryName) || { amount: 0, color: t.categories!.color };
          categoryMap.set(categoryName, {
            amount: existing.amount + t.amount,
            color: t.categories!.color
          });
        });

      const categoryExpensesList = Array.from(categoryMap.entries())
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          color: data.color
        }))
        .sort((a, b) => b.amount - a.amount);

      setCategoryExpenses(categoryExpensesList);

    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    }
  };

  const fetchBudgets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id, name, amount, period, alert_threshold, category_id,
          categories (name, color)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const getBudgetProgress = (budget: Budget) => {
    const categoryTransactions = transactions.filter(
      t => t.type === 'expense' && t.category_id === budget.category_id
    );
    const spent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    
    return {
      spent,
      percentage: Math.min(percentage, 100),
      isOverBudget: percentage > 100,
      isNearLimit: percentage > budget.alert_threshold
    };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const balance = income - expenses;
  const budgetCount = budgets.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm sm:text-base font-medium text-gray-900 min-w-[120px] sm:min-w-[140px] text-center">
                {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="text-center sm:text-right">
              <div className="text-xs text-gray-500 uppercase font-medium">Saldo do Mês</div>
              <div className="text-lg sm:text-xl font-bold text-red-600">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, signDisplay: 'always' })}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600 uppercase">Receita</span>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-gray-900">
              R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600 uppercase">Despesas</span>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-gray-900">
              R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600 uppercase">Total Parcelado</span>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-gray-900">
              R$ {totalInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-xs text-gray-600 uppercase">Orçamentos</span>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-gray-900">{budgetCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Gastos por Categoria */}
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Gastos por Categoria</h2>
            <div className="space-y-3">
              {categoryExpenses.map((category, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700 truncate mr-2">{category.name}</span>
                  <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    R$ {category.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {categoryExpenses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma despesa encontrada neste mês
                </div>
              )}
            </div>
          </div>

          {/* Orçamentos */}
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Orçamentos</h2>
            <div className="space-y-4">
              {budgets.map((budget) => {
                const progress = getBudgetProgress(budget);
                const barColor = progress.isOverBudget 
                  ? 'bg-red-500' 
                  : progress.isNearLimit 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500';

                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 truncate mr-2">{budget.name}</span>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-gray-500">
                          R$ {progress.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                          R$ {budget.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{budget.period}</div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {progress.percentage.toFixed(1)}% usado
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{budget.period}</span>
                    </div>
                  </div>
                );
              })}
              {budgets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum orçamento configurado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
