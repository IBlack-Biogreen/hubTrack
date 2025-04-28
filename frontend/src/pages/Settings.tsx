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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
                Selected Cart: Serial {selectedCart.serialNumber}
              </Typography>
              {currentDeviceLabel ? (
                <>
                  <Typography variant="body1" gutterBottom>
                    Device Label: {currentDeviceLabel.deviceLabel}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    Device Label ID: {currentDeviceLabel._id}
                  </Typography>
                </>
              ) : (
                <Typography variant="body1" color="error">
                  No device label assigned to this cart
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body1" color="error">
              No cart selected. Please select a cart in the Setup page.
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default Settings; 