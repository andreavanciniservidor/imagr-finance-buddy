
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const BudgetPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    period: 'monthly'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode adicionar a lógica para salvar o orçamento
    console.log('Novo orçamento:', formData);
    setIsModalOpen(false);
    setFormData({ name: '', amount: '', category: '', period: 'monthly' });
  };

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
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Orçamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Orçamento</Label>
                <Input
                  id="name"
                  placeholder="Ex: Alimentação, Transporte..."
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor do Orçamento</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alimentacao">Alimentação</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="moradia">Moradia</SelectItem>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="educacao">Educação</SelectItem>
                    <SelectItem value="lazer">Lazer</SelectItem>
                    <SelectItem value="vestuario">Vestuário</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                <Select value={formData.period} onValueChange={(value) => handleInputChange('period', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Orçamento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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

              <p className={`text-sm font-medium ${budget.status === 'Estourado' ? 'text-red-600' :
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
