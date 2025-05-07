import React from 'react';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import UsersTable from '../components/UsersTable';
import useUsers from '../hooks/useUsers';

const Users: React.FC = () => {
  const { users, loading, error } = useUsers();

  return (
    <Container maxWidth={false} sx={{ mt: 2, mb: 2, p: 0 }}>
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
    </Container>
  );
};

export default Users; 