import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';
import { Plus, Edit, Trash2, CreditCard } from 'lucide-react';

interface Cartao {
  id: string;
  nome: string;
  limite: number;
  dia_fechamento: number;
  cor: string;
  created_at: string;
}

const CartoesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    dia_fechamento: '1',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const cartaoData = {
        nome: formData.nome,
        limite: 0, // Valor padrão, já que removemos o campo
        dia_fechamento: parseInt(formData.dia_fechamento),
        cor: formData.cor,
        user_id: user.id
      };

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
    }
  };

  const handleEdit = (cartao: Cartao) => {
    setEditingCartao(cartao);
    setFormData({
      nome: cartao.nome,
      dia_fechamento: cartao.dia_fechamento.toString(),
      cor: cartao.cor
    });
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

  const closeModal = () => {
    setShowModal(false);
    setEditingCartao(null);
    setFormData({
      nome: '',
      dia_fechamento: '1',
      cor: '#3B82F6'
    });
  };

  const getProximoFechamento = (diaFechamento: number) => {
    const hoje = new Date();
    const proximoFechamento = new Date(hoje.getFullYear(), hoje.getMonth(), diaFechamento);
    
    if (proximoFechamento <= hoje) {
      proximoFechamento.setMonth(proximoFechamento.getMonth() + 1);
    }
    
    return proximoFechamento.toLocaleDateString('pt-BR');
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
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cartao.cor }}
                />
                <CreditCard size={20} className="text-gray-600" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(cartao)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(cartao.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{cartao.nome}</h3>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Fechamento:</span>
                <span className="font-medium">Dia {cartao.dia_fechamento}</span>
              </div>
              <div className="flex justify-between">
                <span>Próximo fechamento:</span>
                <span className="font-medium">{getProximoFechamento(cartao.dia_fechamento)}</span>
              </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia de Fechamento
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.dia_fechamento}
                  onChange={(e) => setFormData({ ...formData, dia_fechamento: e.target.value })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                    <option key={dia} value={dia}>Dia {dia}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Compras após esta data são lançadas para o mês posterior ao seguinte
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
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {editingCartao ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartoesPage;