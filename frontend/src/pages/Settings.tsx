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

interface DeviceLabel {
    _id: string;
    deviceLabel: string;
    deviceType: string;
    status: string;
    feedOrgID: string[];
    lastUpdated: string;
}

function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeContext();
  const { enabledLanguages, addEnabledLanguage, removeEnabledLanguage, t } = useLanguage();
  const { timeout, setTimeout, isEnabled, setIsEnabled } = useTimeout();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [timeoutValue, setTimeoutValue] = useState(Math.max(30, timeout / 1000)); // Ensure minimum 30s
  const [deviceLabels, setDeviceLabels] = useState<DeviceLabel[]>([]);
  const [currentDeviceLabel, setCurrentDeviceLabel] = useState<string>('');
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
    const fetchDeviceLabels = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching device labels...');
            const labelsResponse = await fetch('http://localhost:5000/api/device-labels');
            
            if (!labelsResponse.ok) {
                const errorText = await labelsResponse.text();
                console.error('Failed to fetch device labels:', {
                    status: labelsResponse.status,
                    statusText: labelsResponse.statusText,
                    response: errorText
                });
                throw new Error(`Failed to fetch device labels: ${labelsResponse.status} ${labelsResponse.statusText}`);
            }
            
            const labels = await labelsResponse.json();
            console.log('Fetched device labels:', labels);
            
            // Fetch current device label
            const currentResponse = await fetch('http://localhost:5000/api/device-labels/current');
            const current = await currentResponse.json();
            console.log('Current device label:', current);
            
            setDeviceLabels(labels);
            if (current && current.deviceLabel) {
                setCurrentDeviceLabel(current.deviceLabel);
            }
        } catch (error) {
            console.error('Error fetching device labels:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch device labels');
        } finally {
            setLoading(false);
        }
    };

    fetchDeviceLabels();
  }, []);

  const handleDeviceLabelChange = async (label: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/device-labels/current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceLabel: label }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set device label: ${response.statusText}`);
      }

      setCurrentDeviceLabel(label);
    } catch (error) {
      console.error('Error setting device label:', error);
      setError(error instanceof Error ? error.message : 'Failed to set device label');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('settings')}
        </Typography>

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
            Device Label
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <FormControl fullWidth>
            <InputLabel id="device-label-select-label">Select Device Label</InputLabel>
            <Select
              labelId="device-label-select-label"
              value={currentDeviceLabel}
              label="Select Device Label"
              onChange={(e) => handleDeviceLabelChange(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {deviceLabels.map((label) => (
                <MenuItem key={label._id} value={label.deviceLabel}>
                  {label.deviceLabel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          
          {currentDeviceLabel && (
            <Typography variant="body1" sx={{ mt: 2 }}>
              Current device label: {currentDeviceLabel}
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default Settings; 