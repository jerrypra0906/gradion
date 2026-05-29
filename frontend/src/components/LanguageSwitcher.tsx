'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import Image from 'next/image';

type Language = 'en' | 'id';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '/flags/us.svg' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '/flags/id.svg' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
    // Reload page to apply translations
    window.location.reload();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <div className="w-6 h-4 relative">
          {currentLanguage.code === 'en' ? (
            <svg className="w-6 h-4" viewBox="0 0 640 320" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="640" height="320" fill="#012169"/>
              <path d="M0 0L640 320M640 0L0 320" stroke="white" strokeWidth="40"/>
              <path d="M0 128L640 192M640 128L0 192" stroke="white" strokeWidth="53.33"/>
              <path d="M256 0L384 320M640 128L0 192M0 192L640 128" stroke="#C8102E" strokeWidth="26.67"/>
              <rect x="0" y="0" width="256" height="128" fill="#012169"/>
              <path d="M102.4 0L153.6 51.2L204.8 0H256V25.6L204.8 76.8L256 128H204.8L153.6 76.8L102.4 128H51.2L102.4 76.8L51.2 25.6V0H102.4Z" fill="white"/>
              <path d="M102.4 0L153.6 51.2L204.8 0H256V25.6L204.8 76.8L256 128H204.8L153.6 76.8L102.4 128H51.2L102.4 76.8L51.2 25.6V0H102.4Z" fill="#C8102E"/>
            </svg>
          ) : (
            <svg className="w-6 h-4" viewBox="0 0 640 320" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="640" height="160" fill="#FF0000"/>
              <rect y="160" width="640" height="160" fill="white"/>
            </svg>
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {currentLanguage.code.toUpperCase()}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  language === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div className="w-6 h-4 relative flex-shrink-0">
                  {lang.code === 'en' ? (
                    <svg className="w-6 h-4" viewBox="0 0 640 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="640" height="320" fill="#012169"/>
                      <path d="M0 0L640 320M640 0L0 320" stroke="white" strokeWidth="40"/>
                      <path d="M0 128L640 192M640 128L0 192" stroke="white" strokeWidth="53.33"/>
                      <path d="M256 0L384 320M640 128L0 192M0 192L640 128" stroke="#C8102E" strokeWidth="26.67"/>
                      <rect x="0" y="0" width="256" height="128" fill="#012169"/>
                      <path d="M102.4 0L153.6 51.2L204.8 0H256V25.6L204.8 76.8L256 128H204.8L153.6 76.8L102.4 128H51.2L102.4 76.8L51.2 25.6V0H102.4Z" fill="white"/>
                      <path d="M102.4 0L153.6 51.2L204.8 0H256V25.6L204.8 76.8L256 128H204.8L153.6 76.8L102.4 128H51.2L102.4 76.8L51.2 25.6V0H102.4Z" fill="#C8102E"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-4" viewBox="0 0 640 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="640" height="160" fill="#FF0000"/>
                      <rect y="160" width="640" height="160" fill="white"/>
                    </svg>
                  )}
                </div>
                <span className="flex-1 text-left">{lang.name}</span>
                {language === lang.code && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

