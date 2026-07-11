# Recap modifiche — audit sicurezza m2m

## Vulnerabilità critiche risolte

1. **`src/app/api/confirm-renewal/route.ts`** — riscritta: prima zero auth, controllo "già usato" bacato, race condition su codice invito, valori dal client. Ora: `requireStaff()` + ruolo admin, claim atomico, valori server-side. Aggiornato anche `rinnova-abbonamento/page.tsx`.

2. **Funzione DB `renew_restaurant_subscription`** — EXECUTE revocato. Stessa vulnerabilità di sopra ma bypassava Next.js del tutto via `/rest/v1/rpc/`.

3. **Funzione DB `create_profile`** — la più grave: chiunque (anche anonimo) poteva auto-promuoversi admin di qualsiasi ristorante (p_id mai verificato contro auth.uid()). Controllato `profiles`: nessuna prova di sfruttamento reale.

4. **Bug nella mia prima fix**: la revoca iniziale non toccava il grant di default a `PUBLIC` in Postgres. Corretto su 6 funzioni totali (create_profile, use_staff_invite_code, renew_restaurant_subscription, cleanup_empty_pending_orders, handle_new_user, staff_shift_codes_deactivate_siblings, suspend_expired_restaurants).

5. **`chat_logs`** — policy RLS falsa ("anon select own" con qual=true) esponeva tutte le chat di tutti i visitatori. Rimossa.

6. **`menu/extract` route** — mancava auth, chiunque poteva abusare quota Gemini/Groq. Aggiunto `requireStaff()`.

## Hardening

- `search_path` fissato su 13 funzioni DB (5 SECURITY DEFINER) contro schema-hijacking.
- Rimossa policy storage che permetteva listing completo del bucket pubblico `restaurant-logos`.

## Trovata ma NON corretta

- **`orders.total_cents`** modificabile via PATCH REST diretto da anonimo, bypassando trigger di protezione e route confirm/coupon (che si fidano del valore invece di ricalcolarlo da order_items/menu_items). Price-tampering ancora sfruttabile.

## Da decidere (non cancellate)

- Route morte ma vulnerabili: `add-upsell-item`, `ai-analytics`, `menu/route.ts` (top-level)
- "Leaked Password Protection" disattivata su Supabase Auth — da abilitare manualmente dal pannello
