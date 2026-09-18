# Halland Gruppen – kodelager

Dette lageret inneholder to selvstendige ting:

## 1. Montørappen — `montorapp/`

Internt CRM og feltapp for Halland Gruppen. Montørene fører timer, materiell og
tilleggssalg på mobil, fyller ut kontrollskjemaer, og alt skrives til Tripletex.
Bygget for Tigerstaden Elektro og Tigerstaden Lås & Sikkerhet, med avdeling som
et førsteklasses begrep i datamodellen.

Next.js + TypeScript, PWA med offline-kø, Supabase som database, deployes på
Vercel med **Root Directory = `montorapp`**.

→ [`montorapp/README.md`](montorapp/README.md) for oppsett og drift
→ [`docs/plan-halland-crm.md`](docs/plan-halland-crm.md) for planen og funnene fra Tripletex-API-et

## 2. Tigerstaden Eiendomspleie — `index.html`

Nettsiden for takvask, fasadevask og rens av belegningsstein.
Én selvstendig statisk side uten byggesteg.

Live: **https://tigerstaden-eiendomspleie.vercel.app**

### Priskalkulator

Seksjonen `#kalkulator` gir kunden et uforpliktende estimat:

1. **Takets grunnflate (m²)** — kunden kan skrive inn adressen og få flyfoto fra Google Maps rett på siden.
2. **Takvinkel (0–55°)** — regner om grunnflate til reell takflate: `takflate = grunnflate / cos(vinkel)`.
3. **Tilleggstjenester** — impregnering, takrennevask, fasadevask og rens av belegningsstein.

Alle satser ligger i `PRISER`-objektet øverst i `<script>`-blokken i `index.html`:

| Nøkkel | Betydning |
|---|---|
| `takvaskOppmote` | Fast oppmøte/rigg for takvask |
| `takvaskPerM2` | Pris per m² reell takflate |
| `impregneringPerM2` | Impregnering per m² takflate |
| `takrenneFast` | Fast pris takrennevask |
| `fasadePerM2` / `fasadeMin` | Fasadevask per m² / minstepris |
| `steinPerM2` / `steinMin` | Belegningsstein per m² / minstepris |
| `minstepris` | Total minstepris per oppdrag |
