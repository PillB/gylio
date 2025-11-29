import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import esPE from './es-PE.json';

// i18n initialisation
// We load English and Peruvian Spanish translations from JSON files. The
// default language is English. The fallback language is also English. To
// support additional locales, add a new import and resource entry below.

const resources = {
  en: { translation: en },
  'es-PE': { translation: esPE }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es-PE'],
    useDeviceLanguage: true,
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie']
    },
    interpolation: {
      escapeValue: false // react already escapes by default
    }
  });

export default i18n;
