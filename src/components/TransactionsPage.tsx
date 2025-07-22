import React, { useState, useMemo } from 'react';
import { Plus, Filter, X } from 'lucide-react';
import AddTransactionModal from './AddTransactionModal';

const TransactionsPage = () => {
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados dos filtros
  const [filters, setFilters] = useState({
    category: '',
    paymentMethod: '',
    type: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  const transactions = [
    { date: '2024-11-28', description: 'Salário Mensal', category: 'Salário', value: 3500, type: 'income', account: 'Conta Corrente' },
    { date: '2024-11-27', description: 'Compras Supermercado', category: 'Alimentação', value: -120, type: 'expense', account: 'Cartão de Crédito' },
    { date: '2024-11-26', description: 'Mensalidade Academia', category: 'Saúde', value: -80, type: 'expense', account: 'Conta Corrente' },
    { date: '2024-11-25', description: 'Venda de Livro Usado', category: 'Outros', value: 50, type: 'income', account: 'Carteira' },
    { date: '2024-11-24', description: 'Conta de Luz', category: 'Moradia', value: -150, type: 'expense', account: 'Conta Corrente' },
  ];

  // Listas para os filtros
  const categories = [...new Set(transactions.map(t => t.category))];
  const paymentMethods = [...new Set(transactions.map(t => t.account))];

  // Função para filtrar transações
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Filtro por busca
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Filtro por categoria
      if (filters.category && transaction.category !== filters.category) {
        return false;
      }
      
      // Filtro por método de pagamento
      if (filters.paymentMethod && transaction.account !== filters.paymentMethod) {
        return false;
      }
      
      // Filtro por tipo
      if (filters.type && transaction.type !== filters.type) {
        return false;
      }
      
      // Filtro por data inicial
      if (filters.startDate && transaction.date < filters.startDate) {
        return false;
      }
      
      // Filtro por data final
      if (filters.endDate && transaction.date > filters.endDate) {
        return false;
      }
      
      return true;
    });
  }, [transactions, filters]);

  // Função para limpar filtros
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

  // Função para atualizar filtros
  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <div className="flex space-x-3">
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

      {/* Transações Recentes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transações</h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm flex items-center hover:bg-blue-600"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </button>
              {(filters.category || filters.paymentMethod || filters.type || filters.startDate || filters.endDate || filters.search) && (
                <button 
                  onClick={clearFilters}
                  className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm flex items-center hover:bg-gray-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Painel de Filtros */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Busca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar
                  </label>
                  <input 
                    type="text" 
                    placeholder="Descrição da transação..." 
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select 
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Método de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pagamento
                  </label>
                  <select 
                    value={filters.paymentMethod}
                    onChange={(e) => updateFilter('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os métodos</option>
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
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

                {/* Data Inicial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Inicial
                  </label>
                  <input 
                    type="date" 
                    value={filters.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Data Final */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Final
                  </label>
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

          {/* Resumo dos filtros ativos */}
          {(filters.category || filters.paymentMethod || filters.type || filters.startDate || filters.endDate || filters.search) && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Mostrando {filteredTransactions.length} de {transactions.length} transações
              </p>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método de Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {transaction.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {transaction.account}
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
                      {transaction.type === 'income' ? '+' : ''} R$ {Math.abs(transaction.value).toLocaleString('pt-BR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        

      </div>

      {/* Modais */}
      <AddTransactionModal 
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        type="income"
      />
      <AddTransactionModal 
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        type="expense"
      />
    </div>
  );
};

export default TransactionsPage;