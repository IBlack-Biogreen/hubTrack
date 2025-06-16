import { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CardHeader } from '@mui/material';

interface Event {
  _id: string;
  eventName: string;
  eventStart: string;
  eventEnd: string;
}

function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography>Loading events...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography color="error">Error: {error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Events
        </Typography>
        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event._id}>
              <Card>
                <CardHeader
                  title={event.eventName}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Start: {event.eventStart}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    End: {event.eventEnd}
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

export default Events; 