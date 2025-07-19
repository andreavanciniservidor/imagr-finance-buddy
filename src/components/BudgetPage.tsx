
import React from 'react';
import { Plus } from 'lucide-react';

const BudgetPage = () => {
  const budgets = [
    {
      name: 'Alimentação',
      spent: 880,
      budget: 800,
      status: 'Estourado',
      color: 'bg-red-500',
      remaining: -80
    },
    {
      name: 'Transporte',
      spent: 180,
      budget: 300,
      status: 'No Prazo',
      color: 'bg-green-500',
      remaining: 120
    },
    {
      name: 'Moradia',
      spent: 1350,
      budget: 1500,
      status: 'Atenção',
      color: 'bg-orange-500',
      remaining: 150
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Orçamento
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Orçamentos Ativos</h2>
        
        <div className="space-y-6">
          {budgets.map((budget, index) => (
            <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-medium text-gray-900">{budget.name}</h3>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">R$ {budget.budget.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Gasto: R$ {budget.spent.toLocaleString('pt-BR')}</span>
                  <span className={budget.remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                    Restante: {budget.remaining < 0 ? '-' : ''}R$ {Math.abs(budget.remaining).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`${budget.color} h-3 rounded-full transition-all duration-300`} 
                    style={{ width: `${Math.min((budget.spent / budget.budget) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <p className={`text-sm font-medium ${
                budget.status === 'Estourado' ? 'text-red-600' : 
                budget.status === 'Atenção' ? 'text-orange-600' : 'text-green-600'
              }`}>
                {budget.status}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
