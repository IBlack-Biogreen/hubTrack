import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardMedia, 
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  Grid
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useLanguage } from '../contexts/LanguageContext';

interface Feed {
  id: string;
  weight: string;
  totalWeight: string;
  binWeight: string;
  type: string;
  department: string;
  organization: string;
  user: string;
  timestamp: string;
  imageFilename: string;
}

function FeedViewer() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useLanguage();

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('http://localhost:5000/api/local-feeds');
        if (!response.ok) {
          throw new Error('Failed to fetch feeds');
        }
        const data = await response.json();
        setFeeds(data);
        if (data.length > 0) {
          setCurrentIndex(0);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching feeds:', error);
        setError('Failed to load feeds. Please try again later.');
        setLoading(false);
      }
    };

    fetchFeeds();
  }, [location.pathname]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePrevious = () => {
    if (recentFeeds.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : recentFeeds.length - 1));
  };

  const handleNext = () => {
    if (recentFeeds.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex < recentFeeds.length - 1 ? prevIndex + 1 : 0));
  };

  const handleFeedSelect = (index: number) => {
    if (index >= 0 && index < recentFeeds.length) {
      setCurrentIndex(index);
    }
  };

  // Filter feeds from the last 7 days
  const recentFeeds = feeds.filter(feed => {
    const feedDate = new Date(feed.timestamp);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return feedDate >= sevenDaysAgo;
  });

  // Get current feed safely
  const currentFeed = recentFeeds[currentIndex] || null;

  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 64px)', py: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        height: '100%',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {/* Feed List Sidebar */}
        <Paper 
          elevation={3} 
          sx={{ 
            width: isMobile ? '100%' : '300px',
            height: isMobile ? '200px' : '100%',
            overflow: 'auto',
            flexShrink: 0
          }}
        >
          <Typography variant="h6" sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            Recent Feeds (Last 7 Days)
          </Typography>
          <List>
            {recentFeeds.map((feed, index) => (
              <ListItem key={feed.id} disablePadding>
                <ListItemButton 
                  selected={currentIndex === index}
                  onClick={() => handleFeedSelect(index)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      '&:hover': {
                        bgcolor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={feed.type}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          {feed.weight} lbs
                        </Typography>
                        {' — '}
                        {formatDateShort(feed.timestamp)}
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Feed Details */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Typography>Loading feed history...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : recentFeeds.length === 0 ? (
            <Typography>No feed history available for the last 7 days</Typography>
          ) : currentFeed ? (
            <Box sx={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
              <Card>
                {currentFeed.imageFilename && (
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="400"
                      image={`http://localhost:5000/images/${currentFeed.imageFilename}`}
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
                <CardContent sx={{ 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 2,
                  mx: 2,
                  my: 2,
                  backgroundColor: 'background.paper'
                }}>
                  <Grid container spacing={2}>
                    {/* Left column: Metadata */}
                    <Grid item xs={6} sx={{ textAlign: 'center' }}>
                      <Typography variant="body1" gutterBottom>
                        <strong>{t('type')}:</strong> {currentFeed.type}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>{t('department')}:</strong> {currentFeed.department}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>{t('organization')}:</strong> {currentFeed.organization}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>{t('user')}:</strong> {currentFeed.user}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('time')}:</strong> {formatDate(currentFeed.timestamp)}
                      </Typography>
                    </Grid>
                    {/* Right column: Weights */}
                    <Grid item xs={6} sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        <strong>{t('weight')}:</strong> {Number(currentFeed.weight).toFixed(2)} lbs
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>{t('binWeight')}:</strong> {Number(currentFeed.binWeight).toFixed(2)} lbs
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>{t('totalWeight')}:</strong> {Number(currentFeed.totalWeight).toFixed(2)} lbs
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                {currentIndex + 1} of {recentFeeds.length}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Container>
  );
}

export default FeedViewer; 