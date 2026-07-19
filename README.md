# Tigerstaden Eiendomspleie

Nettside for Tigerstaden Eiendomspleie — takvask, fasadevask og rens av belegningsstein i Oslo, Asker og Bærum.

Én selvstendig statisk side: `index.html` (ingen byggesteg — åpne filen i nettleseren, eller legg den på hvilken som helst statisk host).

Live: **https://renere-tak.vercel.app** (Vercel-prosjektet `renere-tak`).

## Priskalkulator

Seksjonen `#kalkulator` lar kunden beregne et uforpliktende estimat:

1. **Takets grunnflate (m²)** — kunden kan skrive inn adressen og få flyfoto fra Google Maps rett på siden (embed, krever ingen API-nøkkel), med veiledning til Googles «Mål avstand»-verktøy for å anslå takarealet.
2. **Takvinkel (0–55°)** — kalkulatoren regner om grunnflate til reell takflate: `takflate = grunnflate / cos(vinkel)`.
3. **Tilleggstjenester** — impregnering av tak, takrennevask, fasadevask (med eget arealfelt) og rens av belegningsstein (med eget arealfelt).

Estimatet vises med linje per tjeneste og totalsum (avrundet til nærmeste 100 kr, med minstepris). Knappen «Be om befaring med dette estimatet» fyller ut kontaktskjemaet med estimatet og adressen.

### Justere priser

Alle satser ligger samlet i `PRISER`-objektet øverst i `<script>`-blokken i `index.html`:

| Nøkkel | Betydning |
|---|---|
| `takvaskOppmote` | Fast oppmøte/rigg for takvask |
| `takvaskPerM2` | Pris per m² reell takflate |
| `impregneringPerM2` | Impregnering per m² takflate |
| `takrenneFast` | Fast pris takrennevask |
| `fasadePerM2` / `fasadeMin` | Fasadevask per m² / minstepris |
| `steinPerM2` / `steinMin` | Belegningsstein per m² / minstepris |
| `minstepris` | Total minstepris per oppdrag |

Satsene er eksempler — juster til reelle priser før lansering.
