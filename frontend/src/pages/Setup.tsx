import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

export default function Setup() {
  const [reading, setReading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchReading = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/labjack/ain1');
        if (!response.ok) {
          throw new Error('Failed to fetch reading');
        }
        const data = await response.json();
        setReading(data.voltage);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reading');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchReading();

    // Set up polling every 500ms
    const interval = setInterval(fetchReading, 500);

    return () => clearInterval(interval);
  }, []);

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
              <Typography variant="h3" component="div" color="primary">
                {reading?.toFixed(3)} V
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
} 