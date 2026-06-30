create unique index if not exists refund_requests_idempotency_key_uidx
on public.refund_requests(idempotency_key)
where idempotency_key is not null;
