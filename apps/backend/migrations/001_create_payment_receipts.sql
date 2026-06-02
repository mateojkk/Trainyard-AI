create table if not exists public.payment_receipts (
  tx_digest text primary key,
  dataset_id text not null,
  buyer_address text not null,
  buyer_sub text,
  seller_address text not null,
  price_sui numeric not null,
  created_at timestamptz not null default now()
);

alter table public.payment_receipts
  add column if not exists buyer_sub text;

alter table public.payment_receipts
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_payment_receipts_buyer_sub
  on public.payment_receipts (buyer_sub);

create index if not exists idx_payment_receipts_buyer_address
  on public.payment_receipts (buyer_address);

create index if not exists idx_payment_receipts_dataset_id
  on public.payment_receipts (dataset_id);

create index if not exists idx_payment_receipts_buyer_sub_dataset_id
  on public.payment_receipts (buyer_sub, dataset_id);
