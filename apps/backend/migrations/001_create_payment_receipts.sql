create table if not exists payment_receipts (
  tx_digest text primary key,
  dataset_id text not null,
  buyer_address text not null,
  seller_address text not null,
  price_sui numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists payment_receipts_dataset_id_idx
  on payment_receipts (dataset_id);
