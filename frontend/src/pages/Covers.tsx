import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid as Grid2,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

export default function Covers() {
  const { t } = useLanguage();

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('covers')}
        </Typography>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Occupancy
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary">
              Occupancy monitoring section coming soon...
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            mt: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Covers
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary">
              Covers management section coming soon...
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 