import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, AlertTriangle } from 'lucide-react';
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
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const BudgetPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formState, setFormState] = useState({
    name: '',
    amount: '',
    category_id: '',
    period: 'monthly',
    alert_threshold: 80
  });

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchCategories();
    }
  }, [user]);

  const fetchBudgets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name, amount, category_id, period, alert_threshold')
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </button>
      </div>

      {loading && <div className="text-center">Carregando...</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Período
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Alerta (%)
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => (
              <tr key={budget.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{budget.name}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">R$ {budget.amount.toFixed(2)}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {budget.category_id ? (
                    categories.find(cat => cat.id === budget.category_id)?.name || 'N/A'
                  ) : (
                    <p className="text-gray-500">Sem categoria</p>
                  )}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{budget.period === 'monthly' ? 'Mensal' : 'Anual'}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div className="flex items-center">
                    {budget.alert_threshold < 80 && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mr-1" />
                    )}
                    <p className="text-gray-900 whitespace-no-wrap">{budget.alert_threshold}%</p>
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(budget)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                X
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
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
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
