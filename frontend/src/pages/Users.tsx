import { useState, useEffect } from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import UsersTable from '../components/UsersTable';
import useUsers from '../hooks/useUsers';

function Users() {
  const { t } = useLanguage();
  const { users, loading, error, refetch } = useUsers();

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <UsersTable users={users} loading={loading} onRefetch={refetch} />
    </Container>
  );
}

export default Users; 