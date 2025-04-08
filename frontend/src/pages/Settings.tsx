import { Container, Typography, Box, Slider, Switch, FormControlLabel } from '@mui/material';
import { useTimeout } from '../contexts/TimeoutContext';
import { useThemeContext } from '../contexts/ThemeContext';

function Settings() {
  const { timeout, setTimeout } = useTimeout();
  const { isDarkMode, toggleDarkMode } = useThemeContext();

  const handleTimeoutChange = (event: Event, newValue: number | number[]) => {
    setTimeout(newValue as number);
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        
        <Box sx={{ mt: 4, maxWidth: 400 }}>
          <Typography gutterBottom>
            Inactivity Timeout: {timeout / 1000} seconds
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

          <Box sx={{ mt: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Settings; 