import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  Snackbar,
} from '@mui/material';
import usePin from '../hooks/usePin';
import { useUser } from '../contexts/UserContext';

function Home() {
  const [pin, setPin] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const { verifyPin, loading } = usePin();
  const { setCurrentUser } = useUser();
  const navigate = useNavigate();
  const pinpadRef = useRef<HTMLDivElement>(null);

  // Reset shake animation when it ends
  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 820); // Slightly longer than animation duration
      return () => clearTimeout(timer);
    }
  }, [shake]);

  // Effect to auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && !loading) {
      handleSubmit();
    }
  }, [pin, loading]);

  const handleNumberClick = (number: string) => {
    if (pin.length < 4 && !loading) {
      setPin(prev => prev + number);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async () => {
    if (pin.length !== 4 || loading) return;
    
    try {
      const result = await verifyPin(pin);
      
      if (result.success && result.user) {
        // Store user in context
        setCurrentUser(result.user);
        
        // Navigate without animation or snackbar
        navigate('/tracking-sequence');
      } else {
        // Invalid PIN - show shake animation
        setShake(true);
        
        // Clear the PIN after a short delay
        setTimeout(() => {
          setPin('');
        }, 500);
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setShake(true);
      setTimeout(() => {
        setPin('');
      }, 500);
    }
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
          
          {/* Fixed height container for PIN display to prevent layout shifts */}
          <Box 
            ref={pinpadRef}
            sx={{ 
              mb: 3,
              height: '70px', // Fixed height to prevent layout shift
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              animation: shake ? 'shake 0.8s cubic-bezier(.36,.07,.19,.97) both' : 'none',
              '@keyframes shake': {
                '10%, 90%': {
                  transform: 'translate3d(-1px, 0, 0)'
                },
                '20%, 80%': {
                  transform: 'translate3d(2px, 0, 0)'
                },
                '30%, 50%, 70%': {
                  transform: 'translate3d(-4px, 0, 0)'
                },
                '40%, 60%': {
                  transform: 'translate3d(4px, 0, 0)'
                }
              }
            }}
          >
            <Typography variant="h4" sx={{ minHeight: '40px' }}>
              {pin.length > 0 ? pin.replace(/./g, '•') : ' '}
            </Typography>
            {loading && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Verifying...
              </Typography>
            )}
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
                    disabled={loading}
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

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClear}
              sx={{ mt: 2 }}
              disabled={loading}
            >
              Clear
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Home; 