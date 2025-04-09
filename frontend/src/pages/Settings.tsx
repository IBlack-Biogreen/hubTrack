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

function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeContext();
  const { enabledLanguages, addEnabledLanguage, removeEnabledLanguage, t } = useLanguage();
  const { timeout, setTimeout } = useTimeout();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  const handleTimeoutChange = (event: Event, newValue: number | number[]) => {
    setTimeout(newValue as number);
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
            <Slider
              value={timeout}
              onChange={handleTimeoutChange}
              min={5000}
              max={60000}
              step={5000}
              marks={[
                { value: 5000, label: '5s' },
                { value: 10000, label: '10s' },
                { value: 30000, label: '30s' },
                { value: 60000, label: '60s' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value / 1000}s`}
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
      </Box>
    </Container>
  );
}

export default Settings; 