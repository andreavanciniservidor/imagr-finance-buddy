
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Bell, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: string;
  category_id: string | null;
  alert_threshold: number;
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetSpending, setBudgetSpending] = useState<Record<string, number>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category_id: '',
    period: 'monthly',
    alert_threshold: 80
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (budgets.length > 0) {
      fetchBudgetSpending();
    }
  }, [budgets, currentMonth]);

  const fetchBudgetSpending = async () => {
    if (!user || budgets.length === 0) return;

    try {
      const spendingData: Record<string, number> = {};
      
      for (const budget of budgets) {
        if (!budget.category_id) continue;

        // Calculate date range based on budget period and current month
        let startDate: Date;
        let endDate: Date;
        
        switch (budget.period) {
          case 'weekly':
            // For weekly budgets, use the current week of the selected month
            startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate() - 7);
            endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
            break;
          case 'monthly':
            // For monthly budgets, use the selected month
            startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            break;
          case 'quarterly':
            // For quarterly budgets, use the quarter of the selected month
            const quarterStart = Math.floor(currentMonth.getMonth() / 3) * 3;
            startDate = new Date(currentMonth.getFullYear(), quarterStart, 1);
            endDate = new Date(currentMonth.getFullYear(), quarterStart + 3, 0);
            break;
          case 'yearly':
            // For yearly budgets, use the year of the selected month
            startDate = new Date(currentMonth.getFullYear(), 0, 1);
            endDate = new Date(currentMonth.getFullYear(), 11, 31);
            break;
          default:
            startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        }

        // Fetch transactions for this category and period
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category_id', budget.category_id)
          .eq('type', 'expense')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (error) throw error;

        const totalSpent = transactions?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
        spendingData[budget.id] = totalSpent;
      }

      setBudgetSpending(spendingData);
    } catch (error) {
      console.error('Error fetching budget spending:', error);
    }
  };

  const getBudgetProgress = (budget: Budget) => {
    const spent = budgetSpending[budget.id] || 0;
    const percentage = (spent / budget.amount) * 100;
    return {
      spent,
      percentage: Math.min(percentage, 100),
      isOverBudget: percentage > 100,
      isNearLimit: percentage >= budget.alert_threshold
    };
  };

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
          category_id,
          alert_threshold,
          categories(name)
        `);

      if (budgetsError) throw budgetsError;

      // Fetch categories (only user-created categories, not pre-defined ones)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'expense')
        .eq('user_id', user?.id);

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
        period: formData.period,
        alert_threshold: formData.alert_threshold
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso!",
      });

      setIsModalOpen(false);
      setFormData({ name: '', amount: '', category_id: '', period: 'monthly', alert_threshold: 80 });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar orçamento",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      amount: budget.amount.toString(),
      category_id: budget.category_id || '',
      period: budget.period,
      alert_threshold: budget.alert_threshold || 80
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBudget) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          name: formData.name,
          amount: parseFloat(formData.amount),
          category_id: formData.category_id || null,
          period: formData.period,
          alert_threshold: formData.alert_threshold
        })
        .eq('id', editingBudget.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento atualizado com sucesso!",
      });

      setIsEditModalOpen(false);
      setEditingBudget(null);
      setFormData({ name: '', amount: '', category_id: '', period: 'monthly', alert_threshold: 80 });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar orçamento",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (budgetId: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso!",
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir orçamento",
        variant: "destructive"
      });
    }
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

  if (loading) {
    return <div className="p-6">Carregando orçamentos...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Orçamentos</h1>
        
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

        <div className="flex justify-end">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center justify-center w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Criar Novo Orçamento</span>
                <span className="sm:hidden">Novo Orçamento</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                      {categories
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                        .map((category) => (
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
                      <SelectItem value="yearly">Anual</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <Label className="text-sm font-medium">Notificações de Limite</Label>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Alerta quando atingir:</span>
                      <span className="text-sm font-medium text-blue-600">{formData.alert_threshold}%</span>
                    </div>
                    <Slider
                      value={[formData.alert_threshold]}
                      onValueChange={(value) => handleInputChange('alert_threshold', value[0].toString())}
                      max={100}
                      min={10}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Você receberá uma notificação quando o gasto atingir esta porcentagem do orçamento.
                    </p>
                  </div>
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

        {/* Modal de Edição */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Orçamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Orçamento</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: Alimentação, Transporte..."
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-amount">Valor do Orçamento</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoria</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-period">Período</Label>
                <Select value={formData.period} onValueChange={(value) => handleInputChange('period', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <Label className="text-sm font-medium">Notificações de Limite</Label>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Alerta quando atingir:</span>
                    <span className="text-sm font-medium text-blue-600">{formData.alert_threshold}%</span>
                  </div>
                  <Slider
                    value={[formData.alert_threshold]}
                    onValueChange={(value) => handleInputChange('alert_threshold', value[0].toString())}
                    max={100}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Você receberá uma notificação quando o gasto atingir esta porcentagem do orçamento.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingBudget(null);
                    setFormData({ name: '', amount: '', category_id: '', period: 'monthly', alert_threshold: 80 });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Orçamentos em Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length > 0 ? (
          budgets.map((budget) => {
            const progress = getBudgetProgress(budget);
            const cardColor = progress.isOverBudget 
              ? '#EF4444' 
              : progress.isNearLimit 
                ? '#F59E0B' 
                : '#10B981';

            return (
              <div
                key={budget.id}
                className="rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-white"
                style={{ backgroundColor: cardColor }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {progress.isOverBudget ? (
                      <AlertTriangle size={20} className="text-white" />
                    ) : progress.isNearLimit ? (
                      <Bell size={20} className="text-white" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-2 text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-2 text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-md transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o orçamento "{budget.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(budget.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-4">{budget.name}</h3>
                
                {/* Informações do orçamento */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-white text-opacity-90">
                    <span>Categoria:</span>
                    <span className="font-medium">{budget.categories?.name || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-white text-opacity-90">
                    <span>Período:</span>
                    <span className="font-medium capitalize">{budget.period}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-white text-opacity-90">
                    <span>Orçamento:</span>
                    <span className="font-medium">
                      R$ {Number(budget.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                  <div className="flex justify-between text-sm text-white text-opacity-90 mb-2">
                    <span>Gasto:</span>
                    <span className="font-medium">
                      R$ {progress.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="w-full bg-white bg-opacity-30 rounded-full h-2 mb-2">
                    <div 
                      className="h-2 rounded-full bg-white transition-all duration-300"
                      style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-white text-opacity-75">
                    <span>{progress.percentage.toFixed(1)}% usado</span>
                    <span>
                      {progress.isOverBudget 
                        ? 'Excedido' 
                        : progress.isNearLimit 
                          ? 'Próximo do limite' 
                          : 'Dentro do orçamento'
                      }
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Bell size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum orçamento criado</h3>
            <p className="text-gray-600 mb-4">Comece criando seu primeiro orçamento para controlar seus gastos</p>
            <Button onClick={() => setIsModalOpen(true)} className="px-4 py-2">
              Criar Primeiro Orçamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPage;
