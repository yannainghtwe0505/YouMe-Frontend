/**
 * YouMe UI i18n (react-i18next).
 *
 * Boundary: **translation keys are for product UI only** (chrome, labels, buttons, empty states,
 * validation, confirm dialogs, server-error fallbacks). **Never** pass user-authored or API-persisted
 * strings through `t()` — render profile fields, bios, chat bodies, peer names, and last-message
 * previews exactly as returned from the API / stored in state.
 *
 * Key layout (single `translation` namespace, nested JSON):
 * - `common`, `app`, `errors`, `lang`, `auth`, `register`, `nav`
 * - `feed`, `discover`, `matches`, `likes`, `photos`, `messages`, `profile`
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ja from './locales/ja.json';
import my from './locales/my.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      my: { translation: my },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja', 'my'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'youme_lang',
    },
  });

export default i18n;
