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
    menuAberto: null, // telefone do card com o menu de ações aberto
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const PRODUTO_LABEL = { oni_marrocos: 'Oni Marrocos', villa_flora_jardins: 'Villa Flora Jardins' };
  const ESTADO_LABEL = {
    CONVERSANDO: 'Conversando', TRANSFERIDO: 'Com humano', AGENDADO: 'Agendado', NUTRICAO: 'Manutenção',
  };

  // Ícones minimalistas (mesmo estilo do ícone de busca já usado na página).
  const ICONE = {
    excluir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    naoLida: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    fixar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 4h6"/><path d="M9 4v6.5c0 .7-.3 1.3-.8 1.8L7 14h10l-1.2-1.7c-.5-.5-.8-1.1-.8-1.8V4"/></svg>',
    arquivar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
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
      if (state.aba === 'arquivadas') return !!c.arquivado;
      if (c.arquivado) return false; // arquivada só aparece na própria aba
      if (state.aba === 'minhas') return c.atendidoPor === state.meuAtendidoPor;
      return true;
    });
  }

  function renderMenuAcoes(c) {
    const itens = [
      { acao: 'apagar', label: 'Excluir', icone: ICONE.excluir, confirmar: true },
      { acao: 'marcar_nao_lida', label: 'Marcar como não lida', icone: ICONE.naoLida, valor: 'true' },
      c.fixado
        ? { acao: 'fixar', label: 'Desfixar', icone: ICONE.fixar, valor: 'false' }
        : { acao: 'fixar', label: 'Fixar', icone: ICONE.fixar, valor: 'true' },
      c.arquivado
        ? { acao: 'arquivar', label: 'Desarquivar', icone: ICONE.arquivar, valor: 'false' }
        : { acao: 'arquivar', label: 'Arquivar', icone: ICONE.arquivar, valor: 'true' },
    ];
    return `
      <div class="menu-acoes" data-tel="${c.telefone}">
        ${itens.map(it => `
          <button type="button" class="menu-acao-item" data-acao="${it.acao}" data-valor="${it.valor || ''}" data-confirmar="${it.confirmar ? '1' : ''}">
            <span class="menu-acao-icone">${it.icone}</span>
            <span>${it.label}</span>
          </button>
        `).join('')}
      </div>`;
  }

  function renderLista() {
    const wrap = qs('#itens');
    const lista = conversasFiltradas();
    qs('#vazio').hidden = lista.length > 0;
    wrap.innerHTML = lista.map(c => {
      const ativo = state.selecionado === c.telefone ? ' ativo' : '';
      const naoLida = c.naoLida ? ' nao-lida' : '';
      const menuAberto = state.menuAberto === c.telefone;
      return `
        <div class="item${ativo}${naoLida}" data-tel="${c.telefone}">
          <div class="avatar">${iniciais(c.nome)}</div>
          <div class="info">
            <div class="linha1"><span class="linha1-nome">${c.fixado ? `<span class="icone-fixado" title="Fixada">${ICONE.fixar}</span>` : ''}<strong>${c.nome || c.telefone}</strong></span><span class="tempo">${tempoRelativo(c.ultimaMensagemEm)}</span></div>
            <div class="linha2">${c.telefone}</div>
            <div class="tags">
              <span class="tag tag-produto">${PRODUTO_LABEL[c.produtoChave] || c.produtoChave || 'Produto?'}</span>
              <span class="tag tag-estado tag-estado-${(c.estado || '').toLowerCase()}">${ESTADO_LABEL[c.estado] || c.estado || '—'}</span>
            </div>
          </div>
          ${c.naoLida ? '<span class="dot-nao-lida" title="Não lida"></span>' : ''}
          <button type="button" class="btn-menu-item" data-tel-menu="${c.telefone}" title="Mais ações">${ICONE.chevron}</button>
          ${menuAberto ? renderMenuAcoes(c) : ''}
        </div>`;
    }).join('');

    wrap.querySelectorAll('.item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.btn-menu-item') || e.target.closest('.menu-acoes')) return;
        selecionar(el.dataset.tel);
      });
    });
    wrap.querySelectorAll('.btn-menu-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tel = btn.dataset.telMenu;
        state.menuAberto = state.menuAberto === tel ? null : tel;
        renderLista();
      });
    });
    wrap.querySelectorAll('.menu-acao-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tel = btn.closest('.menu-acoes').dataset.tel;
        const acao = btn.dataset.acao;
        const valor = btn.dataset.valor || null;
        if (btn.dataset.confirmar === '1' && !confirm('Excluir esta conversa da lista? Ela some pra sempre daqui do painel (não dá pra desfazer por aqui).')) {
          return;
        }
        state.menuAberto = null;
        executarAcao(tel, acao, valor);
      });
    });
  }

  document.addEventListener('click', (e) => {
    if (state.menuAberto && !e.target.closest('.menu-acoes') && !e.target.closest('.btn-menu-item')) {
      state.menuAberto = null;
      renderLista();
    }
  });

  async function selecionar(telefone) {
    state.selecionado = telefone;
    state.menuAberto = null;
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
    if (conversa && conversa.naoLida) {
      await executarAcao(telefone, 'marcar_nao_lida', 'false', { silencioso: true });
    }
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

  async function executarAcao(telefone, acao, valor, opts = {}) {
    if (!telefone) return;
    try {
      await painelFetch('painel-acao', { method: 'POST', body: JSON.stringify({ telefone, acao, valor }) });
      await carregarLista();
      if (acao === 'apagar' && state.selecionado === telefone) {
        state.selecionado = null;
        qs('#thread-vazio').hidden = false;
        qs('#thread-conteudo').hidden = true;
      } else if (state.selecionado === telefone) {
        atualizarBotaoToggle(state.conversas.find(c => c.telefone === telefone));
      }
      if (!opts.silencioso) showToast('Atualizado.');
    } catch (err) {
      if (!opts.silencioso) showToast('Não consegui atualizar agora.', true);
    }
  }

  qs('#busca').addEventListener('input', (e) => { state.busca = e.target.value; renderLista(); });
  qs('#t-toggle').addEventListener('click', (e) => executarAcao(state.selecionado, e.target.dataset.acao, null));
  qs('#t-atribuir').addEventListener('change', (e) => executarAcao(state.selecionado, 'atribuir', e.target.value));
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
