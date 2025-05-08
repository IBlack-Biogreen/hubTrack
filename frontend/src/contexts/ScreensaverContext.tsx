import React, { createContext, useContext, useEffect, useState } from 'react';

interface ScreensaverSettings {
  enabled: boolean;
  nightModeStart: number; // 0-23
  nightModeEnd: number; // 0-23
}

interface ScreensaverContextType {
  isDimmed: boolean;
  isExtraDimmed: boolean;
  resetTimer: () => void;
  settings: ScreensaverSettings;
  updateSettings: (newSettings: Partial<ScreensaverSettings>) => void;
}

const defaultSettings: ScreensaverSettings = {
  enabled: true,
  nightModeStart: 0, // 12 AM
  nightModeEnd: 6, // 6 AM
};

const ScreensaverContext = createContext<ScreensaverContextType | undefined>(undefined);

export const ScreensaverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDimmed, setIsDimmed] = useState(false);
  const [isExtraDimmed, setIsExtraDimmed] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [settings, setSettings] = useState<ScreensaverSettings>(defaultSettings);

  const resetTimer = () => {
    setLastActivity(Date.now());
    setIsDimmed(false);
    setIsExtraDimmed(false);
  };

  const updateSettings = (newSettings: Partial<ScreensaverSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  useEffect(() => {
    if (!settings.enabled) {
      setIsDimmed(false);
      setIsExtraDimmed(false);
      return;
    }

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    const checkInactivity = () => {
      const now = Date.now();
      const hours = new Date().getHours();
      const isNightTime = hours >= settings.nightModeStart && hours < settings.nightModeEnd;
      
      if (now - lastActivity > 10 * 60 * 1000) { // 10 minutes
        setIsDimmed(true);
        if (isNightTime) {
          setIsExtraDimmed(true);
        }
      }
    };

    const interval = setInterval(checkInactivity, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(interval);
    };
  }, [lastActivity, settings]);

  return (
    <ScreensaverContext.Provider value={{ isDimmed, isExtraDimmed, resetTimer, settings, updateSettings }}>
      {children}
    </ScreensaverContext.Provider>
  );
};

export const useScreensaver = () => {
  const context = useContext(ScreensaverContext);
  if (context === undefined) {
    throw new Error('useScreensaver must be used within a ScreensaverProvider');
  }
  return context;
}; 