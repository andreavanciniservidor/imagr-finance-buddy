import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import { Plus, Edit, Trash2, CreditCard, AlertTriangle } from 'lucide-react';
import PeriodoInfo from './PeriodoInfo';
import { CartaoExtended } from '../types/cartao';
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

// Using CartaoExtended from types instead of local interface

const CartoesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartoes, setCartoes] = useState<CartaoExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCartao, setEditingCartao] = useState<CartaoExtended | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    dia_fechamento: '1',
    dia_vencimento: '',
    melhor_dia_compra: '',
    cor: '#3B82F6'
  });

  const cores = [
    { nome: 'Azul', valor: '#3B82F6' },
    { nome: 'Verde', valor: '#10B981' },
    { nome: 'Vermelho', valor: '#EF4444' },
    { nome: 'Roxo', valor: '#8B5CF6' },
    { nome: 'Rosa', valor: '#EC4899' },
    { nome: 'Laranja', valor: '#F59E0B' },
    { nome: 'Cinza', valor: '#6B7280' },
    { nome: 'Indigo', valor: '#6366F1' }
  ];

  useEffect(() => {
    if (user) {
      fetchCartoes();
    }
  }, [user]);

  const fetchCartoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cartoes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cartões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if changes are significant (closing day change for existing card)
  const checkSignificantChanges = (newData: any, originalCartao: CartaoExtended | null) => {
    if (!originalCartao) return false; // New card, no significant changes
    
    const newClosingDay = parseInt(newData.dia_fechamento);
    const originalClosingDay = originalCartao.dia_fechamento;
    
    // Significant if closing day changes by more than 5 days
    return Math.abs(newClosingDay - originalClosingDay) > 5;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    const cartaoData = {
      nome: formData.nome,
      limite: 0, // Valor padrão, já que removemos o campo
      dia_fechamento: parseInt(formData.dia_fechamento),
      dia_vencimento: formData.dia_vencimento ? parseInt(formData.dia_vencimento) : null,
      melhor_dia_compra: formData.melhor_dia_compra ? parseInt(formData.melhor_dia_compra) : null,
      cor: formData.cor,
      user_id: user.id
    };

    // Check for significant changes
    if (editingCartao && checkSignificantChanges(cartaoData, editingCartao)) {
      setPendingChanges(cartaoData);
      setShowConfirmDialog(true);
      return;
    }

    // Proceed with submission
    await submitCartao(cartaoData);
  };

  const submitCartao = async (cartaoData: any) => {
    setSubmitting(true);
    try {
      if (editingCartao) {
        // Atualizar cartão existente
        const { error } = await supabase
          .from('cartoes')
          .update(cartaoData)
          .eq('id', editingCartao.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Cartão atualizado com sucesso!",
        });
      } else {
        // Criar novo cartão
        const { error } = await supabase
          .from('cartoes')
          .insert([cartaoData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Cartão criado com sucesso!",
        });
      }

      setShowModal(false);
      setEditingCartao(null);
      setFormData({
        nome: '',
        dia_fechamento: '1',
        dia_vencimento: '',
        melhor_dia_compra: '',
        cor: '#3B82F6'
      });
      fetchCartoes();
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar cartão. Verifique se a tabela foi criada no banco de dados.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cartao: CartaoExtended) => {
    setEditingCartao(cartao);
    setFormData({
      nome: cartao.nome,
      dia_fechamento: cartao.dia_fechamento.toString(),
      dia_vencimento: cartao.dia_vencimento ? cartao.dia_vencimento.toString() : '',
      melhor_dia_compra: cartao.melhor_dia_compra ? cartao.melhor_dia_compra.toString() : '',
      cor: cartao.cor
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (cartaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cartão?')) return;

    try {
      const { error } = await supabase
        .from('cartoes')
        .delete()
        .eq('id', cartaoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cartão excluído com sucesso!",
      });
      fetchCartoes();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir cartão",
        variant: "destructive"
      });
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Validate nome
    if (!formData.nome.trim()) {
      errors.nome = 'Nome do cartão é obrigatório';
    }
    
    // Validate dia_fechamento
    const diaFechamento = parseInt(formData.dia_fechamento);
    if (diaFechamento < 1 || diaFechamento > 31) {
      errors.dia_fechamento = 'Dia de fechamento deve estar entre 1 e 31';
    }
    
    // Validate dia_vencimento if provided
    if (formData.dia_vencimento) {
      const diaVencimento = parseInt(formData.dia_vencimento);
      if (diaVencimento < 1 || diaVencimento > 31) {
        errors.dia_vencimento = 'Dia de vencimento deve estar entre 1 e 31';
      }
      
      // Ensure vencimento > fechamento (considering month wrap-around)
      if (diaVencimento === diaFechamento) {
        errors.dia_vencimento = 'Dia de vencimento deve ser diferente do dia de fechamento';
      }
      
      // Check if vencimento is too close to fechamento (less than 3 days)
      const diffDays = diaVencimento > diaFechamento 
        ? diaVencimento - diaFechamento 
        : (31 - diaFechamento) + diaVencimento;
      
      if (diffDays < 3) {
        errors.dia_vencimento = 'Vencimento deve ser pelo menos 3 dias após o fechamento';
      }
    }
    
    // Validate melhor_dia_compra if provided
    if (formData.melhor_dia_compra) {
      const melhorDia = parseInt(formData.melhor_dia_compra);
      if (melhorDia < 1 || melhorDia > 31) {
        errors.melhor_dia_compra = 'Melhor dia de compra deve estar entre 1 e 31';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCartao(null);
    setFormErrors({});
    setFormData({
      nome: '',
      dia_fechamento: '1',
      dia_vencimento: '',
      melhor_dia_compra: '',
      cor: '#3B82F6'
    });
  };



  if (loading) {
    return <div className="p-6">Carregando cartões...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cartões</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Novo Cartão
        </button>
      </div>

      {/* Lista de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cartoes.map((cartao) => (
          <div
            key={cartao.id}
            className="rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-white"
            style={{ backgroundColor: cartao.cor }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-white" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(cartao)}
                  className="p-2 text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(cartao.id)}
                  className="p-2 text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-4">{cartao.nome}</h3>
            
            {/* Enhanced period information using PeriodoInfo component */}
            <PeriodoInfo cartao={cartao} showDetails={true} />
            
            {/* Basic card info */}
            <div className="mt-4 pt-4 border-t border-white border-opacity-20">
              <div className="flex justify-between text-sm text-white text-opacity-90">
                <span>Fechamento:</span>
                <span className="font-medium">Dia {cartao.dia_fechamento}</span>
              </div>
              {cartao.dia_vencimento && (
                <div className="flex justify-between text-sm text-white text-opacity-90 mt-1">
                  <span>Vencimento:</span>
                  <span className="font-medium">Dia {cartao.dia_vencimento}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {cartoes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cartão cadastrado</h3>
            <p className="text-gray-600 mb-4">Comece criando seu primeiro cartão de crédito</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Criar Primeiro Cartão
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingCartao ? 'Editar Cartão' : 'Novo Cartão'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Itaú, Bradesco..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    formErrors.nome 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
                {formErrors.nome && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.nome}</p>
                )}
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia de Fechamento
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    formErrors.dia_fechamento 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  value={formData.dia_fechamento}
                  onChange={(e) => setFormData({ ...formData, dia_fechamento: e.target.value })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                    <option key={dia} value={dia}>Dia {dia}</option>
                  ))}
                </select>
                {formErrors.dia_fechamento && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.dia_fechamento}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Compras após esta data são lançadas para o mês posterior ao seguinte
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia de Vencimento (Opcional)
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    formErrors.dia_vencimento 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  value={formData.dia_vencimento}
                  onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                >
                  <option value="">Calcular automaticamente</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                    <option key={dia} value={dia}>Dia {dia}</option>
                  ))}
                </select>
                {formErrors.dia_vencimento && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.dia_vencimento}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Se não informado, será calculado como fechamento + 10 dias
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Melhor Dia para Compras (Opcional)
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    formErrors.melhor_dia_compra 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  value={formData.melhor_dia_compra}
                  onChange={(e) => setFormData({ ...formData, melhor_dia_compra: e.target.value })}
                >
                  <option value="">Não definido</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                    <option key={dia} value={dia}>Dia {dia}</option>
                  ))}
                </select>
                {formErrors.melhor_dia_compra && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.melhor_dia_compra}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Dia recomendado para maximizar o prazo de pagamento
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {cores.map((cor) => (
                    <button
                      key={cor.valor}
                      type="button"
                      className={`w-full h-10 rounded-md border-2 transition-all ${
                        formData.cor === cor.valor 
                          ? 'border-gray-900 scale-105' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: cor.valor }}
                      onClick={() => setFormData({ ...formData, cor: cor.valor })}
                      title={cor.nome}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Salvando...' : (editingCartao ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Significant Changes */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Mudança Significativa Detectada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está alterando o dia de fechamento em mais de 5 dias. Isso pode afetar 
              significativamente o cálculo das datas de lançamento das suas transações futuras 
              e o planejamento financeiro. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
              setPendingChanges(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (pendingChanges) {
                await submitCartao(pendingChanges);
              }
              setShowConfirmDialog(false);
              setPendingChanges(null);
            }}>
              Continuar com as Alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CartoesPage;