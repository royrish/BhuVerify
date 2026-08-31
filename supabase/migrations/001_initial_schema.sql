create type user_role as enum ('operator', 'verifier', 'administrator');

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text not null unique,
    role user_role not null default 'operator',
    created_at timestamptz not null default now()
);

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    file_type text,
    storage_path text not null,
    upload_timestamp timestamptz not null default now(),
    processing_status text not null default 'uploaded',
    document_type text,
    language text,
    source text,
    created_at timestamptz not null default now()
);

create table if not exists public.land_records (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references public.documents(id) on delete set null,
    owner_name text,
    survey_number text,
    khata_number text,
    area numeric,
    area_unit text,
    village text,
    tehsil text,
    district text,
    land_classification text,
    ownership_details text,
    mutation_information text,
    registration_information text,
    overall_confidence numeric,
    validation_status text,
    verification_status text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.extracted_fields (
    id uuid primary key default gen_random_uuid(),
    land_record_id uuid references public.land_records(id) on delete cascade,
    field_name text not null,
    extracted_value text,
    confidence numeric,
    source_bbox jsonb,
    verification_status text default 'pending',
    created_at timestamptz not null default now()
);

create table if not exists public.validation_results (
    id uuid primary key default gen_random_uuid(),
    land_record_id uuid references public.land_records(id) on delete cascade,
    validation_type text not null,
    field_name text,
    severity text,
    expected_value text,
    actual_value text,
    message text,
    status text default 'open',
    created_at timestamptz not null default now()
);

create table if not exists public.verification_actions (
    id uuid primary key default gen_random_uuid(),
    land_record_id uuid references public.land_records(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    field_name text,
    old_value text,
    new_value text,
    comment text,
    timestamp timestamptz not null default now()
);

create index if not exists idx_land_records_document_id on public.land_records(document_id);
create index if not exists idx_extracted_fields_land_record_id on public.extracted_fields(land_record_id);
create index if not exists idx_validation_results_land_record_id on public.validation_results(land_record_id);
create index if not exists idx_verification_actions_land_record_id on public.verification_actions(land_record_id);
