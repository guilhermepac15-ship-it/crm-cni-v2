# Como colocar o CRM CNI no ar

Siga esta ordem. Cada passo é rápido.

## 1. Criar o projeto no Supabase (banco de dados + login + arquivos)

1. Acesse https://supabase.com e crie uma conta grátis (pode ser com o Google).
2. Clique em "New Project". Dê um nome (ex: `crm-cni`), crie uma senha de banco (guarde ela, mas não vai precisar usar no dia a dia) e escolha a região mais próxima (South America - São Paulo, se disponível).
3. Aguarde uns 2 minutos até o projeto ficar pronto.

## 2. Rodar o schema (criar as tabelas)

1. No painel do Supabase, vá em **SQL Editor** (menu lateral) → **New query**.
2. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) desta pasta, copie tudo e cole no editor.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".

## 3. Pegar as chaves do projeto

1. Vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie a **Project URL** e a chave **anon public**.
3. Abra o arquivo [`config.js`](config.js) desta pasta e substitua:
   ```js
   window.SUPABASE_CONFIG = {
     url: 'COLE_AQUI_A_PROJECT_URL',
     anonKey: 'COLE_AQUI_A_ANON_PUBLIC_KEY',
   };
   ```
4. Ainda na página de API, copie também a chave **service_role** (fique atento: essa é secreta) — vai usar só no próximo passo, uma única vez.

## 4. Criar os 3 logins (você, sua mãe, o corretor)

Precisa ter o [Node.js](https://nodejs.org) instalado no seu computador (baixe a versão LTS se não tiver).

1. Abra o Prompt de Comando / PowerShell nesta pasta `CRM CNI v2/supabase`.
2. Rode:
   ```
   npm install
   ```
3. Abra [`supabase/seed-users.js`](supabase/seed-users.js) e preencha:
   - `SUPABASE_URL` (a Project URL do passo 3)
   - `SERVICE_ROLE_KEY` (a chave service_role do passo 3)
   - Na lista `USERS`, troque nome/e-mail/senha de cada um dos 3 (proprietário, mãe, corretor). Essas senhas serão as senhas de login do CRM — escolha senhas que vocês vão lembrar, ou avise que vão trocar depois.
4. Rode:
   ```
   node seed-users.js
   ```
5. Deve aparecer "Criado: ..." três vezes. Se der erro em algum e-mail, corrija e rode de novo só pra aquele (comente os outros com `//` na frente da linha).

## 5. Testar localmente

1. Dê duplo-clique no arquivo `index.html` desta pasta — abre no navegador.
2. Entre com um dos e-mails/senhas criados no passo 4.
3. Crie um lead de teste, arraste entre colunas, agende um follow-up, mova para "Vendido" e anexe um PDF de teste.

Se algo não funcionar, me avise o que aconteceu (mensagem de erro, se houver) que eu ajusto.

## 6. Publicar online (pra vocês 3 acessarem de qualquer lugar)

1. Acesse https://vercel.com e crie uma conta grátis (dá pra usar login do Google/GitHub).
2. Clique em **Add New → Project**.
3. Escolha a opção de enviar a pasta diretamente (arraste a pasta `CRM CNI v2` inteira) — ou, se preferir, suba antes num repositório do GitHub e conecte por lá.
4. Não precisa configurar nada especial (é um site estático). Clique em **Deploy**.
5. Em 1-2 minutos você recebe uma URL tipo `crm-cni.vercel.app` — essa é a URL que você, sua mãe e o corretor vão usar para acessar o CRM de qualquer lugar.
6. Me manda essa URL de volta se quiser que eu confira algo depois de publicado.

---

**Importante:** nunca compartilhe a chave `service_role` com ninguém nem cole ela no `config.js` — só a `anon public` vai no site.
