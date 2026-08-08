// Script para criar os 3 logins do CRM CNI.
// Rode UMA VEZ, localmente, depois de rodar o schema.sql no Supabase.
//
// Como usar:
//   1. cd para a pasta "CRM CNI v2/supabase"
//   2. npm install @supabase/supabase-js
//   3. Preencha SUPABASE_URL e SERVICE_ROLE_KEY abaixo (pegue em
//      Supabase > Project Settings > API > "service_role" — NUNCA coloque
//      essa chave no site/config.js, ela dá acesso total ao banco).
//   4. Ajuste a lista USERS abaixo com nome/e-mail/senha de cada pessoa.
//   5. node seed-users.js
//   6. Depois de rodar, pode apagar suas senhas deste arquivo se quiser.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'COLE_AQUI_A_PROJECT_URL';
const SERVICE_ROLE_KEY = 'COLE_AQUI_A_SERVICE_ROLE_KEY';

const USERS = [
  { nome: 'Guilherme', email: 'guilherme@example.com', senha: 'TrocarSenha123!', papel: 'proprietario' },
  { nome: 'Mãe', email: 'mae@example.com', senha: 'TrocarSenha123!', papel: 'socia' },
  { nome: 'Corretor', email: 'corretor@example.com', senha: 'TrocarSenha123!', papel: 'corretor' },
];

async function main() {
  if (SUPABASE_URL.startsWith('COLE_AQUI') || SERVICE_ROLE_KEY.startsWith('COLE_AQUI')) {
    console.error('Preencha SUPABASE_URL e SERVICE_ROLE_KEY antes de rodar.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.senha,
      email_confirm: true,
    });

    if (error) {
      console.error(`Erro ao criar ${u.email}:`, error.message);
      continue;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, nome: u.nome, papel: u.papel });

    if (profileError) {
      console.error(`Erro ao criar perfil de ${u.email}:`, profileError.message);
    } else {
      console.log(`Criado: ${u.nome} <${u.email}> (${u.papel})`);
    }
  }
}

main();
