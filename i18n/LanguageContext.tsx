import React, { createContext, useContext, useState, useCallback } from 'react';
import { Language, translations, LANGUAGE_OPTIONS } from './translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => { },
    t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const stored = localStorage.getItem('wt_language');
        return (stored as Language) || 'en';
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('wt_language', lang);
    }, []);

    const t = useCallback((key: string): string => {
        const dict = translations[language] as any;
        return dict[key] || (translations['en'] as any)[key] || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
export { LANGUAGE_OPTIONS };
export type { Language };
