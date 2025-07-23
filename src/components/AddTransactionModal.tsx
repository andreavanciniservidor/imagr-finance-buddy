
import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'income' | 'expense';
}

interface Category {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  type 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category_id: '',
    account_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchAccounts();
    }
  }, [isOpen, type]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', type);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias",
        variant: "destructive"
      });
    } else {
      setCategories(data || []);
    }
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name');

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar contas",
        variant: "destructive"
      });
    } else {
      setAccounts(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category_id: formData.category_id || null,
        account_id: formData.account_id || null,
        date: formData.date,
        type
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${type === 'income' ? 'Receita' : 'Despesa'} adicionada com sucesso!`,
      });

      onSuccess();
      onClose();
      setFormData({
        amount: '',
        description: '',
        category_id: '',
        account_id: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar transação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VALOR
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DESCRIÇÃO
            </label>
            <input
              type="text"
              placeholder={type === 'income' ? 'Ex: Salário, Venda de item' : 'Ex: Compras de supermercado'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DATA
            </label>
            <div className="relative">
              <input
                type="date"
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CATEGORIA
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CONTA
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
            >
              <option value="">Selecione uma conta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 text-white rounded-md ${
                type === 'income' 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              disabled={loading}
            >
              {loading ? 'Salvando...' : (type === 'income' ? 'Salvar Receita' : 'Adicionar Despesa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
