import { useLanguageStore } from '@/store/languageStore';
import { getTranslation, type TranslationKey } from '@/lib/translations';

export const useTranslation = () => {
  const language = useLanguageStore((state) => state.language);
  
  const t = (key: TranslationKey): string => {
    return getTranslation(language, key);
  };
  
  return { t, language };
};

