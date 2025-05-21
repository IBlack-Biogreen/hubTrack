import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  CircularProgress
} from '@mui/material';
import { useUser } from '../contexts/UserContext';
import BackspaceIcon from '@mui/icons-material/Backspace';
import axios from 'axios';
import Webcam from 'react-webcam';

const API_URL = window.electron ? 'http://localhost:5000/api' : '/api';

const Home: React.FC = () => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasFeedTypes, setHasFeedTypes] = useState<boolean>(true);
  const { login, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    allTime: 0
  });
  const [weight, setWeight] = useState<number | null>(null);

  // Fetch stats on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  // Check for feed types on component mount
  useEffect(() => {
    const checkFeedTypes = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/feed-types');
        setHasFeedTypes(response.data.length > 0);
      } catch (error) {
        console.error('Error checking feed types:', error);
      }
    };
    checkFeedTypes();
  }, []);

  // If user is already authenticated, redirect to tracking sequence
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/tracking-sequence');
    }
  }, [isAuthenticated, navigate]);

  // Fetch weight reading
  useEffect(() => {
    const fetchWeight = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/labjack/ain1');
        if (!response.ok) {
          throw new Error('Failed to fetch weight');
        }
        const data = await response.json();
        setWeight(data.weight);
      } catch (err) {
        console.error('Error fetching weight:', err);
      }
    };

    // Initial fetch
    fetchWeight();

    // Set up polling
    const interval = setInterval(fetchWeight, 500);

    return () => clearInterval(interval);
  }, []);

  // Handle PIN input
  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      
      // If we've reached 4 digits, attempt login
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
  const handleLogin = async (pinToCheck: string) => {
    if (pinToCheck.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (window.electron) {
        const response = await window.electron.api.post('verify-pin', { pin: pinToCheck });
        if (response.success) {
          const success = await login(pinToCheck);
          if (!success) {
            setError('Invalid PIN. Please try again.');
            setPin('');
          }
        } else {
          setError('Invalid PIN. Please try again.');
          setPin('');
        }
      } else {
        const success = await login(pinToCheck);
        if (!success) {
          setError('Invalid PIN. Please try again.');
          setPin('');
        }
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

  if (!hasFeedTypes) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mt: 8 }}>
          <Typography variant="h5" component="h2" align="center" gutterBottom>
            No Feed Types Available
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 4 }}>
            Please add feed types in the Audits page to start tracking.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/audits')}
            >
              Go to Audits
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch',
      bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
      position: 'absolute',
      top: '64px',
      left: 0
    }}>
      <Grid container spacing={3} sx={{ 
        width: '100%',
        height: '100%',
        maxWidth: '1800px',
        px: 3,
        m: 0,
        flex: 1
      }}>
        {/* Left Column - Stats */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: 'calc(100vh - 128px)', borderRadius: 2, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Tracking Statistics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e3a5f' : '#e3f2fd'
              }}>
                <Typography variant="body2">Today</Typography>
                <Typography variant="h5">{stats.today.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1b4332' : '#e8f5e9'
              }}>
                <Typography variant="body2">This Week</Typography>
                <Typography variant="h5">{stats.thisWeek.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#5c4033' : '#fff3e0'
              }}>
                <Typography variant="body2">This Month</Typography>
                <Typography variant="h5">{stats.thisMonth.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#4a1c40' : '#fce4ec'
              }}>
                <Typography variant="body2">This Year</Typography>
                <Typography variant="h5">{stats.thisYear.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#3c2a4a' : '#f3e5f5'
              }}>
                <Typography variant="body2">All Time</Typography>
                <Typography variant="h5">{stats.allTime.toFixed(2)} lbs</Typography>
              </Paper>
            </Box>
          </Paper>
        </Grid>

        {/* Center Column - PIN Pad */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: 'calc(100vh - 128px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                value={pin}
                type="password"
                placeholder="Enter PIN to Start Feed"
                InputProps={{
                  readOnly: true,
                  sx: { fontSize: '1.25rem', letterSpacing: '0.25rem', textAlign: 'center' }
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
          </Paper>
        </Grid>

        {/* Right Column - Camera Preview */}
        <Grid item xs={12} md={4}>
          {/* Load Cell Reading Card */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                {weight !== null ? (Math.abs(weight) <= 0.25 ? '0.00' : weight.toFixed(2)) : '--'} lbs
              </Typography>
            </Box>
          </Paper>

          <Paper elevation={3} sx={{ p: 3, height: 'calc(100vh - 256px)', borderRadius: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ position: 'relative', width: '100%', height: 'auto' }}>
              <Webcam
                ref={webcamRef}
                onUserMediaError={(error) => {
                  console.error('Camera error:', error);
                  setCameraError('Failed to access camera. Please check your camera permissions and connection.');
                  setCameraReady(false);
                }}
                onUserMedia={() => {
                  setCameraError(null);
                  setCameraReady(true);
                }}
                screenshotFormat="image/jpeg"
                width={480}
                height={360}
                audio={false}
                imageSmoothing={true}
                mirrored={false}
                videoConstraints={{
                  width: 480,
                  height: 360,
                  facingMode: "environment"
                }}
                style={{ width: '100%', borderRadius: '4px' }}
              />
              {cameraError && (
                <Typography color="error" sx={{ mt: 1, textAlign: 'center' }}>
                  {cameraError}
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home; 