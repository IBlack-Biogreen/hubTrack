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
import { useLanguage } from '../contexts/LanguageContext';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import GrainIcon from '@mui/icons-material/Grain';

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
  const [weather, setWeather] = useState<{
    temperature: number;
    condition: string;
    icon: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const { t } = useLanguage();

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/weather');
        setWeather(response.data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

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
    let isSubscribed = true;
    
    const fetchWeight = async () => {
      if (!isSubscribed) return;
      
      try {
        const response = await fetch('http://localhost:5001/api/labjack/ain1', {
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(3000)
        });
        
        if (!isSubscribed) return;
        
        if (!response.ok) {
          throw new Error('Failed to fetch weight');
        }
        
        const data = await response.json();
        if (isSubscribed) {
          setWeight(data.weight);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Weight fetch request timed out');
        } else {
          console.error('Error fetching weight:', err);
        }
        // Don't set weight to null on error to maintain last known good value
      }
    };

    // Initial fetch
    fetchWeight();

    // Set up polling with a longer interval to reduce network load
    const interval = setInterval(fetchWeight, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
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
      setError(t('pleaseEnterPin'));
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
            setError(t('invalidPin'));
            setPin('');
          }
        } else {
          setError(t('invalidPin'));
          setPin('');
        }
      } else {
        const success = await login(pinToCheck);
        if (!success) {
          setError(t('invalidPin'));
          setPin('');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('somethingWentWrong'));
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
            {t('noFeedTypes')}
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 4 }}>
            {t('addFeedTypes')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/audits')}
            >
              {t('goToAudits')}
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
              {t('quickStats')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e3a5f' : '#e3f2fd'
              }}>
                <Typography variant="body2">{t('today')}</Typography>
                <Typography variant="h5">{stats.today.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1b4332' : '#e8f5e9'
              }}>
                <Typography variant="body2">{t('thisWeek')}</Typography>
                <Typography variant="h5">{stats.thisWeek.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#5c4033' : '#fff3e0'
              }}>
                <Typography variant="body2">{t('thisMonth')}</Typography>
                <Typography variant="h5">{stats.thisMonth.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#4a1c40' : '#fce4ec'
              }}>
                <Typography variant="body2">{t('thisYear')}</Typography>
                <Typography variant="h5">{stats.thisYear.toFixed(2)} lbs</Typography>
              </Paper>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#3c2a4a' : '#f3e5f5'
              }}>
                <Typography variant="body2">{t('allTime')}</Typography>
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
                placeholder={error || t('enterPinToStart')}
                error={!!error}
                InputProps={{
                  readOnly: true,
                  sx: { fontSize: '1.25rem', letterSpacing: '0.25rem', textAlign: 'center' }
                }}
                variant="outlined"
                sx={{ mb: 2 }}
              />
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

        {/* Right Column - Camera Preview and Weather */}
        <Grid item xs={12} md={4}>
          {/* Combined Camera and Weight Card */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, height: 'calc(100vh - 256px)', display: 'flex', flexDirection: 'column' }}>
            {/* Weight Display */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h3" color="primary">
                {weight !== null ? (Math.abs(weight) <= 0.25 ? '0.00' : weight.toFixed(2)) : '--'} lbs
              </Typography>
            </Box>

            {/* Camera Display */}
            <Box sx={{ 
              flex: 1, 
              position: 'relative', 
              width: '100%', 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                maxHeight: 'calc(100% - 20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Webcam
                  ref={webcamRef}
                  onUserMediaError={(error) => {
                    console.error('Camera error:', error);
                    setCameraError(t('cameraError'));
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
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                />
                {cameraError && (
                  <Typography color="error" sx={{ mt: 1, textAlign: 'center' }}>
                    {cameraError}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Weather and Time Card */}
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={2}>
              {/* Time Display */}
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon color="primary" />
                  <Typography variant="h6">
                    {currentTime}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {new Date().toLocaleDateString()}
                </Typography>
              </Grid>

              {/* Weather Display */}
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {weather?.icon === 'sunny' && <WbSunnyIcon color="warning" />}
                  {weather?.icon === 'cloudy' && <CloudIcon color="info" />}
                  {weather?.icon === 'rainy' && <GrainIcon color="primary" />}
                  <Typography variant="h6">
                    {weather ? `${weather.temperature}°F` : '--'}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {weather?.condition || 'Loading...'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home; 