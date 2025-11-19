create table if not exists users (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  roles text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);

create table if not exists refresh_tokens (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_token on refresh_tokens(token);

