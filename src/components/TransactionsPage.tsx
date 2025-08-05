import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import AddTransactionModal from './AddTransactionModal';
import EditTransactionModal from './EditTransactionModal';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  category_id: string | null;
  account_id: string | null;
  payment_method: string | null;
  categories?: {
    name: string;
    color: string;
  };
}

const TransactionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

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
          category_id,
          account_id,
          payment_method,
          categories:category_id(name, color)
        `)
        .eq('user_id', user.id)
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

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', user.id);
  
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar categorias",
          variant: "destructive"
        });
      }
    };

    fetchCategories();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    if (window.confirm("Tem certeza que deseja excluir esta transação?")) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Transação excluída com sucesso!",
        });

        fetchTransactions();
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir transação",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const searchTermLower = searchTerm.toLowerCase();
    const descriptionMatches = transaction.description.toLowerCase().includes(searchTermLower);

    const typeMatches = filterType === 'all' || transaction.type === filterType;

    const categoryMatches = filterCategory === '' || transaction.category_id === filterCategory;

    return descriptionMatches && typeMatches && categoryMatches;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>
      </div>

      <div className="flex space-x-4 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar transação..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>

        <div className="relative">
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
          >
            <option value="all">Todos os Tipos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </div>

        <div className="relative">
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Todas as Categorias</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p>Carregando transações...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {transaction.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.categories?.name || 'Sem categoria'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowEditModal(true);
                      }}
                      className="text-blue-500 hover:text-blue-700 mr-2"
                    >
                      <Edit2 className="h-4 w-4 inline-block" />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 inline-block" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchTransactions}
        type="expense"
      />

      {selectedTransaction && (
        <EditTransactionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchTransactions}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
