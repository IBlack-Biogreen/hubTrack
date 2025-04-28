import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export const availableLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

type Translations = {
  [key: string]: {
    [langCode: string]: string;
  };
};

const translations: Translations = {
  home: {
    en: 'Home',
    es: 'Inicio',
  },
  storage: {
    en: 'Storage',
    es: 'Almacenamiento',
  },
  feedViewer: {
    en: 'Feed Viewer',
    es: 'Visor de Alimentación',
  },
  covers: {
    en: 'Covers',
    es: 'Cubiertas',
  },
  events: {
    en: 'Events',
    es: 'Eventos',
  },
  audits: {
    en: 'Audits',
    es: 'Auditorías',
  },
  stats: {
    en: 'Stats',
    es: 'Estadísticas',
  },
  materials: {
    en: 'Materials',
    es: 'Materiales',
  },
  users: {
    en: 'Users',
    es: 'Usuarios',
  },
  settings: {
    en: 'Settings',
    es: 'Configuración',
  },
  darkMode: {
    en: 'Dark Mode',
    es: 'Modo Oscuro',
  },
  language: {
    en: 'Language',
    es: 'Idioma',
  },
  availableLanguages: {
    en: 'Available Languages',
    es: 'Idiomas Disponibles',
  },
  selectLanguage: {
    en: 'Select Language',
    es: 'Seleccionar Idioma',
  },
  addLanguage: {
    en: 'Add Language',
    es: 'Agregar Idioma',
  },
  removeLanguage: {
    en: 'Remove Language',
    es: 'Eliminar Idioma',
  },
  en: {
    home: 'Home',
    storage: 'Storage',
    feedviewer: 'Feed Viewer',
    covers: 'Covers',
    events: 'Events',
    audits: 'Audits',
    stats: 'Stats',
    materials: 'Materials',
    users: 'Users',
    setup: 'Setup',
    settings: 'Settings',
    darkMode: 'Dark Mode',
  },
  userAuthentication: {
    en: 'User Authentication',
    es: 'Autenticación de Usuario',
  },
  selectOrganization: {
    en: 'Select Organization',
    es: 'Seleccionar Organización',
  },
  selectOrganizationDescription: {
    en: 'Please select an organization from the list below',
    es: 'Por favor seleccione una organización de la lista',
  },
  selectDepartment: {
    en: 'Select Department',
    es: 'Seleccionar Departamento',
  },
  selectDepartmentDescription: {
    en: 'Please select a department from the list below',
    es: 'Por favor seleccione un departamento de la lista',
  },
  selectFeedType: {
    en: 'Select Feed Type',
    es: 'Seleccionar Tipo de Alimento',
  },
  selectFeedTypeDescription: {
    en: 'Please select a feed type from the list below',
    es: 'Por favor seleccione un tipo de alimento de la lista',
  },
  summary: {
    en: 'Summary',
    es: 'Resumen',
  },
  summaryDescription: {
    en: 'Review the feed details before submission',
    es: 'Revise los detalles del alimento antes de enviar',
  },
  pleaseEnterPin: {
    en: 'Please enter your PIN to continue',
    es: 'Por favor ingrese su PIN para continuar',
  },
};

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  enabledLanguages: Language[];
  addEnabledLanguage: (language: Language) => void;
  removeEnabledLanguage: (languageCode: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(availableLanguages[0]);
  const [enabledLanguages, setEnabledLanguages] = useState<Language[]>([availableLanguages[0], availableLanguages[1]]);

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language);
  };

  const t = (key: string): string => {
    return translations[key]?.[currentLanguage.code] || key;
  };

  const addEnabledLanguage = (language: Language) => {
    if (!enabledLanguages.find(lang => lang.code === language.code)) {
      setEnabledLanguages([...enabledLanguages, language]);
    }
  };

  const removeEnabledLanguage = (languageCode: string) => {
    if (languageCode !== 'en') { // Prevent removing English
      setEnabledLanguages(enabledLanguages.filter(lang => lang.code !== languageCode));
      if (currentLanguage.code === languageCode) {
        setCurrentLanguage(availableLanguages[0]); // Switch to English if current language is removed
      }
    }
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setLanguage,
      t,
      enabledLanguages,
      addEnabledLanguage,
      removeEnabledLanguage,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 