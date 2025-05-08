import React from 'react';
import { useScreensaver } from '../contexts/ScreensaverContext';

export const ScreensaverOverlay: React.FC = () => {
  const { isDimmed, isExtraDimmed, resetTimer } = useScreensaver();

  if (!isDimmed && !isExtraDimmed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        opacity: isExtraDimmed ? 0.8 : 0.5,
        zIndex: 9999,
        transition: 'opacity 0.3s ease-in-out',
      }}
      onClick={resetTimer}
    />
  );
}; 