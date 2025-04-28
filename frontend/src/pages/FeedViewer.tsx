import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, CardMedia, IconButton } from '@mui/material';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

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
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : feeds.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < feeds.length - 1 ? prevIndex + 1 : 0));
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        {loading ? (
          <Typography>Loading feed history...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : feeds.length === 0 ? (
          <Typography>No feed history available</Typography>
        ) : (
          <Box sx={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {feeds[currentIndex].type}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Weight:</strong> {feeds[currentIndex].weight} lbs
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Organization:</strong> {feeds[currentIndex].organization}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Department:</strong> {feeds[currentIndex].department}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Time:</strong> {formatDate(feeds[currentIndex].timestamp)}
                </Typography>
              </CardContent>
              {feeds[currentIndex].imageFilename && (
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="400"
                    image={`http://localhost:5000/images/${feeds[currentIndex].imageFilename}`}
                    alt="Feed image"
                    sx={{ objectFit: 'contain' }}
                  />
                  <IconButton
                    onClick={handlePrevious}
                    sx={{
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                    }}
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                  <IconButton
                    onClick={handleNext}
                    sx={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                    }}
                  >
                    <NavigateNextIcon />
                  </IconButton>
                </Box>
              )}
            </Card>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              {currentIndex + 1} of {feeds.length}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default FeedViewer; 