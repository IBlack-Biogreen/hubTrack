import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
} from '@mui/material';

function Home() {
  const [pin, setPin] = useState<string>('');

  const handleNumberClick = (number: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + number);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = () => {
    // Handle pin submission logic here
    console.log('Submitted PIN:', pin);
    setPin('');
  };

  const numbers = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [0]
  ];

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to HubTrack
        </Typography>
        
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Enter PIN
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h4">
              {pin.replace(/./g, '•')}
            </Typography>
          </Box>

          <Box sx={{ maxWidth: 300, width: '100%' }}>
            {numbers.map((row, rowIndex) => (
              <Box 
                key={rowIndex} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  gap: 2,
                  mb: rowIndex === numbers.length - 1 ? 0 : 2
                }}
              >
                {row.map((number) => (
                  <Button
                    key={number}
                    variant="contained"
                    color="primary"
                    onClick={() => handleNumberClick(number.toString())}
                    sx={{ 
                      height: '60px', 
                      width: '60px',
                      fontSize: '1.5rem',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                  >
                    {number}
                  </Button>
                ))}
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClear}
              sx={{ mt: 2 }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              sx={{ mt: 2 }}
              disabled={pin.length !== 4}
            >
              Submit
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Home; 