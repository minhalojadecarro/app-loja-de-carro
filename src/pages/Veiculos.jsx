import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import ModalFinanceiroVeiculo from '../components/ModalDRE';

export default function Veiculos({ session, tenant, isAdmin }) {
  const [veiculos, setVeiculos] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [veiculoFinanceiroModal, setVeiculoFinanceiroModal] = useState(null);
  const [showCadastroModal, setShowCadastroModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // --- ESTADOS DE FILTRO DO ESTOQUE ---
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('todas');
  const [filtroCambio, setFiltroCambio] = useState('todos');
  const [filtroPrecoMax, setFiltroPrecoMax] = useState('');
  const [filtroTenantAdmin, setFiltroTenantAdmin] = useState('todos');

  // Novo estado para controlar se é Carro ou Moto ('carro' ou 'moto')
  const [tipoItem, setTipoItem] = useState('carro');

  // Estados dos seletores exclusivos da API
  const [marcasApi, setMarcasApi] = useState([]);
  const [modelosApi, setModelosApi] = useState([]);
  const [anosApi, setAnosApi] = useState([]);

  // Campos do formulário
  const [tenantId, setTenantId] = useState('');
  const [marcaObj, setMarcaObj] = useState({ id: '', name: '' });
  const [modeloObj, setModeloObj] = useState({ id: '', name: '' });
  const [anoObj, setAnoObj] = useState({ id: '', name: '' });
  
  const [versao, setVersao] = useState('');
  const [combustivel, setCombustivel] = useState('');
  const [precoFormatado, setPrecoFormatado] = useState('');
  const [kmFormatado, setKmFormatado] = useState('');
  const [cor, setCor] = useState('');
  const [cambio, setCambio] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [destaqueHome, setDestaqueHome] = useState(false);

  // Estado para armazenar o valor FIPE obtido da API
  const [valorFipeApi, setValorFipeApi] = useState(0);

  // Verificação de administrador com fallback de segurança por e-mail
  const eAdministrador = Boolean(
    isAdmin || 
    (tenant && (
      String(tenant.subscription_status || '').toLowerCase() === 'admin' ||
      String(tenant.plano || '').toLowerCase() === 'admin'
    )) ||
    session?.user?.email === 'minhalojadecarro@gmail.com'
  );

  const meuTenantId = tenant?.id || session?.user?.id;

  // fetchData envolvido corretamente com useCallback e dependências limpas
  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: tenantsData } = await supabase.from('tenants').select('*');
    setTenants(tenantsData || []);
    
    if (!eAdministrador) {
      setTenantId(meuTenantId || '');
    } else {
      if (tenantsData && tenantsData.length > 0 && !tenantId) {
        setTenantId(tenantsData[0].id);
      }
    }

    // Segmento baseado no tipo atual
    const segmentoApi = tipoItem === 'moto' ? 'motos' : 'carros';

    // Busca inicial de marcas com base no tipo atual
    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${segmentoApi}/marcas`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMarcasApi(data);
      }
    } catch (err) {
      console.error('Erro ao buscar marcas da API:', err);
      setMarcasApi([]);
    }

    let query = supabase.from('veiculos').select('*').order('created_at', { ascending: false });
    if (!eAdministrador && meuTenantId) {
      query = query.eq('tenant_id', meuTenantId);
    }

    const { data: veiculosData, error } = await query;

    if (!error) {
      const listaMapeada = (veiculosData || []).map((v) => {
        const loja = (tenantsData || []).find((l) => l.id === v.tenant_id);
        return {
          ...v,
          tenants: {
            nome: loja?.nome_loja || loja?.nome || loja?.name || 'Revenda sem Parceira',
            whatsapp: loja?.whatsapp || ''
          }
        };
      });
      setVeiculos(listaMapeada);
    }
    setLoading(false);
  }, [eAdministrador, meuTenantId, tenantId, tipoItem]);

  // Executa o fetch de forma assíncrona desacoplada para evitar o aviso de setState síncrono no effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Função para alternar entre Carro e Moto no formulário
  const handleTipoItemChange = async (novoTipo) => {
    setTipoItem(novoTipo);
    setMarcaObj({ id: '', name: '' });
    setModeloObj({ id: '', name: '' });
    setAnoObj({ id: '', name: '' });
    setModelosApi([]);
    setAnosApi([]);
    setVersao('');
    setCombustivel('');
    setValorFipeApi(0);

    try {
      const segmento = novoTipo === 'moto' ? 'motos' : 'carros';
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${segmento}/marcas`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMarcasApi(data);
      }
    } catch (err) {
      console.error('Erro ao buscar marcas:', err);
      setMarcasApi([]);
    }
  };

  const handlePrecoChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (!valor) {
      setPrecoFormatado('');
      return;
    }
    valor = (Number(valor) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setPrecoFormatado(valor);
  };

  const handleKmChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (!valor) {
      setKmFormatado('');
      return;
    }
    valor = Number(valor).toLocaleString('pt-BR');
    setKmFormatado(valor);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('veiculos-fotos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('veiculos-fotos')
        .getPublicUrl(filePath);

      if (publicData?.publicUrl) {
        setFotoUrl(publicData.publicUrl);
      }
    } catch (error) {
      alert('Erro ao carregar a imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Função auxiliar para definir o segmento correto na URL da API FIPE
  const getApiSegmento = () => (tipoItem === 'moto' ? 'motos' : 'carros');

  const handleMarcaChange = async (e) => {
    const marcaCod = e.target.value;
    const marcaSelecionada = marcasApi.find(m => String(m.codigo || m.code) === String(marcaCod));
    
    setMarcaObj({ 
      id: marcaCod, 
      name: marcaSelecionada ? (marcaSelecionada.nome || marcaSelecionada.name) : '' 
    });
    setModelosApi([]);
    setAnosApi([]);
    setModeloObj({ id: '', name: '' });
    setAnoObj({ id: '', name: '' });
    setVersao('');
    setCombustivel('');
    setValorFipeApi(0);

    if (!marcaCod) return;

    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${getApiSegmento()}/marcas/${marcaCod}/modelos`);
      const data = await res.json();
      if (data && Array.isArray(data.modelos)) {
        setModelosApi(data.modelos);
      }
    } catch (err) {
      console.error('Erro ao buscar modelos da API:', err);
      setModelosApi([]);
    }
  };

  const handleModeloChange = async (e) => {
    const modeloCod = e.target.value;
    const modeloSelecionado = modelosApi.find(m => String(m.codigo || m.code) === String(modeloCod));

    setModeloObj({ 
      id: modeloCod, 
      name: modeloSelecionado ? (modeloSelecionado.nome || modeloSelecionado.name) : '' 
    });
    setAnosApi([]);
    setAnoObj({ id: '', name: '' });
    setVersao('');
    setCombustivel('');
    setValorFipeApi(0);

    if (!marcaObj.id || !modeloCod) return;

    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${getApiSegmento()}/marcas/${marcaObj.id}/modelos/${modeloCod}/anos`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAnosApi(data);
      }
    } catch (err) {
      console.error('Erro ao buscar anos da API:', err);
      setAnosApi([]);
    }
  };

  const handleAnoChange = async (e) => {
    const anoCod = e.target.value;
    const anoSelecionado = anosApi.find(a => String(a.codigo || a.code) === String(anoCod));

    setAnoObj({ 
      id: anoCod, 
      name: anoSelecionado ? (anoSelecionado.nome || anoSelecionado.name) : '' 
    });

    if (!marcaObj.id || !modeloObj.id || !anoCod) return;

    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${getApiSegmento()}/marcas/${marcaObj.id}/modelos/${modeloObj.id}/anos/${anoCod}`);
      const data = await res.json();
      
      if (data) {
        if (data.Combustivel) setCombustivel(data.Combustivel);
        if (data.Modelo) setVersao(data.Modelo);
        
        if (data.Valor) {
          const valorLimpo = data.Valor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
          setValorFipeApi(parseFloat(valorLimpo) || 0);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da API:', err);
    }
  };

  const handleEdit = async (veiculo) => {
    setEditingId(veiculo.id);
    const tipoSalvo = veiculo.tipo || 'carro';
    setTipoItem(tipoSalvo);
    setTenantId(veiculo.tenant_id || meuTenantId);
    setMarcaObj({ id: '', name: veiculo.marca || '' });
    setModeloObj({ id: '', name: veiculo.modelo || '' });
    setAnoObj({ id: '', name: String(veiculo.ano_modelo || veiculo.ano_fabricacao || '') });
    setVersao(veiculo.versao || '');
    setCombustivel(veiculo.combustivel || '');
    setValorFipeApi(veiculo.valorfipe || 0);
    
    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${tipoSalvo === 'moto' ? 'motos' : 'carros'}/marcas`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMarcasApi(data);
      }
    } catch (err) {
      console.error('Erro ao carregar marcas na edição:', err);
    }
    
    if (veiculo.preco) {
      setPrecoFormatado(Number(veiculo.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setPrecoFormatado('');
    }

    if (veiculo.quilometragem) {
      setKmFormatado(Number(veiculo.quilometragem).toLocaleString('pt-BR'));
    } else {
      setKmFormatado('');
    }

    setCor(veiculo.cor || '');
    setCambio(veiculo.cambio || '');
    setFotoUrl(veiculo.foto_principal_url || '');
    setDestaqueHome(veiculo.status_destaque === 'em_evidencia');
    
    setShowCadastroModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este item do estoque?')) return;

    const { error } = await supabase.from('veiculos').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir item: ' + error.message);
    } else {
      await supabase.from('veiculo_fotos').delete().eq('veiculo_id', id);
      fetchData();
    }
  };

  const handleToggleDestaque = async (veiculoId, statusAtual) => {
    const novoStatus = statusAtual === 'em_evidencia' ? 'normal' : 'em_evidencia';
    
    const agora = new Date();
    const dataInicio = novoStatus === 'em_evidencia' ? agora.toISOString() : null;
    const dataFim = novoStatus === 'em_evidencia' ? new Date(agora.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() : null;

    const dadosUpdate = {
      status_destaque: novoStatus,
      data_inicio_destaque: dataInicio,
      data_fim_destaque: dataFim
    };

    const { error } = await supabase
      .from('veiculos')
      .update(dadosUpdate)
      .eq('id', veiculoId);

    if (error) {
      alert('Erro ao atualizar destaque: ' + error.message);
    } else {
      fetchData();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTipoItem('carro');
    setTenantId(eAdministrador ? (tenants[0]?.id || '') : meuTenantId);
    setMarcaObj({ id: '', name: '' });
    setModeloObj({ id: '', name: '' });
    setAnoObj({ id: '', name: '' });
    setModelosApi([]);
    setAnosApi([]);
    setVersao('');
    setCombustivel('');
    setPrecoFormatado('');
    setKmFormatado('');
    setCor('');
    setCambio('');
    setFotoUrl('');
    setDestaqueHome(false);
    setValorFipeApi(0);
    setShowCadastroModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let idTenantFinal = tenantId;

    if (!idTenantFinal) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const currentUserId = currentSession?.user?.id;

      if (currentUserId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', currentUserId)
          .maybeSingle();

        if (profileData?.tenant_id) {
          idTenantFinal = profileData.tenant_id;
        } else {
          idTenantFinal = currentUserId;
        }
      }
    }

    if (eAdministrador && !idTenantFinal && tenants.length > 0) {
      idTenantFinal = tenants[0].id;
    }

    if (!idTenantFinal) {
      alert('Erro crítico: ID da Loja (Tenant) não encontrado. Verifique o seu cadastro.');
      return;
    }

    const anoNumerico = parseInt(anoObj.name) || new Date().getFullYear();
    const precoNumerico = parseFloat(precoFormatado.replace(/\./g, '').replace(',', '.')) || 0;
    const kmNumerico = parseInt(kmFormatado.replace(/\./g, '')) || 0;

    const dadosVeiculo = {
      tenant_id: idTenantFinal,
      tipo: tipoItem,
      marca: marcaObj.name,
      modelo: modeloObj.name,
      versao,
      ano_fabricacao: anoNumerico,
      ano_modelo: anoNumerico,
      combustivel,
      preco: precoNumerico,
      valorfipe: valorFipeApi,
      quilometragem: kmNumerico,
      cor,
      cambio,
      foto_principal_url: fotoUrl,
      status_destaque: destaqueHome ? 'em_evidencia' : 'normal',
      data_inicio_destaque: destaqueHome ? new Date().toISOString() : null,
      data_fim_destaque: destaqueHome ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() : null,
      status: 'Disponível'
    };

    if (editingId) {
      const { error } = await supabase
        .from('veiculos')
        .update(dadosVeiculo)
        .eq('id', editingId);

      if (error) {
        alert('Erro ao atualizar item: ' + error.message);
        return;
      }

      if (fotoUrl) {
        await supabase.from('veiculo_fotos').upsert([
          { veiculo_id: editingId, url: fotoUrl, principal: true, is_principal: true }
        ], { onConflict: 'veiculo_id' });
      }

      alert('Item atualizado com sucesso!');
    } else {
      const { data: veiculoInserido, error } = await supabase
        .from('veiculos')
        .insert([dadosVeiculo])
        .select();

      if (error) {
        alert('Erro ao cadastrar item: ' + error.message);
        return;
      }

      const novoVeiculoId = veiculoInserido && veiculoInserido[0] ? veiculoInserido[0].id : null;

      if (novoVeiculoId && fotoUrl) {
        await supabase.from('veiculo_fotos').insert([{
          veiculo_id: novoVeiculoId,
          url: fotoUrl,
          principal: true,
          is_principal: true
        }]);
      }

      alert('Item cadastrado com sucesso!');
    }

    handleCancelEdit();
    fetchData();
  };

  // --- LÓGICA DE FILTRAGEM DO ESTOQUE ---
  const veiculosFiltrados = veiculos.filter((v) => {
    const termoBusca = filtroBusca.toLowerCase();
    const textoVeiculo = `${v.marca || ''} ${v.modelo || ''} ${v.versao || ''}`.toLowerCase();
    const matchBusca = !termoBusca || textoVeiculo.includes(termoBusca);

    const matchMarca = filtroMarca === 'todas' || String(v.marca).toLowerCase() === String(filtroMarca).toLowerCase();
    const matchCambio = filtroCambio === 'todos' || String(v.cambio || '').toLowerCase() === String(filtroCambio).toLowerCase();

    const precoNum = Number(v.preco || 0);
    const matchPreco = !filtroPrecoMax || precoNum <= Number(filtroPrecoMax);

    const matchTenantAdmin = !eAdministrador || filtroTenantAdmin === 'todos' || String(v.tenant_id) === String(filtroTenantAdmin);

    return matchBusca && matchMarca && matchCambio && matchPreco && matchTenantAdmin;
  });

  const marcasDisponiveis = [...new Set(veiculos.map(v => v.marca).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen">
      
      {/* CABEÇALHO COM O BOTÃO DE NOVO VEÍCULO */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Gestão de Veículos e Motos</h1>
          <p className="text-sm text-gray-400 mt-1">Registo, edição e controlo completo do inventário</p>
        </div>
        <button
          onClick={() => { handleCancelEdit(); setShowCadastroModal(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-900/30 flex items-center gap-2 text-sm cursor-pointer"
        >
          🚗🏍️ + Cadastrar Novo Item
        </button>
      </div>

      {/* BARRA DE FILTROS AVANÇADOS */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filtrar Seu Estoque</h3>
          {(filtroBusca || filtroMarca !== 'todas' || filtroCambio !== 'todos' || filtroPrecoMax || filtroTenantAdmin !== 'todos') && (
            <button 
              onClick={() => {
                setFiltroBusca('');
                setFiltroMarca('todas');
                setFiltroCambio('todos');
                setFiltroPrecoMax('');
                setFiltroTenantAdmin('todos');
              }}
              className="text-xs text-blue-400 hover:underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 ${eAdministrador ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400">Pesquisar por Marca ou Modelo</label>
            <input
              type="text"
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              placeholder="Ex: Corolla, Onix, Fiat..."
              className="bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400">Marca</label>
            <select
              value={filtroMarca}
              onChange={(e) => setFiltroMarca(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="todas">Todas as Marcas</option>
              {marcasDisponiveis.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400">Câmbio</label>
            <select
              value={filtroCambio}
              onChange={(e) => setFiltroCambio(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="todos">Todos</option>
              <option value="manual">Manual</option>
              <option value="automático">Automático</option>
              <option value="cvt">CVT</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400">Preço Máximo (R$)</label>
            <input
              type="number"
              value={filtroPrecoMax}
              onChange={(e) => setFiltroPrecoMax(e.target.value)}
              placeholder="Ex: 80000"
              className="bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {eAdministrador && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-amber-400">Filtrar por Revenda</label>
              <select
                value={filtroTenantAdmin}
                onChange={(e) => setFiltroTenantAdmin(e.target.value)}
                className="bg-gray-950 border border-amber-500/50 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="todos">Todas as Lojas</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome_loja || t.nome || t.name || 'Loja sem Nome'}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE VEÍCULOS E MOTOS */}
      {showCadastroModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px',
            width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', color: '#fff'
          }}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Editar Registo' : 'Cadastrar Veículo ou Moto no Estoque'}
              </h2>
              <button 
                onClick={handleCancelEdit} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* SELETOR DE TIPO (CARRO OU MOTO) */}
              <div className="md:col-span-2 bg-gray-900 border border-gray-800 p-2 rounded-xl flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTipoItemChange('carro')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                    tipoItem === 'carro' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  🚗 Carro
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoItemChange('moto')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                    tipoItem === 'moto' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  🏍️ Moto
                </button>
              </div>

              {eAdministrador && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Revenda / Loja
                  </label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition cursor-pointer"
                    required
                  >
                    {tenants.map((loja) => (
                      <option key={loja.id} value={loja.id}>
                        {loja.nome_loja || loja.nome || loja.name || 'Loja'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Marca {editingId && <span className="text-blue-400 text-[10px]">(Atual: {marcaObj.name})</span>}
                </label>
                <select
                  value={marcaObj.id}
                  onChange={handleMarcaChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition cursor-pointer"
                  required={!editingId}
                >
                  <option value="">{editingId ? 'Alterar Marca (Opcional)' : 'Selecione a Marca'}</option>
                  {marcasApi.map((m) => (
                    <option key={m.codigo || m.code} value={m.codigo || m.code}>
                      {m.nome || m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Modelo {editingId && <span className="text-blue-400 text-[10px]">(Atual: {modeloObj.name})</span>}
                </label>
                <select
                  value={modeloObj.id}
                  onChange={handleModeloChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition cursor-pointer"
                >
                  <option value="">{editingId ? 'Alterar Modelo (Opcional)' : 'Selecione o Modelo'}</option>
                  {modelosApi.map((mod) => (
                    <option key={mod.codigo || mod.code} value={mod.codigo || mod.code}>
                      {mod.nome || mod.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Ano do Veículo {editingId && <span className="text-blue-400 text-[10px]">(Atual: {anoObj.name})</span>}
                </label>
                <select
                  value={anoObj.id}
                  onChange={handleAnoChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition cursor-pointer"
                >
                  <option value="">{editingId ? 'Alterar Ano (Opcional)' : 'Selecione o Ano'}</option>
                  {anosApi.map((ano) => (
                    <option key={ano.codigo || ano.code} value={ano.codigo || ano.code}>
                      {ano.nome || ano.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Combustível
                </label>
                <input
                  type="text"
                  placeholder="Gasolina / Flex"
                  value={combustivel}
                  onChange={(e) => setCombustivel(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
                  required
                />
              </div>

              {/* Bloco de Referência do Valor FIPE */}
              <div className="md:col-span-2 bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block">
                    📊 Referência de Mercado (Tabela FIPE)
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Valor médio oficial consultado automaticamente para este modelo/ano.
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-green-400">
                    {valorFipeApi > 0 
                      ? valorFipeApi.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                      : 'Selecione o ano'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Preço de Venda (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={precoFormatado}
                  onChange={handlePrecoChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Quilometragem (KM)
                </label>
                <input
                  type="text"
                  placeholder="0"
                  value={kmFormatado}
                  onChange={handleKmChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Cor
                </label>
                <select
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition cursor-pointer"
                  required
                >
                  <option value="">Selecione a Cor</option>
                  <option value="Branco">Branco</option>
                  <option value="Preto">Preto</option>
                  <option value="Prata">Prata</option>
                  <option value="Cinza">Cinza</option>
                  <option value="Vermelho">Vermelho</option>
                  <option value="Azul">Azul</option>
                  <option value="Marrom">Marrom</option>
                  <option value="Verde">Verde</option>
                  <option value="Amarelo">Amarelo</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Câmbio / Transmissão
                </label>
                <select
                  value={cambio}
                  onChange={(e) => setCambio(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition cursor-pointer"
                >
                  <option value="">Selecione</option>
                  <option value="Automático">Automático</option>
                  <option value="Manual">Manual</option>
                  <option value="CVT">CVT</option>
                  <option value="Semi-automática">Semi-automática</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center bg-gray-950 border border-gray-800 rounded-lg px-4 py-3">
                <label className="flex items-center cursor-pointer gap-3 w-full">
                  <input
                    type="checkbox"
                    checked={destaqueHome}
                    onChange={(e) => setDestaqueHome(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded bg-gray-900 border-gray-700 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white block">Destacar na Home Principal</span>
                    <span className="text-[11px] text-gray-400">Exibe este item na vitrine principal da plataforma (Fila rotativa de 2 dias)</span>
                  </div>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Foto Principal do Item
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 transition cursor-pointer"
                />
                {uploading && <p className="text-xs text-blue-400 mt-1">A carregar e a otimizar foto...</p>}
                {fotoUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={fotoUrl} alt="Pré-visualização" className="w-16 h-12 object-cover rounded-lg border border-gray-700" />
                    <span className="text-xs text-green-400 font-medium">Foto pronta!</span>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-5 py-2.5 rounded-xl transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition shadow-lg text-sm disabled:opacity-50 cursor-pointer"
                >
                  {editingId ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABELA DE VEÍCULOS E MOTOS EM ESTOQUE */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Inventário em Estoque (Carros e Motos)</h2>
          <span className="text-xs text-gray-400 font-medium">Exibindo {veiculosFiltrados.length} de {veiculos.length} item(ns)</span>
        </div>

        {loading ? (
          <p className="p-6 text-center text-gray-500 animate-pulse">A carregar itens...</p>
        ) : veiculosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <p className="text-base font-bold">Nenhum veículo ou moto encontrado.</p>
            <p className="text-xs">Tente ajustar os filtros de busca ou cadastre um novo item.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4">Foto</th>
                  <th className="px-6 py-4">Tipo / Veículo</th>
                  <th className="px-6 py-4">Ano / Combustível</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  
                  {eAdministrador && (
                    <th className="px-6 py-4">Loja / Revenda</th>
                  )}

                  <th className="px-6 py-4 text-center">Vitrine Home (Fila)</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {veiculosFiltrados.map((veiculo) => (
                  <tr key={veiculo.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4">
                      {veiculo.foto_principal_url ? (
                        <img src={veiculo.foto_principal_url} alt={veiculo.modelo} className="w-16 h-12 object-cover rounded-lg border border-gray-800" />
                      ) : (
                        <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500">
                          Sem foto
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 font-bold text-white">
                      <span className="text-[10px] uppercase bg-gray-800 px-2 py-0.5 rounded text-blue-400 mr-2">
                        {veiculo.tipo === 'moto' ? '🏍️ Moto' : '🚗 Carro'}
                      </span>
                      {veiculo.marca} {veiculo.modelo}
                      <span className="block text-xs font-normal text-gray-400">{veiculo.versao}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-800 px-2.5 py-1 rounded text-xs text-gray-300 font-medium">
                        {veiculo.ano_modelo || veiculo.ano_fabricacao} {veiculo.combustivel ? `• ${veiculo.combustivel}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-green-400">
                      {Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {veiculo.status === 'Vendido' ? (
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          ✓ Vendido
                        </span>
                      ) : (
                        <span className="bg-blue-950 text-blue-400 border border-blue-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Disponível
                        </span>
                      )}
                    </td>

                    {eAdministrador && (
                      <td className="px-6 py-4 font-semibold text-blue-400">
                        {veiculo.tenants?.nome || 'Loja Desconhecida'}
                      </td>
                    )}

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleDestaque(veiculo.id, veiculo.status_destaque)}
                        disabled={veiculo.status === 'Vendido'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow cursor-pointer ${
                          veiculo.status === 'Vendido'
                            ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-800'
                            : veiculo.status_destaque === 'em_evidencia'
                            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {veiculo.status_destaque === 'em_evidencia' ? '★ Em Evidência' : '☆ Destacar'}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setVeiculoFinanceiroModal(veiculo)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow flex items-center gap-1 cursor-pointer"
                          title="Gestão Financeira e Fechamento de Venda"
                        >
                          💰 DRE
                        </button>
                        <button
                          onClick={() => handleEdit(veiculo)}
                          className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-blue-600/30 cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(veiculo.id)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-red-600/30 cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DRE E FECHAMENTO DE VENDA */}
      {veiculoFinanceiroModal && (
        <ModalFinanceiroVeiculo
          veiculo={veiculoFinanceiroModal}
          tenantId={meuTenantId}
          onClose={() => setVeiculoFinanceiroModal(null)}
          onSave={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}