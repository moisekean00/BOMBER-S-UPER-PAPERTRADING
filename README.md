# Long Ball

La lega di paper trading tra amici: portafogli da 100.000 € virtuali, mercato nel weekend ai prezzi di chiusura del venerdì, classifica ogni venerdì.

Stack: Next.js 14 (Vercel) · Supabase (login e database) · Yahoo Finance (prezzi, via `yahoo-finance2` lato server).

## Messa online
1. Supabase: esegui `supabase/schema.sql` nello SQL Editor e spegni "Confirm email" in Authentication.
2. Vercel: importa questo repo e imposta le variabili d'ambiente di `.env.example`.
3. Il cron di Vercel chiama `/api/cron` il sabato e il lunedì a mezzanotte; in più ogni pagina esegue i lavori arretrati.

## Dove sono le regole
- `lib/rules.ts`: regole del torneo come funzioni pure (test: `npm test`).
- `lib/calendar.ts`: finestre di mercato e scadenze.
- `lib/engine.ts`: chiusura delle finestre e valutazione del venerdì.
