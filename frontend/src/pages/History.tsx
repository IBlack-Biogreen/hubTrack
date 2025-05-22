import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

function History() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading history data
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography component="h1" variant="h4" color="primary" gutterBottom>
              {t('history')}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {t('historyDescription')}
            </Typography>
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default History; 