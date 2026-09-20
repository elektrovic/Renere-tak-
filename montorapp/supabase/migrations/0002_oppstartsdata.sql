-- Oppstartsdata: de to avdelingene og en første administrator.
--
-- Bytt ut verdiene i merknadene under før du kjører denne.
-- PIN-hash lages slik, fra mappen montorapp:
--   node --experimental-strip-types scripts/lag-pin.mjs 4711

insert into avdelinger (id, slug, navn, tripletex_company_id, tripletex_department_id, farge)
values
  ('avd-elektro', 'tigerstaden-elektro', 'Tigerstaden Elektro', null, null, '#17548F'),
  ('avd-las', 'tigerstaden-las-sikkerhet', 'Tigerstaden Lås & Sikkerhet', null, null, '#8A4B22')
on conflict (id) do nothing;

-- Fyll inn ETT av feltene per avdeling når dere vet hvordan Tripletex er satt opp:
--   update avdelinger set tripletex_department_id = 1 where id = 'avd-elektro';
--   update avdelinger set tripletex_company_id = '12345' where id = 'avd-elektro';

-- Første administrator. Sett inn ekte ansatt-id fra Tripletex og en pin_hash.
-- Når den første administratoren er på plass, kan resten av brukerne legges
-- inn i appen under Admin → Brukere.
-- insert into profiler (id, avdeling_id, tripletex_employee_id, navn, epost, pin_hash, rolle, konsern_admin)
-- values ('admin-1', 'avd-elektro', 101, 'Victor Halland', 'victor@hallandgroup.no', 'scrypt$...', 'admin', true);
