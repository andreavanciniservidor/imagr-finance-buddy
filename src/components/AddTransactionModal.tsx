
import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';

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
    date: getCurrentDateString(),
    transactionType: type,
    isRecurring: false,
    installments: 1,
    totalAmount: '',
    observations: ''
  });

  const [showInstallments, setShowInstallments] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Definir parcelamento como true por padrão para cartão de crédito
      setShowInstallments(formData.payment_method === 'credit_card');
    }
  }, [isOpen, type]);

  // Adicionar listener para quando o app volta do background (mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isOpen && categories.length === 0 && user) {
        // App voltou do background e modal está aberto mas sem categorias
        console.log('App voltou do background, recarregando categorias...');
        fetchCategories();
      }
    };

    const handleFocus = () => {
      if (isOpen && categories.length === 0 && user) {
        // Janela ganhou foco e modal está aberto mas sem categorias
        console.log('Janela ganhou foco, recarregando categorias...');
        fetchCategories();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && isOpen && categories.length === 0 && user) {
        // Página foi restaurada do cache (mobile)
        console.log('Página restaurada do cache, recarregando categorias...');
        fetchCategories();
      }
    };

    const handleResume = () => {
      if (isOpen && categories.length === 0 && user) {
        // App resumiu (mobile)
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
    if (isOpen && user) {
      fetchCategories();
    }
  }, [formData.transactionType, isOpen, user]);

  // Forçar re-render quando as categorias são carregadas
  useEffect(() => {
    if (categories.length > 0 && formData.category_id === '' && !loadingCategories) {
      // Força uma atualização do componente para garantir que o select seja re-renderizado
      setFormData(prev => ({ ...prev, category_id: '' }));
    }
  }, [categories.length, loadingCategories]);

  const fetchCategories = async (retryCount = 0) => {
    if (!user) return;
    
    setLoadingCategories(true);
    
    try {
      console.log(`Buscando categorias (tentativa ${retryCount + 1})...`);
      
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', formData.transactionType)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setCategories(data || []);
      console.log(`Categorias carregadas: ${data?.length || 0} encontradas`);
      
      // Se não encontrou categorias e é a primeira tentativa, tentar novamente
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
      
      // Só mostrar toast de erro após algumas tentativas
      if (retryCount >= 2) {
        toast({
          title: "Erro",
          description: "Erro ao carregar categorias",
          variant: "destructive"
        });
      }
      
      // Tentar novamente até 3 vezes
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Backoff exponencial
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Verificar se é cartão de crédito e tem parcelamento
      const isCreditCard = formData.payment_method === 'credit_card';
      const isInstallment = isCreditCard && showInstallments && formData.installments > 1;

      if (isInstallment) {
        // Criar múltiplas transações para parcelamento
        const transactions = [];
        const [year, month, day] = formData.date.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
        
        for (let i = 0; i < formData.installments; i++) {
          // Calcular a data de cada parcela (começando no mês seguinte)
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(baseDate.getMonth() + 1 + i);
          
          // Formatar data manualmente para evitar problemas de fuso horário
          const installmentYear = installmentDate.getFullYear();
          const installmentMonth = String(installmentDate.getMonth() + 1).padStart(2, '0');
          const installmentDay = String(installmentDate.getDate()).padStart(2, '0');
          const formattedDate = `${installmentYear}-${installmentMonth}-${installmentDay}`;
          
          // Ajustar descrição para incluir número da parcela
          const installmentDescription = formData.installments > 1 
            ? `${formData.description} (${i + 1}/${formData.installments})`
            : formData.description;

          transactions.push({
            user_id: user.id,
            amount: parseFloat(formData.amount),
            description: installmentDescription,
            category_id: formData.category_id || null,
            account_id: null, // Não usamos mais account_id, mas mantemos para compatibilidade
            payment_method: formData.payment_method,
            date: formattedDate,
            type: formData.transactionType
          });
        }

        // Inserir todas as parcelas
        const { error } = await supabase.from('transactions').insert(transactions);
        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `Compra parcelada em ${formData.installments}x criada com sucesso!`,
        });
      } else {
        // Transação única
        let transactionDate = formData.date;
        
        // Se for cartão de crédito, lançar no mês seguinte (independente de parcelamento)
        if (isCreditCard) {
          // Criar data local para evitar problemas de fuso horário
          const [year, month, day] = formData.date.split('-').map(Number);
          const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
          date.setMonth(date.getMonth() + 1);
          
          // Formatar data manualmente para evitar problemas de fuso horário
          const newYear = date.getFullYear();
          const newMonth = String(date.getMonth() + 1).padStart(2, '0');
          const newDay = String(date.getDate()).padStart(2, '0');
          transactionDate = `${newYear}-${newMonth}-${newDay}`;
        }

        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category_id: formData.category_id || null,
          account_id: null, // Não usamos mais account_id, mas mantemos para compatibilidade
          payment_method: formData.payment_method,
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
                  // Calcular valor total se houver parcelas
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
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                  setFormData({ ...formData, payment_method: e.target.value });
                  // Mostrar seção de parcelamento apenas se for cartão de crédito
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
                <strong>Nota:</strong> Em compras com cartão de crédito, o lançamento é feito para o mês seguinte.
              </div>
              
              <button
                type="button"
                className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 font-medium"
                onClick={() => {
                  // Lógica para compra parcelada
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
    </div>
  );
};

export default AddTransactionModal;
