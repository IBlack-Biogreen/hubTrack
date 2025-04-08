import { createContext, useContext, useState, ReactNode } from 'react';

interface TimeoutContextType {
  timeout: number;
  setTimeout: (value: number) => void;
}

const TimeoutContext = createContext<TimeoutContextType | undefined>(undefined);

export function TimeoutProvider({ children }: { children: ReactNode }) {
  const [timeout, setTimeout] = useState(10000); // Default 10 seconds

  return (
    <TimeoutContext.Provider value={{ timeout, setTimeout }}>
      {children}
    </TimeoutContext.Provider>
  );
}

export function useTimeout() {
  const context = useContext(TimeoutContext);
  if (context === undefined) {
    throw new Error('useTimeout must be used within a TimeoutProvider');
  }
  return context;
} 