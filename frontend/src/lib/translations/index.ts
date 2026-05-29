import { en } from './en';
import { id } from './id';

export type TranslationKey = keyof typeof en;
export type Language = 'en' | 'id';

export const translations = {
  en,
  id,
} as const;

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  return translations[lang][key] || translations.en[key] || key;
};

