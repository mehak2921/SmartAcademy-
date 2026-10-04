-- Enable pgvector extension
create extension if not exists vector;

-- Create Users Profile table (extends Supabase Auth)
create table if not exists public.users_profile (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    full_name text,
    avatar_url text,
    preferences jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on users_profile
alter table public.users_profile enable row level security;
create policy "Users can view own profile" on public.users_profile for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users_profile for update using (auth.uid() = id);

-- Create Documents table
create table if not exists public.documents (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    title text not null,
    file_path text not null,
    file_type text not null,
    processing_status text default 'pending' check (processing_status in ('pending', 'processing', 'completed', 'failed')),
    upload_date timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documents enable row level security;
create policy "Users can CRUD own documents" on public.documents for all using (auth.uid() = user_id);

-- Create Document Chunks table (pgvector)
create table if not exists public.document_chunks (
    id uuid default gen_random_uuid() primary key,
    document_id uuid references public.documents on delete cascade not null,
    content text not null,
    embedding vector(768), -- BAAI bge-base-en-v1.5 produces 768-dimensional embeddings
    metadata jsonb default '{}'::jsonb, -- page, chapter, heading, section
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HNSW index for fast vector search
create index if not exists document_chunks_embedding_idx on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Create Chat Sessions table
create table if not exists public.chat_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    title text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_sessions enable row level security;
create policy "Users can CRUD own sessions" on public.chat_sessions for all using (auth.uid() = user_id);

-- Create Chat Messages table
create table if not exists public.chat_messages (
    id uuid default gen_random_uuid() primary key,
    session_id uuid references public.chat_sessions on delete cascade not null,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    metadata jsonb default '{}'::jsonb, -- citations, token counts
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;
create policy "Users can view own messages via session" on public.chat_messages 
for select using (
    exists (
        select 1 from public.chat_sessions 
        where chat_sessions.id = chat_messages.session_id 
        and chat_sessions.user_id = auth.uid()
    )
);

-- Quizzes table
create table if not exists public.quizzes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    title text not null,
    content jsonb not null, -- Contains questions, options, correct answers
    score integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quizzes enable row level security;
create policy "Users can CRUD own quizzes" on public.quizzes for all using (auth.uid() = user_id);

-- Study Plans table
create table if not exists public.study_plans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    title text not null,
    content jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.study_plans enable row level security;
create policy "Users can CRUD own plans" on public.study_plans for all using (auth.uid() = user_id);


-- Hybrid Search Function
create or replace function match_document_chunks (
  query_embedding vector(768),
  query_text text,
  match_count int default 10,
  full_text_weight float default 1,
  semantic_weight float default 1,
  match_threshold float default 0.0
) returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as 
begin
  return query
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.metadata,
    (1 - (document_chunks.embedding <#> query_embedding)) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <#> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
;
