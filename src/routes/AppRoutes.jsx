// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

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
import DashboardFinanceiro from '../pages/DashboardFinanceiro'; // <--- Importando o Dashboard Financeiro

export function AppRoutes({ session, tenantData, isAdmin, selectedStore, }) {
  return (
    <Routes>
      {/* Rota Raiz agora exibe sempre a Home pública de veículos/vitrine geral */}
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
      
      {/* Rota de Login: Redireciona para o painel de veículos se já estiver logado */}
      <Route 
        path="/login" 
        element={session ? <Navigate to="/" replace /> : <Auth />} 
      />

      {/* Rota dedicada para forçar a visualização da Home Pública */}
      <Route 
        path="/home-publica" 
        element={
          <Home 
            session={null} /* Força o componente a se comportar como deslogado/público */
            tenant={null} 
            isAdmin={false} 
          />
        } 
      />
      
      {/* Rota correta para o painel de gestão do lojista (HomeLogistas.jsx) */}
      <Route 
        path="/painel-lojista" 
        element={<HomeLogistas session={session} tenant={tenantData} />} 
      />    
      <Route path="/sobre" element={<Sobre />} />
      <Route path="/planos" element={<Planos tenant={tenantData} session={session} />} />

      {/* Rotas Internas / Gestão (Lojista / Admin) */}
      <Route path="/veiculos" element={<Veiculos session={session} tenant={tenantData} isAdmin={isAdmin} />} />
      <Route path="/estoque" element={<Veiculos session={session} tenant={tenantData} isAdmin={isAdmin} />} />
      
      {/* Painel de gestão exclusiva do lojista (Gerenciar Estoque / Filtros) */}
      <Route path="/painel-lojista" element={<HomeLogistas session={session} tenant={tenantData} />} />

      <Route path="/vitrines" element={<Vitrines session={session} tenant={tenantData} isAdmin={isAdmin} selectedStore={selectedStore} />} />
      <Route path="/relatorios" element={<Relatorios session={session} tenant={tenantData} />} />
      <Route path="/configuracoes" element={<Configuracoes session={session} tenant={tenantData} />} />
      <Route path="/assinaturas" element={<Assinatura />} />
      
      {/* NOVA ROTA: Dashboard Financeiro do Administrador (SaaS) */}
      <Route 
        path="/dashboard-financeiro" 
        element={<DashboardFinanceiro session={session} tenant={tenantData} isAdmin={isAdmin} />} 
      />

      <Route path="/lojas" element={<Lojas />} />

      {/* Rota Pública Oficial: Carrega a Vitrine do Lojista via Slug (ex: /#/carro-barato) */}
      <Route 
        path="/:slug" 
        element={<VitrinePublicaSlug />} 
      />
    </Routes>
  );
}