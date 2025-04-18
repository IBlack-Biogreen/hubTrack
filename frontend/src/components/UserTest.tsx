import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, Chip } from '@mui/material';
import { User } from '../hooks/useUsers';

// Sample user for testing
const testUser: User = {
  _id: '12345',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  status: 'active',
  lastSignIn: new Date().toISOString(),
  avatar: '👤'
};

const UserTest: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>User Interface Test</Typography>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ mr: 2, fontSize: '1.5rem' }}>{testUser.avatar}</Avatar>
            <Typography variant="h6">{testUser.name}</Typography>
          </Box>
          
          <Typography variant="body1">Email: {testUser.email}</Typography>
          
          <Box sx={{ mt: 2 }}>
            <Chip 
              label={`Role: ${testUser.role}`}
              color={testUser.role === 'admin' ? 'primary' : 'default'}
              sx={{ mr: 1 }}
            />
            <Chip 
              label={`Status: ${testUser.status}`}
              color={testUser.status === 'active' ? 'success' : 'default'}
            />
          </Box>
          
          {testUser.lastSignIn && (
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Last Sign In: {new Date(testUser.lastSignIn).toLocaleString()}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserTest; 