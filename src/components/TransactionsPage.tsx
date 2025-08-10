import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  accounts?: {
    name: string;
  };
}

interface Account {
  id: string;
  name: string;
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
      fetchAccounts();
    }
  }, [user, currentDate]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

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
          categories:category_id(name, color),
          accounts:account_id(name)
        `)
        .eq('user_id', user.id)
        .gte('date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('date', lastDayOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []).map(transaction => ({
        ...transaction,
        type: transaction.type as 'income' | 'expense'
      })));
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
    }
  };

  const fetchAccounts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

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

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const searchTermLower = searchTerm.toLowerCase();
    const descriptionMatches = transaction.description.toLowerCase().includes(searchTermLower);
    const typeMatches = filterType === 'all' || transaction.type === filterType;
    const categoryMatches = filterCategory === '' || transaction.category_id === filterCategory;

    return descriptionMatches && typeMatches && categoryMatches;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const getPaymentMethodDisplay = (method: string | null) => {
    const methods: { [key: string]: string } = {
      'cash': 'Dinheiro',
      'debit_card': 'Cartão Débito',
      'credit_card': 'Cartão Crédito',
      'pix': 'PIX',
      'bank_transfer': 'Transferência',
      'check': 'Cheque'
    };
    return method ? methods[method] || method : '-';
  };

  const [showFilters, setShowFilters] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-3 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Transações</h1>
          
          {/* Month Navigation */}
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2 mx-4 sm:mx-8">
              <span className="text-sm sm:text-base font-medium text-gray-900">
                {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
              </span>
              <button
                onClick={goToToday}
                className="text-xs sm:text-sm bg-blue-100 text-blue-600 px-2 sm:px-3 py-1 rounded hover:bg-blue-200 font-medium"
              >
                Hoje
              </button>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                AdicionarReceita
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-red-600 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                AdicionarDespesa
              </button>
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transações</h2>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <input
                    type="text"
                    placeholder="Descrição da transação..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  >
                    <option value="">Todos os métodos</option>
                    <option value="cash">Dinheiro</option>
                    <option value="debit_card">Cartão Débito</option>
                    <option value="credit_card">Cartão Crédito</option>
                    <option value="pix">PIX</option>
                    <option value="bank_transfer">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="dd/mm/aaaa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando transações...</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DATA
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DESCRIÇÃO
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CATEGORIA
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MÉTODO
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TIPO
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        VALOR
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AÇÕES
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">
                            {transaction.description}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {transaction.categories?.name || '-'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getPaymentMethodDisplay(transaction.payment_method)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center relative">
                          <button
                            onClick={() => setShowActionMenu(showActionMenu === transaction.id ? null : transaction.id)}
                            className="text-gray-400 hover:text-gray-600 text-lg"
                          >
                            ⋯
                          </button>
                          {showActionMenu === transaction.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                              <button
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setShowEditModal(true);
                                  setShowActionMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(transaction.id);
                                  setShowActionMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 p-4">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          transaction.type === 'income' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowActionMenu(showActionMenu === transaction.id ? null : transaction.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        ⋯
                      </button>
                    </div>
                    
                    <div className="mb-2">
                      <h3 className="font-medium text-gray-900 text-sm">{transaction.description}</h3>
                      <p className="text-xs text-gray-500">
                        {transaction.categories?.name || 'Sem categoria'} • {getPaymentMethodDisplay(transaction.payment_method)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {showActionMenu === transaction.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowEditModal(true);
                            setShowActionMenu(null);
                          }}
                          className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(transaction.id);
                            setShowActionMenu(null);
                          }}
                          className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {filteredTransactions.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma transação encontrada</h3>
                  <p className="text-gray-600 mb-4">
                    Comece adicionando sua primeira transação
                  </p>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      Adicionar Receita
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                    >
                      Adicionar Despesa
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
