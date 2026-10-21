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

export function AppRoutes({ session, tenantData, isAdmin, selectedStore, setSelectedStore }) {
  return (
    <Routes>
      {/* Rota Raiz: Sempre abre a Home.jsx oficial com o Botão de Compartilhar */}
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
        element={session ? <Navigate to="/veiculos" replace /> : <Auth />} 
      />
      
      <Route path="/compradores" element={<HomeLogistas selectedStore={selectedStore} />} />
      <Route path="/sobre" element={<Sobre />} />
      <Route path="/planos" element={<Planos tenant={tenantData} session={session} />} />

      {/* Rotas Internas / Gestão (Lojista / Admin) */}
      <Route path="/veiculos" element={<Veiculos session={session} tenant={tenantData} isAdmin={isAdmin} />} />
      <Route path="/estoque" element={<Veiculos session={session} tenant={tenantData} isAdmin={isAdmin} />} />
      <Route path="/vitrines" element={<Vitrines session={session} tenant={tenantData} isAdmin={isAdmin} selectedStore={selectedStore} />} />
      <Route path="/relatorios" element={<Relatorios session={session} tenant={tenantData} />} />
      <Route path="/configuracoes" element={<Configuracoes session={session} tenant={tenantData} />} />
      <Route path="/assinaturas" element={<Assinatura />} />
      <Route path="/lojas" element={<Lojas />} />

      {/* ROTA DE TESTE RÁPIDO */}
      <Route 
        path="/:slug" 
        element={<VitrinePublicaSlug />} 
      />
     </Routes>
  );
}
 