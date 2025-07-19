
import React from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <Construction className="w-16 h-16 text-gray-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 text-center max-w-md">
        {description || "Esta funcionalidade está sendo desenvolvida e estará disponível em breve."}
      </p>
    </div>
  );
};

export default ComingSoon;
