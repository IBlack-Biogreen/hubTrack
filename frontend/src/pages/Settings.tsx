import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage, availableLanguages } from '../contexts/LanguageContext';
import { useTimeout } from '../contexts/TimeoutContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHeadlessUI } from '../contexts/HeadlessUIContext';

function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeContext();
  const { enabledLanguages, addEnabledLanguage, removeEnabledLanguage, t } = useLanguage();
  const { timeout, setTimeout, isEnabled, setIsEnabled } = useTimeout();
  const { theme, setTheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [timeoutValue, setTimeoutValue] = useState(timeout / 1000); // Convert to seconds for display

  const handleTimeoutChange = (value: number) => {
    setTimeoutValue(value);
    setTimeout(value * 1000); // Convert back to milliseconds
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
                onChange={setIsEnabled}
                className={`${
                  isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
            <input
              type="number"
              id="timeout"
              min="1"
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
                  <ListItemSecondaryAction>
                    {language.code !== 'en' && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => removeEnabledLanguage(language.code)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
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
            Theme
          </Typography>
          <div className="space-y-2">
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </Box>
      </Box>
    </Container>
  );
}

export default Settings; 