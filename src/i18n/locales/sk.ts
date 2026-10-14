// Slovenčina – hlavný jazyk. Ďalší jazyk = kópia tohto súboru s preloženými hodnotami.

const sk = {
  app: {
    name: 'Tillotson Index',
    tagline: 'Príprava motokáry, víkendy a skúsenosti tímu na jednom mieste.',
    developedBy: 'Vyvinul',
    loading: 'Načítavam…',
  },

  common: {
    save: 'Uložiť',
    saving: 'Ukladám…',
    cancel: 'Zrušiť',
    close: 'Zavrieť',
    back: 'Späť',
    continue: 'Pokračovať',
    add: 'Pridať',
    edit: 'Upraviť',
    change: 'Zmeniť',
    done: 'Hotovo',
    soon: 'Čoskoro',
    retry: 'Skúsiť znova',
    error: 'Niečo sa nepodarilo. Skús to prosím znova.',
    optional: 'nepovinné',
  },

  auth: {
    google: 'Pokračovať cez Google',
    demo: 'Vyskúšať ukážku',
    demoNote: 'Ukážkový režim – dáta sa ukladajú iba v tomto prehliadači.',
    signOut: 'Odhlásiť sa',
    inviteHint: 'Ak ťa do tímu pozval manažér, prihlás sa rovnakým Google účtom a do tímu sa dostaneš automaticky.',
  },

  nav: {
    home: 'Domov',
    weekend: 'Víkend',
    setup: 'Setup',
    tracks: 'Trate',
    team: 'Tím',
  },

  context: {
    switch: 'Prepnúť',
    kart: 'Motokára',
    karts: 'Motokáry',
    team: 'Tím',
    teams: 'Tímy',
    noKart: 'Bez motokáry',
    chooseKart: 'Vyber motokáru',
    chooseTeam: 'Vyber tím',
    chooseKartHint: 'Pri ktorej motokáre dnes pracuješ?',
    chooseTeamHint: 'Si členom viacerých tímov.',
    otherTeam: 'Iný tím',
    newTeam: 'Založiť nový tím',
    noKarts: 'Tím zatiaľ nemá motokáry',
    noKartsManager: 'Pridaj prvú motokáru a môžeš začať.',
    noKartsMember: 'Manažér ti zatiaľ nepridelil žiadnu motokáru.',
    skip: 'Pokračovať bez motokáry',
    driver: 'Jazdec',
  },

  onboarding: {
    hello: 'Vitaj, {{name}}',
    helloAnon: 'Vitaj',
    intro: 'Najprv založ tím. Neskôr doň pozveš mechanikov aj jazdcov.',
    teamName: 'Názov tímu',
    teamNamePlaceholder: 'napr. Vilim Motorsport',
    teamColor: 'Farba tímu',
    teamColorHint: 'Aplikácia sa jej prispôsobí.',
    create: 'Založiť tím',
    preview: 'Náhľad',
  },

  home: {
    current: 'Aktuálne',
    noEvent: 'Žiadna naplánovaná udalosť',
    noEventHint: 'Preteky alebo tréning pripravíš v sekcii Víkend.',
    planEvent: 'Naplánovať',
    pressures: 'Tlaky pneumatík',
    pressuresEmpty: 'Zatiaľ nezapísané',
    checklist: 'Checklist',
    checklistEmpty: 'Bez aktívneho checklistu',
    driverNotes: 'Poznámky jazdca',
    serviceBook: 'Servisná knižka',
    noKartTitle: 'Nie je vybraná motokára',
    noKartHint: 'Vyber motokáru, pri ktorej pracuješ.',
    tires: {
      fl: 'Ľavá predná',
      fr: 'Pravá predná',
      rl: 'Ľavá zadná',
      rr: 'Pravá zadná',
      front: 'Predok',
      rear: 'Zadok',
    },
  },

  weekend: {
    title: 'Víkend',
    emptyTitle: 'Preteky a tréningy',
    emptyBody:
      'Tu vytvoríš pretekový víkend alebo test, vyberieš motokáry, doplníš harmonogram a checklisty. Po jazde zapíšeš čas, kolá a spätnú väzbu.',
  },

  setup: {
    title: 'Setup',
    emptyTitle: 'Nastavenie motokáry',
    emptyBody:
      'Tlaky všetkých štyroch pneumatík, prevod, karburátor, geometria a rozmery. Každá zmena sa uloží do histórie – kto, kedy a čo zmenil.',
    hidden: 'Setup nie je pre tvoju rolu dostupný.',
  },

  tracks: {
    title: 'Trate',
    emptyTitle: 'Knižnica tratí',
    emptyBody:
      'Overené nastavenia pre konkrétne okruhy. Setup z trate si pozrieš a podľa oprávnení použiješ na svoju motokáru.',
  },

  team: {
    title: 'Tím',
    karts: 'Motokáry',
    members: 'Členovia',
    addKart: 'Pridať motokáru',
    editKart: 'Upraviť motokáru',
    kartNumber: 'Číslo',
    driverName: 'Meno jazdca',
    driverNamePlaceholder: 'napr. Adam',
    appearance: 'Vzhľad tímu',
    appearanceHint: 'Názov, farba a ikona',
    icon: 'Ikona tímu',
    iconUpload: 'Nahrať ikonu',
    iconRemove: 'Odstrániť',
    you: 'ty',
    invite: 'Pozvať člena',
    roles: 'Roly a oprávnenia',
    switchTeam: 'Prepnúť tím',
    app: 'Aplikácia',
    noKarts: 'Zatiaľ žiadne motokáry',
    removeKart: 'Odstrániť motokáru',
    removeKartConfirm: 'Motokára {{number}} zmizne zo zoznamu. Jej história zostane uložená.',
  },

  roles: {
    manager: 'Manažér',
    chief_mechanic: 'Šéfmechanik',
    mechanic: 'Mechanik',
    driver: 'Jazdec',
    title: 'Roly a oprávnenia',
    desc: {
      manager: 'Spravuje celý tím, ľudí aj motokáry',
      chief_mechanic: 'Všetky motokáry, setup a jazdy',
      mechanic: 'Setup a jazdy pridelených motokár',
      driver: 'Spätná väzba a poznámky, bez setupu',
    },
    intro: 'Rola určuje, čo človek v tíme vidí a môže meniť. Rozhoduje zoznam oprávnení, nie názov.',
    newRole: 'Nová rola',
    editRole: 'Upraviť rolu',
    name: 'Názov roly',
    namePlaceholder: 'napr. Rodič',
    presetNameHint: 'Názov predvolenej roly sa nedá zmeniť.',
    permissions: 'Oprávnenia',
    permissionCount_one: '{{count}} oprávnenie',
    permissionCount_few: '{{count}} oprávnenia',
    permissionCount_other: '{{count}} oprávnení',
    memberCount_one: '{{count}} člen',
    memberCount_few: '{{count}} členovia',
    memberCount_other: '{{count}} členov',
    preset: 'Predvolené roly',
    custom: 'Vlastné roly',
    delete: 'Odstrániť rolu',
    deleteConfirm: 'Naozaj odstrániť rolu „{{name}}“?',
    saved: 'Rola uložená',
  },

  permission: {
    groups: {
      team: 'Tím',
      setup: 'Setup',
      weekend: 'Víkend a jazdy',
      tracks: 'Trate',
      kart: 'Motokára',
    },
    team: { manage: { label: 'Spravovať tím', hint: 'Členovia, roly, motokáry a vzhľad tímu.' } },
    kart: { all: { label: 'Všetky motokáry', hint: 'Inak vidí iba motokáry, ktoré mu pridelíš.' } },
    setup: {
      view: { label: 'Vidieť setup', hint: 'Tlaky, prevod, karburátor a ďalšie nastavenia.' },
      edit: { label: 'Meniť setup', hint: 'Zapisovať zmeny nastavenia motokáry.' },
    },
    event: {
      view: { label: 'Vidieť preteky a tréningy', hint: 'Harmonogram, checklisty a poznámky.' },
      manage: { label: 'Plánovať preteky a tréningy', hint: 'Vytvárať a upravovať udalosti.' },
    },
    session: {
      edit: { label: 'Zapisovať jazdy', hint: 'Čas, počet kôl, podmienky a správanie motokáry.' },
      feedback: { label: 'Spätná väzba jazdca', hint: 'Pridať, ako sa motokára jazdila.' },
    },
    checklist: { edit: { label: 'Odškrtávať checklist', hint: 'Príprava, pred jazdou a po jazde.' } },
    track: {
      view: { label: 'Vidieť knižnicu tratí', hint: 'Uložené nastavenia pre okruhy.' },
      manage: { label: 'Spravovať trate', hint: 'Pridávať trate a ukladať k nim setup.' },
      apply: { label: 'Použiť setup z trate', hint: 'Preniesť odporúčaný setup na motokáru.' },
    },
    service: { edit: { label: 'Servisná knižka', hint: 'Zapisovať výmeny oleja a servis.' } },
    notes: { edit: { label: 'Poznámky', hint: 'Písať poznámky k motokáre.' } },
  },

  members: {
    invite: 'Pozvať člena',
    inviteHint: 'Zadaj Google e-mail. Keď sa prihlási, automaticky sa ocitne v tíme.',
    email: 'Google e-mail',
    emailPlaceholder: 'meno@gmail.com',
    role: 'Rola',
    karts: 'Pridelené motokáry',
    kartsHint: 'Motokáry, pri ktorých bude pracovať.',
    kartsAll: 'Táto rola vidí všetky motokáry tímu.',
    send: 'Pozvať',
    added: 'Pridaný do tímu',
    addedBody: '{{email}} už aplikáciu používa, takže je v tíme hneď.',
    invited: 'Pozvánka pripravená',
    invitedBody: 'Pošli {{email}} odkaz na aplikáciu. Po prihlásení cez Google bude v tíme automaticky.',
    share: 'Poslať odkaz',
    shareText: 'Pridaj sa k nášmu tímu v aplikácii Tillotson Index. Prihlás sa cez Google ({{email}}):',
    copied: 'Odkaz skopírovaný',
    pending: 'Čaká na prihlásenie',
    pendingTitle: 'Pozvánka',
    cancelInvite: 'Zrušiť pozvánku',
    edit: 'Upraviť člena',
    remove: 'Odstrániť z tímu',
    removeConfirm: 'Naozaj odstrániť {{name}} z tímu?',
    leave: 'Opustiť tím',
    leaveConfirm: 'Naozaj chceš opustiť tím {{team}}?',
    noKarts: 'Tím zatiaľ nemá motokáry.',
  },

  errors: {
    last_manager: 'Tím musí mať aspoň jedného človeka, ktorý ho spravuje. Najprv daj oprávnenie „Spravovať tím“ niekomu inému.',
    already_member: 'Tento človek už v tíme je.',
    invalid_email: 'Skontroluj e-mailovú adresu.',
    role_in_use: 'Rolu ešte niekto používa. Najprv mu priraď inú.',
    forbidden: 'Na túto zmenu nemáš oprávnenie.',
  },

  settings: {
    title: 'Nastavenia',
    profile: 'Profil',
    name: 'Meno',
    photo: 'Fotka',
    photoChange: 'Zmeniť fotku',
    profileHint: 'Meno a fotka sú spoločné pre všetky tvoje tímy.',
    language: 'Jazyk',
    units: 'Jednotky',
    unit: {
      pressure: 'Tlak',
      temperature: 'Teplota',
      length: 'Dĺžka',
      weight: 'Hmotnosť',
    },
    appearance: 'Vzhľad',
    theme: {
      system: 'Podľa systému',
      light: 'Svetlý',
      dark: 'Tmavý',
    },
    account: 'Účet',
    saved: 'Uložené',
  },

  about: {
    title: 'O aplikácii',
    body:
      'Tillotson Index pomáha tímom motokárových pretekov – najmä v kategórii Tillotson T4 – pripraviť motokáru, zorganizovať víkend a uchovať skúsenosti tímu.',
    version: 'Verzia {{version}}',
    developedBy: 'Aplikáciu vyvinul',
  },

  privacy: {
    title: 'Ochrana súkromia',
    link: 'Ochrana súkromia',
    updated: 'Platné od 14. októbra 2026',
    intro:
      'Tillotson Index je tímová aplikácia pre motokárové pretekanie, ktorú vyvinul Vilim Motorsport. Tu je jednoducho opísané, aké údaje aplikácia používa a prečo.',
    sections: [
      {
        title: 'Aké údaje používame',
        body: 'Pri prihlásení cez Google získame tvoje meno, e-mailovú adresu a profilovú fotku. Ďalej ukladáme údaje, ktoré do aplikácie zadáš ty alebo tvoj tím: tímy, motokáry, nastavenia (setup), udalosti, záznamy jázd, checklisty a poznámky.',
      },
      {
        title: 'Na čo ich používame',
        body: 'Iba na to, aby aplikácia fungovala: na prihlásenie, na zobrazenie tvojho mena a fotky členom tvojho tímu a na uloženie práce tímu. Údaje nepredávame, nepoužívame na reklamu a neposielame tretím stranám na marketing.',
      },
      {
        title: 'Kto ich vidí',
        body: 'Tvoje meno, e-mail a fotku vidia iba členovia tímov, do ktorých patríš. Údaje tímu vidia iba jeho členovia, a to podľa oprávnení svojej roly, ktoré nastavuje manažér tímu.',
      },
      {
        title: 'Kde sú uložené',
        body: 'Údaje sú uložené v databáze služby Supabase a aplikácia beží na službe Vercel. Aby aplikácia fungovala aj pri slabom signále na trati, časť údajov sa ukladá aj priamo v tvojom zariadení.',
      },
      {
        title: 'Údaje z Google účtu',
        body: 'Od Googlu žiadame iba základné údaje profilu (meno, e-mail, fotka). Nemáme prístup k tvojim e-mailom, súborom ani iným službám Google. Používanie údajov z Google API sa riadi pravidlami Google API Services User Data Policy vrátane požiadaviek na obmedzené použitie (Limited Use).',
      },
      {
        title: 'Vymazanie údajov',
        body: 'Z tímu ťa môže kedykoľvek odstrániť manažér tímu. O úplné vymazanie účtu a všetkých tvojich údajov môžeš požiadať manažéra svojho tímu alebo priamo Vilim Motorsport.',
      },
    ],
  },

  pwa: {
    update: 'Je pripravená nová verzia.',
    reload: 'Aktualizovať',
    offline: 'Si offline. Zmeny sa odošlú, keď sa pripojíš.',
  },

  phase: {
    soon: 'Pripravujeme',
  },
}

export default sk
export type Resources = typeof sk
