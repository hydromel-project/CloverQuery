import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation, type Language, type TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr'); // Default to French
  
  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('clover-query-language') as Language;
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
  }, []);
  
  // Save language to localStorage when it changes
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('clover-query-language', lang);
  };
  
  // Translation function
  const t = (key: TranslationKey) => getTranslation(key, language);
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Language selector component
export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{t('language')}:</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="text-sm border rounded px-2 py-1 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
      >
        <option value="fr">{t('french')}</option>
        <option value="en">{t('english')}</option>
      </select>
    </div>
  );
}