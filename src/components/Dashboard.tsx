
import React, { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import AddTransactionModal from './AddTransactionModal';

const Dashboard = () => {
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const currentDate = new Date().toLocaleDateString('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  });

  const transactions = [
    { date: '28 Nov', description: 'Salário Mensal', category: 'Salário', value: 3500, type: 'income', account: 'Conta Corrente' },
    { date: '27 Nov', description: 'Compras Supermercado', category: 'Alimentação', value: -120, type: 'expense', account: 'Cartão de Crédito' },
    { date: '26 Nov', description: 'Mensalidade Academia', category: 'Saúde', value: -80, type: 'expense', account: 'Conta Corrente' },
    { date: '25 Nov', description: 'Venda de Livro Usado', category: 'Outros', value: 50, type: 'income', account: 'Carteira' },
    { date: '24 Nov', description: 'Conta de Luz', category: 'Moradia', value: -150, type: 'expense', account: 'Conta Corrente' },
  ];

  const budgets = [
    { name: 'Alimentação', spent: 450, budget: 400, color: 'bg-red-500', status: 'Estourado' },
    { name: 'Transporte', spent: 200, budget: 500, color: 'bg-green-500', status: 'No Prazo' },
    { name: 'Lazer', spent: 150, budget: 200, color: 'bg-orange-500', status: 'Atenção' },
  ];

  const categories = [
    { name: 'Alimentação', value: 450 },
    { name: 'Transporte', value: 200 },
    { name: 'Moradia', value: 600 },
    { name: 'Lazer', value: 150 },
    { name: 'Educação', value: 100 },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 capitalize">{currentDate}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">SALDO ATUAL</p>
          <p className="text-2xl font-bold text-gray-900">R$ 5.200,00</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Receita</p>
              <p className="text-xl font-bold text-gray-900">R$ 3.500,00</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Despesas</p>
              <p className="text-xl font-bold text-gray-900">R$ 1.200,00</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Gasto</p>
              <p className="text-xl font-bold text-gray-900">R$ 1.000,00</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm text-gray-600">Meta</p>
              <p className="text-xl font-bold text-gray-900">R$ 500,00</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gastos por Categoria */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos por Categoria</h3>
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">{category.name}</span>
                <span className="text-gray-900 font-medium">R$ {category.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progresso dos Orçamentos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso dos Orçamentos</h3>
          <div className="space-y-4">
            {budgets.map((budget, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">{budget.name}</span>
                  <span className="text-gray-900 font-medium">
                    R$ {budget.spent} / R$ {budget.budget}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${budget.color} h-2 rounded-full`} 
                    style={{ width: `${Math.min((budget.spent / budget.budget) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className={`text-xs mt-1 ${
                  budget.status === 'Estourado' ? 'text-red-600' : 
                  budget.status === 'Atenção' ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {budget.status} em R$ {Math.abs(budget.budget - budget.spent)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Buscar transações..." 
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
                <button className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm">
                  Filtrar
                </button>
              </div>
            </div>
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
              {transactions.map((transaction, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {transaction.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.type === 'income' ? '+' : ''} R$ {Math.abs(transaction.value).toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {transaction.account}
                  </td>
                </tr>
              ))}
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

export default Dashboard;
