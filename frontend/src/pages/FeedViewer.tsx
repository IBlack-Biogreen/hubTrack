import { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CardMedia } from '@mui/material';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

interface Feed {
  id: string;
  weight: string;
  type: string;
  department: string;
  organization: string;
  timestamp: string;
  imageFilename: string;
}

function FeedViewer() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/local-feeds');
        setFeeds(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load feed history');
        setLoading(false);
      }
    };

    fetchFeeds();
  }, [location.pathname]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          History
        </Typography>
        
        {loading ? (
          <Typography>Loading feed history...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : feeds.length === 0 ? (
          <Typography>No feed history available</Typography>
        ) : (
          <Grid container spacing={3}>
            {feeds.map((feed) => (
              <Grid item xs={12} sm={6} md={4} key={feed.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {feed.type}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Weight:</strong> {feed.weight} lbs
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Organization:</strong> {feed.organization}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Department:</strong> {feed.department}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Time:</strong> {formatDate(feed.timestamp)}
                    </Typography>
                  </CardContent>
                  {feed.imageFilename && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={`http://localhost:5000/images/${feed.imageFilename}`}
                      alt="Feed image"
                    />
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}

export default FeedViewer; 