import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, LinearProgress, Stack, Grid, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useLanguage } from '../contexts/LanguageContext';

function Storage() {
  const { t } = useLanguage();
  const [storageUtilization, setStorageUtilization] = useState<number>(0);
  const [storageCapacity, setStorageCapacity] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/device-labels');
        if (!response.ok) throw new Error('Failed to fetch device labels');
        
        const labels = await response.json();
        if (!labels || labels.length === 0) {
          setError('No device labels found');
          setLoading(false);
          return;
        }

        const deviceLabel = labels[0];
        setStorageUtilization(deviceLabel.storageUtilization || 0);
        setStorageCapacity(deviceLabel.storageCapacity || 0);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching storage data:', err);
        setError('Failed to load storage data');
        setLoading(false);
      }
    };

    fetchStorageData();
  }, []);

  const updateStorageUtilization = async (newValue: number) => {
    try {
      const response = await fetch('http://localhost:5000/api/device-labels');
      if (!response.ok) throw new Error('Failed to fetch device labels');
      
      const labels = await response.json();
      if (!labels || labels.length === 0) {
        setError('No device labels found');
        return;
      }

      const deviceLabel = labels[0];

      if (newValue < 0 || newValue > storageCapacity) {
        setError('Invalid storage value');
        return;
      }

      const updateResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel._id}/storage-utilization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storageUtilization: newValue }),
      });

      if (!updateResponse.ok) throw new Error('Failed to update storage utilization');
      
      setStorageUtilization(newValue);
      setError(null);
    } catch (err) {
      console.error('Error updating storage utilization:', err);
      setError('Failed to update storage utilization');
    }
  };

  const handleAddBucket = () => {
    updateStorageUtilization(storageUtilization + 1);
  };

  const handleRemoveBucket = () => {
    updateStorageUtilization(storageUtilization - 1);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('storageUtilization')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, bgcolor: 'info.light', p: 2, borderRadius: 1 }}>
              {t('storageUtilizationDescription')}
            </Typography>
            {error && (
              <Typography color="error" gutterBottom>
                {error}
              </Typography>
            )}
            <Box sx={{ width: '100%', mb: 4 }}>
              <LinearProgress
                variant="determinate"
                value={(storageUtilization / storageCapacity) * 100}
                sx={{ height: 20, borderRadius: 1 }}
              />
              <Typography
                variant="h3" 
                align="center" 
                sx={{ 
                  mt: 2,
                  mb: 1,
                  fontWeight: 'bold'
                }}
              >
                {storageUtilization}
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary"
                align="center"
              >
                {t('of')} {storageCapacity} {t('buckets')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={4} justifyContent="center">
              <Button
                variant="contained"
                onClick={handleRemoveBucket}
                disabled={storageUtilization <= 0}
                sx={{ 
                  width: 100,
                  height: 100,
                  borderRadius: '50%'
                }}
              >
                <RemoveIcon sx={{ fontSize: 50 }} />
              </Button>
              <Button
                variant="contained"
                onClick={handleAddBucket}
                disabled={storageUtilization >= storageCapacity}
                sx={{ 
                  width: 100,
                  height: 100,
                  borderRadius: '50%'
                }}
              >
                <AddIcon sx={{ fontSize: 50 }} />
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Storage; 