
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: string;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const BudgetPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category_id: '',
    period: 'monthly'
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          id,
          name,
          amount,
          period,
          categories(name)
        `);

      if (budgetsError) throw budgetsError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'expense');

      if (categoriesError) throw categoriesError;

      setBudgets(budgetsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        name: formData.name,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id || null,
        period: formData.period
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso!",
      });

      setIsModalOpen(false);
      setFormData({ name: '', amount: '', category_id: '', period: 'monthly' });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar orçamento",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6">Carregando orçamentos...</div>;
  }

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
                  step="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
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
          {budgets.length > 0 ? (
            budgets.map((budget) => (
              <div key={budget.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium text-gray-900">{budget.name}</h3>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      R$ {Number(budget.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{budget.period}</p>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Categoria: {budget.categories?.name || 'N/A'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>

                <p className="text-sm font-medium text-green-600">
                  Orçamento criado
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum orçamento criado ainda</p>
              <p className="text-sm mt-2">Clique em "Criar Novo Orçamento" para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
