import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Grid as Grid2,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import Webcam from 'react-webcam';

// Register Chart.js components
Chart.register(...registerables);

export default function Setup() {
  const [reading, setReading] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{voltage: number, weight: number, timestamp: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scaleFactor, setScaleFactor] = useState(24.5);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [carts, setCarts] = useState<Array<{ 
    _id: string, 
    serialNumber: string, 
    machserial: number,
    currentDeviceLabelID?: string 
  }>>([]);
  const [selectedCart, setSelectedCart] = useState<string>('');
  const [cartsLoading, setCartsLoading] = useState(true);
  const [cartsError, setCartsError] = useState<string | null>(null);
  const [isCartSelected, setIsCartSelected] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const { t } = useLanguage();
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Load saved cart on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('selectedCart');
    const savedDeviceLabel = localStorage.getItem('selectedDeviceLabel');
    if (savedCart) {
      setSelectedCart(savedCart);
      setIsCartSelected(true);
    }
  }, []);

  // Save cart selection to localStorage
  const handleCartSelection = (serialNumber: string) => {
    const selectedCartData = carts.find(cart => cart.serialNumber === serialNumber);
    setSelectedCart(serialNumber);
    setIsCartSelected(true);
    localStorage.setItem('selectedCart', serialNumber);
    
    // If the cart has a currentDeviceLabelID, save it
    if (selectedCartData?.currentDeviceLabelID) {
      localStorage.setItem('selectedDeviceLabel', selectedCartData.currentDeviceLabelID);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/labjack/config');
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
        const response = await fetch('http://localhost:5001/api/labjack/ain1');
        if (!response.ok) {
          throw new Error('Failed to fetch reading');
        }
        const data = await response.json();
        console.log('Received reading:', data);  // Debug log
        setReading(data.voltage);
        setWeight(data.weight);
        setError(null);
      } catch (err) {
        console.error('Error fetching reading:', err);
        setError('Failed to connect to load cell server. Please ensure the server is running.');
      } finally {
        setLoading(false);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/labjack/history');
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error('Error fetching history:', err);
        // Don't set error state for history as it's not critical
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
      const response = await fetch('http://localhost:5001/api/labjack/tare', {
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
      const response = await fetch('http://localhost:5001/api/labjack/scale', {
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

  const handleCameraError = (error: string | DOMException) => {
    console.error('Camera error:', error);
    setCameraError('Failed to access camera. Please check your camera permissions and connection.');
  };

  const handleCameraLoad = () => {
    console.log('Camera loaded successfully');
    setCameraError(null);
  };

  // Fetch carts on component mount
  useEffect(() => {
    const fetchCarts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/carts/serial-numbers');
        if (!response.ok) {
          throw new Error('Failed to fetch cart serial numbers');
        }
        const data = await response.json();
        setCarts(data);
        setCartsError(null);
      } catch (err) {
        console.error('Error fetching carts:', err);
        setCartsError('Failed to load cart serial numbers');
      } finally {
        setCartsLoading(false);
      }
    };

    // Only fetch carts if no cart is selected
    if (!isCartSelected) {
      fetchCarts();
    } else {
      setCartsLoading(false);
    }
  }, [isCartSelected, setCarts, setCartsError, setCartsLoading]);

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
          <Typography variant="h6" gutterBottom>
            Cart Selection
          </Typography>
          {cartsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cartsError}
            </Alert>
          )}
          {isCartSelected ? (
            <Box sx={{ p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body1">
                Selected Cart: Serial {selectedCart}
              </Typography>
            </Box>
          ) : (
            <FormControl fullWidth>
              <InputLabel>Select Cart Serial Number</InputLabel>
              <Select
                value={selectedCart}
                onChange={(e) => handleCartSelection(e.target.value)}
                label="Select Cart Serial Number"
                disabled={cartsLoading}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {carts.map((cart) => (
                  <MenuItem key={cart._id} value={cart.serialNumber}>
                    Serial: {cart.serialNumber} (Machine Serial: {cart.machserial})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {cartsLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Load Cell Configuration
          </Typography>
          <Grid2 container spacing={2}>
            <Grid2 item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Scale Factor (lbs/volt)"
                type="number"
                value={scaleFactor}
                onChange={handleScaleChange}
                disabled={loading}
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleTare}
                disabled={loading}
              >
                Tare
              </Button>
            </Grid2>
          </Grid2>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Current Reading
          </Typography>
          <Grid2 container spacing={2}>
            <Grid2 item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Voltage (V)"
                value={reading?.toFixed(4) || ''}
                disabled
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Weight (lbs)"
                value={weight?.toFixed(2) || ''}
                disabled
              />
            </Grid2>
          </Grid2>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
            height: '300px',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Weight History
          </Typography>
          <canvas ref={chartRef} />
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Camera
          </Typography>
          {cameraError ? (
            <Alert severity="error">{cameraError}</Alert>
          ) : (
            <Box sx={{ position: 'relative', width: '100%', height: '300px' }}>
              <Webcam
                ref={webcamRef}
                onUserMediaError={handleCameraError}
                onUserMedia={handleCameraLoad}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Button
                variant="contained"
                onClick={capture}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                }}
              >
                Capture
              </Button>
            </Box>
          )}
          {capturedImage && (
            <Box sx={{ mt: 2 }}>
              <img
                src={capturedImage}
                alt="Captured"
                style={{ maxWidth: '100%' }}
              />
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
} 