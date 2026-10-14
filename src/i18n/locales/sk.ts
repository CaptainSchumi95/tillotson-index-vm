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
  },

  roles: {
    manager: 'Manažér',
    chief_mechanic: 'Šéfmechanik',
    mechanic: 'Mechanik',
    driver: 'Jazdec',
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
