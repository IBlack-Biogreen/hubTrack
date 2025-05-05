import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Card, 
  CardContent,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

interface FeedType {
  _id: string;
  type: string;
  typeDispName: string;
  organization: string;
  orgDispName: string;
  department: string;
  deptDispName: string;
  buttonColor: string;
  explanation: string;
  status: string;
  lastUpdated: string;
}

const API_URL = window.electron ? 'http://localhost:5000/api' : '/api';

function Audits() {
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_URL}/feed-types`);
        setFeedTypes(response.data);
      } catch (err) {
        console.error('Error fetching feed types:', err);
        setError('Failed to load feed types. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedTypes();
  }, []);

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Feed Types
        </Typography>
        <Grid container spacing={3}>
          {feedTypes.map((feedType) => (
            <Grid item xs={12} sm={6} md={4} key={feedType._id}>
              <Card sx={{ 
                bgcolor: `#${feedType.buttonColor || '000000'}`, 
                color: '#fff',
                height: '100%'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {feedType.typeDispName || feedType.type}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Organization:</strong> {feedType.orgDispName || feedType.organization}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Department:</strong> {feedType.deptDispName || feedType.department}
                  </Typography>
                  {feedType.explanation && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Description:</strong> {feedType.explanation}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Status:</strong> {feedType.status || 'Active'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}

export default Audits; 