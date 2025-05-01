import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage, availableLanguages } from '../contexts/LanguageContext';
import { useTimeout } from '../contexts/TimeoutContext';

interface Cart {
    _id: string;
    serialNumber: string;
    machserial: number;
    currentDeviceLabelID?: string;
}

interface DeviceLabel {
    _id: string;
    deviceLabel: string;
    deviceType: string;
    status: string;
    feedOrgID: string[];
    lastUpdated: string;
    settings?: any;
}

interface WiFiNetwork {
    bssid: string;
    ssid: string;
    signal_level: number;
    channel: number;
}

interface WiFiConnection {
    ssid: string;
    signal_level: number;
    channel: number;
}

function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeContext();
  const { enabledLanguages, addEnabledLanguage, removeEnabledLanguage, t } = useLanguage();
  const { timeout, setTimeout, isEnabled, setIsEnabled } = useTimeout();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [timeoutValue, setTimeoutValue] = useState(Math.max(30, timeout / 1000)); // Ensure minimum 30s
  const [deviceLabels, setDeviceLabels] = useState<DeviceLabel[]>([]);
  const [selectedCart, setSelectedCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
  const [currentConnection, setCurrentConnection] = useState<WiFiConnection | null>(null);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const handleTimeoutChange = (value: number) => {
    if (value < 30) {
      setTimeoutValue(30);
      setTimeout(30 * 1000);
    } else {
      setTimeoutValue(value);
      setTimeout(value * 1000);
    }
  };

  const handleAddLanguage = () => {
    if (selectedLanguage) {
      const language = availableLanguages.find(lang => lang.code === selectedLanguage);
      if (language) {
        addEnabledLanguage(language);
        setSelectedLanguage('');
      }
    }
  };

  const scanNetworks = async () => {
    if (!window.electron) return;
    setScanning(true);
    try {
      const networks = await window.electron.ipcRenderer.scanNetworks();
      setWifiNetworks(networks);
    } catch (error) {
      console.error('Error scanning networks:', error);
    } finally {
      setScanning(false);
    }
  };

  const getCurrentConnection = async () => {
    if (!window.electron) return;
    try {
      const connection = await window.electron.ipcRenderer.getCurrentConnection();
      setCurrentConnection(connection);
    } catch (error) {
      console.error('Error getting current connection:', error);
    }
  };

  const connectToNetwork = async () => {
    if (!window.electron || !selectedNetwork) return;
    setConnecting(true);
    try {
      await window.electron.ipcRenderer.connectToNetwork(selectedNetwork.ssid, password);
      await getCurrentConnection();
      setShowPasswordDialog(false);
      setPassword('');
    } catch (error) {
      console.error('Error connecting to network:', error);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectFromNetwork = async () => {
    if (!window.electron) return;
    try {
      await window.electron.ipcRenderer.disconnectFromNetwork();
      setCurrentConnection(null);
    } catch (error) {
      console.error('Error disconnecting from network:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Get the selected cart from localStorage
            const savedCartSerial = localStorage.getItem('selectedCart');
            if (!savedCartSerial) {
                console.log('No cart selected');
                return;
            }

            // Fetch carts to get the selected cart's details
            const cartsResponse = await fetch('http://localhost:5000/api/carts/serial-numbers');
            if (!cartsResponse.ok) {
                throw new Error('Failed to fetch carts');
            }
            const carts = await cartsResponse.json();
            const currentCart = carts.find((cart: Cart) => cart.serialNumber === savedCartSerial);
            setSelectedCart(currentCart || null);

            // Fetch device labels
            const labelsResponse = await fetch('http://localhost:5000/api/device-labels');
            if (!labelsResponse.ok) {
                throw new Error('Failed to fetch device labels');
            }
            const labels = await labelsResponse.json();
            setDeviceLabels(labels);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (window.electron) {
      scanNetworks();
      getCurrentConnection();
    }
  }, []);

  // Get the current device label based on the selected cart
  const currentDeviceLabel = selectedCart?.currentDeviceLabelID 
    ? deviceLabels.find(label => label._id === selectedCart.currentDeviceLabelID)
    : null;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('darkMode')}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isDarkMode}
                onChange={toggleDarkMode}
                color="primary"
              />
            }
            label={t('darkMode')}
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Inactivity Timeout
          </Typography>
          <Box sx={{ mt: 2, maxWidth: 400 }}>
            <Typography gutterBottom>
              {timeout / 1000} seconds
            </Typography>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700 dark:text-gray-300">Enable Inactivity Timeout</span>
              <Switch
                checked={isEnabled}
                onChange={(_, checked) => setIsEnabled(checked)}
                className={`${
                  isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              />
            </div>
            <input
              type="number"
              id="timeout"
              min="30"
              max="3600"
              value={timeoutValue}
              onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              disabled={!isEnabled}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('language')}
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('availableLanguages')}
            </Typography>
            <List>
              {enabledLanguages.map((language) => (
                <ListItem key={language.code}>
                  <ListItemText
                    primary={language.nativeName}
                    secondary={language.name}
                  />
                  <Box sx={{ ml: 'auto' }}>
                    {language.code !== 'en' && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => removeEnabledLanguage(language.code)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>

          <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>{t('selectLanguage')}</InputLabel>
              <Select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                label={t('selectLanguage')}
              >
                {availableLanguages
                  .filter(lang => !enabledLanguages.find(el => el.code === lang.code))
                  .map((language) => (
                    <MenuItem key={language.code} value={language.code}>
                      {language.nativeName} ({language.name})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <IconButton
              color="primary"
              onClick={handleAddLanguage}
              disabled={!selectedLanguage}
            >
              <AddIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Device Label Information
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : selectedCart ? (
            <Box sx={{ p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Serial Number:</strong> {selectedCart.serialNumber}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Machine Serial:</strong> {selectedCart.machserial}
              </Typography>
              {currentDeviceLabel && (
                <>
                  <Typography variant="body1" gutterBottom>
                    <strong>Current Device Label:</strong> {currentDeviceLabel.deviceLabel}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Device Type:</strong> {currentDeviceLabel.deviceType}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Status:</strong> {currentDeviceLabel.status}
                  </Typography>
                </>
              )}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No cart selected
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            WiFi Networks
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={scanNetworks}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Scan Networks'}
            </Button>
            
            {currentConnection && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<WifiOffIcon />}
                onClick={disconnectFromNetwork}
                sx={{ ml: 2 }}
              >
                Disconnect
              </Button>
            )}
          </Box>

          {currentConnection && (
            <Box sx={{ p: 2, backgroundColor: 'info.light', borderRadius: 1, mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Connected to:</strong> {currentConnection.ssid}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Signal Strength:</strong> {currentConnection.signal_level} dBm
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Channel:</strong> {currentConnection.channel}
              </Typography>
            </Box>
          )}

          <List>
            {wifiNetworks.map((network) => (
              <ListItem
                key={network.bssid}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => {
                      setSelectedNetwork(network);
                      setShowPasswordDialog(true);
                    }}
                  >
                    <WifiIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={network.ssid}
                  secondary={`Signal: ${network.signal_level} dBm | Channel: ${network.channel}`}
                />
              </ListItem>
            ))}
          </List>

          <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)}>
            <DialogTitle>Connect to {selectedNetwork?.ssid}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={connecting}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
              <Button
                onClick={connectToNetwork}
                disabled={!password || connecting}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Container>
  );
}

export default Settings; 