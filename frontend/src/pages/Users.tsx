import { Container, Typography, Box } from '@mui/material';

function Users() {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Users
        </Typography>
        <Typography>
          User management content will go here.
        </Typography>
      </Box>
    </Container>
  );
}

export default Users; 