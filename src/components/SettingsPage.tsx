
import React, { useState } from 'react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    language: 'Português (Brasil)',
    currency: 'BRL - Real Brasileiro',
    theme: 'Claro',
    emailNotifications: false,
    pushNotifications: false,
    budgetAlerts: false,
    twoFactor: false
  });

  const handleToggle = (setting: string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev]
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações Gerais */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Configurações Gerais</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Idioma</span>
              <span className="text-gray-900">{settings.language}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Moeda Padrão</span>
              <span className="text-gray-900">{settings.currency}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Tema</span>
              <div className="flex items-center">
                <span className="text-gray-900 mr-3">{settings.theme}</span>
                <div className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                  settings.theme === 'Escuro' ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    settings.theme === 'Escuro' ? 'translate-x-4' : ''
                  }`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Notificações</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Notificações por E-mail</span>
              <div 
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                  settings.emailNotifications ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onClick={() => handleToggle('emailNotifications')}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.emailNotifications ? 'translate-x-4' : ''
                }`}></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Notificações Push</span>
              <div 
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                  settings.pushNotifications ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onClick={() => handleToggle('pushNotifications')}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.pushNotifications ? 'translate-x-4' : ''
                }`}></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Alertas de Orçamento</span>
              <div 
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                  settings.budgetAlerts ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onClick={() => handleToggle('budgetAlerts')}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.budgetAlerts ? 'translate-x-4' : ''
                }`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Segurança */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Segurança</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Alterar Senha</span>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Alterar
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Autenticação de Dois Fatores</span>
              <div 
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                  settings.twoFactor ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onClick={() => handleToggle('twoFactor')}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.twoFactor ? 'translate-x-4' : ''
                }`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferências de Dados */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Preferências de Dados</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Exportar Dados</span>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Exportar
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Excluir Conta</span>
              <button className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
