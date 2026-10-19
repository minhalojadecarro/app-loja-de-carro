import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ModalFinanceiroVeiculo from '../components/ModalDRE';

export default function Veiculos({ session, tenant, isAdmin }) {
  const [veiculos, setVeiculos] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [veiculoFinanceiroModal, setVeiculoFinanceiroModal] = useState(null);
  const [showCadastroModal, setShowCadastroModal] = useState(false); // Estado para abrir/fechar o modal de cadastro
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  const fetchData = async () => {
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

    try {
      const res = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
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
            nome: loja?.nome_loja || loja?.nome || loja?.name || 'Revenda Parceira',
            whatsapp: loja?.whatsapp || ''
          }
        };
      });
      setVeiculos(listaMapeada);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [eAdministrador, meuTenantId, tenant]);

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

    if (!marcaCod) return;

    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaCod}/modelos`);
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

    if (!marcaObj.id || !modeloCod) return;

    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaObj.id}/modelos/${modeloCod}/anos`);
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
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaObj.id}/modelos/${modeloObj.id}/anos/${anoCod}`);
      const data = await res.json();
      
      if (data) {
        if (data.Combustivel) setCombustivel(data.Combustivel);
        if (data.Modelo) setVersao(data.Modelo);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da API:', err);
    }
  };

  const handleEdit = (veiculo) => {
    setEditingId(veiculo.id);
    setTenantId(veiculo.tenant_id || meuTenantId);
    setMarcaObj({ id: '', name: veiculo.marca || '' });
    setModeloObj({ id: '', name: veiculo.modelo || '' });
    setAnoObj({ id: '', name: String(veiculo.ano_modelo || veiculo.ano_fabricacao || '') });
    setVersao(veiculo.versao || '');
    setCombustivel(veiculo.combustivel || '');
    
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
    setDestaqueHome(Boolean(veiculo.destaque_home));
    
    setShowCadastroModal(true); // Abre o modal automaticamente ao editar
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este veículo do estoque?')) return;

    const { error } = await supabase.from('veiculos').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir veículo: ' + error.message);
    } else {
      await supabase.from('veiculo_fotos').delete().eq('veiculo_id', id);
      fetchData();
    }
  };

  const handleToggleDestaque = async (veiculoId, estadoAtual) => {
    const novoEstado = !estadoAtual;
    const { error } = await supabase
      .from('veiculos')
      .update({ destaque_home: novoEstado })
      .eq('id', veiculoId);

    if (error) {
      alert('Erro ao atualizar destaque: ' + error.message);
    } else {
      fetchData();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
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
    setShowCadastroModal(false); // Fecha o modal
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let idTenantFinal = tenantId;

    if (!idTenantFinal) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      idTenantFinal = currentSession?.user?.id;
    }

    if (eAdministrador && !idTenantFinal && tenants.length > 0) {
      idTenantFinal = tenants[0].id;
    }

    if (!idTenantFinal) {
      alert('Erro crítico: Sessão não encontrada. Por favor, faça login novamente.');
      return;
    }

    const anoNumerico = parseInt(anoObj.name) || new Date().getFullYear();
    const precoNumerico = parseFloat(precoFormatado.replace(/\./g, '').replace(',', '.')) || 0;
    const kmNumerico = parseInt(kmFormatado.replace(/\./g, '')) || 0;

    const dadosVeiculo = {
      tenant_id: idTenantFinal,
      marca: marcaObj.name,
      modelo: modeloObj.name,
      versao,
      ano_fabricacao: anoNumerico,
      ano_modelo: anoNumerico,
      combustivel,
      preco: precoNumerico,
      quilometragem: kmNumerico,
      cor,
      cambio,
      foto_principal_url: fotoUrl,
      destaque_home: destaqueHome,
      status: 'Disponível' // <--- ADICIONE ESTA LINHA
    };

    if (editingId) {
      const { error } = await supabase
        .from('veiculos')
        .update(dadosVeiculo)
        .eq('id', editingId);

      if (error) {
        alert('Erro ao atualizar veículo: ' + error.message);
        return;
      }

      if (fotoUrl) {
        await supabase.from('veiculo_fotos').upsert([
          { veiculo_id: editingId, url: fotoUrl, principal: true, is_principal: true }
        ], { onConflict: 'veiculo_id' });
      }

      alert('Veículo atualizado com sucesso!');
    } else {
      const { data: veiculoInserido, error } = await supabase
        .from('veiculos')
        .insert([dadosVeiculo])
        .select();

      if (error) {
        alert('Erro ao cadastrar veículo: ' + error.message);
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

      if (marcaObj.name && modeloObj.name) {
        await supabase.from('catalogo_carros').insert([{ 
          marca: marcaObj.name, 
          modelo: modeloObj.name, 
          versao, 
          ano: String(anoNumerico), 
          combustivel 
        }]);
      }

      alert('Veículo cadastrado com sucesso!');
    }

    handleCancelEdit();
    fetchData();
  };

  // Função exclusiva do Admin para a vitrine principal da Home (campo: destaque)
  const handleToggleDestaqueAdmin = async (veiculoId, estadoAtual) => {
    const novoEstado = !estadoAtual;

    if (novoEstado) {
      const totalDestaquesAdmin = veiculos.filter((v) => v.destaque).length;
      if (totalDestaquesAdmin >= 4) {
        alert('Limite atingido! O Administrador pode selecionar no máximo 4 veículos para a vitrine principal da Home.');
        return;
      }
    }

    const { error } = await supabase
      .from('veiculos')
      .update({ destaque: novoEstado })
      .eq('id', veiculoId);

    if (error) {
      alert('Erro ao atualizar destaque do Admin: ' + error.message);
    } else {
      fetchData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen">
      
      {/* CABEÇALHO COM O BOTÃO DE NOVO VEÍCULO */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Gestão de Veículos do Estoque</h1>
          <p className="text-sm text-gray-400 mt-1">Registo, edição e controlo completo do inventário</p>
        </div>
        <button
          onClick={() => { handleCancelEdit(); setShowCadastroModal(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-900/30 flex items-center gap-2 text-sm"
        >
          🚗 + Cadastrar Veículo
        </button>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE VEÍCULOS */}
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
                {editingId ? 'Editar Veículo' : 'Cadastrar Novo Veículo no Estoque'}
              </h2>
              <button 
                onClick={handleCancelEdit} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {eAdministrador && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Revenda / Loja
                  </label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
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
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
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
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
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
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
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
                  Versão / Detalhes
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1.0 Flex 5p"
                  value={versao}
                  onChange={(e) => setVersao(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
                />
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
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
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
                  Câmbio
                </label>
                <select
                  value={cambio}
                  onChange={(e) => setCambio(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
                >
                  <option value="">Selecione</option>
                  <option value="Automático">Automático</option>
                  <option value="Manual">Manual</option>
                  <option value="CVT">CVT</option>
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
                    <span className="text-[11px] text-gray-400">Exibe este veículo na vitrine principal da plataforma (Até 6 destaques)</span>
                  </div>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Foto Principal do Veículo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
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
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-5 py-2.5 rounded-xl transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition shadow-lg text-sm disabled:opacity-50"
                >
                  {editingId ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABELA DE VEÍCULOS EM ESTOQUE COM DESTAQUE TOTAL */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Veículos em Estoque</h2>
          <span className="text-xs text-gray-400 font-medium">Total: {veiculos.length} veículos</span>
        </div>

        {loading ? (
          <p className="p-6 text-center text-gray-500">A carregar veículos...</p>
        ) : veiculos.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nenhum veículo cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4">Foto</th>
                  <th className="px-6 py-4">Veículo</th>
                  <th className="px-6 py-4">Ano / Combustível</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  
                  {eAdministrador && (
                    <th className="px-6 py-4">Loja / Revenda</th>
                  )}

                  {/* Destaque do Lojista */}
                  <th className="px-6 py-4 text-center">Destaque Loja</th>

                  {/* Destaque do Admin (Vitrine Principal da Home) */}
                  {eAdministrador && (
                    <th className="px-6 py-4 text-center text-amber-400">Vitrine Home (Admin)</th>
                  )}

                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {veiculos.map((veiculo) => (
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

                    {/* Coluna Loja / Revenda (Apenas para o Admin) */}
                    {eAdministrador && (
                      <td className="px-6 py-4 font-semibold text-blue-400">
                        {veiculo.tenants?.nome || 'Loja Desconhecida'}
                      </td>
                    )}

                    {/* Destaque do Lojista (destaque_home) */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleDestaque(veiculo.id, veiculo.destaque_home)}
                        disabled={veiculo.status === 'Vendido'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
                          veiculo.status === 'Vendido'
                            ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-800'
                            : veiculo.destaque_home 
                            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {veiculo.destaque_home ? '★ Em Destaque' : '☆ Destacar'}
                      </button>
                    </td>

                    {/* Destaque do Administrador para a Home Principal (campo: destaque - Máximo 4) */}
                    {eAdministrador && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleDestaqueAdmin(veiculo.id, veiculo.destaque)}
                          disabled={veiculo.status === 'Vendido'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow border ${
                            veiculo.status === 'Vendido'
                              ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-800'
                              : veiculo.destaque
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30 shadow-amber-900/20'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                          title="Definir se este carro aparece nos 4 destaques da Home principal"
                        >
                          {veiculo.destaque ? '👑 Home (Ativo)' : '☆ Colocar na Home'}
                        </button>
                      </td>
                    )}

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setVeiculoFinanceiroModal(veiculo)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow flex items-center gap-1"
                          title="Gestão Financeira e Fechamento de Venda"
                        >
                          💰 DRE
                        </button>
                        <button
                          onClick={() => handleEdit(veiculo)}
                          className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-blue-600/30"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(veiculo.id)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-red-600/30"
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