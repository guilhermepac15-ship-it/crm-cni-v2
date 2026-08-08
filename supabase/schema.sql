-- CRM CNI v2 — schema, RLS, storage bucket e permissões por papel
-- Rode este script inteiro no SQL Editor do seu projeto Supabase (um clique em "Run").

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('proprietario','socia','corretor')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: usuários autenticados podem ver todos os perfis"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: usuário só edita o próprio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ============ LEADS ============
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  renda numeric,
  observacao text,
  empreendimento text,
  cidade text,
  origem text,
  etapa text not null default 'contato_inicial' check (etapa in (
    'contato_inicial','oportunidade','visita','manutencao',
    'em_analise','aprovado','reprovado','lead_perdido','vendido'
  )),
  temperatura text check (temperatura in ('frio','morno','quente')) default 'morno',
  motivo_perda text,
  responsavel_id uuid references public.profiles(id),
  order_index integer not null default 0,
  etapa_atualizada_em timestamptz not null default now(),
  email text,
  nao_deseja_contato boolean not null default false,
  tag_dia text check (tag_dia in ('dia_1','dia_2','dia_3','dia_4') or tag_dia is null),
  ultimo_contato_em timestamptz,
  reconversao_status text check (reconversao_status in ('perdido','tentando_reconquistar','recontato_agendado','reconvertido') or reconversao_status is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Proprietário/sócia veem tudo (leads deles + de todos os corretores).
-- Corretor só vê e mexe nos próprios leads (responsavel_id = ele mesmo).
create policy "leads: select proprio ou gestor"
  on public.leads for select
  to authenticated
  using (
    responsavel_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel in ('proprietario','socia'))
  );

create policy "leads: insert autenticados"
  on public.leads for insert
  to authenticated
  with check (true);

create policy "leads: update proprio ou gestor"
  on public.leads for update
  to authenticated
  using (
    responsavel_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel in ('proprietario','socia'))
  );

create policy "leads: delete proprio ou gestor"
  on public.leads for delete
  to authenticated
  using (
    responsavel_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel in ('proprietario','socia'))
  );

create index if not exists leads_etapa_idx on public.leads(etapa);
create index if not exists leads_responsavel_idx on public.leads(responsavel_id);

-- mantém updated_at em dia
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Verifica se já existe um lead com esse telefone, sem expor de quem é
-- (usado para o alerta de duplicidade, funciona mesmo com RLS restringindo o corretor).
create or replace function public.lead_phone_exists(p_telefone text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.leads
    where telefone is not null and telefone <> ''
    and regexp_replace(telefone, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g')
  );
$$;

grant execute on function public.lead_phone_exists(text) to authenticated;

-- ============ FOLLOW-UPS ============
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  data_hora timestamptz not null,
  nota text,
  concluido boolean not null default false,
  created_by uuid references public.profiles(id),
  tipo text check (tipo in ('whatsapp','ligacao','reuniao','visita','followup','documentos') or tipo is null),
  atribuido_a uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.follow_ups enable row level security;

create policy "follow_ups: conforme visibilidade do lead"
  on public.follow_ups for all
  to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = follow_ups.lead_id
      and (l.responsavel_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel in ('proprietario','socia')))
    )
  )
  with check (
    exists (
      select 1 from public.leads l
      where l.id = follow_ups.lead_id
      and (l.responsavel_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel in ('proprietario','socia')))
    )
  );

create index if not exists follow_ups_lead_idx on public.follow_ups(lead_id);
create index if not exists follow_ups_data_idx on public.follow_ups(data_hora);

-- ============ LEAD DOCUMENTOS ============
create table if not exists public.lead_documentos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  tipo text not null check (tipo in ('contrato','documento')),
  nome_arquivo text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table public.lead_documentos enable row level security;

create policy "lead_documentos: conforme visibilidade do lead"
  on public.lead_documentos for all
  to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_documentos.lead_id
      and (l.responsavel_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel in ('proprietario','socia')))
    )
  )
  with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_documentos.lead_id
      and (l.responsavel_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel in ('proprietario','socia')))
    )
  );

create index if not exists lead_documentos_lead_idx on public.lead_documentos(lead_id);

-- ============ STORAGE BUCKET ============
insert into storage.buckets (id, name, public)
values ('documentos-clientes', 'documentos-clientes', false)
on conflict (id) do nothing;

create policy "documentos-clientes: autenticados podem ler"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documentos-clientes');

create policy "documentos-clientes: autenticados podem enviar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documentos-clientes');

create policy "documentos-clientes: autenticados podem apagar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documentos-clientes');
