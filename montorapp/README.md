# Montørappen

Internt CRM og feltapp for Halland Gruppen. Montørene fører timer, materiell og
tilleggssalg på mobil, fyller ut kontrollskjemaer, og alt skrives til Tripletex.

**Avdelinger fra start:** Tigerstaden Elektro og Tigerstaden Lås & Sikkerhet.
Ny avdeling er én rad i databasen – ingen kodeendring.

---

## Kom i gang

```bash
cd montorapp
npm install
cp .env.example .env.local     # AUTH_SECRET må fylles ut
npm run dev                    # http://localhost:3000
```

Uten Tripletex- og Supabase-nøkler starter appen i **demomodus** med testdata.
Da kan du logge inn som hvem som helst av demobrukerne med PIN `1234` – de
listes opp på innloggingssiden.

Nyttige kommandoer:

| Kommando | Hva den gjør |
|---|---|
| `npm run dev` | Kjører appen lokalt |
| `npm run build` | Bygger for produksjon |
| `npm test` | Kjører testene |
| `npm run typecheck` | Sjekker typene |
| `npm run pin 4711` | Lager en PIN-hash til databasen |
| `npm run icons` | Genererer appikonene på nytt |

---

## Hvordan det henger sammen

**Tripletex er fasit.** Vi lager ikke egne tabeller for prosjekter, timer,
ordrelinjer eller innkjøp. Leses noe, leses det fra Tripletex. Føres timer,
skrives de til Tripletex.

Vår egen database inneholder bare det Tripletex ikke har: prislister,
tilleggssalg med selger og signatur, skjemamaler og utfyllinger, kalender,
ukens mål – og køstatus med måletall for hvor lang tid registreringen tar.

```
app/
  (felt)/        mobil-PWA for montøren
  admin/         desktop-visning for ledelsen
  api/           alt som snakker med Tripletex, Supabase og Anthropic
lib/
  tripletex/     adapterlaget – all API-kunnskap samlet ett sted
  store/         vår egen database (Supabase, eller minne i demomodus)
  offline/       køen på telefonen
  pdf/           PDF-generering for kontrollskjemaer
  ai/            forslag til fritekstfeltene
  kobbr/         grensesnitt med manuell reserveløsning
supabase/migrations/   databasen som SQL
tests/                 tester som kjøres med `npm test`
```

### Offline

Alt montøren registrerer legges først i en kø i nettleserens egen database
(IndexedDB) og sendes til serveren når det er dekning. Statuslinja øverst viser
alltid **I kø**, **Sender**, **Sendt** eller **Feilet**.

Hver registrering får en id laget på telefonen (`localId`). Den følger jobben
hele veien, og gjør at et nytt forsøk aldri fører de samme timene to ganger –
serveren svarer «allerede sendt» i stedet for å skrive på nytt.

### Sikkerhet

- Ingen nøkler i frontend. Tripletex, Kobbr og Anthropic snakkes med kun fra
  API-rutene på serveren.
- To roller: `montor` og `admin`. Dekningsgrad og prosjektøkonomi er sperret for
  montører både i API-rutene og i sidene – det holder ikke å gjette en adresse.
- Innlogging med e-post og PIN (4–8 siffer). PIN lagres som scrypt-hash, aldri i
  klartekst. Åtte bomforsøk på ti minutter bremser videre forsøk.
- Innloggingen ligger i en signert informasjonskapsel som varer i 90 dager, slik
  at ingen blir logget ut fordi de sto i en kjeller uten dekning.
- Supabase-tabellene har radsikkerhet slått på uten åpne regler: den offentlige
  nøkkelen gir tilgang til null rader. All lesing går gjennom serveren vår.

---

## Tripletex-integrasjonen

Innloggingsflyten er den Tripletex dokumenterer:

```
PUT /v2/token/session/:create?consumerToken=..&employeeToken=..&expirationDate=..
  → { value: { token } }
Basic Auth: brukernavn = selskaps-id (0), passord = session-token
```

Tokenet caches og fornyes automatisk et døgn før utløp. Ved `429` prøver vi på
nytt med økende ventetid – Tripletex oppgir ingen offentlig grense.

Endepunktene vi bruker:

| Hva | Endepunkt |
|---|---|
| Prosjekter | `GET /project` |
| Aktiviteter | `GET /activity` |
| Timer (les) | `GET /timesheet/entry` |
| Timer (skriv) | `POST /timesheet/entry/list` – flere føringer i ett kall |
| Månedsstatus | `GET /timesheet/month` |
| Tillegg og materiell | `POST /order` med ordrelinjer |
| Kontrollskjema som PDF | `POST /documentArchive/project/{id}` |
| Dekningsgrad | `GET /project/controlForm` |

**Må verifiseres mot testmiljøet med ekte nøkler** (merket `VERIFISER` i koden):
feltnavnene på `/timesheet/month`, formatet på filopplastingen til
`/documentArchive`, og feltnavnene i `/project/controlForm`. Alle tre er bygget
slik at appen faller tilbake på noe fornuftig i stedet for å kræsje hvis svaret
ser annerledes ut enn ventet. For dekningsgrad regner vi selv fra fastpris,
ordrelinjer og førte timer hvis kontrollskjemaet ikke gir tall.

---

## Sette det i drift

### 1. Database

Opprett et Supabase-prosjekt. Kjør `supabase/migrations/0001_grunnmur.sql` i
SQL-editoren, deretter `0002_oppstartsdata.sql` (les merknadene der først).

Lag en PIN-hash til den første administratoren:

```bash
npm run pin 4711
```

### 2. Miljøvariabler i Vercel

Se `.env.example`. Minimum for ekte drift:

```
AUTH_SECRET                 (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TRIPLETEX_CONSUMER_TOKEN
TRIPLETEX_EMPLOYEE_TOKEN
TRIPLETEX_BASE_URL          https://api-test.tripletex.tech først, så https://tripletex.no
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY           (valgfri – kun for forslag til fritekst i skjemaene)
```

### 3. Vercel

Prosjektets **Root Directory** settes til `montorapp`. Resten er standard
Next.js. Etter deploy: gå til **Admin → Oppsett** i appen for å se hva som er
koblet på og hva som mangler.

### 4. På telefonen

Åpne adressen i Safari eller Chrome og velg «Legg til på hjemskjerm». Da får
montøren fullskjerm, eget ikon og kameratilgang.

---

## Måling

- **Hvor lang tid registreringen tar** måles fra skjemaet åpnes til det sendes,
  og vises på Min side. Den brukes til å se om appen sparer tid – aldri til å
  sammenlikne montører.
- **Faktisk tid mot estimat** vises per prosjekt for admin. Montørene
  konkurrerer mot tilbudet, ikke mot hverandre.
- **Topplista for tilleggssalg** sorteres på andel jobber med tillegg, ikke på
  kroner. Nevneren er jobbene montøren faktisk har vært på i perioden – både de
  han har ført timer på og de han har solgt tillegg på.
