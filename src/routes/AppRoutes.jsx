import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Importação das Páginas
import Home from '../pages/Home';
import HomeLogistas from '../pages/HomeLogistas';
import Lojas from '../pages/Lojas';
import Veiculos from '../pages/Veiculos';
import Vitrines from '../pages/Vitrines';
import VitrinePublicaSlug from '../pages/VitrinePublicaSlug';
import Sobre from '../pages/Sobre';
import Configuracoes from '../pages/Configuracoes';
import Relatorios from '../pages/Relatorios';
import Planos from '../components/Planos';
import Auth from '../components/Auth';
import Assinatura from '../Assinatura';
import DashboardFinanceiro from '../pages/DashboardFinanceiro';
import ResetPassword from '../pages/ResetPassword';
import DetalheVeiculo from '../pages/DetalheVeiculo';

export function AppRoutes({ session, tenantData, isAdmin, selectedStore }) {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <Routes>
      {/* Rota oficial de redefinição de palavra-passe */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Rota Raiz */}
      <Route 
        path="/" 
        element={
          <Home 
            session={session} 
            tenant={tenantData} 
            isAdmin={isAdmin} 
          />
        } 
      />
      
      {/* Rota de Login */}
      <Route 
        path="/login" 
        element={session ? <Navigate to="/" replace /> : <Auth />} 
      />

      {/* Rota Home Pública */}
      <Route 
        path="/home-publica" 
        element={
          <Home 
            session={null} 
            tenant={null} 
            isAdmin={false} 
          />
        } 
      />

      {/* 1. OBRIGATÓRIO: A rota específica do veículo vem ANTES da rota genérica do slug */}
      <Route 
        path="/:slug/veiculo/:id" 
        element={<DetalheVeiculo />} 
      />

      {/* 2. DEPOIS: A rota geral da vitrine por slug */}
      <Route 
        path="/:slug" 
        element={<VitrinePublicaSlug />} 
      />
      
      {/* Painel do Lojista */}
      <Route 
        path="/painel-lojista" 
        element={<HomeLogistas session={session} tenant={tenantData} />} 
      />
      
      <Route path="/sobre" element={<Sobre />} />
      <Route path="/planos" element={<Planos tenant={tenantData} session={session} />} />

      {/* Gestão de Veículos */}
      <Route path="/veiculos" element={<Veiculos session={session} tenant={tenantData} isAdmin={isAdmin} />} />
      <Route path="/estoque" element={<Veiculos session={session} tenant={tenantData} isAdmin={isAdmin} />} />

      <Route path="/vitrines" element={<Vitrines session={session} tenant={tenantData} isAdmin={isAdmin} selectedStore={selectedStore} />} />
      <Route path="/relatorios" element={<Relatorios session={session} tenant={tenantData} />} />
      <Route path="/configuracoes" element={<Configuracoes session={session} tenant={tenantData} />} />
      <Route path="/assinaturas" element={<Assinatura />} />
      
      {/* Dashboard Financeiro */}
      <Route 
        path="/dashboard-financeiro" 
        element={<DashboardFinanceiro session={session} tenant={tenantData} isAdmin={isAdmin} />} 
      />

      <Route path="/lojas" element={<Lojas />} />
    </Routes>
  );
}