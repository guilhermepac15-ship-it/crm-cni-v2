// ============ CONVERSAS DA ANA — página própria, sem o resto do CRM ============
// Fala só com o workflow "Painel de Conversas API" no n8n do bot (nunca com a
// API mestra do n8n), protegido por um segredo simples (config.js). O acesso
// à própria página usa o mesmo login do CRM (Supabase).
(function () {
  const supaCfg = window.SUPABASE_CONFIG || {};
  const painelCfg = window.PAINEL_CONFIG || {};
  const sb = window.supabase.createClient(supaCfg.url, supaCfg.anonKey);

  // Mesmo mapa usado no bot (n8n) pra saber de quem é cada lead.
  const RESPONSAVEL_ID = { andre: '21a57083-4262-45fc-88e8-39749db9adef', angela: 'a37454a5-f591-4785-904a-34d4b19d573d' };

  const state = {
    conversas: [],
    selecionado: null,
    mensagens: [],
    busca: '',
    aba: 'todas',
    meuAtendidoPor: null, // 'andre' | 'angela' | null (não reconhecido)
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const PRODUTO_LABEL = { oni_marrocos: 'Oni Marrocos', villa_flora_jardins: 'Villa Flora Jardins' };
  const ESTADO_LABEL = {
    CONVERSANDO: 'Conversando', TRANSFERIDO: 'Com humano', AGENDADO: 'Agendado', NUTRICAO: 'Manutenção',
  };

  function showToast(msg, isError) {
    const el = qs('#toast');
    el.textContent = msg;
    el.style.background = isError ? '#c1503c' : '#213a5f';
    el.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { el.hidden = true; }, 3000);
  }

  async function painelFetch(path, options = {}) {
    const res = await fetch(`${painelCfg.baseUrl}/${path}`, {
      ...options,
      headers: { 'X-Painel-Secret': painelCfg.secret, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!res.ok) throw new Error(`Falha ao falar com o painel (${res.status})`);
    return res.json();
  }

  function whatsappLink(telefone) {
    const digits = (telefone || '').replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '#';
  }
  function iniciais(nome) { return (nome || '?').trim().charAt(0).toUpperCase(); }
  function tempoRelativo(iso) {
    if (!iso) return '';
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  }
  function dataLabel(iso) {
    const d = new Date(iso);
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    const mesmoDia = (a, b) => a.toDateString() === b.toDateString();
    if (mesmoDia(d, hoje)) return 'Hoje';
    if (mesmoDia(d, ontem)) return 'Ontem';
    return d.toLocaleDateString('pt-BR');
  }

  // ============ AUTH GATE ============
  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return;
    }
    const { data: profile } = await sb.from('profiles').select('id,nome').eq('id', session.user.id).maybeSingle();
    qs('#user-chip').textContent = profile ? profile.nome : session.user.email;
    if (profile) {
      if (profile.id === RESPONSAVEL_ID.andre) state.meuAtendidoPor = 'andre';
      else if (profile.id === RESPONSAVEL_ID.angela) state.meuAtendidoPor = 'angela';
    }
    qs('#login-gate').hidden = true;
    qs('#app').hidden = false;
    carregarLista();
    setInterval(carregarLista, 15000);
    setInterval(() => { if (state.selecionado) carregarHistorico(); }, 8000);
  }

  async function carregarLista() {
    try {
      const data = await painelFetch('painel-leads');
      state.conversas = data.conversas || [];
      renderLista();
    } catch (err) {
      console.error('Erro ao carregar conversas', err);
    }
  }

  function conversasFiltradas() {
    const termo = state.busca.trim().toLowerCase();
    return state.conversas.filter(c => {
      if (termo && !((c.nome || '').toLowerCase().includes(termo) || (c.telefone || '').includes(termo))) return false;
      if (state.aba === 'minhas') return c.atendidoPor === state.meuAtendidoPor;
      if (state.aba === 'arquivadas') return c.estado === 'NUTRICAO';
      return true;
    });
  }

  function renderLista() {
    const wrap = qs('#itens');
    const lista = conversasFiltradas();
    qs('#vazio').hidden = lista.length > 0;
    wrap.innerHTML = lista.map(c => {
      const ativo = state.selecionado === c.telefone ? ' ativo' : '';
      return `
        <div class="item${ativo}" data-tel="${c.telefone}">
          <div class="avatar">${iniciais(c.nome)}</div>
          <div class="info">
            <div class="linha1"><strong>${c.nome || c.telefone}</strong><span class="tempo">${tempoRelativo(c.ultimaMensagemEm)}</span></div>
            <div class="linha2">${c.telefone}</div>
            <div class="tags">
              <span class="tag tag-produto">${PRODUTO_LABEL[c.produtoChave] || c.produtoChave || 'Produto?'}</span>
              <span class="tag tag-estado tag-estado-${(c.estado || '').toLowerCase()}">${ESTADO_LABEL[c.estado] || c.estado || '—'}</span>
            </div>
          </div>
        </div>`;
    }).join('');
    wrap.querySelectorAll('.item').forEach(el => el.addEventListener('click', () => selecionar(el.dataset.tel)));
  }

  async function selecionar(telefone) {
    state.selecionado = telefone;
    renderLista();
    qs('#thread-vazio').hidden = true;
    qs('#thread-conteudo').hidden = false;
    const conversa = state.conversas.find(c => c.telefone === telefone);
    qs('#t-nome').textContent = conversa ? (conversa.nome || telefone) : telefone;
    qs('#t-telefone').textContent = telefone;
    qs('#t-whatsapp').href = whatsappLink(telefone);
    qs('#t-atribuir').value = (conversa && conversa.atendidoPor) || 'andre';
    atualizarBotaoToggle(conversa);
    await carregarHistorico();
  }

  function atualizarBotaoToggle(conversa) {
    const btn = qs('#t-toggle');
    if (conversa && conversa.estado === 'TRANSFERIDO') {
      btn.textContent = 'Reativar a Ana';
      btn.dataset.acao = 'reativar';
    } else {
      btn.textContent = 'Assumir conversa agora';
      btn.dataset.acao = 'transferir';
    }
  }

  async function carregarHistorico() {
    if (!state.selecionado) return;
    try {
      const data = await painelFetch(`painel-historico?telefone=${encodeURIComponent(state.selecionado)}`);
      state.mensagens = data.mensagens || [];
      renderThread();
    } catch (err) {
      console.error('Erro ao carregar histórico', err);
    }
  }

  function renderThread() {
    const wrap = qs('#t-msgs');
    const permaneceEmbaixo = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 40;
    let ultimaData = null;
    const partes = [];
    for (const m of state.mensagens) {
      const label = dataLabel(m.criadoEm);
      if (label !== ultimaData) {
        partes.push(`<div class="divisor"><span>${label}</span></div>`);
        ultimaData = label;
      }
      const hora = m.criadoEm ? new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const classe = m.remetente === 'lead' ? 'bolha-lead' : 'bolha-bot';
      partes.push(`<div class="bolha ${classe}"><p>${(m.texto || '').replace(/</g, '&lt;')}</p><span class="hora">${hora}</span></div>`);
    }
    wrap.innerHTML = partes.join('');
    if (permaneceEmbaixo) wrap.scrollTop = wrap.scrollHeight;
  }

  async function executarAcao(acao, valor) {
    if (!state.selecionado) return;
    try {
      await painelFetch('painel-acao', { method: 'POST', body: JSON.stringify({ telefone: state.selecionado, acao, valor }) });
      await carregarLista();
      atualizarBotaoToggle(state.conversas.find(c => c.telefone === state.selecionado));
      showToast('Atualizado.');
    } catch (err) {
      showToast('Não consegui atualizar agora.', true);
    }
  }

  qs('#busca').addEventListener('input', (e) => { state.busca = e.target.value; renderLista(); });
  qs('#t-toggle').addEventListener('click', (e) => executarAcao(e.target.dataset.acao, null));
  qs('#t-atribuir').addEventListener('change', (e) => executarAcao('atribuir', e.target.value));
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.aba = btn.dataset.tab;
      renderLista();
    });
  });

  init();
})();
