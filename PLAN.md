# Tillotson Index – plán vývoja

Tímová pracovná aplikácia pre motokárové pretekanie (primárne Tillotson T4).
Vyvinul **Vilim Motorsport** (logá v `vilim-motorsport/`, logá aplikácie v `tillotson-index-logos/`).

## 1. Rozhodnutia

| Oblasť | Rozhodnutie |
|---|---|
| Forma | PWA (SPA), mobile-first, rovnako použiteľná na PC. Neskôr možné zabaliť cez Capacitor do obchodov bez prepisu. |
| Frontend | React + TypeScript + Vite, `vite-plugin-pwa`, Tailwind CSS, TanStack Router + TanStack Query |
| Backend | Supabase (Postgres + Row Level Security, Google Auth, Storage, Realtime) |
| Hosting | GitHub + Vercel Hobby (free, nekomerčné použitie) + Supabase Free. Pri predaji Vercel Pro alebo Cloudflare Pages. |
| Offline (MVP) | Čítanie z cache (IndexedDB) + fronta zápisov pre víkendovú prácu: setup, checklist, jazdy, poznámky. Ostatné (správa tímu, rolí…) vyžaduje internet. Ak nebude stačiť → PowerSync. |
| Jazyk | Slovenčina. Od začiatku i18n (`i18next`), žiadne natvrdo písané texty, dátumy/čísla cez `Intl`. Ďalšie jazyky (EN, IT…) = pridať preklad. |
| Jednotky | Ukladajú sa v kanonickej jednotke (bar, mm, °C, …), prevod iba pri zobrazení. Predvolene bar, v nastaveniach profilu prepnutie na psi a ďalšie jednotky. |
| Trate | Spoločný katalóg tratí (názov, miesto, dĺžka) pripravujeme my cez seed v databáze – bez admin rozhrania. Tímy si môžu pridať vlastné trate. **Setupy pri tratiach sú vždy tímové** a spravuje ich každý tím sám. |
| Náklady | Všetko zadarmo (pozri sekciu 7). |

## 2. Dizajn

- **Značka aplikácie**: modrý gradient IDX (#2460FC → #154BD6), hranaté široké písmo (Saira) na nadpisy a čísla, Archivo na text.
- **Farba tímu** preberá akcent (tlačidlá, štartové čísla, aktívna navigácia); kontrast sa dopočíta pre svetlý aj tmavý režim.
- **Štartové číslo** (KartPlate) s prúžkom nad číslom – odkaz na logo IDX. Hlavný vizuálny prvok aplikácie.
- **Pre ľudí bez skúseností s technikou**: veľké dotykové plochy (≥ 48 px), popisy pod ikonami v navigácii, jedna hlavná akcia na obrazovke, žiadne skryté gestá.
- Mobil: spodná navigácia, panely zospodu. PC: bočný panel, rovnaké komponenty.
- Svetlý režim predvolene (čitateľnosť na slnku), tmavý podľa systému alebo nastavenia.
- Vilim Motorsport: „BY VILIM MOTORSPORT“ v hero logu na prihlásení, podpis v bočnom paneli, nastaveniach a v *O aplikácii*.

## 3. Základné princípy

- **Profil ≠ tím ≠ motokára.** Meno a foto patria osobe, rola a členstvo tímu, setup a servis motokáre.
- **Oprávnenia vynucuje databáza (RLS)**, nie iba UI. Rozhoduje zoznam oprávnení roly, nie jej názov.
- **Setup motokáry = skutočný stav.** Setup pri trati je iba odporúčanie; výber trate nič nemení automaticky.
- **História je nemenná** – každá uložená zmena setupu je nová revízia (kto, kedy, čo).
- Udalosť sa týka iba **vybraných motokár**.

## 4. Dátový model (návrh)

```
profiles              id, name, avatar_url, locale, unit_prefs
teams                 id, name, color_primary, color_secondary, icon_url
permissions           kód oprávnenia (setup.view, setup.edit, event.create, team.manage, …)
roles                 team_id, name, is_default
role_permissions      role_id × permission
memberships           profile_id × team_id × role_id
invitations           team_id, email, role_id  (pridanie cez Google e-mail pred prvým prihlásením)
categories            team_id, name
karts                 team_id, number, driver_profile_id, category_id
kart_assignments      membership_id × kart_id
setup_fields          team_id|null, group (tires/gearing/carb/geometry/dimensions/custom), key, unit_kind, order
setup_revisions       kart_id, values (jsonb), author_id, created_at, note
setup_variants        kart_id, name (mokrý, kvalifikácia…), values
tracks                team_id|null (null = spoločná), name, location, length
track_setups          team_id, track_id, name, values, author_id
events                team_id, type (race|test), date_from, date_to, track_id, notes
event_karts           event_id × kart_id
schedule_items        event_id, day, time, title
checklist_templates   team_id, phase (prep|pre_run|post_run), items
checklist_state       event_id, kart_id, item_id, done_by, done_at
sessions              event_id, kart_id, setup_revision_id, best_lap, laps, conditions,
                      kart_behaviour, driver_feedback, next_plan
driver_notes          kart_id, author_id, text
service_log           kart_id, type (oil…), date, hours/laps, note
```

Porovnanie jázd = rozdiel `best_lap` + diff dvoch `setup_revisions`.

Predvolené roly: **manažér, šéfmechanik, mechanik, jazdec** (jazdec bez `setup.view`).

## 5. Fázy

### Fáza 1 – Základ ✅
- Projekt, PWA (manifest, service worker, ikony), i18n, systém jednotiek
- Supabase schéma + RLS, prihlásenie Google
- Profil (meno, foto, jazyk, jednotky)
- Vytvorenie tímu, výber tímu → výber motokáry, téma podľa farieb tímu
- Zapamätanie posledného tímu / motokáry / sekcie
- Navigácia 5 sekcií (spodná lišta na mobile, bočná na PC)
- Branding „Vyvinul Vilim Motorsport“ – prihlasovacia obrazovka + *O aplikácii*

### Fáza 2 – Tím ✅ (bez kategórií – pribudnú, keď budú treba)
- Členovia (pozvanie cez e-mail), roly, editor vlastných rolí a oprávnení
- Motokáry, kategórie, pridelenia, vzhľad tímu

### Fáza 3 – Setup ✅
- Tlaky 4 pneumatík navrchu, prevod, karburátor, geometria, rozmery, vlastné položky
- História revízií (kto/kedy/čo), varianty

### Fáza 4 – Domov ✅
- Aktuálny jazdec a motokára, aktívna udalosť, prehľad setupu a tlakov, stav checklistu
- Poznámky jazdca, servisná knižka (oleje)

### Fáza 5 – Víkend (časť 1 ✅: udalosti, harmonogram, checklisty · časť 2: jazdy a porovnanie)
- Preteky / test, dátum alebo rozsah, trať, výber motokár
- Harmonogram po dňoch (pri teste voliteľný), checklisty (príprava / pred jazdou / po jazde), poznámky
- Záznam jazdy a porovnanie s predchádzajúcou

**→ MVP hotové (fázy 1–5), prvý ostrý víkend.**

### Fáza 6 – Trate
- Spoločný katalóg (seed) + vlastné trate tímu
- Tímový setup pri trati: vytvoriť ručne / skopírovať z motokáry / upraviť / použiť na motokáru

### Fáza 7 – Offline a doladenie
- Test na reálnej trati so slabým signálom, riešenie konfliktov
- Inštalácia iOS / Android / PC, návod pre rodičov-mechanikov

### Neskôr
- Čítanie harmonogramu z PDF / fotky (AI)
- Inteligentné odporúčania setupu
- Ďalšie jazyky, prípadne Capacitor a obchody

## 6. Obmedzenia PWA na iOS
- Inštalácia ručne: Safari → Zdieľať → Pridať na plochu
- Notifikácie len pre nainštalovanú appku (iOS 16.4+)
- Safari môže zmazať lokálne dáta pri dlhom nepoužívaní → dáta na serveri sú vždy zdroj pravdy

## 7. Bezplatná prevádzka – riziká a opatrenia

| Limit Supabase Free | Opatrenie |
|---|---|
| Projekt sa uspí po 7 dňoch nečinnosti | Plánovaný „ping“ (GitHub Actions cron) |
| Bez automatických záloh | Týždenný `pg_dump` cez GitHub Actions do privátneho úložiska |
| 500 MB DB, 1 GB storage | Fotky zmenšiť a skomprimovať v prehliadači pred nahraním |

Pri predaji: prechod na Supabase Pro, bez zmien v kóde.
