import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/use-toast';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  user_id: string | null;
}

const CategoriesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#3B82F6',
  });

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type, color, user_id')
        .eq('user_id', user.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      // Type assertion to ensure proper typing
      setCategories((data || []).map(cat => ({
        ...cat,
        type: cat.type as 'income' | 'expense'
      })));
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleColorChange = (color: string) => {
    setFormData({
      ...formData,
      color: color,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            type: formData.type,
            color: formData.color,
          })
          .eq('id', editingCategory.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Categoria atualizada com sucesso!",
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name,
            type: formData.type,
            color: formData.color,
            user_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Categoria criada com sucesso!",
        });
      }

      fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar categoria",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (window.confirm("Tem certeza que deseja excluir esta categoria?")) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Categoria excluída com sucesso!",
        });

        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir categoria",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const openModal = (type?: 'income' | 'expense') => {
    setShowModal(true);
    setFormData({
      name: '',
      type: type || activeTab,
      color: '#3B82F6',
    });
    setEditingCategory(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const filteredCategories = categories.filter(category => category.type === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Categorias</h1>
          </div>
          
          <button
            onClick={() => openModal()}
            className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-gray-900 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-6">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'expense'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'income'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Receitas
          </button>
        </div>

        {/* Categories Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Categorias de {activeTab === 'expense' ? 'Despesas' : 'Receitas'}
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando categorias...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg p-4 text-white relative overflow-hidden"
                  style={{ backgroundColor: category.color }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white">{category.name}</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-white text-opacity-90">
                    <Tag className="w-4 h-4 mr-2" />
                    <span className="text-sm">
                      {category.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </div>
                </div>
              ))}

              {filteredCategories.length === 0 && !loading && (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Tag className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma categoria de {activeTab === 'expense' ? 'despesa' : 'receita'} encontrada
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Comece criando sua primeira categoria para organizar suas transações
                  </p>
                  <button
                    onClick={() => openModal(activeTab)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Criar Primeira Categoria
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                X
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cor</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-24 h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
