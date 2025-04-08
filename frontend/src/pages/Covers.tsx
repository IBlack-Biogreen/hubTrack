import { Container, Typography, Box } from '@mui/material';

function Covers() {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Covers
        </Typography>
        <Typography>
          Covers management content will go here.
        </Typography>
      </Box>
    </Container>
  );
}

export default Covers; 