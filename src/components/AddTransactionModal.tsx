import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import FaturaPreview from './FaturaPreview';
import { FaturaCalculator } from '@/lib/faturaCalculator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'income' | 'expense';
}

interface Category {
  id: string;
  name: string;
}

interface Cartao {
  id: string;
  nome: string;
  cor: string;
  dia_fechamento: number;
  dia_vencimento: number | null;
  melhor_dia_compra: number | null;
  limite: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  type 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loadingCartoes, setLoadingCartoes] = useState(false);
  
  // Métodos de pagamento fixos (ordenados alfabeticamente)
  const paymentMethods = [
    { id: 'credit_card', name: 'Cartão de Crédito' },
    { id: 'debit_card', name: 'Cartão de Débito' },
    { id: 'cash', name: 'Dinheiro' },
    { id: 'pix', name: 'Pix' },
    { id: 'transfer', name: 'Transferência' }
  ];

  // Função para obter data atual no formato correto (sem problemas de fuso horário)
  const getCurrentDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category_id: '',
    payment_method: 'credit_card',
    cartao_id: '',
    date: getCurrentDateString(),
    transactionType: type,
    isRecurring: false,
    installments: 1,
    totalAmount: '',
    observations: ''
  });

  const [previewLoading, setPreviewLoading] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);
  const [showDateChangeDialog, setShowDateChangeDialog] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<string | null>(null);

  // Debounced loading for preview calculations
  const debouncePreviewLoading = useCallback(() => {
    setPreviewLoading(true);
    const timer = setTimeout(() => {
      setPreviewLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Check if date change is significant (more than 1 month difference in launch date)
  const checkSignificantDateChange = useCallback((newDate: string, oldDate: string, cartaoId: string) => {
    if (!cartaoId || !newDate || !oldDate) return false;
    
    const cartao = cartoes.find(c => c.id === cartaoId);
    if (!cartao) return false;

    try {
      const [newYear, newMonth, newDay] = newDate.split('-').map(Number);
      const [oldYear, oldMonth, oldDay] = oldDate.split('-').map(Number);
      
      const newPurchaseDate = new Date(newYear, newMonth - 1, newDay);
      const oldPurchaseDate = new Date(oldYear, oldMonth - 1, oldDay);
      
      const newLaunchDate = FaturaCalculator.calculateLaunchDate(newPurchaseDate, cartao);
      const oldLaunchDate = FaturaCalculator.calculateLaunchDate(oldPurchaseDate, cartao);
      
      const monthsDifference = Math.abs(
        (newLaunchDate.getFullYear() - oldLaunchDate.getFullYear()) * 12 + 
        (newLaunchDate.getMonth() - oldLaunchDate.getMonth())
      );
      
      return monthsDifference > 1;
    } catch (error) {
      console.warn('Error checking significant date change:', error);
      return false;
    }
  }, [cartoes]);

  useEffect(() => {
    if (isOpen) {
      // Limpar cache para garantir cálculos atualizados
      FaturaCalculator.clearCache();
      
      fetchCategories();
      fetchCartoes();
      // Definir parcelamento como true por padrão para cartão de crédito
      setShowInstallments(formData.payment_method === 'credit_card');
    }
  }, [isOpen, type]);

  // Adicionar listener para quando o app volta do background (mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isOpen && categories.length === 0 && user) {
        console.log('App voltou do background, recarregando categorias...');
        fetchCategories();
      }
    };

    const handleFocus = () => {
      if (isOpen && categories.length === 0 && user) {
        console.log('Janela ganhou foco, recarregando categorias...');
        fetchCategories();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && isOpen && categories.length === 0 && user) {
        console.log('Página restaurada do cache, recarregando categorias...');
        fetchCategories();
      }
    };

    const handleResume = () => {
      if (isOpen && categories.length === 0 && user) {
        console.log('App resumiu, recarregando categorias...');
        fetchCategories();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('resume', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('resume', handleResume);
    };
  }, [isOpen, categories.length, user]);

  // Verificar se as categorias estão vazias quando o tipo muda
  useEffect(() => {
    if (isOpen && user && categories.length === 0) {
      fetchCategories();
    }
  }, [formData.transactionType, isOpen, user]);

  // Forçar re-render quando as categorias são carregadas
  useEffect(() => {
    if (categories.length > 0 && formData.category_id === '' && !loadingCategories) {
      setFormData(prev => ({ ...prev, category_id: '' }));
    }
  }, [categories.length, loadingCategories]);

  const fetchCategories = async (retryCount = 0) => {
    if (!user) return;
    
    setLoadingCategories(true);
    
    try {
      console.log(`Buscando categorias (tentativa ${retryCount + 1})...`);
      
      // Optimized query with specific field selection and proper indexing
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', formData.transactionType)
        .eq('user_id', user.id)
        .order('name'); // Add ordering for consistent results

      if (error) throw error;
      
      setCategories(data || []);
      console.log(`Categorias carregadas: ${data?.length || 0} encontradas`);
      
      if ((!data || data.length === 0) && retryCount === 0) {
        console.log('Nenhuma categoria encontrada, tentando novamente...');
        setTimeout(() => {
          if (isOpen && user) {
            fetchCategories(1);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      
      if (retryCount >= 2) {
        toast({
          title: "Erro",
          description: "Erro ao carregar categorias",
          variant: "destructive"
        });
      }
      
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => {
          if (isOpen && user) {
            fetchCategories(retryCount + 1);
          }
        }, delay);
      }
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchCartoes = async () => {
    if (!user) return;
    
    setLoadingCartoes(true);
    
    try {
      const { data, error } = await supabase
        .from('cartoes')
        .select('id, nome, cor, dia_fechamento, dia_vencimento, melhor_dia_compra, limite, user_id, created_at, updated_at')
        .eq('user_id', user.id)
        .order('nome');

      if (error) throw error;
      
      setCartoes(data || []);
    } catch (error) {
      console.error('Error fetching cartoes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cartões",
        variant: "destructive"
      });
    } finally {
      setLoadingCartoes(false);
    }
  };

  // Função para calcular a data de lançamento usando FaturaCalculator
  // Agora mantém o mesmo dia da compra no mês de lançamento
  const calculateCreditCardDate = (purchaseDate: string, cartaoId: string) => {
    if (!cartaoId) return purchaseDate;

    const cartao = cartoes.find(c => c.id === cartaoId);
    if (!cartao) return purchaseDate;

    try {
      // Limpar cache para garantir cálculo atualizado
      FaturaCalculator.clearCacheForCard(cartaoId);
      
      const [year, month, day] = purchaseDate.split('-').map(Number);
      const purchaseDateObj = new Date(year, month - 1, day);
      
      const launchDate = FaturaCalculator.calculateLaunchDate(purchaseDateObj, cartao);
      
      const newYear = launchDate.getFullYear();
      const newMonth = String(launchDate.getMonth() + 1).padStart(2, '0');
      const newDay = String(launchDate.getDate()).padStart(2, '0');
      
      return `${newYear}-${newMonth}-${newDay}`;
    } catch (error) {
      console.warn('Erro no cálculo de data do cartão, usando fallback simples:', error);
      
      // Fallback simples: manter o mesmo dia no próximo mês
      const [year, month, day] = purchaseDate.split('-').map(Number);
      const launchDate = new Date(year, month - 1, day);
      
      // Se a compra foi após o fechamento, vai para 2 meses à frente
      // Se foi antes do fechamento, vai para 1 mês à frente
      const closingDay = cartao.dia_fechamento;
      if (day > closingDay) {
        launchDate.setMonth(launchDate.getMonth() + 2);
      } else {
        launchDate.setMonth(launchDate.getMonth() + 1);
      }
      
      // Ajustar o dia se necessário (ex: 31 de janeiro -> 28/29 de fevereiro)
      const targetMonth = launchDate.getMonth();
      const targetYear = launchDate.getFullYear();
      const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const adjustedDay = Math.min(day, lastDayOfMonth);
      
      launchDate.setDate(adjustedDay);
      
      const newYear = launchDate.getFullYear();
      const newMonth = String(launchDate.getMonth() + 1).padStart(2, '0');
      const newDay = String(launchDate.getDate()).padStart(2, '0');
      
      return `${newYear}-${newMonth}-${newDay}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const isCreditCard = formData.payment_method === 'credit_card';
      const isInstallment = isCreditCard && showInstallments && formData.installments > 1;

      if (isInstallment) {
        const transactions = [];
        const [year, month, day] = formData.date.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day);
        
        for (let i = 0; i < formData.installments; i++) {
          const [year, month, day] = formData.date.split('-').map(Number);
          const purchaseDate = new Date(year, month - 1, day);
          
          const installmentPurchaseDate = new Date(purchaseDate);
          installmentPurchaseDate.setMonth(installmentPurchaseDate.getMonth() + i);
          
          const installmentLaunchDate = calculateCreditCardDate(
            `${installmentPurchaseDate.getFullYear()}-${String(installmentPurchaseDate.getMonth() + 1).padStart(2, '0')}-${String(installmentPurchaseDate.getDate()).padStart(2, '0')}`,
            formData.cartao_id
          );
          
          const installmentDescription = formData.installments > 1 
            ? `${formData.description} (${i + 1}/${formData.installments})`
            : formData.description;

          transactions.push({
            user_id: user.id,
            amount: parseFloat(formData.amount),
            description: installmentDescription,
            category_id: formData.category_id || null,
            account_id: null,
            payment_method: formData.payment_method,
            cartao_id: formData.payment_method === 'credit_card' ? formData.cartao_id || null : null,
            date: installmentLaunchDate,
            type: formData.transactionType
          });
        }

        const { error } = await supabase.from('transactions').insert(transactions);
        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `Compra parcelada em ${formData.installments}x criada com sucesso!`,
        });
      } else {
        let transactionDate = formData.date;
        
        if (isCreditCard) {
          transactionDate = calculateCreditCardDate(formData.date, formData.cartao_id);
        }

        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category_id: formData.category_id || null,
          account_id: null,
          payment_method: formData.payment_method,
          cartao_id: formData.payment_method === 'credit_card' ? formData.cartao_id || null : null,
          date: transactionDate,
          type: formData.transactionType
        });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `${formData.transactionType === 'income' ? 'Receita' : 'Despesa'} adicionada com sucesso!`,
        });
      }

      onSuccess();
      onClose();
      setFormData({
        amount: '',
        description: '',
        category_id: '',
        payment_method: 'credit_card',
        cartao_id: '',
        date: getCurrentDateString(),
        transactionType: type,
        isRecurring: false,
        installments: 1,
        totalAmount: '',
        observations: ''
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar transação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Nova Transação
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              placeholder="presente"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Valor por Parcela e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor por Parcela (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value });
                  if (formData.installments > 1) {
                    const total = parseFloat(e.target.value) * formData.installments;
                    setFormData(prev => ({ ...prev, amount: e.target.value, totalAmount: total.toFixed(2) }));
                  }
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    const oldDate = formData.date;
                    
                    if (formData.payment_method === 'credit_card' && formData.cartao_id && 
                        checkSignificantDateChange(newDate, oldDate, formData.cartao_id)) {
                      setPendingDateChange(newDate);
                      setShowDateChangeDialog(true);
                    } else {
                      setFormData({ ...formData, date: newDate });
                      if (formData.payment_method === 'credit_card' && formData.cartao_id) {
                        debouncePreviewLoading();
                      }
                    }
                  }}
                  required
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Tipo e Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <div className="relative">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={formData.transactionType}
                  onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as 'income' | 'expense' })}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
                {loadingCategories && (
                  <span className="ml-2 text-xs text-blue-600">(Carregando...)</span>
                )}
                {!loadingCategories && categories.length === 0 && (
                  <button
                    type="button"
                    onClick={() => fetchCategories()}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Recarregar
                  </button>
                )}
              </label>
              <div className="relative">
                <select
                  key={`categories-${categories.length}-${formData.transactionType}-${loadingCategories}-${Date.now()}`}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${
                    loadingCategories ? 'bg-gray-50' : 'bg-white'
                  }`}
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  disabled={loadingCategories}
                >
                  <option value="">
                    {loadingCategories 
                      ? 'Carregando categorias...' 
                      : categories.length === 0 
                        ? 'Nenhuma categoria encontrada'
                        : 'Selecione uma categoria'
                    }
                  </option>
                  {categories
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pagamento
            </label>
            <div className="relative">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                value={formData.payment_method}
                onChange={(e) => {
                  setFormData({ ...formData, payment_method: e.target.value, cartao_id: '' });
                  setShowInstallments(e.target.value === 'credit_card');
                }}
              >
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Campo Cartão - aparece apenas quando Cartão de Crédito é selecionado */}
          {formData.payment_method === 'credit_card' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cartão
                {loadingCartoes && (
                  <span className="ml-2 text-xs text-blue-600">(Carregando...)</span>
                )}
              </label>
              <div className="relative">
                <select
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${
                    loadingCartoes ? 'bg-gray-50' : 'bg-white'
                  }`}
                  value={formData.cartao_id}
                  onChange={(e) => setFormData({ ...formData, cartao_id: e.target.value })}
                  disabled={loadingCartoes}
                  required={formData.payment_method === 'credit_card'}
                >
                  <option value="">
                    {loadingCartoes 
                      ? 'Carregando cartões...' 
                      : cartoes.length === 0 
                        ? 'Nenhum cartão encontrado'
                        : 'Selecione um cartão'
                    }
                  </option>
                  {cartoes.map((cartao) => (
                    <option key={cartao.id} value={cartao.id}>
                      {cartao.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {cartoes.length === 0 && !loadingCartoes && (
                <p className="text-xs text-gray-500 mt-1">
                  Nenhum cartão cadastrado. <span className="text-blue-600 cursor-pointer hover:underline">Cadastre um cartão primeiro</span>.
                </p>
              )}
            </div>
          )}

          {/* FaturaPreview - aparece quando cartão de crédito é selecionado */}
          {formData.payment_method === 'credit_card' && formData.cartao_id && (
            <FaturaPreview
              cartao={cartoes.find(c => c.id === formData.cartao_id) || null}
              purchaseDate={formData.date}
              amount={formData.amount}
              isLoading={previewLoading}
              className="mt-4"
            />
          )}

          {/* Transação Recorrente */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="recurring"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            />
            <label htmlFor="recurring" className="text-sm text-gray-700">
              Transação Recorrente
            </label>
          </div>

          {/* Seção de Compra Parcelada */}
          {showInstallments && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 space-y-4">
              <div className="bg-yellow-200 text-yellow-800 text-xs p-2 rounded">
                <strong>Nota:</strong> O lançamento considera o dia de fechamento do cartão. Compras após o fechamento vão para o mês posterior ao seguinte.
              </div>
              
              <button
                type="button"
                className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 font-medium"
                onClick={() => {
                  if (formData.installments > 1) {
                    const total = parseFloat(formData.amount) * formData.installments;
                    setFormData(prev => ({ ...prev, totalAmount: total.toFixed(2) }));
                  }
                }}
              >
                Compra Parcelada
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Parcelas
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      value={formData.installments}
                      onChange={(e) => {
                        const installments = parseInt(e.target.value);
                        const total = parseFloat(formData.amount) * installments;
                        setFormData({ 
                          ...formData, 
                          installments, 
                          totalAmount: total.toFixed(2) 
                        });
                      }}
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}x
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    value={`R$ ${formData.totalAmount || (parseFloat(formData.amount) * formData.installments).toFixed(2)}`}
                    readOnly
                  />
                </div>
              </div>

              {formData.installments > 1 && (
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Serão geradas {formData.installments} parcelas de R$ {formData.amount}</p>
                  <p>• Primeira parcela em {(() => {
                    const [year, month, day] = formData.date.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    date.setMonth(date.getMonth() + 1);
                    return date.toLocaleDateString('pt-BR');
                  })()}</p>
                  <p>• Última parcela em {(() => {
                    const [year, month, day] = formData.date.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    date.setMonth(date.getMonth() + formData.installments);
                    return date.toLocaleDateString('pt-BR');
                  })()}</p>
                  <div className="bg-yellow-200 text-yellow-800 p-2 rounded mt-2">
                    <strong>Nota:</strong> Em compras parceladas, a primeira parcela é lançada para o mês seguinte.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações (opcional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Informações adicionais sobre a transação"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            />
          </div>

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      {/* Date Change Confirmation Dialog */}
      <AlertDialog open={showDateChangeDialog} onOpenChange={setShowDateChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mudança Significativa de Data</AlertDialogTitle>
            <AlertDialogDescription>
              A mudança de data resultará em uma diferença significativa na data de lançamento da fatura 
              (mais de 1 mês). Isso pode afetar o planejamento financeiro. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDateChangeDialog(false);
              setPendingDateChange(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingDateChange) {
                setFormData({ ...formData, date: pendingDateChange });
                if (formData.payment_method === 'credit_card' && formData.cartao_id) {
                  debouncePreviewLoading();
                }
              }
              setShowDateChangeDialog(false);
              setPendingDateChange(null);
            }}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddTransactionModal;
