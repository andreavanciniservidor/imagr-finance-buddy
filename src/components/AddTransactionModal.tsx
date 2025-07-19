
import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'income' | 'expense';
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, type }) => {
  const [formData, setFormData] = useState({
    value: '',
    description: '',
    category: '',
    date: '',
    account: ''
  });

  const categories = type === 'income' 
    ? ['Salário', 'Freelance', 'Investimentos', 'Outros']
    : ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Educação', 'Saúde', 'Outros'];

  const accounts = ['Conta Corrente', 'Poupança', 'Cartão de Crédito', 'Carteira'];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você implementaria a lógica para salvar a transação
    console.log('Transação:', { ...formData, type });
    onClose();
  };

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

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            {type === 'income' ? 'Nova Receita' : 'Detalhes da Despesa'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VALOR
              </label>
              <input
                type="text"
                placeholder={type === 'income' ? '0,00' : 'R$ 0,00'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
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
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="">
                  {type === 'income' ? 'Salário' : 'Selecione uma categoria'}
                </option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                required
              >
                <option value="">
                  {type === 'income' ? 'Conta Corrente' : 'Selecione uma conta'}
                </option>
                {accounts.map((account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
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
              >
                {type === 'income' ? 'Salvar Receita' : 'Adicionar Despesa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;
