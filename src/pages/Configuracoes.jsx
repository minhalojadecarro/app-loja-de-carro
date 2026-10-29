import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Configuracoes({ session, tenant, onTenantUpdated }) {
  const userId = session?.user?.id;
  
  // Estados unificados
  const [tenantId, setTenantId] = useState(tenant?.id || '');
  const [nomeLoja, setNomeLoja] = useState(tenant?.nome_loja || '');
  const [whatsapp, setWhatsapp] = useState(tenant?.whatsapp || '');
  
  // Logos e Fotos
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '');

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState(tenant?.foto_perfil_url || '');

  // Dados Bancários e Pix
  const [banco, setBanco] = useState(tenant?.banco || '');
  const [agencia, setAgencia] = useState(tenant?.agencia || '');
  const [contaCorrente, setContaCorrente] = useState(tenant?.conta_corrente || '');
  const [tipoChavePix, setTipoChavePix] = useState(tenant?.tipo_chave_pix || '');
  const [chavePix, setChavePix] = useState(tenant?.chave_pix || '');
  const [titularConta, setTitularConta] = useState(tenant?.titular_conta || '');

  const [loading, setLoading] = useState(false);

  // Carrega os dados estritamente vinculados ao usuário logado
  useEffect(() => {
    async function carregarDadosDoTenant() {
      if (!userId) return;

      const { data: tenantData, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (tenantData && !error) {
        setTenantId(tenantData.id); // Captura o ID real e único desta loja
        setNomeLoja(tenantData.nome_loja || '');
        setWhatsapp(tenantData.whatsapp || '');
        setLogoUrl(tenantData.logo_url || '');
        setFotoPerfilUrl(tenantData.foto_perfil_url || '');
        
        setBanco(tenantData.banco || '');
        setAgencia(tenantData.agencia || '');
        setContaCorrente(tenantData.conta_corrente || '');
        setTipoChavePix(tenantData.tipo_chave_pix || '');
        setChavePix(tenantData.chave_pix || '');
        setTitularConta(tenantData.titular_conta || '');
      }
    }

    carregarDadosDoTenant();
  }, [userId]);

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId) {
      alert('Usuário não autenticado.');
      return;
    }

    if (!tenantId) {
      alert('Erro crítico: ID da loja não identificado para este usuário.');
      return;
    }

    setLoading(true);

    try {
      let novaLogoUrl = logoUrl;
      let novaFotoUrl = fotoPerfilUrl;

      // 1. Upload da Logo da Loja se alterada
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${tenantId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        novaLogoUrl = publicUrlData.publicUrl;
      }

      // 2. Upload da Foto de Perfil se alterada
      if (fotoFile) {
        const fileExt = fotoFile.name.split('.').pop();
        const fileName = `perfil-${tenantId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, fotoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        novaFotoUrl = publicUrlData.publicUrl;
      }

      const dadosParaAtualizar = {
        nome_loja: nomeLoja,
        logo_url: novaLogoUrl,
        foto_perfil_url: novaFotoUrl,
        whatsapp: whatsapp,
        banco: banco,
        agencia: agencia,
        conta_corrente: contaCorrente,
        tipo_chave_pix: tipoChavePix,
        chave_pix: chavePix,
        titular_conta: titularConta
      };

      // 3. ATUALIZAÇÃO SEGURA: Utiliza simultaneamente o id da loja E o user_id para isolamento absoluto
      const { data: tenantUpdatedData, error: tenantError } = await supabase
        .from('tenants')
        .update(dadosParaAtualizar)
        .eq('id', tenantId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (tenantError) throw tenantError;

      if (!tenantUpdatedData) {
        throw new Error("A atualização foi recusada por políticas de segurança ou ID inválido.");
      }

      // Atualiza estados locais e caches
      setLogoUrl(novaLogoUrl);
      setLogoFile(null);
      setFotoPerfilUrl(novaFotoUrl);
      setFotoFile(null);

      localStorage.setItem('tenant_logo_cache', novaLogoUrl);
      localStorage.setItem('tenant_nome_cache', nomeLoja);

      window.dispatchEvent(new Event('tenantUpdatedInstant'));

      if (onTenantUpdated && tenantUpdatedData) {
        onTenantUpdated(tenantUpdatedData);
      }

      alert('Configurações salvas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar:', error.message);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
        Configurações do Perfil e Financeiro
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* --- FOTO DE PERFIL DO LOJISTA --- */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '15px' }}>
            Foto de Perfil do Lojista (Avatar)
          </h3>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '2px solid #3b82f6',
              overflow: 'hidden',
              backgroundColor: '#020617',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {(fotoPreview || fotoPerfilUrl) ? (
                <img 
                  src={fotoPreview || fotoPerfilUrl} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' }}>
                  {nomeLoja ? nomeLoja.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>

            <label 
              htmlFor="foto-upload" 
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
                border: '2px dashed #3b82f6',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa' }}>
                {fotoFile ? fotoFile.name : 'Clique para alterar a foto de perfil'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Recomendado: Imagem quadrada (PNG ou JPG)
              </span>

              <input 
                id="foto-upload"
                type="file" 
                accept="image/*" 
                onChange={handleFotoChange} 
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* --- DADOS GERAIS DA LOJA --- */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '15px' }}>
            Informações Gerais da Revenda
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Nome da Loja:
              </label>
              <input 
                type="text" 
                value={nomeLoja} 
                onChange={(e) => setNomeLoja(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #334155', 
                  backgroundColor: '#020617', 
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                WhatsApp de Atendimento:
              </label>
              <input 
                type="text" 
                value={whatsapp} 
                onChange={(e) => setWhatsapp(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #334155', 
                  backgroundColor: '#020617', 
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            {/* UPLOAD DA LOGO */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Logomarca da Loja:
              </label>

              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    overflow: 'hidden',
                    backgroundColor: '#020617',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {logoPreview || logoUrl ? (
                      <img 
                        src={logoPreview || logoUrl} 
                        alt="Logo da Loja" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', padding: '4px' }}>
                        Sem Logo
                      </span>
                    )}
                  </div>
                </div>

                <label 
                  htmlFor="file-upload" 
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    border: '2px dashed #3b82f6',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa' }}>
                    {logoFile ? logoFile.name : 'Clique para selecionar uma logomarca'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    PNG, JPG ou WEBP
                  </span>

                  <input 
                    id="file-upload"
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* --- DADOS BANCÁRIOS E RECEBIMENTO --- */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '15px' }}>
            Dados Bancários e Chave Pix
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Titular da Conta / Razão Social:
              </label>
              <input 
                type="text" 
                placeholder="Ex: Minha Loja de Carro Ltda"
                value={titularConta} 
                onChange={(e) => setTitularConta(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #334155', 
                  backgroundColor: '#020617', 
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                  Banco:
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Itaú, Nubank, Bradesco"
                  value={banco} 
                  onChange={(e) => setBanco(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #334155', 
                    backgroundColor: '#020617', 
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                  Agência:
                </label>
                <input 
                  type="text" 
                  placeholder="0001"
                  value={agencia} 
                  onChange={(e) => setAgencia(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #334155', 
                    backgroundColor: '#020617', 
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Conta Corrente / Poupança:
              </label>
              <input 
                type="text" 
                placeholder="12345-6"
                value={contaCorrente} 
                onChange={(e) => setContaCorrente(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #334155', 
                  backgroundColor: '#020617', 
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                  Tipo de Chave Pix:
                </label>
                <select
                  value={tipoChavePix}
                  onChange={(e) => setTipoChavePix(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #334155', 
                    backgroundColor: '#020617', 
                    color: '#fff',
                    outline: 'none'
                  }}
                >
                  <option value="">Selecione...</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="Email">E-mail</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Aleatoria">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                  Chave Pix:
                </label>
                <input 
                  type="text" 
                  placeholder="Informe a chave Pix"
                  value={chavePix} 
                  onChange={(e) => setChavePix(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #334155', 
                    backgroundColor: '#020617', 
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOTÃO SUBMIT */}
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '14px', 
            backgroundColor: '#2563eb', 
            color: '#fff', 
            border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            borderRadius: '8px', 
            fontWeight: 'bold',
            fontSize: '15px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          {loading ? 'Salvando Alterações...' : 'Salvar Todas as Configurações'}
        </button>
      </form>
    </div>
  );
}