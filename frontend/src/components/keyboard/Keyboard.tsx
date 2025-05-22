import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import BackspaceIcon from '@mui/icons-material/Backspace';
import KeyboardCapslockIcon from '@mui/icons-material/KeyboardCapslock';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter?: () => void;
  disabled?: boolean;
  maxLength?: number;
  currentValue?: string;
}

const KEY_STYLE = {
  minWidth: 56,
  minHeight: 56,
  margin: '0 8px 12px 0',
  fontSize: '1.25rem',
  flex: '0 0 auto',
};

const SPACE_STYLE = {
  minWidth: 320,
  minHeight: 56,
  margin: '0 8px 12px 0',
  fontSize: '1.25rem',
  flex: '0 0 auto',
};

const Keyboard: React.FC<KeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onClear,
  onEnter,
  disabled = false,
  maxLength = 100,
  currentValue = '',
}) => {
  const [isCapsLock, setIsCapsLock] = useState(false);

  const handleKeyPress = (key: string) => {
    if (disabled) return;
    if (currentValue.length < maxLength) {
      // Auto-capitalize first character or use caps lock for other characters
      if (currentValue.length === 0) {
        onKeyPress(key.toUpperCase());
      } else {
        onKeyPress(isCapsLock ? key.toUpperCase() : key.toLowerCase());
      }
    }
  };

  const toggleCapsLock = () => {
    setIsCapsLock(!isCapsLock);
  };

  // QWERTY layout with correct row alignment
  const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['Caps', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
    ['Space', 'Enter']
  ];

  // Row indents for QWERTY look
  const rowIndents = [0, 24, 48, 0, 80];

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', mt: 2 }}>
      {keyboardLayout.map((row, rowIndex) => (
        <Box
          key={`row-${rowIndex}`}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 1,
            ml: `${rowIndents[rowIndex]}px`,
          }}
        >
          {row.map((key) => {
            if (key === '⌫') {
              return (
                <Button
                  key={key}
                  variant="outlined"
                  color="error"
                  onClick={onBackspace}
                  sx={KEY_STYLE}
                  disabled={disabled}
                >
                  <BackspaceIcon />
                </Button>
              );
            }
            if (key === 'Caps') {
              return (
                <Button
                  key={key}
                  variant="outlined"
                  color={isCapsLock ? 'primary' : 'inherit'}
                  onClick={toggleCapsLock}
                  sx={KEY_STYLE}
                  disabled={disabled}
                >
                  <KeyboardCapslockIcon />
                </Button>
              );
            }
            if (key === 'Space') {
              return (
                <Button
                  key={key}
                  variant="contained"
                  onClick={() => handleKeyPress(' ')}
                  sx={SPACE_STYLE}
                  disabled={disabled}
                >
                  Space
                </Button>
              );
            }
            if (key === 'Enter') {
              return (
                <Button
                  key={key}
                  variant="contained"
                  color="primary"
                  onClick={onEnter}
                  sx={KEY_STYLE}
                  disabled={disabled}
                >
                  Enter
                </Button>
              );
            }
            return (
              <Button
                key={key}
                variant="contained"
                onClick={() => handleKeyPress(key)}
                sx={KEY_STYLE}
                disabled={disabled}
              >
                {isCapsLock ? key.toUpperCase() : key.toLowerCase()}
              </Button>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export default Keyboard; 