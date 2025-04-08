import { Container, Typography, Box } from '@mui/material';

function Stats() {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Statistics
        </Typography>
        <Typography>
          Statistics and analytics content will go here.
        </Typography>
      </Box>
    </Container>
  );
}

export default Stats; 