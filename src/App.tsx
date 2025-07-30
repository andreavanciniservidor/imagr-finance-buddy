
import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import TransactionsPage from "@/components/TransactionsPage";
import BudgetPage from "@/components/BudgetPage";
import ReportsPage from "@/components/ReportsPage";
import CategoriesPage from "@/components/CategoriesPage";
import CartoesPage from "@/components/CartoesPage";
import ComingSoon from "@/components/ComingSoon";
import AuthPage from "@/components/AuthPage";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/goals" element={<ComingSoon title="Metas" />} />
        <Route path="/investments" element={<ComingSoon title="Investimentos" />} />
        <Route path="/cards" element={<CartoesPage />} />
        <Route path="/bills" element={<ComingSoon title="Contas" />} />
        <Route path="/help" element={<ComingSoon title="Ajuda" />} />
        <Route path="/profile" element={<ComingSoon title="Perfil" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Router>
      <AppContent />
      <Toaster />
    </Router>
  </QueryClientProvider>
);

export default App;
