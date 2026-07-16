-- Cache delle traduzioni UI a runtime (namespace `client`, una riga per lingua).
-- Popolata e letta SOLO dall'endpoint server /api/i18n/client tramite service role.
-- RLS attiva senza policy pubbliche: anon/authenticated non hanno accesso.

create table if not exists public.ui_translations (
  lang       text        not null,
  namespace  text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (lang, namespace)
);

alter table public.ui_translations enable row level security;
