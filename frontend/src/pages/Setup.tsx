import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Grid,
} from '@mui/material';
import type { GridProps } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
Chart.register(...registerables);

export default function Setup() {
  const [reading, setReading] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{voltage: number, weight: number, timestamp: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scaleFactor, setScaleFactor] = useState(24.5);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/labjack/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        const data = await response.json();
        setScaleFactor(data.scale_factor);
      } catch (err) {
        console.error('Error fetching config:', err);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchReading = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/labjack/ain1');
        if (!response.ok) {
          throw new Error('Failed to fetch reading');
        }
        const data = await response.json();
        setReading(data.voltage);
        setWeight(data.weight);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reading');
      } finally {
        setLoading(false);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/labjack/history');
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    };

    // Initial fetches
    fetchReading();
    fetchHistory();

    // Set up polling
    const readingInterval = setInterval(fetchReading, 500);
    const historyInterval = setInterval(fetchHistory, 1000);

    return () => {
      clearInterval(readingInterval);
      clearInterval(historyInterval);
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && history.length > 0) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: history.map(item => item.timestamp),
            datasets: [{
              label: 'Weight (lbs)',
              data: history.map(item => item.weight),
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              borderWidth: 2,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: 'time',
                time: {
                  unit: 'second',
                  displayFormats: {
                    second: 'HH:mm:ss'
                  }
                },
                title: {
                  display: true,
                  text: 'Time'
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Weight (lbs)'
                }
              }
            },
            animation: {
              duration: 0
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [history]);

  const handleTare = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/labjack/tare', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to tare');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tare');
    }
  };

  const handleScaleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(event.target.value);
    if (isNaN(newScale)) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/labjack/scale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scale: newScale }),
      });
      if (!response.ok) {
        throw new Error('Failed to update scale');
      }
      setScaleFactor(newScale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update scale');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('setup') || 'Setup'}
        </Typography>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Load Cell Configuration
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Scale Factor (lbs/volt)"
                type="number"
                value={scaleFactor}
                onChange={handleScaleChange}
                fullWidth
                inputProps={{
                  step: 0.1,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                onClick={handleTare}
                fullWidth
                sx={{ height: '56px' }}
              >
                Tare
              </Button>
            </Grid>
          </Grid>
        </Paper>

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
            Load Cell Reading
          </Typography>

          {loading ? (
            <CircularProgress sx={{ mt: 2 }} />
          ) : error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Grid container spacing={2} justifyContent="center">
                <Grid item xs={6}>
                  <Typography variant="h3" component="div" color="primary">
                    {reading?.toFixed(3)} V
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h3" component="div" color="secondary">
                    {weight?.toFixed(2)} lbs
                  </Typography>
                </Grid>
              </Grid>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
            height: '400px'
          }}
        >
          <canvas ref={chartRef} />
        </Paper>
      </Box>
    </Container>
  );
} 