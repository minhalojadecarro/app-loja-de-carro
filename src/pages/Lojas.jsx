import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Lojas() {
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Campos do formulário
  const [nome, setNome] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState('PJ');
  const [documento, setDocumento] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [plano, setPlano] = useState('trial');

  const fetchLojas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lojas:', error);
    } else {
      setLojas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLojas();
  }, []);

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const handleNomeChange = (e) => {
    const val = e.target.value;
    setNome(val);
    setSlug(generateSlug(val));
  };

  const handleDocumentoChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (tipoPessoa === 'PF') {
      if (value.length > 11) value = value.slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      if (value.length > 14) value = value.slice(0, 14);
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    setDocumento(value);
  };

  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)/, '($1');
    }
    setWhatsapp(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Como estamos na gestão de lojas administrativa, geramos um UUID aleatório ou usamos o ID do auth se aplicável
    const novoRegistro = {
      id: crypto.randomUUID(),
      nome,
      nome_loja: nome,
      slug,
      whatsapp,
      tipo_pessoa: tipoPessoa,
      documento,
      plano,
      trial_ends_at: trialEndsAt.toISOString()
    };

    const { error } = await supabase.from('tenants').insert([novoRegistro]);

    if (error) {
      alert('Erro ao registar loja: ' + error.message);
    } else {
      setNome('');
      setDocumento('');
      setSlug('');
      setWhatsapp('');
      fetchLojas();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white">Gestão de Lojas e Vendedores</h1>
        <p className="text-sm text-gray-400 mt-1">Registe e controle as revendas parceiras da plataforma</p>
      </div>

      {/* Formulário de Registo */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl mb-12">
        <h2 className="text-lg font-bold text-white mb-4">Registar Nova Conta / Revenda</h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Nome do Vendedor / Loja
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Auto Manaus Veículos"
              value={nome}
              onChange={handleNomeChange}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Tipo de Cadastro
            </label>
            <select
              value={tipoPessoa}
              onChange={(e) => { setTipoPessoa(e.target.value); setDocumento(''); }}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
            >
              <option value="PJ">Pessoa Jurídica (CNPJ)</option>
              <option value="PF">Pessoa Física (CPF)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              {tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}
            </label>
            <input
              type="text"
              required
              placeholder={tipoPessoa === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
              value={documento}
              onChange={handleDocumentoChange}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Slug (URL pública)
            </label>
            <input
              type="text"
              required
              placeholder="minhaloja"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              WhatsApp de Contato
            </label>
            <input
              type="text"
              required
              placeholder="(92) 99999-9999"
              value={whatsapp}
              onChange={handleWhatsappChange}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Plano Inicial
            </label>
            <select
              value={plano}
              onChange={(e) => setPlano(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
            >
              <option value="trial">Trial (30 Dias Grátis)</option>
              <option value="paid">Pago (Assinante)</option>
              <option value="admin">Administrador</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-blue-900/30"
            >
              Criar Conta e Iniciar Teste de 30 Dias
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Contas Registadas */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Contas Registadas</h2>
        </div>

        {loading ? (
          <p className="p-6 text-center text-gray-500">A carregar lojas...</p>
        ) : lojas.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nenhuma conta cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Tipo / Documento</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Status / Plano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {lojas.map((loja) => (
                  <tr key={loja.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 font-bold text-white">{loja.nome || loja.nome_loja}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-gray-800 px-2.5 py-1 rounded font-medium text-gray-300 mr-2">
                        {loja.tipo_pessoa || 'PJ'}
                      </span>
                      {loja.documento || '-'}
                    </td>
                    <td className="px-6 py-4 text-blue-400 font-mono">/{loja.slug}</td>
                    <td className="px-6 py-4">{loja.whatsapp || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        loja.plano === 'admin' ? 'bg-purple-900 text-purple-200 border border-purple-700' :
                        loja.plano === 'paid' ? 'bg-green-900 text-green-200 border border-green-700' :
                        loja.plano === 'trial' ? 'bg-blue-900 text-blue-200 border border-blue-700' :
                        'bg-red-900 text-red-200 border border-red-700'
                      }`}>
                        {loja.plano}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}