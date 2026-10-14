import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import sk from './locales/sk'

/** Dostupné jazyky. Nový jazyk: pridať súbor do locales/ a záznam sem. */
export const LANGUAGES = [{ code: 'sk', label: 'Slovenčina' }] as const
export type LanguageCode = (typeof LANGUAGES)[number]['code']

export const DEFAULT_LANGUAGE: LanguageCode = 'sk'

void i18n.use(initReactI18next).init({
  resources: { sk: { translation: sk } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function setLanguage(code: string) {
  const lang = LANGUAGES.some((l) => l.code === code) ? code : DEFAULT_LANGUAGE
  if (i18n.language !== lang) void i18n.changeLanguage(lang)
  document.documentElement.lang = lang
}

export default i18n
