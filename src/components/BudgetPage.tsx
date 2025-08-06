import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';

interface Budget {
  id: string;
  name: string;
  amount: number;
  category_id: string | null;
  period: string;
  alert_threshold: number;
  categories?: {
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  amount: number;
  category_id: string | null;
  type: 'income' | 'expense';
  date: string;
}

const BudgetPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [formState, setFormState] = useState({
    name: '',
    amount: '',
    category_id: '',
    period: 'monthly',
    alert_threshold: 80
  });

  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchCategories();
      fetchTransactions();
    }
  }, [user, currentDate]);

  const fetchBudgets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id, name, amount, category_id, period, alert_threshold,
          categories (name, color)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar orçamentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('type', 'expense')
        .eq('user_id', user.id);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, category_id, type, date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('date', lastDayOfMonth.toISOString().split('T')[0]);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { name, amount, category_id, period, alert_threshold } = formState;

    if (!name || !amount || !period) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (editingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from('budgets')
          .update({
            name,
            amount: parseFloat(amount),
            category_id: category_id || null,
            period,
            alert_threshold: parseInt(alert_threshold.toString())
          })
          .eq('id', editingBudget.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Orçamento atualizado com sucesso!",
        });
      } else {
        // Create new budget
        const { error } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            name,
            amount: parseFloat(amount),
            category_id: category_id || null,
            period,
            alert_threshold: parseInt(alert_threshold.toString())
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Orçamento criado com sucesso!",
        });
      }

      fetchBudgets();
      closeModal();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar orçamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (budget: Budget) => {
    setEditingBudget(budget);
    setFormState({
      name: budget.name,
      amount: budget.amount.toString(),
      category_id: budget.category_id || '',
      period: budget.period,
      alert_threshold: budget.alert_threshold
    });
    setShowModal(true);
  };

  const deleteBudget = async (id: string) => {
    if (!user) return;

    if (window.confirm("Tem certeza que deseja excluir este orçamento?")) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('budgets')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Orçamento excluído com sucesso!",
        });

        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir orçamento",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setFormState({
      name: '',
      amount: '',
      category_id: '',
      period: 'monthly',
      alert_threshold: 80
    });
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

  const getBudgetProgress = (budget: Budget) => {
    const categoryTransactions = transactions.filter(
      t => t.category_id === budget.category_id
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-green-600">Fin</span>
              <span className="text-sm font-medium text-gray-600">Control</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Orçamentos</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Orçamento
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Orçamentos Ativos Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orçamentos Ativos</h2>
          
          {loading && (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          )}

          <div className="space-y-6">
            {budgets.map((budget) => {
              const progress = getBudgetProgress(budget);
              const categoryName = budget.categories?.name || 'Categoria não definida';
              
              // Determine colors based on progress
              let progressBarColor = 'bg-green-500';
              let statusColor = 'text-green-600';
              let statusText = 'Dentro do orçamento';
              let statusBg = 'bg-green-50';
              
              if (progress.isOverBudget) {
                progressBarColor = 'bg-red-500';
                statusColor = 'text-red-600';
                statusText = 'Orçamento excedido';
                statusBg = 'bg-red-50';
              } else if (progress.isNearLimit) {
                progressBarColor = 'bg-yellow-500';
                statusColor = 'text-yellow-600';
                statusText = 'Próximo do limite';
                statusBg = 'bg-yellow-50';
              }

              return (
                <div key={budget.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  {/* Budget Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                      <p className="text-sm text-gray-600">Categoria: {categoryName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        R$ {budget.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">{budget.period}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>
                        R$ {progress.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                        R$ {budget.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span>{progress.percentage.toFixed(1)}% usado</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${progressBarColor}`}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor} ${statusBg}`}>
                      {progress.isOverBudget && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      {!progress.isOverBudget && !progress.isNearLimit && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {statusText}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEditing(budget)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteBudget(budget.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {progress.isOverBudget && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">
                          Orçamento Excedido
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        Você excedeu seu orçamento em R$ {(progress.spent - budget.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. 
                        Considere revisar seus gastos nesta categoria.
                      </p>
                    </div>
                  )}

                  {progress.isNearLimit && !progress.isOverBudget && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
                        <span className="text-sm text-yellow-700">
                          Próximo do Limite
                        </span>
                      </div>
                      <p className="text-xs text-yellow-600 mt-1">
                        Você está próximo do seu limite de orçamento. 
                        Restam R$ {(budget.amount - progress.spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para este período.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {budgets.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum orçamento criado</h3>
                <p className="text-gray-600 mb-4">Comece criando seu primeiro orçamento para controlar seus gastos</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Criar Primeiro Orçamento
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formState.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formState.amount}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                  Categoria
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formState.category_id}
                  onChange={handleInputChange}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="period" className="block text-sm font-medium text-gray-700">
                  Período
                </label>
                <select
                  id="period"
                  name="period"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formState.period}
                  onChange={handleInputChange}
                  required
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <div>
                <label htmlFor="alert_threshold" className="block text-sm font-medium text-gray-700">
                  Alerta (%)
                </label>
                <input
                  type="number"
                  id="alert_threshold"
                  name="alert_threshold"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formState.alert_threshold}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPage;
