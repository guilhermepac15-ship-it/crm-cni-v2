// ============ CONFIG ============
let sb;
try {
  const cfg = window.SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey || cfg.url.includes('COLE_AQUI') || cfg.anonKey.includes('COLE_AQUI')) {
    throw new Error('Configuração do Supabase ausente.');
  }
  sb = window.supabase.createClient(cfg.url, cfg.anonKey);
} catch (err) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f16;color:#e7ecf1;font-family:sans-serif;padding:24px;text-align:center;">
      <div style="max-width:440px;">
        <h1 style="font-size:18px;">Configuração pendente</h1>
        <p style="color:#8d9aab;font-size:14px;line-height:1.6;">
          O arquivo <code>config.js</code> ainda não tem os dados do seu projeto Supabase
          (ou eles estão incorretos). Siga o passo 3 do <code>SETUP.md</code> para preencher
          a Project URL e a chave anon public, depois recarregue esta página.
        </p>
      </div>
    </div>`;
  throw err;
}

const ETAPAS = [
  { key: 'contato_inicial', label: 'Contato Inicial' },
  { key: 'oportunidade', label: 'Oportunidade' },
  { key: 'visita', label: 'Visita' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'em_analise', label: 'Em Análise' },
  { key: 'aprovado', label: 'Aprovado' },
  { key: 'reprovado', label: 'Reprovado' },
  { key: 'lead_perdido', label: 'Lead Perdido' },
  { key: 'vendido', label: 'Vendido' },
];

const PAPEL_LABEL = { proprietario: 'Proprietário', socia: 'Sócia', corretor: 'Corretor' };

const TEMPERATURAS = [
  { key: 'frio', label: 'Frio', color: '#3a86ff' },
  { key: 'morno', label: 'Morno', color: '#e08a1e' },
  { key: 'quente', label: 'Quente', color: '#e0475f' },
];
function temperaturaInfo(key) {
  return TEMPERATURAS.find(t => t.key === key) || TEMPERATURAS[1];
}

const ORIGENS_SUGERIDAS = ['WhatsApp', 'Indicação', 'Instagram', 'Facebook', 'Site', 'OLX', 'Placa/Outdoor', 'Loja'];

const CIDADES = ['Campinas', 'Hortolândia', 'Sumaré'];

function toTitleCase(str) {
  return String(str || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}

const TAGS_DIA = [
  { key: 'dia_1', label: 'DIA 1' },
  { key: 'dia_2', label: 'DIA 2' },
  { key: 'dia_3', label: 'DIA 3' },
  { key: 'dia_4', label: 'DIA 4' },
];
function tagDiaLabel(key) {
  const t = TAGS_DIA.find(t => t.key === key);
  return t ? t.label : null;
}

const TIPOS_TAREFA = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'ligacao', label: 'Ligação' },
  { key: 'reuniao', label: 'Reunião' },
  { key: 'visita', label: 'Visita' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'documentos', label: 'Enviar documentos' },
];
function tipoTarefaLabel(key) {
  const t = TIPOS_TAREFA.find(t => t.key === key);
  return t ? t.label : null;
}

const ETAPAS_RECONVERSAO = [
  { key: 'perdido', label: 'Perdido' },
  { key: 'tentando_reconquistar', label: 'Tentando Reconquistar' },
  { key: 'recontato_agendado', label: 'Recontato Agendado' },
  { key: 'reconvertido', label: 'Reconvertido' },
];
function etapaReconversaoInfo(key) {
  return ETAPAS_RECONVERSAO.find(e => e.key === key) || ETAPAS_RECONVERSAO[0];
}

const MOTIVOS_PERDA = [
  'Sem aprovação de crédito',
  'Desistiu da compra',
  'Comprou com concorrente',
  'Fora do orçamento',
  'Não retornou contato',
  'Imóvel não disponível',
  'Outro',
];

const STALE_DAYS = 5; // dias parado na mesma etapa até avisar

function isGestor() {
  return currentProfile && (currentProfile.papel === 'proprietario' || currentProfile.papel === 'socia');
}

// ============ ICONS (monocromáticos, herdam a cor do texto) ============
const ICONS = {
  phone: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.2Z"/></svg>',
  money: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6c0-1.5 1.8-3 4-3s4 1.5 4 3"/><path d="M6 6h12l2 13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M12 10v6M10 12h4"/></svg>',
  building: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18"/><path d="M6 12h12M6 8h12M6 16h12"/><path d="M10 22v-4h4v4"/></svg>',
  pin: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.5 7-12A7 7 0 0 0 5 10c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  clock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  person: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>',
  sun: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>',
  chevronLeft: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  chevronRight: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  message: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.5A8.5 8.5 0 1 1 21 11.5Z"/></svg>',
  fire: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-1.5.8-2.5 1.5-3.5.3 1 1 1.5 1.5 1.5-.3-2 .5-4 2-6 .3 1.5 1 2.5 2 3.5.6.6 1 1.5 1 2.5"/></svg>',
};

function whatsappUrl(telefone) {
  const digits = (telefone || '').replace(/\D/g, '');
  if (!digits) return null;
  const comDdi = digits.startsWith('55') ? digits : '55' + digits;
  return `https://wa.me/${comDdi}`;
}

// ============ STATE ============
let currentUser = null;
let currentProfile = null;
let leads = [];
let followUps = [];
let profiles = [];
let editingLeadId = null; // null = novo lead
let draggedCardId = null;
const filterState = { renda: null, responsavelId: '', temperatura: '', empreendimento: '' };
let sortState = 'recentes'; // recentes | manual | nome | quente

// ============ HELPERS ============
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showToast(msg, isError = false) {
  const el = qs('#toast');
  el.textContent = msg;
  el.style.background = isError ? 'var(--danger)' : 'var(--topbar-bg)';
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 3200);
}

function formatCurrency(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(iso) {
  return new Date(iso).getTime() < Date.now();
}

function daysInStage(lead) {
  const ref = lead.etapa_atualizada_em || lead.created_at;
  const ms = Date.now() - new Date(ref).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function etapaInfo(key) {
  return ETAPAS.find(e => e.key === key) || ETAPAS[0];
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatPhone(telefone) {
  const digits = (telefone || '').replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return telefone || '—';
}

// ============ THEME ============
function initTheme() {
  const saved = localStorage.getItem('crm-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon();
}
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('crm-theme', next);
  updateThemeIcon();
}
function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  qs('#btn-theme').innerHTML = isDark ? ICONS.sun : ICONS.moon;
}

// ============ AUTH ============
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await onLoggedIn(session.user);
  } else {
    showLogin();
  }
}

function showLogin() {
  qs('#login-screen').hidden = false;
  qs('#app-screen').hidden = true;
}

async function onLoggedIn(user) {
  currentUser = user;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  currentProfile = profile || { nome: user.email, papel: '' };
  filterState.responsavelId = user.id;

  qs('#login-screen').hidden = true;
  qs('#app-screen').hidden = false;
  qs('#user-nome').textContent = currentProfile.nome;
  qs('#user-papel').textContent = PAPEL_LABEL[currentProfile.papel] || '';

  await loadAll();
}

qs('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = qs('#login-email').value.trim();
  const password = qs('#login-password').value;
  qs('#login-error').textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    qs('#login-error').textContent = 'E-mail ou senha inválidos.';
    return;
  }
  await onLoggedIn(data.user);
});

qs('#btn-logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  currentUser = null;
  leads = [];
  followUps = [];
  showLogin();
});

qs('#btn-theme').addEventListener('click', toggleTheme);

// ============ DATA LOADING ============
async function loadAll() {
  await Promise.all([loadLeads(), loadFollowUps(), loadProfiles()]);
  renderBoard();
  renderReminders();
  populateDatalists();
  populateUserFilter();
  updateFilterCountBadge();
  qs('#nav-corretores').hidden = !isGestor();
  renderCorretores();
  renderInicio();
  renderReconversao();
  initMensagensFiltros();
}

function populateUserFilter() {
  const wrap = qs('#filtro-usuario-wrap');
  if (!isGestor()) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const select = qs('#filtro-usuario');
  select.innerHTML = '<option value="">Todos</option>' +
    profiles.map(p => `<option value="${p.id}">${escapeHtml(p.nome)} (${PAPEL_LABEL[p.papel] || p.papel})</option>`).join('');
  select.value = filterState.responsavelId;
}

function irParaFunilDoUsuario(responsavelId) {
  filterState.responsavelId = responsavelId;
  qs('#filtro-usuario').value = responsavelId;
  updateFilterCountBadge();
  qsa('.side-nav-item').forEach(b => b.classList.remove('active'));
  qs('.side-nav-item[data-view="funil"]').classList.add('active');
  qsa('.view').forEach(v => v.classList.remove('active'));
  qs('#view-funil').classList.add('active');
  renderBoard();
}

function renderCorretores() {
  const list = qs('#corretores-list');
  if (!isGestor()) { list.innerHTML = ''; return; }
  const corretores = profiles.filter(p => p.papel === 'corretor');
  if (!corretores.length) {
    list.innerHTML = '<p class="locked-hint">Nenhum corretor cadastrado ainda.</p>';
    return;
  }
  list.innerHTML = corretores.map(c => {
    const leadsDoCorretor = leads.filter(l => l.responsavel_id === c.id);
    const ativos = leadsDoCorretor.filter(l => !['vendido', 'reprovado', 'lead_perdido'].includes(l.etapa));
    const parados = ativos.filter(l => daysInStage(l) >= STALE_DAYS).length;
    const iniciais = c.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    return `
      <div class="corretor-card" data-id="${c.id}">
        <div class="corretor-avatar">${escapeHtml(iniciais)}</div>
        <div class="corretor-info">
          <strong>${escapeHtml(c.nome)}</strong>
          <p>${ativos.length} lead${ativos.length === 1 ? '' : 's'} em andamento
            ${parados ? ` · <span class="corretor-stale">${parados} parado${parados === 1 ? '' : 's'}</span>` : ''}
          </p>
        </div>
        ${ICONS.chevronRight}
      </div>
    `;
  }).join('');
  qsa('.corretor-card', list).forEach(card => {
    card.addEventListener('click', () => irParaFunilDoUsuario(card.dataset.id));
  });
}

const ETAPAS_ENCERRADAS = ['vendido', 'reprovado', 'lead_perdido'];

function renderInicio() {
  const el = qs('#inicio-saudacao');
  if (!el) return; // ainda não logado / view não montada

  const nome = currentProfile ? currentProfile.nome.split(' ')[0] : '';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  el.textContent = `${saudacao}, ${nome}`;

  const totalClientes = leads.length;
  const oportunidades = leads.filter(l => l.etapa === 'oportunidade').length;
  const tarefasAbertas = followUps.filter(f => !f.concluido).length;
  const leadsQuentes = leads.filter(l => l.temperatura === 'quente' && !ETAPAS_ENCERRADAS.includes(l.etapa)).length;

  const stats = [
    { icon: ICONS.person, label: 'Total de clientes', value: totalClientes, hint: 'Base ativa', color: 'var(--ic-person)' },
    { icon: ICONS.money, label: 'Oportunidades', value: oportunidades, hint: 'Em andamento', color: 'var(--ic-money)' },
    { icon: ICONS.clock, label: 'Tarefas abertas', value: tarefasAbertas, hint: 'Próximos retornos', color: 'var(--stale)' },
    { icon: ICONS.fire, label: 'Leads quentes', value: leadsQuentes, hint: 'Prioridade alta', color: 'var(--danger)' },
  ];
  qs('#dashboard-stats').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="--stat-icon-color:${s.color}">${s.icon}</div>
      <div class="stat-info">
        <strong>${s.value}</strong>
        <span>${s.label}</span>
        <small>${s.hint}</small>
      </div>
    </div>
  `).join('');

  const prioridadesEl = qs('#dashboard-prioridades');
  const vistos = new Set();
  const itens = [];
  followUps.filter(f => !f.concluido && isOverdue(f.data_hora))
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))
    .forEach(f => {
      const lead = leads.find(l => l.id === f.lead_id);
      if (lead && !vistos.has(lead.id)) { vistos.add(lead.id); itens.push({ lead, motivo: 'Follow-up atrasado' }); }
    });
  leads.filter(l => !ETAPAS_ENCERRADAS.includes(l.etapa) && daysInStage(l) >= STALE_DAYS).forEach(l => {
    if (!vistos.has(l.id)) { vistos.add(l.id); itens.push({ lead: l, motivo: `Parado há ${daysInStage(l)} dias` }); }
  });
  const top = itens.slice(0, 6);
  if (!top.length) {
    prioridadesEl.innerHTML = '<p class="locked-hint">Nenhum atendimento pendente no momento.</p>';
  } else {
    prioridadesEl.innerHTML = top.map(({ lead, motivo }) => `
      <div class="prioridade-row" data-id="${lead.id}">
        <strong>${escapeHtml(lead.nome)}</strong>
        <span>${motivo}</span>
      </div>
    `).join('');
    qsa('.prioridade-row', prioridadesEl).forEach(row => {
      row.addEventListener('click', () => openLeadModal(row.dataset.id));
    });
  }

  const funilEl = qs('#dashboard-funil');
  const maxCount = Math.max(1, ...ETAPAS.map(e => leads.filter(l => l.etapa === e.key).length));
  funilEl.innerHTML = ETAPAS.map(e => {
    const count = leads.filter(l => l.etapa === e.key).length;
    const pct = Math.round((count / maxCount) * 100);
    return `
      <div class="funil-resumo-row">
        <div class="funil-resumo-label"><span>${e.label}</span><strong>${count}</strong></div>
        <div class="funil-resumo-bar"><div class="funil-resumo-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
  qs('#dashboard-funil-resumo').textContent = `${totalClientes} cliente${totalClientes === 1 ? '' : 's'}`;
}

async function loadLeads() {
  const { data, error } = await sb.from('leads').select('*').order('order_index', { ascending: true });
  if (error) { showToast('Erro ao carregar leads: ' + error.message, true); return; }
  leads = data || [];
}

async function loadFollowUps() {
  const { data, error } = await sb.from('follow_ups').select('*').order('data_hora', { ascending: true });
  if (error) { showToast('Erro ao carregar lembretes: ' + error.message, true); return; }
  followUps = data || [];
}

async function loadProfiles() {
  const { data, error } = await sb.from('profiles').select('*');
  if (error) { showToast('Erro ao carregar responsáveis: ' + error.message, true); return; }
  profiles = data || [];
}

function profileName(id) {
  const p = profiles.find(p => p.id === id);
  return p ? p.nome : null;
}

function populateDatalists() {
  const empreendimentos = [...new Set(leads.map(l => l.empreendimento).filter(Boolean))];
  const origens = [...new Set([...ORIGENS_SUGERIDAS, ...leads.map(l => l.origem).filter(Boolean)])];
  const cidades = [...new Set(leads.map(l => l.cidade).filter(Boolean))];
  qs('#lista-empreendimentos').innerHTML = empreendimentos.map(v => `<option value="${escapeHtml(v)}">`).join('');
  qs('#lista-origens').innerHTML = origens.map(v => `<option value="${escapeHtml(v)}">`).join('');
  qs('#lista-cidades').innerHTML = cidades.map(v => `<option value="${escapeHtml(v)}">`).join('');
}

function nextFollowUpFor(leadId) {
  return followUps
    .filter(f => f.lead_id === leadId && !f.concluido)
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))[0];
}

// ============ TABS ============
qsa('.side-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    qsa('.side-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    qsa('.view').forEach(v => v.classList.remove('active'));
    qs(`#view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'reconversao') renderReconversao();
    if (btn.dataset.view === 'mensagens') renderMensagensPreview();
  });
});

// ============ PAINEL DE FILTROS ============
function openFilterDrawer() {
  qs('#filter-drawer').hidden = false;
  qs('#filter-backdrop').hidden = false;
}
function closeFilterDrawer() {
  qs('#filter-drawer').hidden = true;
  qs('#filter-backdrop').hidden = true;
}
qs('#btn-toggle-filtros').addEventListener('click', openFilterDrawer);
qs('#btn-close-filtros').addEventListener('click', closeFilterDrawer);
qs('#filter-backdrop').addEventListener('click', closeFilterDrawer);

function updateFilterCountBadge() {
  const count = (filterState.renda !== null ? 1 : 0) + (filterState.responsavelId ? 1 : 0)
    + (filterState.temperatura ? 1 : 0) + (filterState.empreendimento ? 1 : 0);
  const badge = qs('#filter-count-badge');
  if (count > 0) { badge.hidden = false; badge.textContent = count; }
  else badge.hidden = true;
}

qs('#btn-aplicar-filtros').addEventListener('click', () => {
  const rendaVal = qs('#filtro-renda').value;
  filterState.renda = rendaVal ? Number(rendaVal) : null;
  filterState.responsavelId = qs('#filtro-usuario').value;
  filterState.temperatura = qs('#filtro-temperatura').value;
  filterState.empreendimento = qs('#filtro-empreendimento').value;
  updateFilterCountBadge();
  renderBoard();
  closeFilterDrawer();
});

qs('#btn-limpar-filtros').addEventListener('click', () => {
  filterState.renda = null;
  filterState.responsavelId = '';
  filterState.temperatura = '';
  filterState.empreendimento = '';
  qs('#filtro-renda').value = '';
  qs('#filtro-usuario').value = '';
  qs('#filtro-temperatura').value = '';
  qs('#filtro-empreendimento').value = '';
  updateFilterCountBadge();
  renderBoard();
  closeFilterDrawer();
});

qs('#sel-ordenar').addEventListener('change', (e) => {
  sortState = e.target.value;
  renderBoard();
});

function passesFilters(lead) {
  if (filterState.renda !== null && Number(lead.renda) !== filterState.renda) return false;
  if (filterState.responsavelId && lead.responsavel_id !== filterState.responsavelId) return false;
  if (filterState.temperatura && lead.temperatura !== filterState.temperatura) return false;
  if (filterState.empreendimento === 'com' && !lead.empreendimento) return false;
  if (filterState.empreendimento === 'sem' && lead.empreendimento) return false;
  return true;
}

function ordenarLeads(list) {
  if (sortState === 'nome') return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (sortState === 'quente') {
    const peso = { quente: 0, morno: 1, frio: 2 };
    return [...list].sort((a, b) => (peso[a.temperatura] ?? 1) - (peso[b.temperatura] ?? 1));
  }
  if (sortState === 'recentes') return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return [...list].sort((a, b) => a.order_index - b.order_index);
}

// ============ BOARD RENDER ============
function renderBoard() {
  const search = qs('#busca-leads').value.trim().toLowerCase();
  const board = qs('#board');
  board.innerHTML = '';

  ETAPAS.forEach(etapa => {
    const leadsDaColuna = ordenarLeads(leads
      .filter(l => l.etapa === etapa.key)
      .filter(l => !search
        || l.nome.toLowerCase().includes(search)
        || (l.telefone || '').includes(search)
        || (l.cidade || '').toLowerCase().includes(search))
      .filter(passesFilters));

    const col = document.createElement('div');
    col.className = 'column';
    col.dataset.etapa = etapa.key;

    col.innerHTML = `
      <div class="column-header">
        <span>${etapa.label}</span>
        <span class="column-count">${leadsDaColuna.length}</span>
      </div>
      <div class="column-body" data-etapa="${etapa.key}"></div>
    `;

    const body = qs('.column-body', col);
    leadsDaColuna.forEach(lead => body.appendChild(renderCard(lead)));

    body.addEventListener('dragover', (e) => {
      e.preventDefault();
      body.classList.add('drag-over');
      const afterEl = getDragAfterElement(body, e.clientY);
      const dragging = qs('.dragging');
      if (!dragging) return;
      if (afterEl == null) body.appendChild(dragging);
      else body.insertBefore(dragging, afterEl);
    });
    body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      body.classList.remove('drag-over');
      await persistColumnOrder(body);
    });

    board.appendChild(col);
  });
}

function renderCard(lead) {
  const fu = nextFollowUpFor(lead.id);
  const overdue = fu && isOverdue(fu.data_hora);
  const responsavel = profileName(lead.responsavel_id);
  const temp = temperaturaInfo(lead.temperatura);
  const idx = ETAPAS.findIndex(e => e.key === lead.etapa);
  const encerrado = ['vendido', 'reprovado', 'lead_perdido'].includes(lead.etapa);
  const dias = daysInStage(lead);
  const stale = !encerrado && dias >= STALE_DAYS;

  const rows = [
    lead.empreendimento ? `<div class="lead-row" style="--row-icon-color:var(--ic-building)">${ICONS.building}<span>${escapeHtml(lead.empreendimento)}</span></div>` : '',
    lead.cidade ? `<div class="lead-row" style="--row-icon-color:var(--ic-pin)">${ICONS.pin}<span>${escapeHtml(lead.cidade)}</span></div>` : '',
    responsavel ? `<div class="lead-row" style="--row-icon-color:var(--ic-person)">${ICONS.person}<span>${escapeHtml(responsavel)}</span></div>` : '',
    `<div class="lead-row" style="--row-icon-color:var(--ic-phone)">${ICONS.phone}<span>${escapeHtml(formatPhone(lead.telefone))}</span></div>`,
    `<div class="lead-row" style="--row-icon-color:var(--ic-money)">${ICONS.money}<span>${formatCurrency(lead.renda)}</span></div>`,
  ].join('');

  const card = document.createElement('div');
  card.className = 'lead-card';
  card.draggable = true;
  card.dataset.id = lead.id;
  const tagDia = tagDiaLabel(lead.tag_dia);
  card.innerHTML = `
    <div class="card-badges">
      <div class="temp-pill" style="--temp-color:${temp.color}"><span class="temp-dot"></span>${temp.label}</div>
      ${tagDia ? `<span class="tag-dia-pill">${tagDia}</span>` : ''}
      ${lead.nao_deseja_contato ? `<span class="opt-out-pill" title="Não deseja contato">Não contatar</span>` : ''}
    </div>
    <h4>${escapeHtml(lead.nome)}</h4>
    ${rows}
    ${overdue ? `<span class="overdue-badge">${ICONS.clock} Follow-up atrasado</span>` : ''}
    ${stale ? `<span class="stale-badge">${ICONS.clock} Parado há ${dias} dias</span>` : ''}
    <div class="card-footer">
      <div class="card-nav">
        ${lead.telefone ? `<button class="card-nav-btn whatsapp-btn" style="color:var(--ic-whatsapp)" title="Abrir conversa no WhatsApp">${ICONS.message}</button>` : ''}
        <button class="card-nav-btn" data-dir="-1" title="Mover para a etapa anterior" ${idx <= 0 ? 'disabled' : ''}>${ICONS.chevronLeft}</button>
        <button class="card-nav-btn" data-dir="1" title="Mover para a próxima etapa" ${idx >= ETAPAS.length - 1 ? 'disabled' : ''}>${ICONS.chevronRight}</button>
      </div>
    </div>
  `;

  qsa('.card-nav-btn[data-dir]', card).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveLeadStage(lead.id, Number(btn.dataset.dir));
    });
  });

  const waBtn = qs('.whatsapp-btn', card);
  if (waBtn) {
    waBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(whatsappUrl(lead.telefone), '_blank');
    });
  }

  card.addEventListener('dragstart', () => {
    draggedCardId = lead.id;
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedCardId = null;
  });
  card.addEventListener('click', () => openLeadModal(lead.id));

  return card;
}

function getDragAfterElement(container, y) {
  const cards = qsa('.lead-card:not(.dragging)', container);
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}

const ETAPAS_PERDA = ['reprovado', 'lead_perdido'];

async function persistColumnOrder(columnBodyEl) {
  const etapa = columnBodyEl.dataset.etapa;
  const ids = qsa('.lead-card', columnBodyEl).map(el => el.dataset.id);
  if (!ids.length) return;

  let leadQueMudou = null;
  const updates = ids.map((id, index) => {
    const lead = leads.find(l => l.id === id);
    const changedStage = lead && lead.etapa !== etapa;
    const payload = { etapa, order_index: index };
    if (changedStage) payload.etapa_atualizada_em = new Date().toISOString();
    if (lead) {
      lead.etapa = etapa; lead.order_index = index;
      if (changedStage) { lead.etapa_atualizada_em = payload.etapa_atualizada_em; leadQueMudou = lead; }
    }
    return sb.from('leads').update(payload).eq('id', id);
  });

  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();

  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);
  if (failed) showToast('Erro ao salvar posição: ' + failed.error.message, true);

  if (leadQueMudou && ETAPAS_PERDA.includes(etapa) && !leadQueMudou.motivo_perda) {
    openLeadModal(leadQueMudou.id);
  }
}

async function moveLeadStage(leadId, direction) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  const idx = ETAPAS.findIndex(e => e.key === lead.etapa);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= ETAPAS.length) return;
  const novaEtapa = ETAPAS[newIdx].key;
  const etapaAtualizadaEm = new Date().toISOString();

  const maxOrder = Math.max(0, ...leads.filter(l => l.etapa === novaEtapa).map(l => l.order_index + 1));
  lead.etapa = novaEtapa;
  lead.order_index = maxOrder;
  lead.etapa_atualizada_em = etapaAtualizadaEm;
  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();

  const { error } = await sb.from('leads').update({ etapa: novaEtapa, order_index: maxOrder, etapa_atualizada_em: etapaAtualizadaEm }).eq('id', leadId);
  if (error) showToast('Erro ao mover lead: ' + error.message, true);

  if (ETAPAS_PERDA.includes(novaEtapa) && !lead.motivo_perda) {
    openLeadModal(lead.id);
  }
}

async function moverParaEtapaDireta(leadId, novaEtapa) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead || lead.etapa === novaEtapa) return;
  const etapaAtualizadaEm = new Date().toISOString();
  const maxOrder = Math.max(0, ...leads.filter(l => l.etapa === novaEtapa).map(l => l.order_index + 1));
  lead.etapa = novaEtapa;
  lead.order_index = maxOrder;
  lead.etapa_atualizada_em = etapaAtualizadaEm;
  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();
  closeModal();

  const { error } = await sb.from('leads').update({ etapa: novaEtapa, order_index: maxOrder, etapa_atualizada_em: etapaAtualizadaEm }).eq('id', leadId);
  if (error) showToast('Erro ao mover lead: ' + error.message, true);

  if (ETAPAS_PERDA.includes(novaEtapa) && !lead.motivo_perda) {
    openLeadModal(lead.id);
  }
}

qs('#busca-leads').addEventListener('input', renderBoard);

// ============ LEMBRETES VIEW ============
function renderReminders() {
  const pendentes = followUps
    .filter(f => !f.concluido)
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const overdueCount = pendentes.filter(f => isOverdue(f.data_hora)).length;
  const badge = qs('#reminder-count');
  if (overdueCount > 0) { badge.hidden = false; badge.textContent = overdueCount; }
  else badge.hidden = true;

  const list = qs('#reminders-list');
  const empty = qs('#empty-reminders');
  list.innerHTML = '';

  if (!pendentes.length) { empty.hidden = false; return; }
  empty.hidden = true;

  pendentes.forEach(f => {
    const lead = leads.find(l => l.id === f.lead_id);
    if (!lead) return;
    const overdue = isOverdue(f.data_hora);
    const row = document.createElement('div');
    row.className = 'reminder-row' + (overdue ? ' overdue' : '');
    row.innerHTML = `
      <span class="rr-date">${formatDateTime(f.data_hora)}</span>
      <span class="rr-body">
        <strong>${escapeHtml(lead.nome)}</strong>
        <p>${escapeHtml(f.nota || 'Sem observação')} · ${etapaInfo(lead.etapa).label}</p>
      </span>
    `;
    row.addEventListener('click', () => openLeadModal(lead.id));
    list.appendChild(row);
  });
}

// ============ MODAL: NOVO / EDITAR LEAD ============
qs('#btn-novo-lead').addEventListener('click', () => openLeadModal(null));

function closeModal() {
  qs('#modal-overlay').hidden = true;
  qs('#modal').innerHTML = '';
  editingLeadId = null;
}

async function openLeadModal(leadId) {
  editingLeadId = leadId;
  const lead = leadId ? leads.find(l => l.id === leadId) : null;
  await renderModal(lead);
  qs('#modal-overlay').hidden = false;
}

async function renderModal(lead) {
  const isNew = !lead;
  const modal = qs('#modal');

  let docsHtml = '';
  let docs = [];
  if (!isNew && lead.etapa === 'vendido') {
    const { data } = await sb.from('lead_documentos').select('*').eq('lead_id', lead.id).order('uploaded_at', { ascending: false });
    docs = data || [];
  }

  const followUpsDoLead = isNew ? [] : followUps.filter(f => f.lead_id === lead.id).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const motivoAtual = isNew ? '' : (lead.motivo_perda || '');
  const motivoEhPreset = MOTIVOS_PERDA.includes(motivoAtual) && motivoAtual !== 'Outro';
  const motivoPreset = motivoEhPreset ? motivoAtual : (motivoAtual ? 'Outro' : '');
  const motivoOutroValue = motivoEhPreset ? '' : motivoAtual;
  const showMotivo = !isNew && ['reprovado', 'lead_perdido'].includes(lead.etapa);

  modal.innerHTML = `
    <div class="modal-header">
      <h2>${isNew ? 'Novo Lead' : escapeHtml(lead.nome)}</h2>
      <button class="modal-close" id="btn-close-modal">✕</button>
    </div>
    <div class="modal-body">
      ${!isNew ? `
        <div class="section-title">Mover para etapa</div>
        <div class="mover-etapa-grid">
          ${ETAPAS.map(e => `<button type="button" class="mover-etapa-btn ${lead.etapa === e.key ? 'active' : ''}" data-etapa="${e.key}">${ICONS.chevronRight}${e.label}</button>`).join('')}
        </div>
      ` : ''}
      <div class="field">
        <label>Nome *</label>
        <input type="text" id="f-nome" value="${isNew ? '' : escapeHtml(lead.nome)}" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Telefone</label>
          <input type="tel" id="f-telefone" value="${isNew ? '' : escapeHtml(lead.telefone || '')}" placeholder="(19) 99999-9999">
        </div>
        <div class="field">
          <label>E-mail</label>
          <input type="email" id="f-email" value="${isNew ? '' : escapeHtml(lead.email || '')}" placeholder="cliente@email.com">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Renda</label>
          <input type="number" id="f-renda" step="0.01" min="0" value="${isNew ? '' : (lead.renda ?? '')}">
        </div>
        <div class="field">
          <label>Tag de sequência</label>
          <select id="f-tag-dia">
            <option value="">Sem tag</option>
            ${TAGS_DIA.map(t => `<option value="${t.key}" ${!isNew && lead.tag_dia === t.key ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Empreendimento de interesse</label>
          <input type="text" id="f-empreendimento" list="lista-empreendimentos" value="${isNew ? '' : escapeHtml(lead.empreendimento || '')}">
        </div>
        <div class="field">
          <label>Cidade de interesse</label>
          <select id="f-cidade">
            <option value="">Selecione</option>
            ${CIDADES.map(c => `<option value="${c}" ${!isNew && lead.cidade === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Origem do lead</label>
          <input type="text" id="f-origem" list="lista-origens" value="${isNew ? '' : escapeHtml(lead.origem || '')}">
        </div>
        <div class="field">
          <label>Responsável</label>
          <input type="text" value="${isNew ? (currentProfile ? escapeHtml(currentProfile.nome) : '') : escapeHtml(profileName(lead.responsavel_id) || '—')}" disabled>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Etapa</label>
          <select id="f-etapa">
            ${ETAPAS.map(e => `<option value="${e.key}" ${!isNew && lead.etapa === e.key ? 'selected' : ''}>${e.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Temperatura</label>
          <select id="f-temperatura">
            ${TEMPERATURAS.map(t => `<option value="${t.key}" ${(isNew ? t.key === 'morno' : lead.temperatura === t.key) ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field checkbox-field">
        <label class="checkbox-label">
          <input type="checkbox" id="f-nao-deseja-contato" ${!isNew && lead.nao_deseja_contato ? 'checked' : ''}>
          Não deseja contato (não entra em disparos)
        </label>
      </div>
      <div class="field" id="motivo-perda-wrap" ${showMotivo ? '' : 'hidden'}>
        <label>Motivo da perda</label>
        <select id="f-motivo-select">
          <option value="">Selecione um motivo</option>
          ${MOTIVOS_PERDA.map(m => `<option value="${escapeHtml(m)}" ${motivoPreset === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('')}
        </select>
        <input type="text" id="f-motivo-outro" placeholder="Descreva o motivo" style="margin-top:8px" value="${escapeHtml(motivoOutroValue)}" ${motivoPreset === 'Outro' ? '' : 'hidden'}>
      </div>
      <div class="field">
        <label>Observação</label>
        <textarea id="f-observacao">${isNew ? '' : escapeHtml(lead.observacao || '')}</textarea>
      </div>

      <div class="section-title">Follow-up</div>
      ${isNew ? '<p class="locked-hint">Salve o lead primeiro para agendar follow-ups.</p>' : `
        <div id="followups-list">${renderFollowUpsList(followUpsDoLead)}</div>
        <div class="add-followup-row">
          <div class="field">
            <label>Data/hora</label>
            <input type="datetime-local" id="fu-data">
          </div>
          <div class="field">
            <label>Tipo</label>
            <select id="fu-tipo">
              <option value="">Selecione</option>
              ${TIPOS_TAREFA.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Atribuir para</label>
            <select id="fu-atribuido">
              ${profiles.map(p => `<option value="${p.id}" ${p.id === (currentUser && currentUser.id) ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Nota</label>
            <input type="text" id="fu-nota" placeholder="Ex: Ligar para confirmar visita">
          </div>
          <button class="btn-secondary btn-small" id="btn-add-followup" type="button">+ Adicionar</button>
        </div>
      `}

      ${!isNew && lead.etapa === 'vendido' ? `
        <div class="section-title">Documentos — Vendido</div>
        <div class="vendido-box">
          <div id="docs-list">${renderDocsList(docs)}</div>
          <div class="upload-row">
            <select id="doc-tipo">
              <option value="contrato">Contrato (PDF)</option>
              <option value="documento">Documento</option>
            </select>
            <input type="file" id="doc-file" accept=".pdf,.jpg,.jpeg,.png">
            <button class="btn-secondary btn-small" id="btn-upload-doc" type="button">Anexar</button>
          </div>
        </div>
      ` : ''}
    </div>
    <div class="modal-footer">
      ${!isNew ? '<button class="btn-danger" id="btn-delete-lead" type="button">Excluir</button>' : '<span></span>'}
      <div class="right">
        <button class="btn-secondary" id="btn-cancel-modal" type="button">Cancelar</button>
        <button class="btn-primary" id="btn-save-lead" type="button">Salvar</button>
      </div>
    </div>
  `;

  qs('#btn-close-modal').addEventListener('click', closeModal);
  qs('#btn-cancel-modal').addEventListener('click', closeModal);
  qs('#btn-save-lead').addEventListener('click', () => saveLead(isNew));
  qs('#f-etapa').addEventListener('change', (e) => {
    qs('#motivo-perda-wrap').hidden = !['reprovado', 'lead_perdido'].includes(e.target.value);
  });
  qs('#f-motivo-select').addEventListener('change', (e) => {
    qs('#f-motivo-outro').hidden = e.target.value !== 'Outro';
  });
  if (!isNew) {
    qs('#btn-delete-lead').addEventListener('click', () => deleteLead(lead.id));
    qsa('.mover-etapa-btn', modal).forEach(btn => {
      btn.addEventListener('click', () => moverParaEtapaDireta(lead.id, btn.dataset.etapa));
    });
    qs('#btn-add-followup').addEventListener('click', () => addFollowUp(lead.id));
    qsa('.fu-toggle').forEach(cb => cb.addEventListener('change', (e) => toggleFollowUp(e.target.dataset.id, e.target.checked)));
    if (lead.etapa === 'vendido') {
      qs('#btn-upload-doc').addEventListener('click', () => uploadDoc(lead.id));
      qsa('.doc-download').forEach(a => a.addEventListener('click', (e) => downloadDoc(e, a.dataset.path)));
      qsa('.doc-delete').forEach(btn => btn.addEventListener('click', () => deleteDoc(btn.dataset.id, btn.dataset.path, lead.id)));
    }
  }
}

function renderFollowUpsList(items) {
  if (!items.length) return '<p class="locked-hint">Nenhum follow-up agendado.</p>';
  return items.map(f => {
    const tipo = tipoTarefaLabel(f.tipo);
    const atribuido = profileName(f.atribuido_a);
    return `
    <div class="followup-item ${f.concluido ? 'done' : ''} ${!f.concluido && isOverdue(f.data_hora) ? 'overdue' : ''}">
      <input type="checkbox" class="fu-toggle" data-id="${f.id}" ${f.concluido ? 'checked' : ''}>
      <span class="fu-date">${formatDateTime(f.data_hora)}</span>
      <span class="fu-text">
        ${tipo ? `<span class="fu-tipo-tag">${tipo}</span>` : ''}
        ${escapeHtml(f.nota || 'Sem observação')}
        ${atribuido ? ` · ${escapeHtml(atribuido)}` : ''}
      </span>
    </div>
  `;
  }).join('');
}

function renderDocsList(docs) {
  if (!docs.length) return '<p class="locked-hint">Nenhum documento anexado ainda.</p>';
  return docs.map(d => `
    <div class="doc-item">
      <span class="doc-tag">${d.tipo === 'contrato' ? 'Contrato' : 'Documento'}</span>
      <span class="doc-name">${escapeHtml(d.nome_arquivo)}</span>
      <button class="btn-secondary btn-small doc-download" data-path="${escapeHtml(d.storage_path)}" type="button">Baixar</button>
      <button class="btn-danger btn-small doc-delete" data-id="${d.id}" data-path="${escapeHtml(d.storage_path)}" type="button">Excluir</button>
    </div>
  `).join('');
}

async function saveLead(isNew) {
  const etapa = qs('#f-etapa').value;
  const motivoSelect = qs('#f-motivo-select') ? qs('#f-motivo-select').value : '';
  const motivoOutro = qs('#f-motivo-outro') ? qs('#f-motivo-outro').value.trim() : '';
  const motivo_perda = ['reprovado', 'lead_perdido'].includes(etapa)
    ? (motivoSelect === 'Outro' ? motivoOutro : motivoSelect) || null
    : null;

  const payload = {
    nome: toTitleCase(qs('#f-nome').value.trim()),
    telefone: qs('#f-telefone').value.trim(),
    email: qs('#f-email').value.trim(),
    renda: qs('#f-renda').value ? Number(qs('#f-renda').value) : null,
    empreendimento: toTitleCase(qs('#f-empreendimento').value.trim()),
    cidade: qs('#f-cidade').value.trim(),
    origem: toTitleCase(qs('#f-origem').value.trim()),
    etapa,
    temperatura: qs('#f-temperatura').value,
    tag_dia: qs('#f-tag-dia').value || null,
    nao_deseja_contato: qs('#f-nao-deseja-contato').checked,
    motivo_perda,
    observacao: qs('#f-observacao').value.trim(),
  };

  if (!payload.nome) { showToast('Informe o nome do lead.', true); return; }

  if (isNew) {
    if (payload.telefone) {
      const { data: existe } = await sb.rpc('lead_phone_exists', { p_telefone: payload.telefone });
      if (existe && !confirm('Já existe um lead cadastrado com esse telefone. Deseja continuar mesmo assim?')) return;
    }
    const maxOrder = Math.max(0, ...leads.filter(l => l.etapa === payload.etapa).map(l => l.order_index + 1));
    payload.order_index = maxOrder;
    payload.responsavel_id = currentUser.id;

    // otimista: mostra o card e fecha o modal na hora, sem esperar a rede
    const tempId = 'temp-' + Date.now();
    leads.push({ id: tempId, created_at: new Date().toISOString(), ...payload });
    closeModal();
    renderBoard();
    renderReminders();
    renderCorretores();
    renderInicio();
    renderReconversao();
    populateDatalists();
    showToast('Lead criado!');

    const { data, error } = await sb.from('leads').insert(payload).select().single();
    const idx = leads.findIndex(l => l.id === tempId);
    if (error) {
      if (idx !== -1) leads.splice(idx, 1);
      showToast('Erro ao criar lead: ' + error.message, true);
    } else if (idx !== -1) {
      leads[idx] = data;
    }
  } else {
    const idToUpdate = editingLeadId;
    const idx = leads.findIndex(l => l.id === idToUpdate);
    const anterior = idx !== -1 ? { ...leads[idx] } : null;
    if (anterior && anterior.etapa !== payload.etapa) payload.etapa_atualizada_em = new Date().toISOString();

    // otimista: aplica a mudança e fecha o modal na hora, sem esperar a rede
    if (idx !== -1) leads[idx] = { ...leads[idx], ...payload };
    closeModal();
    renderBoard();
    renderReminders();
    renderCorretores();
    renderInicio();
    renderReconversao();
    populateDatalists();
    showToast('Lead atualizado!');

    const { data, error } = await sb.from('leads').update(payload).eq('id', idToUpdate).select().single();
    if (error) {
      if (idx !== -1 && anterior) leads[idx] = anterior;
      showToast('Erro ao salvar: ' + error.message, true);
    } else if (idx !== -1) {
      leads[idx] = data;
    }
  }

  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();
  populateDatalists();
}

async function deleteLead(leadId) {
  if (!confirm('Excluir este lead e todo o histórico dele? Essa ação não pode ser desfeita.')) return;
  const { error } = await sb.from('leads').delete().eq('id', leadId);
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return; }
  leads = leads.filter(l => l.id !== leadId);
  followUps = followUps.filter(f => f.lead_id !== leadId);
  closeModal();
  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();
  showToast('Lead excluído.');
}

// ============ FOLLOW-UPS ============
async function addFollowUp(leadId) {
  const dataInput = qs('#fu-data').value;
  const nota = qs('#fu-nota').value.trim();
  if (!dataInput) { showToast('Escolha uma data para o follow-up.', true); return; }

  const payload = {
    lead_id: leadId,
    data_hora: new Date(dataInput).toISOString(),
    nota,
    tipo: qs('#fu-tipo').value || null,
    atribuido_a: qs('#fu-atribuido').value || currentUser.id,
    created_by: currentUser.id,
  };
  const { data, error } = await sb.from('follow_ups').insert(payload).select().single();
  if (error) { showToast('Erro ao agendar follow-up: ' + error.message, true); return; }
  followUps.push(data);
  showToast('Follow-up agendado!');
  const lead = leads.find(l => l.id === leadId);
  await renderModal(lead);
  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();
}

async function toggleFollowUp(id, concluido) {
  const { data, error } = await sb.from('follow_ups').update({ concluido }).eq('id', id).select().single();
  if (error) { showToast('Erro ao atualizar follow-up: ' + error.message, true); return; }
  const idx = followUps.findIndex(f => f.id === id);
  followUps[idx] = data;
  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();
  const lead = leads.find(l => l.id === editingLeadId);
  if (lead) await renderModal(lead);
}

// ============ DOCUMENTOS ============
async function uploadDoc(leadId) {
  const fileInput = qs('#doc-file');
  const file = fileInput.files[0];
  const tipo = qs('#doc-tipo').value;
  if (!file) { showToast('Escolha um arquivo.', true); return; }

  const path = `${leadId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: uploadError } = await sb.storage.from('documentos-clientes').upload(path, file);
  if (uploadError) { showToast('Erro ao enviar arquivo: ' + uploadError.message, true); return; }

  const { error: dbError } = await sb.from('lead_documentos').insert({
    lead_id: leadId, tipo, nome_arquivo: file.name, storage_path: path, uploaded_by: currentUser.id,
  });
  if (dbError) { showToast('Erro ao registrar documento: ' + dbError.message, true); return; }

  showToast('Documento anexado!');
  const lead = leads.find(l => l.id === leadId);
  await renderModal(lead);
}

async function downloadDoc(e, path) {
  e.preventDefault();
  const { data, error } = await sb.storage.from('documentos-clientes').createSignedUrl(path, 3600);
  if (error) { showToast('Erro ao gerar link: ' + error.message, true); return; }
  window.open(data.signedUrl, '_blank');
}

async function deleteDoc(id, path, leadId) {
  if (!confirm('Excluir este documento?')) return;
  await sb.storage.from('documentos-clientes').remove([path]);
  const { error } = await sb.from('lead_documentos').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir documento: ' + error.message, true); return; }
  showToast('Documento excluído.');
  const lead = leads.find(l => l.id === leadId);
  await renderModal(lead);
}

// ============ EXPORT CSV ============
qs('#btn-export').addEventListener('click', () => {
  const header = ['Nome', 'Telefone', 'E-mail', 'Renda', 'Empreendimento', 'Cidade', 'Origem', 'Responsável', 'Etapa', 'Temperatura', 'Tag de sequência', 'Não deseja contato', 'Motivo da perda', 'Observação', 'Criado em'];
  const rows = leads.map(l => [
    l.nome, formatPhone(l.telefone), l.email || '', l.renda ?? '', l.empreendimento || '', l.cidade || '', l.origem || '',
    profileName(l.responsavel_id) || '', etapaInfo(l.etapa).label, temperaturaInfo(l.temperatura).label, tagDiaLabel(l.tag_dia) || '',
    l.nao_deseja_contato ? 'Sim' : 'Não', l.motivo_perda || '', l.observacao || '', formatDateTime(l.created_at),
  ]);

  // ; como separador (não vírgula) pra abrir certo no Excel em português
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-cni-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ============ RECONVERSÃO ============
async function moverReconversao(leadId, novoStatus) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  lead.reconversao_status = novoStatus;
  renderReconversao();
  const { error } = await sb.from('leads').update({ reconversao_status: novoStatus }).eq('id', leadId);
  if (error) showToast('Erro ao mover: ' + error.message, true);
}

async function reconverterLead(leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  if (!confirm(`Trazer ${lead.nome} de volta para o funil principal, na etapa Contato Inicial?`)) return;
  const etapa = 'contato_inicial';
  const etapaAtualizadaEm = new Date().toISOString();
  const maxOrder = Math.max(0, ...leads.filter(l => l.etapa === etapa).map(l => l.order_index + 1));
  lead.etapa = etapa;
  lead.order_index = maxOrder;
  lead.etapa_atualizada_em = etapaAtualizadaEm;
  lead.reconversao_status = null;
  lead.motivo_perda = null;
  renderBoard();
  renderReminders();
  renderCorretores();
  renderInicio();
  renderReconversao();
  const { error } = await sb.from('leads').update({
    etapa, order_index: maxOrder, etapa_atualizada_em: etapaAtualizadaEm, reconversao_status: null, motivo_perda: null,
  }).eq('id', leadId);
  if (error) showToast('Erro ao reconverter: ' + error.message, true);
  else showToast('Lead reconvertido! Voltou para Contato Inicial.');
}

function renderReconversao() {
  const boardEl = qs('#board-reconversao');
  if (!boardEl) return;
  const leadsPerdidos = leads.filter(l => ETAPAS_PERDA.includes(l.etapa));

  boardEl.innerHTML = '';
  ETAPAS_RECONVERSAO.forEach(etapa => {
    const leadsDaColuna = leadsPerdidos.filter(l => (l.reconversao_status || 'perdido') === etapa.key);
    const col = document.createElement('div');
    col.className = 'column';
    col.innerHTML = `
      <div class="column-header">
        <span>${etapa.label}</span>
        <span class="column-count">${leadsDaColuna.length}</span>
      </div>
      <div class="column-body"></div>
    `;
    const body = qs('.column-body', col);
    leadsDaColuna.forEach(lead => body.appendChild(renderReconversaoCard(lead, etapa.key)));
    boardEl.appendChild(col);
  });
}

function renderReconversaoCard(lead, statusAtual) {
  const idx = ETAPAS_RECONVERSAO.findIndex(e => e.key === statusAtual);
  const card = document.createElement('div');
  card.className = 'lead-card';
  card.innerHTML = `
    <div class="card-badges">
      <span class="opt-out-pill">${etapaInfo(lead.etapa).label}</span>
    </div>
    <h4>${escapeHtml(lead.nome)}</h4>
    <div class="lead-row" style="--row-icon-color:var(--ic-phone)">${ICONS.phone}<span>${escapeHtml(formatPhone(lead.telefone))}</span></div>
    ${lead.motivo_perda ? `<div class="lead-row" style="--row-icon-color:var(--danger)">${ICONS.clock}<span>${escapeHtml(lead.motivo_perda)}</span></div>` : ''}
    <div class="card-footer">
      <div class="card-nav">
        ${lead.telefone ? `<button class="card-nav-btn whatsapp-btn" style="color:var(--ic-whatsapp)" title="Abrir conversa no WhatsApp">${ICONS.message}</button>` : ''}
        <button class="card-nav-btn" data-dir="-1" title="Etapa anterior" ${idx <= 0 ? 'disabled' : ''}>${ICONS.chevronLeft}</button>
        <button class="card-nav-btn" data-dir="1" title="Próxima etapa" ${idx >= ETAPAS_RECONVERSAO.length - 1 ? 'disabled' : ''}>${ICONS.chevronRight}</button>
      </div>
    </div>
    ${statusAtual === 'reconvertido' ? `<button class="btn-primary btn-small btn-reconverter" type="button" style="margin-top:10px;width:100%">Voltar para o funil principal</button>` : ''}
  `;
  qsa('.card-nav-btn[data-dir]', card).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const novoIdx = idx + Number(btn.dataset.dir);
      if (novoIdx < 0 || novoIdx >= ETAPAS_RECONVERSAO.length) return;
      moverReconversao(lead.id, ETAPAS_RECONVERSAO[novoIdx].key);
    });
  });
  const waBtn = qs('.whatsapp-btn', card);
  if (waBtn) waBtn.addEventListener('click', (e) => { e.stopPropagation(); window.open(whatsappUrl(lead.telefone), '_blank'); });
  const reconverterBtn = qs('.btn-reconverter', card);
  if (reconverterBtn) reconverterBtn.addEventListener('click', (e) => { e.stopPropagation(); reconverterLead(lead.id); });
  card.addEventListener('click', () => openLeadModal(lead.id));
  return card;
}

// ============ CENTRAL DE MENSAGENS ============
const filaState = { ids: [], index: 0, mensagem: '' };

function initMensagensFiltros() {
  const etapaSel = qs('#msg-etapa');
  if (!etapaSel) return;
  const respSel = qs('#msg-responsavel');
  respSel.innerHTML = '<option value="">Todos</option>' +
    profiles.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('');
  respSel.value = (currentUser && currentUser.id) || '';
  etapaSel.innerHTML = '<option value="">Todas</option>' + ETAPAS.map(e => `<option value="${e.key}">${e.label}</option>`).join('');
  qs('#msg-tag').innerHTML = '<option value="">Todas</option>' + TAGS_DIA.map(t => `<option value="${t.key}">${t.label}</option>`).join('') + '<option value="sem_tag">Sem tag</option>';
  qs('#msg-temperatura').innerHTML = '<option value="">Todas</option>' + TEMPERATURAS.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
  qs('#msg-cidade').innerHTML = '<option value="">Todas</option>' + CIDADES.map(c => `<option value="${c}">${c}</option>`).join('');

  qsa('#mensagens-montagem select').forEach(sel => sel.addEventListener('change', renderMensagensPreview));
  qs('#msg-confirmo').addEventListener('change', updateMontarFilaBtn);
  qs('#btn-montar-fila').addEventListener('click', montarFila);
  qs('#btn-encerrar-fila').addEventListener('click', encerrarFila);
  qs('#btn-pular-fila').addEventListener('click', () => avancarFila(false));
  qs('#btn-abrir-whatsapp').addEventListener('click', () => avancarFila(true));

  renderMensagensPreview();
}

function candidatosMensagem() {
  const responsavelId = qs('#msg-responsavel').value;
  const etapa = qs('#msg-etapa').value;
  const tag = qs('#msg-tag').value;
  const cidade = qs('#msg-cidade').value;
  const temperatura = qs('#msg-temperatura').value;
  const hoje = new Date().toDateString();

  return leads.filter(l => {
    if (responsavelId && l.responsavel_id !== responsavelId) return false;
    if (etapa && l.etapa !== etapa) return false;
    if (tag === 'sem_tag' && l.tag_dia) return false;
    if (tag && tag !== 'sem_tag' && l.tag_dia !== tag) return false;
    if (cidade && l.cidade !== cidade) return false;
    if (temperatura && l.temperatura !== temperatura) return false;
    if (l.nao_deseja_contato) return false;
    if (!l.telefone) return false;
    if (l.tag_dia === 'dia_4') return false;
    if (l.ultimo_contato_em && new Date(l.ultimo_contato_em).toDateString() === hoje) return false;
    return true;
  });
}

function renderMensagensPreview() {
  const previewEl = qs('#msg-preview');
  if (!previewEl) return;

  const responsavelId = qs('#msg-responsavel').value;
  const etapa = qs('#msg-etapa').value, tag = qs('#msg-tag').value, cidade = qs('#msg-cidade').value, temperatura = qs('#msg-temperatura').value;
  const baseSet = leads.filter(l =>
    (!responsavelId || l.responsavel_id === responsavelId)
    && (!etapa || l.etapa === etapa) && (!cidade || l.cidade === cidade) && (!temperatura || l.temperatura === temperatura)
    && (!tag || (tag === 'sem_tag' ? !l.tag_dia : l.tag_dia === tag))
  );
  const candidatos = candidatosMensagem();
  const semWhatsapp = baseSet.filter(l => !l.telefone).length;
  const naoDeseja = baseSet.filter(l => l.nao_deseja_contato).length;
  const hoje = new Date().toDateString();
  const jaContatadoHoje = baseSet.filter(l => l.ultimo_contato_em && new Date(l.ultimo_contato_em).toDateString() === hoje).length;
  const concluiuDia4 = baseSet.filter(l => l.tag_dia === 'dia_4').length;

  previewEl.innerHTML = `
    <div class="msg-preview-count">${candidatos.length}</div>
    <p class="msg-preview-label">cliente${candidatos.length === 1 ? '' : 's'} disponíveis para a fila</p>
    <ul class="msg-preview-list">
      <li>${baseSet.length - semWhatsapp} com WhatsApp válido</li>
      <li>${jaContatadoHoje} já contatado${jaContatadoHoje === 1 ? '' : 's'} hoje não entram novamente</li>
      <li>${concluiuDia4} já concluíram o DIA 4 e não voltam à fila</li>
      <li>${naoDeseja} marcado${naoDeseja === 1 ? '' : 's'} como "não deseja contato"</li>
    </ul>
  `;
  updateMontarFilaBtn();
}

function updateMontarFilaBtn() {
  const btn = qs('#btn-montar-fila');
  if (!btn) return;
  const candidatos = candidatosMensagem();
  const qtd = Math.min(candidatos.length, Number(qs('#msg-qtd').value));
  btn.disabled = !qs('#msg-confirmo').checked || candidatos.length === 0;
  btn.textContent = candidatos.length ? `Montar fila (${qtd} cliente${qtd === 1 ? '' : 's'})` : 'Montar fila';
}

function montarFila() {
  const candidatos = candidatosMensagem();
  const qtd = Number(qs('#msg-qtd').value);
  filaState.ids = candidatos.slice(0, qtd).map(l => l.id);
  filaState.index = 0;
  filaState.mensagem = qs('#msg-texto').value;
  if (!filaState.ids.length) { showToast('Nenhum cliente disponível com esses filtros.', true); return; }
  qs('#mensagens-montagem').hidden = true;
  qs('#mensagens-fila').hidden = false;
  renderFilaAtual();
}

function encerrarFila() {
  filaState.ids = [];
  filaState.index = 0;
  qs('#mensagens-fila').hidden = true;
  qs('#mensagens-montagem').hidden = false;
  renderMensagensPreview();
}

function renderFilaAtual() {
  if (filaState.index >= filaState.ids.length) {
    showToast('Fila concluída!');
    encerrarFila();
    return;
  }
  const lead = leads.find(l => l.id === filaState.ids[filaState.index]);
  if (!lead) { avancarFila(false); return; }
  qs('#fila-progresso').textContent = `Cliente ${filaState.index + 1} de ${filaState.ids.length}`;
  const texto = filaState.mensagem.replace(/\{nome\}/g, lead.nome.split(' ')[0]);
  qs('#fila-cliente-info').innerHTML = `
    <h4 style="margin:0 0 8px">${escapeHtml(lead.nome)}</h4>
    <div class="lead-row" style="--row-icon-color:var(--ic-phone)">${ICONS.phone}<span>${escapeHtml(formatPhone(lead.telefone))}</span></div>
    ${lead.tag_dia ? `<span class="tag-dia-pill" style="margin-top:8px;display:inline-block">${tagDiaLabel(lead.tag_dia)}</span>` : ''}
    <div class="field" style="margin-top:12px">
      <label>Mensagem que será enviada</label>
      <textarea id="fila-msg-preview">${escapeHtml(texto)}</textarea>
    </div>
  `;
}

async function avancarFila(marcarContatado) {
  const lead = leads.find(l => l.id === filaState.ids[filaState.index]);
  if (marcarContatado && lead) {
    const textoEl = qs('#fila-msg-preview');
    const texto = textoEl ? textoEl.value : filaState.mensagem.replace(/\{nome\}/g, lead.nome.split(' ')[0]);
    window.open(whatsappUrl(lead.telefone) + '?text=' + encodeURIComponent(texto), '_blank');

    const proximaTag = { dia_1: 'dia_2', dia_2: 'dia_3', dia_3: 'dia_4' }[lead.tag_dia] || 'dia_1';
    const agora = new Date().toISOString();
    lead.ultimo_contato_em = agora;
    lead.tag_dia = proximaTag;
    renderBoard();
    const { error } = await sb.from('leads').update({ ultimo_contato_em: agora, tag_dia: proximaTag }).eq('id', lead.id);
    if (error) showToast('Erro ao marcar contato: ' + error.message, true);
  }
  filaState.index += 1;
  renderFilaAtual();
}

// ============ INIT ============
initTheme();
initAuth();
