import Link from "next/link";
import { Logo } from "@/components/Logo";
import { WINDOWS } from "@/lib/calendar";

const day = (iso: string) => new Date(iso).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default function Rules() {
  return (
    <>
      <header className="topbar">
        <Link href="/dashboard"><Logo size={32} light /></Link>
        <div className="spacer" />
        <Link className="btn white small" href="/dashboard">Torna alla lega</Link>
      </header>
      <main className="prose" style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1>Regolamento</h1>

        <h2>1. Il torneo in breve</h2>
        <p>Vince chi, ai prezzi di chiusura del 31 dicembre 2026, ha il portafoglio virtuale di valore più alto.</p>
        <ul>
          <li>Fino a 10 partecipanti, quota reale di 50 € a testa.</li>
          <li>Ognuno parte con 100.000 € virtuali.</li>
          <li>Stagione dal 1 novembre 2026 al 1 gennaio 2027.</li>
          <li>I cambi si fanno solo nel weekend, ai prezzi di chiusura del venerdì: come mettere la formazione al fantacalcio.</li>
          <li>Ammessi azioni, ETF, prodotti a leva, futures e opzioni di tutti i mercati. Niente crypto.</li>
          <li>Leva massima 5x. Chi azzera il portafoglio è eliminato.</li>
          <li>Commissario del torneo: Pier. Decide sui casi non previsti da questo regolamento.</li>
        </ul>

        <h2>2. Iscrizione e montepremi</h2>
        <p>La quota è di 50 € a testa, da versare su Revolut a Pier prima della prima formazione. Chi non ha versato la quota non può schierare la prima formazione. Con 10 partecipanti il montepremi è di 500 €; la divisione si decide quando è noto il numero finale di iscritti, comunque prima dell&apos;inizio. Pier paga i premi entro una settimana dalla fine.</p>

        <h2>3. Calendario e finestre di mercato</h2>
        <p>Ogni weekend c&apos;è una finestra di mercato: si apre il sabato alle 00:00 e si chiude domenica alle 23:59, ora italiana. I cambi si eseguono ai prezzi di chiusura del venerdì precedente. La scadenza è prima della riapertura dei futures USA, così nessuno compra ai prezzi del venerdì sapendo già come si muovono i mercati.</p>
        <ul>
          <li>La prima finestra è libera: si compone il portafoglio da zero, senza il limite del 50%.</li>
          <li>Chi non fa cambi tiene il portafoglio della settimana prima.</li>
          <li>I cambi si modificano liberamente fino alla chiusura: vale l&apos;ultima versione salvata.</li>
        </ul>
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Finestra</th><th>Si apre</th><th>Si chiude</th><th>Prezzi</th></tr></thead>
            <tbody>
              {WINDOWS.map((w) => (
                <tr key={w.id}>
                  <td>{w.label}</td>
                  <td>{day(w.opensAt)}</td>
                  <td>{day(w.closesAt)}, {time(w.closesAt)}</td>
                  <td>chiusura {new Date(`${w.priceDate}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}</td>
                </tr>
              ))}
              <tr><td>Valutazione finale</td><td>—</td><td>—</td><td>ultima chiusura al 31 dic</td></tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 16 }}>Il mercato di prova serve solo per fare pratica: a mezzanotte di venerdì 30 ottobre tutti ripartono da 100.000 € in cash.</p>

        <h2>4. Prodotti ammessi e composizione</h2>
        <p>Si possono usare tutti i mercati del mondo. Ogni portafoglio deve avere almeno il <b>5% in azioni</b>, il <b>5% in ETF azionari</b> e il <b>5% in ETF obbligazionari</b>. Il controllo si fa su ogni formazione inviata, ai prezzi del venerdì: se un tipo scende sotto il 5% per l&apos;andamento dei prezzi non c&apos;è penalità, ma alla prima finestra in cui fai cambi va riportato al 5%.</p>
        <ul>
          <li><b>Azioni:</b> tutti i mercati, quote frazionarie ammesse.</li>
          <li><b>ETF ed ETC</b> (azionari, settoriali, materie prime): sì.</li>
          <li><b>Obbligazioni:</b> solo tramite ETF obbligazionari.</li>
          <li><b>Prodotti a leva e inversi:</b> sì, leva massima 5x.</li>
          <li><b>Acquisto a leva:</b> azioni ed ETF si possono comprare con leva da 1x a 5x. Metti il capitale, il resto è un prestito con interesse del 5% annuo, addebitato sul cash ogni venerdì: la posizione vale esposizione meno prestito, quindi guadagni e perdite si moltiplicano. Se cambi quantità o leva, il prestito si ricalcola su tutta la posizione.</li>
          <li><b>Futures:</b> tutti, long o short, frazioni di contratto, margine 20%.</li>
          <li><b>Opzioni:</b> solo acquisto, nessun limite di peso. Si perde al massimo il premio.</li>
          <li><b>No:</b> vendita di opzioni, vendita allo scoperto di azioni (per il ribasso usa futures short, ETP inversi o put), crypto.</li>
        </ul>
        <p>Cash ammesso, senza interessi. Nessun limite di peso per singolo titolo.</p>

        <h2>5. Regola del 50% sulle vendite</h2>
        <p>In ogni finestra puoi vendere al massimo il 50% della parte investita del portafoglio (valore totale meno cash), ai prezzi del venerdì. Il cash si investe sempre liberamente e quello che incassi vendendo lo reinvesti nella stessa finestra. Per i futures conta il margine; le opzioni contano al valore di mercato. Non contano nel 50%: la prima finestra, le vendite per coprire il cash negativo e il rollover dei futures.</p>
        <p className="muted">Esempio: portafoglio da 150.000, di cui 50.000 cash. Puoi investire i 50.000 di cash e vendere fino a 50.000 di posizioni.</p>

        <h2>6. Futures</h2>
        <ol>
          <li><b>Apertura.</b> Scegli l&apos;esposizione in euro, ad esempio 40.000: il 20% (8.000) passa dal cash al margine.</li>
          <li><b>Valore in portafoglio.</b> Il future vale quanto il suo margine. Guadagni e perdite finiscono nel cash ogni venerdì.</li>
          <li><b>Regolamento del venerdì.</b> Differenza tra il prezzo del venerdì e quello della settimana prima, moltiplicata per l&apos;esposizione.</li>
          <li><b>Cash negativo.</b> Nella finestra successiva devi riportarlo a zero vendendo (fuori dal 50%). Altrimenti alla chiusura la piattaforma vende in proporzione da tutte le posizioni.</li>
          <li><b>Chiusura.</b> In qualsiasi finestra: il margine torna nel cash e conta nel 50%.</li>
          <li><b>Rollover.</b> Automatico sul contratto successivo, stessa esposizione in euro.</li>
          <li><b>Valuta.</b> Conversione al cambio di chiusura del venerdì.</li>
        </ol>

        <h2>7. Valutazione</h2>
        <ul>
          <li><b>Prezzi:</b> chiusura ufficiale della borsa principale; settlement per i futures; chiusura o media domanda/offerta per le opzioni. Fonte: Yahoo Finance.</li>
          <li><b>Festivi:</b> se una borsa è chiusa il venerdì vale l&apos;ultima chiusura disponibile.</li>
          <li><b>Dividendi e cedole:</b> accreditati in cash la settimana dello stacco. Gli ETF ad accumulazione non distribuiscono.</li>
          <li><b>Cambi:</b> chiusura del venerdì. Il rischio di cambio è tuo.</li>
          <li><b>Costi:</b> nessuna commissione, tassa o interesse.</li>
          <li><b>Opzioni a scadenza:</b> regolate al valore intrinseco, in cash.</li>
        </ul>

        <h2>8. Eliminazione, classifica e controversie</h2>
        <ul>
          <li>La classifica si aggiorna ogni venerdì. Con valore pari o sotto zero si è eliminati e si chiude ultimi.</li>
          <li>A pari valore finale i premi si sommano e si dividono.</li>
          <li>Chi abbandona non riceve la quota; il portafoglio resta fermo e continua a essere valutato.</li>
          <li>Un prezzo sbagliato si segnala entro il martedì: il commissario corregge e ricalcola.</li>
          <li>Le modifiche al regolamento valgono dalla finestra successiva.</li>
        </ul>
      </main>
    </>
  );
}
