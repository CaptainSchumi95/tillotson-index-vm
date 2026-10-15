-- Ďalšie spoločné trate (miesto a dĺžka podľa prevádzkovateľov a FIA/IAME podkladov, október 2026).
-- Pridajú sa iba tie, ktoré v knižnici ešte nie sú (rovnaký názov).

insert into public.tracks (team_id, name, location, length_m, created_by)
select null, v.name, v.location, v.length_m, null
from (values
  ('Motokáry Dlhá',             'Dlhá, SK',                      1095),
  ('Motokáry Trebatice',        'Trebatice, SK',                  920),
  ('Speedworld Bruck',          'Pachfurth, AT',                 1120),
  ('Páloc Ring',                'Balassagyarmat, HU',            1200),
  ('SteelRing Třinec',          'Třinec, CZ',                    1232),
  ('South Garda Karting',       'Lonato del Garda, IT',          1200),
  ('Jesolo Pista Azzurra',      'Jesolo, IT',                    1045),
  ('Franciacorta',              'Castrezzato, IT',               1300),
  ('Nizza Monferrato',          'Nizza Monferrato, IT',          1080),
  ('Kiltorcan',                 'Ballyhale, IE',                 1100),
  ('PFI Karting',               'Brandon, GB',                   1382),
  ('Ala di Trento',             'Ala, IT',                       1110),
  ('7 Laghi Kart',              'Castelletto di Branduzzo, IT',  1256),
  ('Motokáry Písek-Hradiště',   'Písek, CZ',                     1250),
  ('Zielona Góra',              'Stary Kisielin, PL',            1042),
  ('Funarena Cheb',             'Cheb, CZ',                      1202)
) as v(name, location, length_m)
where not exists (
  select 1 from public.tracks t where t.team_id is null and lower(t.name) = lower(v.name)
);
