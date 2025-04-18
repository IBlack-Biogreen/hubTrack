import React from 'react';
import { Container, Typography, Paper, Box, CircularProgress } from '@mui/material';
import UsersTable from '../components/UsersTable';
import useUsers from '../hooks/useUsers';

const Users: React.FC = () => {
  const { users, loading, error } = useUsers();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Users Management
      </Typography>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        {error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">Error loading users: {error}</Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <UsersTable users={users} />
        )}
      </Paper>
    </Container>
  );
};

export default Users; 