import { Container, Typography, Box } from '@mui/material';

function FeedViewer() {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Feed Viewer
        </Typography>
        <Typography>
          Feed viewer content will go here.
        </Typography>
      </Box>
    </Container>
  );
}

export default FeedViewer; 