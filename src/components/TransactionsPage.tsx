
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Filter, X, ChevronLeft, ChevronRight, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';
import AddTransactionModal from './AddTransactionModal';
import EditTransactionModal from './EditTransactionModal';

// Função utilitária para formatar datas sem problemas de fuso horário
const formatDateForDisplay = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('pt-BR');
};

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  account_id: string | null;
  cartao_id: string | null;
  payment_method?: string;
  categories: { name: string } | null;
  accounts: { name: string } | null;
}

const TransactionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Métodos de pagamento fixos (ordenados alfabeticamente)
  const paymentMethods = [
    { id: 'credit_card', name: 'Cartão de Crédito' },
    { id: 'debit_card', name: 'Cartão de Débito' },
    { id: 'cash', name: 'Dinheiro' },
    { id: 'pix', name: 'Pix' },
    { id: 'transfer', name: 'Transferência' }
  ];

  // Função para converter ID do método para nome legível
  const getPaymentMethodName = (paymentMethodId: string | null | undefined) => {
    if (!paymentMethodId) return 'N/A';
    const method = paymentMethods.find(m => m.id === paymentMethodId);
    return method ? method.name : 'N/A';
  };
  
  const [filters, setFilters] = useState({
    category: '',
    paymentMethod: '',
    type: '',
    startDate: '',
    endDate: '',
    search: ''
  });

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
          description,
          amount,
          type,
          category_id,
          account_id,
          cartao_id,
          payment_method,
          categories(name),
          accounts(name)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Type assertion for transactions to ensure proper typing
      const typedTransactions = (data || []).map(t => ({
        ...t,
        type: t.type as 'income' | 'expense'
      }));
      
      setTransactions(typedTransactions);
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

  const categories = [...new Set(transactions.map(t => t.categories?.name).filter(Boolean))];
  const paymentMethodsForFilter = paymentMethods.map(pm => pm.name);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Filtro por mês atual (sem problemas de fuso horário)
      const [year, month, day] = transaction.date.split('-').map(Number);
      const currentYear = currentMonth.getFullYear();
      const currentMonthIndex = currentMonth.getMonth();
      
      if (year !== currentYear || (month - 1) !== currentMonthIndex) {
        return false;
      }
      
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.category && transaction.categories?.name !== filters.category) {
        return false;
      }
      
      if (filters.paymentMethod && getPaymentMethodName(transaction.payment_method) !== filters.paymentMethod) {
        return false;
      }
      
      if (filters.type && transaction.type !== filters.type) {
        return false;
      }
      
      if (filters.startDate && transaction.date < filters.startDate) {
        return false;
      }
      
      if (filters.endDate && transaction.date > filters.endDate) {
        return false;
      }
      
      return true;
    });
  }, [transactions, filters, currentMonth]);

  const clearFilters = () => {
    setFilters({
      category: '',
      paymentMethod: '',
      type: '',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentMonth.getFullYear() === now.getFullYear() && 
           currentMonth.getMonth() === now.getMonth();
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user?.id);

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
    }
  };

  if (loading) {
    return <div className="p-6">Carregando transações...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 lg:mt-0 mt-2">Transações</h1>
        
        {/* Navegação por Mês */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-4 bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
                {formatMonthYear(currentMonth)}
              </span>
              {!isCurrentMonth() && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Hoje
                </button>
              )}
            </div>
            
            <button
              onClick={goToNextMonth}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button 
            onClick={() => setShowIncomeModal(true)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Adicionar </span>Receita
          </button>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Adicionar </span>Despesa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Transações</h3>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="w-full sm:w-auto px-3 py-2 bg-blue-500 text-white rounded-md text-sm flex items-center justify-center hover:bg-blue-600 font-medium"
              >
                <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                Filtros
              </button>
              {(filters.category || filters.paymentMethod || filters.type || filters.startDate || filters.endDate || filters.search) && (
                <button 
                  onClick={clearFilters}
                  className="w-full sm:w-auto px-3 py-2 bg-gray-500 text-white rounded-md text-sm flex items-center justify-center hover:bg-gray-600 font-medium"
                >
                  <X className="w-4 h-4 mr-2 flex-shrink-0" />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Descrição da transação..." 
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select 
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas as categorias</option>
                    {categories
                      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                      .map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento</label>
                  <select 
                    value={filters.paymentMethod}
                    onChange={(e) => updateFilter('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os métodos</option>
                    {paymentMethodsForFilter.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select 
                    value={filters.type}
                    onChange={(e) => updateFilter('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                  <input 
                    type="date" 
                    value={filters.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                  <input 
                    type="date" 
                    value={filters.endDate}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {(filters.category || filters.paymentMethod || filters.type || filters.startDate || filters.endDate || filters.search) && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Mostrando {filteredTransactions.length} de {transactions.length} transações
              </p>
            </div>
          )}
        </div>
        
        {/* Mobile/Tablet View - Cards */}
        <div className="block lg:hidden">
          <div className="space-y-3 p-3 sm:p-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma transação encontrada</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                        {transaction.description}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {formatDateForDisplay(transaction.date)}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <span className={`text-base sm:text-lg font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'} R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'income' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Categoria:</span>
                      <p className="font-medium text-gray-900">{transaction.categories?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Método:</span>
                      <p className="font-medium text-gray-900">{getPaymentMethodName(transaction.payment_method)}</p>
                    </div>
                  </div>
                  
                  {/* Botões de Ação Mobile */}
                  <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTransaction(transaction)}
                      className="flex items-center"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a transação "{transaction.description}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método de Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateForDisplay(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.categories?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getPaymentMethodName(transaction.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'income' ? '+' : '-'} R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a transação "{transaction.description}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddTransactionModal 
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        onSuccess={fetchTransactions}
        type="income"
      />
      <AddTransactionModal 
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={fetchTransactions}
        type="expense"
      />
      <EditTransactionModal 
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTransaction(null);
        }}
        onSuccess={fetchTransactions}
        transaction={editingTransaction}
      />
    </div>
  );
};

export default TransactionsPage;
