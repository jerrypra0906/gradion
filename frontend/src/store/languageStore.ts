import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/lib/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'id',
      setLanguage: (lang: Language) => set({ language: lang }),
    }),
    {
      // Bump key so new installs default to Bahasa Indonesia without inheriting old "en" persisted state.
      name: 'gradion-language-v2',
    }
  )
);

