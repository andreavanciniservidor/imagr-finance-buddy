import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, CreditCard, PiggyBank } from 'lucide-react';
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
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: string;
  alert_threshold: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [budgetStatus, setBudgetStatus] = useState<{ id: string; name: string; status: 'ok' | 'warning' | 'critical' }[]>([]);
  const [showAllBudgets, setShowAllBudgets] = useState(false);

  useEffect(() => {
    if (transactions.length > 0) {
      const totalIncome = transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      setIncome(totalIncome);

      const totalExpenses = transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      setExpenses(totalExpenses);
    }
  }, [transactions]);

  useEffect(() => {
    if (budgets.length > 0) {
      const calculateBudgetStatus = () => {
        return budgets.map((budget) => {
          const totalSpent = transactions
            .filter((transaction) => transaction.type === 'expense')
            .filter((transaction) => transaction.category_id === budget.category_id)
            .reduce((sum, transaction) => sum + transaction.amount, 0);

          const percentageSpent = (totalSpent / budget.amount) * 100;

          let status: 'ok' | 'warning' | 'critical' = 'ok';
          if (percentageSpent > budget.alert_threshold) {
            status = 'warning';
          }
          if (percentageSpent > 100) {
            status = 'critical';
          }

          return {
            id: budget.id,
            name: budget.name,
            status: status,
          };
        });
      };

      setBudgetStatus(calculateBudgetStatus());
    }
  }, [budgets, transactions]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchBudgets();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, description, date, type, payment_method')
        .eq('user_id', user.id)
        .gte('date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('date', lastDayOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name, amount, period, alert_threshold')
        .eq('user_id', user.id);

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const balance = income - expenses;

  const displayedBudgets = showAllBudgets ? budgets : budgets.slice(0, 3);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral das suas finanças</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingUp className="text-green-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Receitas</h2>
          </div>
          <p className="text-2xl text-gray-900">R$ {income.toFixed(2)}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingDown className="text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Despesas</h2>
          </div>
          <p className="text-2xl text-gray-900">R$ {expenses.toFixed(2)}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center mb-2">
            <DollarSign className="text-blue-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Saldo</h2>
          </div>
          <p className="text-2xl text-gray-900">R$ {balance.toFixed(2)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Orçamentos</h2>
        {displayedBudgets.map((budget) => {
          const status = budgetStatus.find((s) => s.id === budget.id)?.status || 'ok';
          let statusColor = 'text-green-500';
          if (status === 'warning') statusColor = 'text-yellow-500';
          if (status === 'critical') statusColor = 'text-red-500';

          return (
            <div key={budget.id} className="bg-white shadow rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{budget.name}</h3>
                  <p className="text-gray-600">Meta: R$ {budget.amount.toFixed(2)}</p>
                </div>
                <div className={`flex items-center ${statusColor}`}>
                  <Target className="mr-1" size={16} />
                  <span className="text-sm font-medium">{status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          );
        })}
        {budgets.length > 3 && (
          <button
            onClick={() => setShowAllBudgets(!showAllBudgets)}
            className="text-blue-500 hover:underline"
          >
            {showAllBudgets ? 'Ver Menos' : 'Ver Todos'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
