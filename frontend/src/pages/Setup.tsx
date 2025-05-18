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
  Grid as Grid2,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import Webcam from 'react-webcam';
import { NumberPad } from '../components/keyboard';

// Register Chart.js components
Chart.register(...registerables);

export default function Setup() {
  const [reading, setReading] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{voltage: number, weight: number, timestamp: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scaleFactor, setScaleFactor] = useState(24.5);
  const [tareVoltage, setTareVoltage] = useState(0.0);
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
  const [cartConfigLoaded, setCartConfigLoaded] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const { t } = useLanguage();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showChangeCartDialog, setShowChangeCartDialog] = useState(false);
  const [webcamDimensions, setWebcamDimensions] = useState({ width: 640, height: 480 });
  const [scaleFactorDialogOpen, setScaleFactorDialogOpen] = useState(false);
  const [tempScaleFactor, setTempScaleFactor] = useState('');

  // Load saved cart on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('selectedCart');
    const savedDeviceLabel = localStorage.getItem('selectedDeviceLabel');
    console.log('Saved cart from localStorage:', savedCart);
    
    if (savedCart) {
      setSelectedCart(savedCart);
      setIsCartSelected(true);
      
      // Load scale configuration from the cart
      const fetchCartConfig = async () => {
        try {
          console.log('Fetching cart config for:', savedCart);
          const response = await fetch(`http://localhost:5000/api/carts/${savedCart}`);
          if (response.ok) {
            const cartData = await response.json();
            console.log('Cart data received:', cartData);
            if (cartData.tareVoltage !== undefined) {
              console.log('Setting tare voltage from cart:', cartData.tareVoltage);
              setTareVoltage(cartData.tareVoltage);
            }
            if (cartData.scaleFactor !== undefined) {
              console.log('Setting scale factor from cart:', cartData.scaleFactor);
              setScaleFactor(cartData.scaleFactor);
            }
            setCartConfigLoaded(true);
          } else {
            console.error('Failed to fetch cart config:', response.status, response.statusText);
            setCartConfigLoaded(true); // Still mark as loaded even if it failed
          }
        } catch (err) {
          console.error('Error fetching cart config:', err);
          setCartConfigLoaded(true); // Still mark as loaded even if it failed
        }
      };
      
      fetchCartConfig();
    } else {
      setCartConfigLoaded(true); // No cart to load, so we're done
    }
  }, []);

  // Save cart selection to localStorage and database
  const handleCartSelection = async (serialNumber: string) => {
    const selectedCartData = carts.find(cart => cart.serialNumber === serialNumber);
    setSelectedCart(serialNumber);
    setIsCartSelected(true);
    localStorage.setItem('selectedCart', serialNumber);
    
    // If the cart has a currentDeviceLabelID, save it
    if (selectedCartData?.currentDeviceLabelID) {
      localStorage.setItem('selectedDeviceLabel', selectedCartData.currentDeviceLabelID);
    }

    // Update the database to mark this cart as selected and purge others
    try {
      // First, delete all other carts
      await fetch('http://localhost:5000/api/carts/purge-others', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keepSerialNumber: serialNumber }),
      });

      // Then select the chosen cart
      await fetch(`http://localhost:5000/api/carts/${serialNumber}/select`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error updating cart selection in database:', error);
    }
  };

  const handleChangeCart = async () => {
    try {
      // Check if backend is available
      try {
        const response = await fetch('http://localhost:5000/api/health');
        if (!response.ok) {
          throw new Error('Backend server is not responding');
        }
      } catch (error) {
        setCartsError('Backend server is not available. Please ensure the backend is running.');
        return;
      }

      // Clear localStorage
      localStorage.removeItem('selectedCart');
      localStorage.removeItem('selectedDeviceLabel');
      
      // Reset state
      setSelectedCart('');
      setIsCartSelected(false);
      
      // Fetch carts again
      await fetchCarts();
    } catch (error) {
      console.error('Error changing cart:', error);
      setCartsError('Failed to change cart. Please try again.');
    }
  };

  const fetchCarts = async () => {
    const maxRetries = 3;
    let retryCount = 0;
    let success = false;

    while (!success && retryCount < maxRetries) {
      try {
        setCartsLoading(true);
        const response = await fetch('http://localhost:5000/api/carts/serial-numbers');
        if (!response.ok) {
          throw new Error('Failed to fetch cart serial numbers');
        }
        const data = await response.json();
        setCarts(data);
        setCartsError(null);
        success = true;
      } catch (err) {
        console.error('Error fetching carts:', err);
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Retrying in 2 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          setCartsError('Failed to load cart serial numbers. Please ensure the backend is running and try refreshing the page.');
        }
      } finally {
        setCartsLoading(false);
      }
    }
  };

  useEffect(() => {
    // Only fetch LabJack config after cart config is loaded
    if (!cartConfigLoaded) return;

    const fetchConfig = async () => {
      try {
        console.log('Fetching LabJack config, selectedCart:', selectedCart);
        const response = await fetch('http://localhost:5001/api/labjack/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        const data = await response.json();
        console.log('LabJack config received:', data);
        // Only set these values if we don't have a cart selected
        if (!selectedCart) {
          console.log('No cart selected, using LabJack defaults');
          setScaleFactor(data.scale_factor);
          setTareVoltage(data.tare_voltage);
        } else {
          console.log('Cart is selected, ignoring LabJack defaults');
        }
      } catch (err) {
        console.error('Error fetching config:', err);
      }
    };

    fetchConfig();
  }, [selectedCart, cartConfigLoaded]);

  useEffect(() => {
    const fetchReading = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/labjack/ain1');
        if (!response.ok) {
          throw new Error('Failed to fetch reading');
        }
        const data = await response.json();
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})  // Send empty JSON object
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Tare error response:', errorData);
        throw new Error(errorData.error || 'Failed to tare');
      }
      const data = await response.json();
      setTareVoltage(data.tare_voltage);
      
      // Save the tare voltage to the cart document
      if (selectedCart) {
        console.log('Selected cart:', selectedCart); // Debug log
        
        // Use the serialNumber directly since that's what we have in selectedCart
        const url = `http://localhost:5000/api/carts/${selectedCart}/update-scale-config`;
        console.log('Making request to:', url); // Debug log
        
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tareVoltage: data.tare_voltage,
            scaleFactor: scaleFactor
          }),
        });
      }
    } catch (err) {
      console.error('Tare error:', err); // Debug log
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
      
      // Save the scale factor to the cart document
      if (selectedCart) {
        const cartData = carts.find(cart => cart.serialNumber === selectedCart);
        if (cartData) {
          await fetch(`http://localhost:5000/api/carts/${cartData.serialNumber}/update-scale-config`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tareVoltage: tareVoltage,
              scaleFactor: newScale
            }),
          });
        }
      }
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
    
    // Get camera's native resolution
    if (webcamRef.current && webcamRef.current.video) {
      const video = webcamRef.current.video;
      setWebcamDimensions({
        width: video.videoWidth,
        height: video.videoHeight
      });
    }
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
  }, [isCartSelected]);

  const handleScaleFactorClick = () => {
    setTempScaleFactor(scaleFactor.toString());
    setScaleFactorDialogOpen(true);
  };

  const handleNumberPadKeyPress = (key: string) => {
    setTempScaleFactor(prev => prev + key);
  };

  const handleNumberPadBackspace = () => {
    setTempScaleFactor(prev => prev.slice(0, -1));
  };

  const handleNumberPadClear = () => {
    setTempScaleFactor('');
  };

  const handleNumberPadEnter = async () => {
    const newValue = parseFloat(tempScaleFactor);
    if (!isNaN(newValue)) {
      setScaleFactor(newValue);
      try {
        const response = await fetch('http://localhost:5001/api/labjack/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scaleFactor: newValue }),
        });
        if (!response.ok) {
          throw new Error('Failed to update scale factor');
        }
      } catch (err) {
        console.error('Error updating scale factor:', err);
        setError('Failed to update scale factor. Please try again.');
      }
    }
    setScaleFactorDialogOpen(false);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
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
            <Box>
              <Box sx={{ p: 2, backgroundColor: 'success.light', borderRadius: 1, mb: 2 }}>
                <Typography variant="body1">
                  Selected Cart: Serial {selectedCart}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setShowChangeCartDialog(true)}
              >
                Change Cart Serial
              </Button>
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
                    {cart.serialNumber}
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

        {/* Change Cart Confirmation Dialog */}
        <Dialog
          open={showChangeCartDialog}
          onClose={() => setShowChangeCartDialog(false)}
        >
          <DialogTitle>Change Cart Serial Number</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to change the cart serial number? This will:
            </Typography>
            <ul>
              <li>Clear the current cart selection</li>
              <li>Refresh the list of available carts</li>
              <li>Allow you to select a new cart</li>
            </ul>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowChangeCartDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                setShowChangeCartDialog(false);
                handleChangeCart();
              }}
              color="secondary"
            >
              Yes, Change Cart
            </Button>
          </DialogActions>
        </Dialog>

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
                onClick={handleScaleFactorClick}
                InputProps={{
                  readOnly: true,
                }}
              />
              <Button
                fullWidth
                variant="outlined"
                onClick={handleScaleFactorClick}
                sx={{ mt: 1 }}
              >
                Calibrate Scale
              </Button>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tare Voltage (V)"
                type="number"
                value={tareVoltage.toFixed(4)}
                disabled
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleTare}
                disabled={loading}
                sx={{ mt: 1 }}
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
            Camera Preview
          </Typography>
          {cameraError ? (
            <Alert severity="error">{cameraError}</Alert>
          ) : (
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                overflow: 'hidden',
                width: '100%'
              }}
            >
              <Webcam
                ref={webcamRef}
                onUserMediaError={handleCameraError}
                onUserMedia={handleCameraLoad}
                videoConstraints={{
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "environment"
                }}
                imageSmoothing={false}
                mirrored={false}
                style={{
                  width: '100%',
                  height: 'auto'
                }}
              />
            </Box>
          )}
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Camera resolution: {webcamDimensions.width}x{webcamDimensions.height}
          </Typography>
        </Paper>

        {/* Scale Factor Number Pad Dialog */}
        <Dialog
          open={scaleFactorDialogOpen}
          onClose={() => setScaleFactorDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Enter Scale Factor</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                value={tempScaleFactor}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                  sx: { fontSize: '1.25rem' }
                }}
              />
            </Box>
            <NumberPad
              onKeyPress={handleNumberPadKeyPress}
              onBackspace={handleNumberPadBackspace}
              onClear={handleNumberPadClear}
              showDecimal={true}
              currentValue={tempScaleFactor}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setScaleFactorDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleNumberPadEnter} variant="contained">Enter</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
} 