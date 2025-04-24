import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  IconButton,
  CircularProgress
} from '@mui/material';
import { useUser } from '../contexts/UserContext';
import BackspaceIcon from '@mui/icons-material/Backspace';

const Home: React.FC = () => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { login, isAuthenticated } = useUser();
  const navigate = useNavigate();

  // If user is already authenticated, redirect to tracking sequence
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/tracking-sequence');
    }
  }, [isAuthenticated, navigate]);

  // Handle PIN input and attempt login when PIN is 4 digits
  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      
      // Automatically attempt login when pin reaches 4 digits
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  // Handle PIN backspace
  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  // Handle PIN clear
  const handlePinClear = () => {
    setPin('');
    setError(null);
  };

  // Handle login with PIN
  const handleLogin = async (pinToUse: string) => {
    if (pinToUse.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await login(pinToUse);
      
      if (success) {
        // Redirect to tracking sequence will happen in useEffect
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // PIN pad layout
  const pinPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫']
  ];

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mt: 8 }}>
        
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            value={pin}
            type="password"
            placeholder="Enter 4-digit PIN"
            InputProps={{
              readOnly: true,
              sx: { fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }
            }}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          {error && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
        </Box>

        <Grid container spacing={2}>
          {pinPad.map((row, rowIndex) => (
            <Grid item container justifyContent="center" spacing={2} key={`row-${rowIndex}`}>
              {row.map((key) => (
                <Grid item xs={4} key={key}>
                  {key === '⌫' ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      onClick={handlePinBackspace}
                      sx={{ height: 64, fontSize: '1.25rem' }}
                      disabled={loading}
                    >
                      <BackspaceIcon />
                    </Button>
                  ) : key === 'C' ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      onClick={handlePinClear}
                      sx={{ height: 64, fontSize: '1.25rem' }}
                      disabled={loading}
                    >
                      {key}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handlePinInput(key)}
                      sx={{ height: 64, fontSize: '1.5rem' }}
                      disabled={loading}
                    >
                      {key}
                    </Button>
                  )}
                </Grid>
              ))}
            </Grid>
          ))}
        </Grid>

        {loading && (
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Home; 