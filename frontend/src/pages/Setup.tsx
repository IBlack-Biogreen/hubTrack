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
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
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
  const [binWeight, setBinWeight] = useState(0.0);
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
  const [binWeightDialogOpen, setBinWeightDialogOpen] = useState(false);
  const [tempBinWeight, setTempBinWeight] = useState('');
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false);
  const [knownWeight, setKnownWeight] = useState('25');
  const [currentVoltage, setCurrentVoltage] = useState<number | null>(null);
  const [storageCapacity, setStorageCapacity] = useState(0.0);
  const [storageUtilization, setStorageUtilization] = useState(0.0);
  const [storageCapacityDialogOpen, setStorageCapacityDialogOpen] = useState(false);
  const [storageUtilizationDialogOpen, setStorageUtilizationDialogOpen] = useState(false);
  const [tempStorageCapacity, setTempStorageCapacity] = useState('');
  const [tempStorageUtilization, setTempStorageUtilization] = useState('');
  const [calibrationHelpDialogOpen, setCalibrationHelpDialogOpen] = useState(false);

  // Load saved cart on component mount
  useEffect(() => {
    const loadSelectedCart = async () => {
      try {
        // First try to get the selected cart from the database
        const response = await fetch('http://localhost:5000/api/selected-cart');
        if (response.ok) {
          const cartData = await response.json();
          console.log('Selected cart from database:', cartData);
          
          if (cartData.serialNumber) {
            setSelectedCart(cartData.serialNumber);
            setIsCartSelected(true);
            
            // Also save to localStorage for backward compatibility
            localStorage.setItem('selectedCart', cartData.serialNumber);
            
            // Load scale configuration from the cart
            if (cartData.tareVoltage !== undefined) {
              console.log('Setting tare voltage from cart:', cartData.tareVoltage);
              setTareVoltage(cartData.tareVoltage);
            }
            if (cartData.scaleFactor !== undefined) {
              console.log('Setting scale factor from cart:', cartData.scaleFactor);
              setScaleFactor(cartData.scaleFactor);
            }
            
            // Fetch device label settings
            try {
              const deviceLabelsResponse = await fetch('http://localhost:5000/api/device-labels');
              if (deviceLabelsResponse.ok) {
                const deviceLabels = await deviceLabelsResponse.json();
                if (Array.isArray(deviceLabels) && deviceLabels.length > 0) {
                  // Use the cart's currentDeviceLabelID if available, otherwise use the first device label
                  let deviceLabel;
                  if (cartData.currentDeviceLabelID) {
                    const matchingLabel = deviceLabels.find(label => label._id === cartData.currentDeviceLabelID);
                    deviceLabel = matchingLabel ? matchingLabel.deviceLabel : deviceLabels[0].deviceLabel;
                    console.log('Using device label from cart currentDeviceLabelID:', deviceLabel);
                  } else {
                    deviceLabel = deviceLabels[0].deviceLabel;
                    console.log('Using first device label (no currentDeviceLabelID):', deviceLabel);
                  }
                  
                  const settingsResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/settings`);
                  if (settingsResponse.ok) {
                    const settings = await settingsResponse.json();
                    if (settings.binWeight !== undefined) {
                      console.log('Setting bin weight from device settings:', settings.binWeight);
                      setBinWeight(settings.binWeight);
                    }
                    if (settings.storageCapacity !== undefined) {
                      console.log('Setting storage capacity from device settings:', settings.storageCapacity);
                      setStorageCapacity(settings.storageCapacity);
                    }
                    if (settings.storageUtilization !== undefined) {
                      console.log('Setting storage utilization from device settings:', settings.storageUtilization);
                      setStorageUtilization(settings.storageUtilization);
                    }
                  }
                }
              }
            } catch (err) {
              console.error('Error fetching device settings:', err);
            }
            
            setCartConfigLoaded(true);
            return;
          }
        }
        
        // Fallback to localStorage if database doesn't have a selected cart
        const savedCart = localStorage.getItem('selectedCart');
        const savedDeviceLabel = localStorage.getItem('selectedDeviceLabel');
        console.log('Saved cart from localStorage (fallback):', savedCart);
        
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
                
                // Fetch device label settings
                try {
                  const deviceLabelsResponse = await fetch('http://localhost:5000/api/device-labels');
                  if (deviceLabelsResponse.ok) {
                    const deviceLabels = await deviceLabelsResponse.json();
                    if (Array.isArray(deviceLabels) && deviceLabels.length > 0) {
                      // Use the cart's currentDeviceLabelID if available, otherwise use the first device label
                      let deviceLabel;
                      if (cartData.currentDeviceLabelID) {
                        const matchingLabel = deviceLabels.find(label => label._id === cartData.currentDeviceLabelID);
                        deviceLabel = matchingLabel ? matchingLabel.deviceLabel : deviceLabels[0].deviceLabel;
                        console.log('Using device label from cart currentDeviceLabelID:', deviceLabel);
                      } else {
                        deviceLabel = deviceLabels[0].deviceLabel;
                        console.log('Using first device label (no currentDeviceLabelID):', deviceLabel);
                      }
                      
                      const settingsResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/settings`);
                      if (settingsResponse.ok) {
                        const settings = await settingsResponse.json();
                        if (settings.binWeight !== undefined) {
                          console.log('Setting bin weight from device settings:', settings.binWeight);
                          setBinWeight(settings.binWeight);
                        }
                        if (settings.storageCapacity !== undefined) {
                          console.log('Setting storage capacity from device settings:', settings.storageCapacity);
                          setStorageCapacity(settings.storageCapacity);
                        }
                        if (settings.storageUtilization !== undefined) {
                          console.log('Setting storage utilization from device settings:', settings.storageUtilization);
                          setStorageUtilization(settings.storageUtilization);
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error('Error fetching device settings:', err);
                }
              } else {
                console.error('Failed to fetch cart config:', response.status, response.statusText);
              }
            } catch (err) {
              console.error('Error fetching cart config:', err);
            } finally {
              setCartConfigLoaded(true);
            }
          };
          
          fetchCartConfig();
        } else {
          setCartConfigLoaded(true); // No cart to load, so we're done
        }
      } catch (err) {
        console.error('Error loading selected cart:', err);
        setCartConfigLoaded(true);
      }
    };
    
    loadSelectedCart();
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

  const handleBinWeightClick = () => {
    setTempBinWeight(binWeight.toString());
    setBinWeightDialogOpen(true);
  };

  const handleBinWeightNumberPadKeyPress = (key: string) => {
    setTempBinWeight(prev => prev + key);
  };

  const handleBinWeightNumberPadBackspace = () => {
    setTempBinWeight(prev => prev.slice(0, -1));
  };

  const handleBinWeightNumberPadClear = () => {
    setTempBinWeight('');
  };

  const handleBinWeightNumberPadEnter = async () => {
    const newValue = parseFloat(tempBinWeight);
    if (!isNaN(newValue)) {
      setBinWeight(newValue);
      try {
        // Get the device label from the database
        const response = await fetch('http://localhost:5000/api/device-labels');
        if (!response.ok) {
          throw new Error('Failed to fetch device labels');
        }
        const deviceLabels = await response.json();
        const deviceLabel = deviceLabels[0]?.deviceLabel;
        
        if (!deviceLabel) {
          throw new Error('No device label found');
        }

        const updateResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ binWeight: newValue }),
        });
        if (!updateResponse.ok) {
          throw new Error('Failed to update bin weight');
        }
      } catch (err) {
        console.error('Error updating bin weight:', err);
        setError('Failed to update bin weight. Please try again.');
      }
    }
    setBinWeightDialogOpen(false);
  };

  const handleCalibrateScale = async () => {
    try {
      // Get current voltage reading using the existing ain1 endpoint
      const response = await fetch('http://localhost:5001/api/labjack/ain1');
      if (!response.ok) {
        throw new Error('Failed to get voltage reading');
      }
      const data = await response.json();
      setCurrentVoltage(data.voltage);
      setCalibrationDialogOpen(true);
    } catch (err) {
      console.error('Calibration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start calibration');
    }
  };

  const handleCalibrationNumberPadKeyPress = (key: string) => {
    setKnownWeight(prev => prev + key);
  };

  const handleCalibrationNumberPadBackspace = () => {
    setKnownWeight(prev => prev.slice(0, -1));
  };

  const handleCalibrationNumberPadClear = () => {
    setKnownWeight('25');
  };

  const handleCalibrationNumberPadEnter = async () => {
    if (!currentVoltage) return;
    
    const knownWeightValue = parseFloat(knownWeight);
    if (isNaN(knownWeightValue)) return;

    // Calculate new scale factor
    const newScaleFactor = knownWeightValue / (currentVoltage - tareVoltage);
    
    try {
      // Update scale factor in LabJack server
      const response = await fetch('http://localhost:5001/api/labjack/scale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scale: newScaleFactor }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update scale factor');
      }
      
      setScaleFactor(newScaleFactor);
      
      // Save the scale factor to the cart document
      if (selectedCart) {
        await fetch(`http://localhost:5000/api/carts/${selectedCart}/update-scale-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tareVoltage: tareVoltage,
            scaleFactor: newScaleFactor
          }),
        });
      }
      
      setCalibrationDialogOpen(false);
    } catch (err) {
      console.error('Error updating scale factor:', err);
      setError('Failed to update scale factor. Please try again.');
    }
  };

  const handleStorageCapacityClick = () => {
    setTempStorageCapacity(storageCapacity.toString());
    setStorageCapacityDialogOpen(true);
  };

  const handleStorageCapacityNumberPadKeyPress = (key: string) => {
    setTempStorageCapacity(prev => prev + key);
  };

  const handleStorageCapacityNumberPadBackspace = () => {
    setTempStorageCapacity(prev => prev.slice(0, -1));
  };

  const handleStorageCapacityNumberPadClear = () => {
    setTempStorageCapacity('');
  };

  const handleStorageCapacityNumberPadEnter = async () => {
    const newStorageCapacity = parseFloat(tempStorageCapacity);
    if (!isNaN(newStorageCapacity)) {
      try {
        const deviceLabelsResponse = await fetch('http://localhost:5000/api/device-labels');
        if (!deviceLabelsResponse.ok) {
          throw new Error('Failed to fetch device labels');
        }
        const deviceLabels = await deviceLabelsResponse.json();
        const deviceLabel = deviceLabels[0]?._id;

        if (!deviceLabel) {
          console.error('No device label found');
          return;
        }

        const response = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/storage-capacity`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storageCapacity: newStorageCapacity }),
        });

        if (response.ok) {
          setStorageCapacity(newStorageCapacity);
          setStorageCapacityDialogOpen(false);
        } else {
          console.error('Failed to update storage capacity');
        }
      } catch (error) {
        console.error('Error updating storage capacity:', error);
      }
    }
  };

  const handleStorageUtilizationClick = () => {
    setTempStorageUtilization(storageUtilization.toString());
    setStorageUtilizationDialogOpen(true);
  };

  const handleStorageUtilizationNumberPadKeyPress = (key: string) => {
    setTempStorageUtilization(prev => prev + key);
  };

  const handleStorageUtilizationNumberPadBackspace = () => {
    setTempStorageUtilization(prev => prev.slice(0, -1));
  };

  const handleStorageUtilizationNumberPadClear = () => {
    setTempStorageUtilization('');
  };

  const handleStorageUtilizationNumberPadEnter = async () => {
    const newStorageUtilization = parseFloat(tempStorageUtilization);
    if (!isNaN(newStorageUtilization)) {
      try {
        const deviceLabelsResponse = await fetch('http://localhost:5000/api/device-labels');
        if (!deviceLabelsResponse.ok) {
          throw new Error('Failed to fetch device labels');
        }
        const deviceLabels = await deviceLabelsResponse.json();
        const deviceLabel = deviceLabels[0]?._id;

        if (!deviceLabel) {
          console.error('No device label found');
          return;
        }

        const response = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/storage-utilization`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storageUtilization: newStorageUtilization }),
        });

        if (response.ok) {
          setStorageUtilization(newStorageUtilization);
          setStorageUtilizationDialogOpen(false);
        } else {
          console.error('Failed to update storage utilization');
        }
      } catch (error) {
        console.error('Error updating storage utilization:', error);
      }
    }
  };

  const handleClearHistory = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/labjack/clear-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setHistory([]);
        console.log('Weight history cleared successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to clear weight history:', errorData);
        setError('Failed to clear weight history. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing weight history:', error);
      setError('Failed to connect to LabJack server. Please ensure the server is running.');
    }
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
                InputProps={{
                  readOnly: true,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleCalibrateScale}
                >
                  Calibrate Scale
                </Button>
                <Tooltip title="Calibration Help">
                  <IconButton
                    onClick={() => setCalibrationHelpDialogOpen(true)}
                    size="small"
                    color="primary"
                  >
                    <HelpOutlineIcon />
                  </IconButton>
                </Tooltip>
              </Box>
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
            height: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Weight History
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearHistory}
              color="secondary"
            >
              Clear History
            </Button>
          </Box>
          <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
          </Box>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
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
                width: '100%',
                height: '400px'
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
                  height: '100%',
                  objectFit: 'contain'
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

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Storage
          </Typography>
          <Grid2 container spacing={2}>
            <Grid2 item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bin Weight (lbs)"
                type="number"
                value={binWeight.toFixed(2)}
                onChange={(e) => setBinWeight(parseFloat(e.target.value))}
                sx={{
                  '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                    WebkitAppearance: 'none',
                    margin: 0,
                  },
                  '& input[type=number]': {
                    MozAppearance: 'textfield',
                  },
                }}
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Storage Capacity"
                type="number"
                value={storageCapacity.toFixed(0)}
                onChange={(e) => setStorageCapacity(parseFloat(e.target.value))}
                sx={{
                  '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                    WebkitAppearance: 'none',
                    margin: 0,
                  },
                  '& input[type=number]': {
                    MozAppearance: 'textfield',
                  },
                }}
              />
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Storage Utilization"
                type="number"
                value={storageUtilization.toFixed(0)}
                onChange={(e) => setStorageUtilization(parseFloat(e.target.value))}
                sx={{
                  '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
                    WebkitAppearance: 'none',
                    margin: 0,
                  },
                  '& input[type=number]': {
                    MozAppearance: 'textfield',
                  },
                }}
              />
            </Grid2>
          </Grid2>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBinWeightClick}
            >
              Set Bin Weight
            </Button>
            <Button
              variant="outlined"
              onClick={handleStorageCapacityClick}
            >
              Set Storage Capacity
            </Button>
            <Button
              variant="outlined"
              onClick={handleStorageUtilizationClick}
            >
              Set Storage Utilization
            </Button>
          </Stack>
        </Paper>

        {/* Bin Weight Dialog */}
        <Dialog 
          open={binWeightDialogOpen} 
          onClose={() => setBinWeightDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: '80vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle>Set Bin Weight</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>
                {tempBinWeight || '0.0'} lbs
              </Typography>
              <Grid2 container spacing={1}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'C'].map((key) => (
                  <Grid2 item xs={4} key={key}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        if (key === 'C') {
                          handleBinWeightNumberPadClear();
                        } else {
                          handleBinWeightNumberPadKeyPress(key.toString());
                        }
                      }}
                    >
                      {key}
                    </Button>
                  </Grid2>
                ))}
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBinWeightNumberPadBackspace}
                  >
                    ←
                  </Button>
                </Grid2>
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleBinWeightNumberPadEnter}
                  >
                    Enter
                  </Button>
                </Grid2>
              </Grid2>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Storage Capacity Dialog */}
        <Dialog 
          open={storageCapacityDialogOpen} 
          onClose={() => setStorageCapacityDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: '80vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle>Set Storage Capacity</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>
                {tempStorageCapacity || '0'}
              </Typography>
              <Grid2 container spacing={1}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'C'].map((key) => (
                  <Grid2 item xs={4} key={key}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        if (key === 'C') {
                          handleStorageCapacityNumberPadClear();
                        } else {
                          handleStorageCapacityNumberPadKeyPress(key.toString());
                        }
                      }}
                    >
                      {key}
                    </Button>
                  </Grid2>
                ))}
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleStorageCapacityNumberPadBackspace}
                  >
                    ←
                  </Button>
                </Grid2>
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleStorageCapacityNumberPadEnter}
                  >
                    Enter
                  </Button>
                </Grid2>
              </Grid2>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Storage Utilization Dialog */}
        <Dialog 
          open={storageUtilizationDialogOpen} 
          onClose={() => setStorageUtilizationDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: '80vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle>Set Storage Utilization</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>
                {tempStorageUtilization || '0'}
              </Typography>
              <Grid2 container spacing={1}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'C'].map((key) => (
                  <Grid2 item xs={4} key={key}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        if (key === 'C') {
                          handleStorageUtilizationNumberPadClear();
                        } else {
                          handleStorageUtilizationNumberPadKeyPress(key.toString());
                        }
                      }}
                    >
                      {key}
                    </Button>
                  </Grid2>
                ))}
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleStorageUtilizationNumberPadBackspace}
                  >
                    ←
                  </Button>
                </Grid2>
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleStorageUtilizationNumberPadEnter}
                  >
                    Enter
                  </Button>
                </Grid2>
              </Grid2>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Calibration Dialog */}
        <Dialog 
          open={calibrationDialogOpen} 
          onClose={() => setCalibrationDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: '80vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle>Calibrate Scale</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1" align="center" gutterBottom>
                Current Voltage: {currentVoltage?.toFixed(4) || '0.0000'} V
              </Typography>
              <Typography variant="body1" align="center" gutterBottom>
                Tare Voltage: {tareVoltage.toFixed(4)} V
              </Typography>
              <Typography variant="h6" align="center" gutterBottom>
                Enter Known Weight: {knownWeight} lbs
              </Typography>
              <Grid2 container spacing={1}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'C'].map((key) => (
                  <Grid2 item xs={4} key={key}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        if (key === 'C') {
                          handleCalibrationNumberPadClear();
                        } else {
                          handleCalibrationNumberPadKeyPress(key.toString());
                        }
                      }}
                    >
                      {key}
                    </Button>
                  </Grid2>
                ))}
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleCalibrationNumberPadBackspace}
                  >
                    ←
                  </Button>
                </Grid2>
                <Grid2 item xs={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleCalibrationNumberPadEnter}
                  >
                    Enter
                  </Button>
                </Grid2>
              </Grid2>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Calibration Help Dialog */}
        <Dialog 
          open={calibrationHelpDialogOpen} 
          onClose={() => setCalibrationHelpDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>How to Calibrate the Scale</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Calibration Process:
              </Typography>
              <Box component="ol" sx={{ pl: 2 }}>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    Put a known weight on the scale (like a 25lb weight)
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    Click "Calibrate Scale"
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    Dialog opens showing current voltage
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    Enter the known weight (25)
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    Press Enter
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    System calculates new scale factor
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    Updates both LabJack server and database
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    Future weight readings use the new scale factor
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                How it works:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                The system calculates the scale factor using this formula:
              </Typography>
              <Box sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1, 
                fontFamily: 'monospace',
                mb: 2
              }}>
                Scale Factor = Known Weight / (Current Voltage - Tare Voltage)
              </Box>
              <Typography variant="body2">
                This ensures that the scale accurately converts voltage readings to weight measurements.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCalibrationHelpDialogOpen(false)} variant="contained">
              Got it!
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
} 