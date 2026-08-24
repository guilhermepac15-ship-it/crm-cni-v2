// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// Essas duas chaves são públicas por design do Supabase — protegidas pelas
// regras de RLS no banco, não por estarem escondidas aqui.
window.SUPABASE_CONFIG = {
  url: 'https://kcnhqhpksmushxnifxks.supabase.co',
  anonKey: 'sb_publishable_uvz-zkF7HYnruCmCIVm-dA_j4ZF3BRw',
};

// Painel de Conversas — fala com o workflow "Painel de Conversas API" no n8n
// do bot, nunca com a API mestra do n8n diretamente (por isso o segredo próprio).
window.PAINEL_CONFIG = {
  baseUrl: 'https://bot.cniimoveis.imb.br/webhook',
  secret: '49c1c8284def255c6c041c775bfa6271ab3a67aabdf0c717',
};
