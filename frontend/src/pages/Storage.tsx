import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, LinearProgress, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

function Storage() {
  const [storageUtilization, setStorageUtilization] = useState<number>(0);
  const [storageCapacity, setStorageCapacity] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorageData();
  }, []);

  const fetchStorageData = async () => {
    try {
      // First get all device labels
      const labelsResponse = await fetch('http://localhost:5000/api/device-labels');
      if (!labelsResponse.ok) throw new Error('Failed to fetch device labels');
      
      const labels = await labelsResponse.json();
      if (!labels || labels.length === 0) {
        setError('No device labels found');
        setLoading(false);
        return;
      }

      // Use the first device label
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

  const updateStorageUtilization = async (newValue: number) => {
    try {
      // First get all device labels
      const labelsResponse = await fetch('http://localhost:5000/api/device-labels');
      if (!labelsResponse.ok) throw new Error('Failed to fetch device labels');
      
      const labels = await labelsResponse.json();
      if (!labels || labels.length === 0) {
        setError('No device labels found');
        return;
      }

      const deviceLabel = labels[0];

      if (newValue < 0 || newValue > storageCapacity) {
        setError('Invalid storage value');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel._id}/storage-utilization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storageUtilization: newValue }),
      });

      if (!response.ok) throw new Error('Failed to update storage utilization');
      
      setStorageUtilization(newValue);
      setError(null);
    } catch (err) {
      console.error('Error updating storage utilization:', err);
      setError('Failed to update storage utilization');
    }
  };

  const handleIncrement = () => {
    updateStorageUtilization(storageUtilization + 1);
  };

  const handleDecrement = () => {
    updateStorageUtilization(storageUtilization - 1);
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Storage Utilization
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, bgcolor: 'info.light', p: 2, borderRadius: 1 }}>
          Please click the (+) button once for each bus bucket you add to storage. Click the (-) button to remove a bucket.
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
            of {storageCapacity} buckets
          </Typography>
        </Box>

        <Stack direction="row" spacing={4} justifyContent="center">
          <Button 
            variant="contained" 
            onClick={handleDecrement}
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
            onClick={handleIncrement}
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
      </Box>
    </Container>
  );
}

export default Storage; 