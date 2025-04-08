import { Container, Typography, Box } from '@mui/material';

function Settings() {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography>
          Application settings content will go here.
        </Typography>
      </Box>
    </Container>
  );
}

export default Settings; 