# Halland Gruppen — internt CRM / feltapp

Plan for datamodell, arkitektur og mappestruktur. **Til godkjenning før bygging starter.**

Dato: 2026-09-01 · Status: venter på godkjenning

---

## 1. Funn fra Tripletex-API-et

Kilde: Tripletex sitt offisielle utviklerrepo (`github.com/Tripletex/tripletex-api2`) — changelog,
FAQ, webhook-dokumentasjon og deres egne kodeeksempler. Se punkt 8 om hvorfor jeg ikke kunne lese
selve OpenAPI-siden herfra.

### 1.1 Innlogging mot Tripletex — bekreftet

Flyten er nøyaktig som du beskrev, og er bekreftet mot Tripletex sitt eget eksempel:

```
PUT https://tripletex.no/v2/token/session/:create
      ?consumerToken=<integrasjonsnøkkel>
      &employeeToken=<ansattnøkkel>
      &expirationDate=<ÅÅÅÅ-MM-DD>
   → { "value": { "token": "<session token>" } }
```

Deretter Basic Auth på alle kall: brukernavn = `0` (selskapet som eier ansattnøkkelen),
passord = session token.

- Testmiljø: `https://api-test.tripletex.tech` — samme API, egne nøkler.
- Utløpsdato på session token velger vi selv. Adapteret vårt lager token med noen dagers
  levetid, cacher den, og fornyer automatisk før den går ut.
- Tripletex svarer `429` ved for mange kall. Nøyaktig grense er ikke offentlig dokumentert,
  så vi bygger inn kø, cache og automatisk ny-forsøk med økende ventetid.

### 1.2 Timeføring — bekreftet, passer flyten vår perfekt

`POST /v2/timesheet/entry` med akkurat de feltene vi trenger:

```json
{ "project": {"id": 123}, "activity": {"id": 123}, "employee": {"id": 123},
  "date": "2026-09-01", "hours": 3.5 }
```

- Ingen stemplingsklokke i API-et heller — timer føres som antall timer på en dato.
  Det er nøyaktig modellen du vil ha.
- `POST /v2/timesheet/entry/list` tar **flere føringer i ett kall** → «flere prosjekter samme
  dag i én operasjon» blir ett API-kall. (Må verifiseres mot testmiljø.)
- `GET/PUT /v2/timesheet/month` gir status på måneden (fullført / godkjent). **Viktig:** appen
  må sjekke dette før den skriver — en godkjent måned kan ikke endres, og da skal montøren få
  en tydelig beskjed i stedet for en teknisk feil.
- Feltet `chargeableHours` finnes hvis dere vil skille fakturerbare timer fra førte timer.

### 1.3 Tilleggssalg som ordrelinjer — bekreftet

`POST /v2/order` og `POST/PUT /v2/order/orderline` finnes, og ordrelinjer kan sendes med
i samme kall som ordren. Prosjektet har i tillegg egne prosjektordrelinjer
(`/v2/project/orderline`, `ProjectOrderLineDTO`).

Åpent punkt vi må avklare mot deres oppsett: skal hvert tillegg bli **en ny ordre** på
prosjektet, eller **nye linjer på en ordre som allerede ligger der**? Dette bestemmer vi når
jeg ser et ekte prosjekt i deres Tripletex.

### 1.4 Kontrollskjemaer / Fase 3b — **ja, dette lar seg gjøre**

Dette var det viktigste tekniske forbeholdet ditt. Svaret er ja:

```
POST /v2/documentArchive/project/{prosjektId}   ← last opp dokument på prosjektet
GET  /v2/documentArchive/project/{prosjektId}   ← liste dokumentene på prosjektet
PUT  /v2/documentArchive/{id}                   ← endre metadata
DELETE /v2/documentArchive/{id}
```

Tripletex har altså et dokumentarkiv der filer kan knyttes til et prosjekt. Løsningen blir
som du foreslo: **appen lager PDF-en selv, og laster den opp på prosjektet.**

To presiseringer:

- Det finnes et endepunkt som heter `GET /v2/project/controlForm`, men det er **ikke**
  elektrikerens sluttkontroll/SJA. Det er Tripletex sitt eget prosjektkontrollskjema
  (økonomi: fastpris, dekningsgrad, antall deltakere). Så vi eier skjemamalene selv — som
  planlagt.
- Nøyaktig filformat på opplastingen (multipart) må verifiseres mot testmiljøet med ekte
  nøkler før vi bygger fase 3b ferdig.

### 1.5 Dekningsgrad / Fase 4 — sannsynligvis gratis

Samme `GET /v2/project/controlForm` inneholder blant annet `contributionMarginPercent`
(dekningsgrad), `isFixedPrice` og `fixedPrice` per prosjekt. Får vi den til å svare med ekte
tall, er Fase 4 i praksis en ren visning — vi slipper å regne dekningsgrad selv.
Må verifiseres.

### 1.6 Webhooks — nyttig, men begrenset

`GET /v2/event` lister hvilke hendelser vi kan abonnere på, `POST /v2/event/subscription`
setter opp abonnementet, med egendefinert autentiseringsheader mot vår mottaker. Listen over
hendelser er kort i dag (f.eks. `product.create`, `order.delete`). Tripletex anbefaler selv en
nattlig full synk i tillegg. Vi bruker webhooks til å friske opp cachen vår, ikke som eneste
kilde.

### 1.7 Kobbr — antakelig ikke nødvendig med eget API

Kobbr markedsfører allerede **ferdig integrasjon mot Tripletex**. Det betyr at tilbudet
sannsynligvis allerede havner i Tripletex når kunden aksepterer — som fastpris på prosjektet
eller som en ordre.

Anbefaling, i denne rekkefølgen:

1. **Tripletex først:** bruk prosjektets fastpris (`fixedPrice`) som baseline når den finnes.
2. **Manuelt:** admin kan skrive inn opprinnelig tilbudssum på prosjektet.
3. **Kobbr-API:** bare hvis de bekrefter at det finnes. Vi bygger uansett bak et grensesnitt,
   så det kan kobles på uten å røre resten.

---

## 2. Prinsipper som styrer hele bygget

1. **Tripletex er fasit.** Vi lager ikke egne tabeller for prosjekter, timer, ordrelinjer eller
   innkjøp. Leser vi noe, leser vi det fra Tripletex.
2. **Avdeling er et førsteklasses begrep.** Hver bruker, hvert prosjekt, hver prisliste, hver
   skjemamal og hver toppliste er knyttet til en avdeling. Ny avdeling = én rad i databasen,
   ingen kodeendring.
3. **Offline er standardtilstanden.** Alt montøren registrerer legges i en lokal kø på
   telefonen først, og sendes når nettet er der. Han ser alltid statusen.
4. **Ingen nøkler i frontend.** All kontakt med Tripletex, Kobbr og Anthropic går gjennom våre
   egne API-ruter på serveren.
5. **Vi rangerer aldri montører mot hverandre på tid.** Faktisk tid måles mot estimert tid på
   jobben. Bare tilleggssalg har åpen toppliste.

---

## 3. Datamodell (Supabase / Postgres)

Alle tabeller har `department_id`, og radsikkerhet (RLS) i databasen sørger for at en montør
bare får se sitt eget og sin egen avdelings fellestall. Dekningsgrad og prosjektøkonomi er
sperret for montørrollen både i databasen og på serveren.

### Grunnmur

**`departments`** — avdelingene
| felt | forklaring |
|---|---|
| `id` | intern id |
| `slug` | `tigerstaden-elektro`, `tigerstaden-las-sikkerhet` |
| `navn` | visningsnavn |
| `tripletex_company_id` | fylles ut hvis avdelingen er et eget selskap i Tripletex |
| `tripletex_department_id` | fylles ut hvis avdelingen er en avdeling i ett selskap |
| `farge` | brukes i kalender og grafer |
| `aktiv` | |

De to Tripletex-feltene gjør at modellen takler **begge** oppsett — to selskaper eller ett
selskap med avdelinger — uten kodeendring. Adapteret slår opp riktig «Tripletex-kontekst» ut
fra avdelingen til den innloggede.

**`profiles`** — brukerne
`id` (samme som innlogging) · `department_id` · `tripletex_employee_id` · `navn` ·
`rolle` (`montor` | `admin`) · `kalenderfarge` · `konsern_admin` (ser alle avdelinger) · `aktiv`

### Fase 1 — timer

**`time_entry_jobs`** — køen og målingen, *ikke* en kopi av timene
`id` · `local_id` (laget på telefonen, hindrer dobbeltføring) · `profile_id` ·
`department_id` · `project_tripletex_id` · `dato` · `timer` · `activity_id` ·
`status` (`i_ko` | `sender` | `sendt` | `feilet`) · `tripletex_entry_id` ·
`registrering_ms` (hvor lang tid selve føringen tok) · `feilmelding` · tidsstempler

Payloaden slettes fra raden så snart Tripletex har bekreftet skrivingen. Da står vi igjen med
status og måletall — ikke en skyggekopi av timelisten.

**`project_meta`** — det Tripletex ikke har om prosjektet
`project_tripletex_id` · `department_id` · `baseline_sum` (opprinnelig tilbudssum) ·
`baseline_kilde` (`tripletex` | `manuell` | `kobbr`) · `estimerte_timer` · `notat`

### Fase 2 — tilleggssalg

**`price_list_items`** — prisliste per avdeling
`department_id` · `tripletex_product_id` (valgfri) · `navn` · `enhet` · `pris` · `sortering` · `aktiv`

**`extra_sales`**
`id` · `local_id` · `department_id` · `project_tripletex_id` · `solgt_av` (profil) ·
`sum` · `status` (`kladd` | `i_ko` | `sendt` | `feilet`) · `tripletex_order_id` ·
`signert_tid` · `signert_navn` · `signatur_sti` · `registrering_ms` · tidsstempler

**`extra_sale_lines`** — linjene (fra prisliste eller fritekst)
**`extra_sale_photos`** — bildene (privat lagring, signerte lenker)

Signatur er obligatorisk i flyten, men lagres som eget felt slik at topplista kan vise
«signert vs. usignert» og fange opp de som glemmer den.

### Fase 3 — kalender

**`calendar_events`** — `department_id` · `profile_id` · `project_tripletex_id` · `start` ·
`slutt` · `tittel` · `notat`. Farge kommer fra `profiles.kalenderfarge`.

### Fase 3b — kontrollskjemaer

**`form_templates`** — `department_id` · `type` (`sluttkontroll` | `sja` | `egenkontroll`) ·
`versjon` · `definisjon` (spørsmålene som data) · `aktiv`
Én mal per skjematype og avdeling. Nye skjemaer legges inn som data, ikke som kode.

**`form_submissions`** — `template_id` · `project_tripletex_id` · `profile_id` · `svar` ·
`ai_forslag` (så vi kan se hva AI foreslo kontra hva montøren endret) · `status` ·
`pdf_sti` · `tripletex_document_archive_id` · signaturfelter

### Fase 5 — mål

**`goals`** — `department_id` · `uke` · `type` · `malverdi` · `satt_av` · `beskrivelse`

---

## 4. Mappestruktur

```
app/
  (felt)/                  mobil-PWA for montøren
    jobber/                mine prosjekter, dagens og gårsdagens øverst
    timer/                 føre timer, flere prosjekter i én operasjon
    tillegg/               registrere tillegg, bilde, signatur
    skjema/                kontrollskjema, ett spørsmål av gangen
    toppliste/
  (admin)/                 desktop-visning
    dashbord/
    lonnsomhet/            dekningsgrad, topp 10 (kun admin)
    prislister/
    maler/                 skjemamaler per avdeling
    mal/                   ukens mål
  api/
    tripletex/             alle kall mot Tripletex, kun server
    tillegg/
    skjema/ai/             Anthropic-kall, kun server
    sync/                  mottar køen fra telefonen
lib/
  tripletex/               adapterlaget
    auth.ts                session token, cache og fornyelse
    client.ts              felles kall, kø, ny-forsøk, 429-håndtering
    projects.ts  timesheet.ts  orders.ts  documents.ts  types.ts
  kobbr/                   grensesnitt + manuell reserveløsning
  avdeling/                slår opp Tripletex-kontekst ut fra avdeling
  offline/                 lokal kø (IndexedDB), synk, statusvisning
  supabase/
components/
supabase/migrations/       databaseendringer som versjonerte filer
tests/
```

---

## 5. Offline — hvordan det faktisk virker

1. Montøren trykker «Lagre». Registreringen får en id laget på telefonen og legges i en lokal
   kø. Skjermen bekrefter med en gang — han venter aldri på nett.
2. En statuslinje viser hele tiden: **I kø (3)** / **Sender** / **Sendt** / **Feilet**.
3. Når nettet er tilbake sendes køen til vår server, som skriver til Tripletex.
4. Id-en fra telefonen følger med hele veien, slik at et nytt forsøk aldri fører samme timer
   to ganger.
5. Prosjektlisten hans caches lokalt, så han ser jobbene sine også uten dekning.

Teknisk: PWA med servicearbeider (Serwist), lokal database i nettleseren (IndexedDB),
synk ved gjenvunnet nett og når appen åpnes.

---

## 6. Sikkerhet og roller

- Alle nøkler i miljøvariabler på Vercel: `TRIPLETEX_CONSUMER_TOKEN`,
  `TRIPLETEX_EMPLOYEE_TOKEN`, `TRIPLETEX_BASE_URL`, `ANTHROPIC_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`. Ingen av dem sendes til nettleseren.
- To roller: `montor` og `admin`. Dekningsgrad og prosjektøkonomi er sperret for montør i
  databasen (RLS) i tillegg til i serverkoden — så det holder ikke å «gjette» en nettadresse.
- Bilder og signaturer i privat lagring med signerte, kortlevde lenker.

---

## 7. Hva fase 1 leverer

- Innlogging, avdeling og rolle på plass.
- «Mine jobber» hentet fra Tripletex, med dagens og gårsdagens prosjekter øverst.
- Føre timer på ett eller flere prosjekter i én operasjon, med forslag basert på hva montøren
  pleier å føre på liknende jobber.
- Full offline-kø med synlig status.
- Varsel på slutten av dagen hvis det ikke er ført timer.
- Måling av hvor lang tid registreringen tar, så vi kan sammenlikne med dagens rutine.
- Deployet på Vercel, klar for testing på ekte mobil.

---

## 8. Det som blokkerer meg akkurat nå

**Utviklingsmiljøet mitt får ikke lov til å nå `tripletex.no` eller
`api-test.tripletex.tech`.** Nettverkspolicyen for dette miljøet blokkerer dem. Derfor har jeg
lest Tripletex sitt offisielle utviklerrepo i stedet for API-sidene deres. Det er en god kilde,
men det betyr:

- Jeg kan ikke prøvekjøre kall mot Tripletex herfra.
- Ting merket «må verifiseres» over må sjekkes mot testmiljøet før vi stoler på dem.

To veier videre, begge fungerer:

- Du åpner `tripletex.no` og `api-test.tripletex.tech` i nettverksinnstillingene for dette
  utviklingsmiljøet, så tester jeg direkte herfra, eller
- jeg bygger fase 1 mot testdata, og vi kobler på ekte Tripletex når appen står på Vercel — der
  gjelder ikke denne sperren.

---

## 9. Spørsmål jeg trenger svar på

1. **Er Tigerstaden Elektro og Tigerstaden Lås & Sikkerhet to separate selskaper i Tripletex,
   eller ett selskap med to avdelinger?** Modellen takler begge, men jeg må vite hvilken før
   jeg kobler opp.
2. **Hvilket kodelager skal appen ligge i?** Dette lageret (`Renere-tak-`) inneholder i dag
   nettsiden til Tigerstaden Eiendomspleie. Jeg anbefaler et nytt, eget lager for appen.
3. **Har dere API-tilgang i Tripletex i dag** — altså en registrert integrasjon
   (consumer token) og mulighet for å lage ansattnøkler (employee token)?
4. **Skal jeg åpne nettverket her, eller bygge mot testdata først?** Se punkt 8.

---

## 10. Status

Planen er gjennomført. Appen ligger i [`montorapp/`](../montorapp/) og dekker alle
fem fasene, samt fase 3b. Se [`montorapp/README.md`](../montorapp/README.md) for
oppsett og drift.

Beslutninger tatt underveis, siden bestiller ba om at alle valg ble tatt uten
ytterligere avklaringer:

- Appen ligger i dette kodelageret under `montorapp/`, ikke i et nytt lager.
  Nettsiden til Tigerstaden Eiendomspleie ligger urørt ved siden av.
- Innlogging med e-post og PIN (scrypt-hash), fordi det er raskest på mobil i felt.
- Avdelingen har felt for både Tripletex-selskap og Tripletex-avdeling, slik at
  begge oppsett virker uten kodeendring. Spørsmål 1 er dermed ikke lenger
  blokkerende, men må besvares før ekte data kobles på.
- Tilbudssum hentes fra prosjektets fastpris i Tripletex, med manuell overstyring
  for admin. Kobbr ligger klar bak et grensesnitt.
- Uten nøkler kjører appen i demomodus med testdata, slik at hele flyten kan
  prøves før Tripletex-tilgangen er på plass.

De tre punktene merket «må verifiseres» i punkt 1 gjenstår fortsatt, og er
markert med `VERIFISER` i koden.
