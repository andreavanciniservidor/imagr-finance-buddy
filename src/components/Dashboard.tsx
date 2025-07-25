import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AddTransactionModal from './AddTransactionModal';
import { useToast } from './ui/use-toast';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categories: { name: string } | null;
  accounts: { name: string } | null;
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: string;
  category_id: string | null;
  alert_threshold: number;
  categories: { name: string } | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetSpending, setBudgetSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const currentDate = new Date().toLocaleDateString('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (budgets.length > 0) {
      fetchBudgetSpending();
    }
  }, [budgets]);

  const fetchBudgetSpending = async () => {
    if (!user || budgets.length === 0) return;

    try {
      const spendingData: Record<string, number> = {};
      const currentMonth = new Date();
      
      for (const budget of budgets) {
        if (!budget.category_id) continue;

        // Calculate date range based on budget period and current month
        let startDate: Date;
        let endDate: Date;
        
        switch (budget.period) {
          case 'weekly':
            // For weekly budgets, use the current week of the selected month
            startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate() - 7);
            endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
            break;
          case 'monthly':
            // For monthly budgets, use the selected month
            startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            break;
          case 'quarterly':
            // For quarterly budgets, use the quarter of the selected month
            const quarterStart = Math.floor(currentMonth.getMonth() / 3) * 3;
            startDate = new Date(currentMonth.getFullYear(), quarterStart, 1);
            endDate = new Date(currentMonth.getFullYear(), quarterStart + 3, 0);
            break;
          case 'yearly':
            // For yearly budgets, use the year of the selected month
            startDate = new Date(currentMonth.getFullYear(), 0, 1);
            endDate = new Date(currentMonth.getFullYear(), 11, 31);
            break;
          default:
            startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        }

        // Fetch transactions for this category and period
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category_id', budget.category_id)
          .eq('type', 'expense')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (error) throw error;

        const totalSpent = transactions?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
        spendingData[budget.id] = totalSpent;
      }

      setBudgetSpending(spendingData);
    } catch (error) {
      console.error('Error fetching budget spending:', error);
    }
  };

  const getBudgetProgress = (budget: Budget) => {
    const spent = budgetSpending[budget.id] || 0;
    const percentage = (spent / budget.amount) * 100;
    return {
      spent,
      percentage: Math.min(percentage, 100),
      isOverBudget: percentage > 100,
      isNearLimit: percentage >= budget.alert_threshold
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          type,
          categories(name),
          accounts(name)
        `)
        .order('date', { ascending: false })
        .limit(5);

      if (transactionsError) throw transactionsError;

      // Fetch budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          id,
          name,
          amount,
          period,
          category_id,
          alert_threshold,
          categories(name)
        `);

      if (budgetsError) throw budgetsError;

      // Type assertion for transactions to ensure proper typing
      const typedTransactions = (transactionsData || []).map(t => ({
        ...t,
        type: t.type as 'income' | 'expense'
      }));

      setTransactions(typedTransactions);
      setBudgets(budgetsData || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpenses;

  // Calculate expenses by category
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const category = t.categories?.name || 'Outros';
      acc[category] = (acc[category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const categories = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value
  }));

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 capitalize">{currentDate}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">SALDO ATUAL</p>
          <p className="text-2xl font-bold text-gray-900">
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Receita</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Despesas</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Transações</p>
              <p className="text-xl font-bold text-gray-900">{transactions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Orçamentos</p>
              <p className="text-xl font-bold text-gray-900">{budgets.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gastos por Categoria */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos por Categoria</h3>
          <div className="space-y-3">
            {categories.length > 0 ? (
              categories.map((category, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-700">{category.name}</span>
                  <span className="text-gray-900 font-medium">
                    R$ {category.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Nenhuma despesa encontrada</p>
            )}
          </div>
        </div>

        {/* Orçamentos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orçamentos</h3>
          <div className="space-y-4">
            {budgets.length > 0 ? (
              budgets.map((budget) => {
                const progress = getBudgetProgress(budget);
                return (
                  <div key={budget.id}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">{budget.name}</span>
                      <div className="text-right">
                        <span className="text-gray-900 font-medium text-sm">
                          R$ {progress.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                          R$ {Number(budget.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress.isOverBudget 
                            ? 'bg-red-500' 
                            : progress.isNearLimit 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{progress.percentage.toFixed(1)}% usado</span>
                      <span className="capitalize">{budget.period}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500">Nenhum orçamento criado</p>
            )}
          </div>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
            <button className="text-blue-500 text-sm hover:text-blue-600">
              Ver Todas as Transações
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conta</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.categories?.name || 'Outros'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'income' ? '+' : '-'} R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.accounts?.name || 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button 
            onClick={() => setShowIncomeModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Receita
          </button>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Despesa
          </button>
        </div>
      </div>

      {/* Modais */}
      <AddTransactionModal 
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        onSuccess={fetchData}
        type="income"
      />
      <AddTransactionModal 
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={fetchData}
        type="expense"
      />
    </div>
  );
};

export default Dashboard;
