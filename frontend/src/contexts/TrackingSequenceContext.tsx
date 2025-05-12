import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TrackingSequenceContextType {
  isInTrackingSequence: boolean;
  setIsInTrackingSequence: (value: boolean) => void;
  sequenceStartTime: Date | null;
  setSequenceStartTime: (time: Date | null) => void;
}

const TrackingSequenceContext = createContext<TrackingSequenceContextType | undefined>(undefined);

export function TrackingSequenceProvider({ children }: { children: ReactNode }) {
  const [isInTrackingSequence, setIsInTrackingSequence] = useState(false);
  const [sequenceStartTime, setSequenceStartTime] = useState<Date | null>(null);

  return (
    <TrackingSequenceContext.Provider value={{
      isInTrackingSequence,
      setIsInTrackingSequence,
      sequenceStartTime,
      setSequenceStartTime
    }}>
      {children}
    </TrackingSequenceContext.Provider>
  );
}

export function useTrackingSequence() {
  const context = useContext(TrackingSequenceContext);
  if (context === undefined) {
    throw new Error('useTrackingSequence must be used within a TrackingSequenceProvider');
  }
  return context;
} 