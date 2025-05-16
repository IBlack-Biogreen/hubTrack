import React from 'react';
import { Box, Button, Grid } from '@mui/material';
import BackspaceIcon from '@mui/icons-material/Backspace';

interface NumberPadProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
  showDecimal?: boolean;
  maxLength?: number;
  currentValue?: string;
}

const NumberPad: React.FC<NumberPadProps> = ({
  onKeyPress,
  onBackspace,
  onClear,
  disabled = false,
  showDecimal = false,
  maxLength = 10,
  currentValue = '',
}) => {
  const handleKeyPress = (key: string) => {
    if (disabled) return;
    
    // Handle decimal point
    if (key === '.' && showDecimal) {
      if (!currentValue.includes('.')) {
        onKeyPress(key);
      }
      return;
    }

    // Handle number input
    if (currentValue.length < maxLength) {
      onKeyPress(key);
    }
  };

  const numberPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [showDecimal ? '.' : 'C', '0', '⌫']
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
      <Grid container spacing={2}>
        {numberPad.map((row, rowIndex) => (
          <Grid item container justifyContent="center" spacing={2} key={`row-${rowIndex}`}>
            {row.map((key) => (
              <Grid item xs={4} key={key}>
                {key === '⌫' ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    onClick={onBackspace}
                    sx={{ height: 64, fontSize: '1.25rem' }}
                    disabled={disabled}
                  >
                    <BackspaceIcon />
                  </Button>
                ) : key === 'C' ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    onClick={onClear}
                    sx={{ height: 64, fontSize: '1.25rem' }}
                    disabled={disabled}
                  >
                    {key}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleKeyPress(key)}
                    sx={{ height: 64, fontSize: '1.5rem' }}
                    disabled={disabled}
                  >
                    {key}
                  </Button>
                )}
              </Grid>
            ))}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default NumberPad; 