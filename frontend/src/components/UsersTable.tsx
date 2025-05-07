import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  Avatar,
  TablePagination,
  Tooltip,
  IconButton,
  TextField,
  InputAdornment,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Fab,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { User } from '../hooks/useUsers';

type Order = 'asc' | 'desc';
type AddUserTab = 'activate' | 'create';

interface UsersTableProps {
  users: User[];
  loading?: boolean;
}

const UsersTable: React.FC<UsersTableProps> = ({ users, loading = false }) => {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof User>('name');
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserTab, setAddUserTab] = useState<AddUserTab>('activate');
  const [editForm, setEditForm] = useState({
    name: '',
    LANGUAGE: '',
    CODE: '',
    organization: '',
    title: '',
    siteChampion: false,
    numberFeeds: 0
  });
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    LANGUAGE: 'en',
    CODE: '',
    organization: '',
    title: '',
    siteChampion: false,
    numberFeeds: 0,
    status: 'active'
  });

  // Filter out inactive users for display
  const activeUsers = React.useMemo(() => {
    return users.filter(user => user.status !== 'inactive');
  }, [users]);

  const inactiveUsers = React.useMemo(() => {
    return users.filter(user => user.status === 'inactive');
  }, [users]);

  const handleCodeClick = (userId: string) => {
    setRevealedCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleRequestSort = (property: keyof User) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      LANGUAGE: user.LANGUAGE || '',
      CODE: user.CODE || '',
      organization: user.organization || '',
      title: user.title || '',
      siteChampion: user.siteChampion || false,
      numberFeeds: user.numberFeeds || 0
    });
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Close the modal and refresh the user list
      handleCloseEdit();
      // You might want to add a refetch function to the props to refresh the user list
    } catch (error) {
      console.error('Error updating user:', error);
      // You might want to show an error message to the user
    }
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const sortedUsers = React.useMemo(() => {
    if (!activeUsers?.length) return [];
    
    return [...activeUsers].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (!aValue || !bValue) {
        if (!aValue && !bValue) return 0;
        return !aValue ? -1 : 1;
      }
      
      if (order === 'desc') {
        return String(bValue).localeCompare(String(aValue));
      } else {
        return String(aValue).localeCompare(String(bValue));
      }
    });
  }, [activeUsers, order, orderBy]);

  const handleAddUserClick = () => {
    setShowAddUser(true);
  };

  const handleCloseAddUser = () => {
    setShowAddUser(false);
    setAddUserTab('activate');
    setNewUserForm({
      name: '',
      LANGUAGE: 'en',
      CODE: '',
      organization: '',
      title: '',
      siteChampion: false,
      numberFeeds: 0,
      status: 'active'
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: AddUserTab) => {
    setAddUserTab(newValue);
  };

  const handleActivateUser = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...user, status: 'active' }),
      });

      if (!response.ok) {
        throw new Error('Failed to activate user');
      }

      handleCloseAddUser();
      // You might want to add a refetch function to the props to refresh the user list
    } catch (error) {
      console.error('Error activating user:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      handleCloseAddUser();
      // You might want to add a refetch function to the props to refresh the user list
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleNewUserInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewUserForm(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  if (!activeUsers?.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No active users found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <TableContainer sx={{ height: 'calc(100vh - 100px)' }}>
        <Table stickyHeader aria-label="users table">
          <TableHead>
            <TableRow>
              <TableCell width="50px">Edit</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'LANGUAGE'}
                  direction={orderBy === 'LANGUAGE' ? order : 'asc'}
                  onClick={() => handleRequestSort('LANGUAGE')}
                >
                  Language
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'CODE'}
                  direction={orderBy === 'CODE' ? order : 'asc'}
                  onClick={() => handleRequestSort('CODE')}
                >
                  Code
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'organization'}
                  direction={orderBy === 'organization' ? order : 'asc'}
                  onClick={() => handleRequestSort('organization')}
                >
                  Organization
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'siteChampion'}
                  direction={orderBy === 'siteChampion' ? order : 'asc'}
                  onClick={() => handleRequestSort('siteChampion')}
                >
                  Site Champion
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'numberFeeds'}
                  direction={orderBy === 'numberFeeds' ? order : 'asc'}
                  onClick={() => handleRequestSort('numberFeeds')}
                >
                  Number of Feeds
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>Loading users...</Typography>
                </TableCell>
              </TableRow>
            ) : sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>No active users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditClick(user)}
                      sx={{ '&:hover': { color: 'primary.main' } }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, fontSize: '1rem' }}>{user.avatar}</Avatar>
                      {user.name}
                    </Box>
                  </TableCell>
                  <TableCell>{user.LANGUAGE || 'en'}</TableCell>
                  <TableCell>
                    <Box 
                      onClick={() => handleCodeClick(user._id)}
                      sx={{ 
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { opacity: 0.7 }
                      }}
                    >
                      {revealedCodes.has(user._id) ? user.CODE || 'N/A' : '****'}
                    </Box>
                  </TableCell>
                  <TableCell>{user.organization || 'N/A'}</TableCell>
                  <TableCell>
                    {user.siteChampion && (
                      <Tooltip title="Site Champion">
                        <StarIcon sx={{ color: 'primary.main' }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>{user.numberFeeds || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add User FAB */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64
        }}
        onClick={handleAddUserClick}
      >
        <AddIcon sx={{ fontSize: 32 }} />
      </Fab>

      {/* Add User Modal */}
      <Dialog 
        open={showAddUser} 
        onClose={handleCloseAddUser}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          <Tabs value={addUserTab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Activate Existing User" value="activate" />
            <Tab label="Create New User" value="create" />
          </Tabs>

          {addUserTab === 'activate' ? (
            <List sx={{ width: '100%', maxHeight: 400, overflow: 'auto' }}>
              {inactiveUsers.length === 0 ? (
                <Typography sx={{ p: 2, textAlign: 'center' }}>No inactive users found</Typography>
              ) : (
                inactiveUsers.map((user) => (
                  <React.Fragment key={user._id}>
                    <ListItem
                      button
                      onClick={() => handleActivateUser(user)}
                      sx={{ py: 2 }}
                    >
                      <ListItemAvatar>
                        <Avatar>{user.avatar}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={`${user.organization || 'No Organization'} - ${user.CODE || 'No Code'}`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              )}
            </List>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Name"
                value={newUserForm.name}
                onChange={handleNewUserInputChange('name')}
                fullWidth
                required
              />
              <TextField
                label="Language"
                value={newUserForm.LANGUAGE}
                onChange={handleNewUserInputChange('LANGUAGE')}
                fullWidth
                required
              />
              <TextField
                label="Code"
                value={newUserForm.CODE}
                onChange={handleNewUserInputChange('CODE')}
                fullWidth
                required
              />
              <TextField
                label="Organization"
                value={newUserForm.organization}
                onChange={handleNewUserInputChange('organization')}
                fullWidth
                required
              />
              <TextField
                label="Title"
                value={newUserForm.title}
                onChange={handleNewUserInputChange('title')}
                fullWidth
              />
              <TextField
                label="Number of Feeds"
                type="number"
                value={newUserForm.numberFeeds}
                onChange={handleNewUserInputChange('numberFeeds')}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddUser}>Cancel</Button>
          {addUserTab === 'create' && (
            <Button 
              onClick={handleCreateUser} 
              variant="contained" 
              color="primary"
              disabled={!newUserForm.name || !newUserForm.CODE}
            >
              Create User
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Existing Edit User Modal */}
      <Dialog 
        open={!!editingUser} 
        onClose={handleCloseEdit}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              value={editForm.name}
              onChange={handleInputChange('name')}
              fullWidth
            />
            <TextField
              label="Language"
              value={editForm.LANGUAGE}
              onChange={handleInputChange('LANGUAGE')}
              fullWidth
            />
            <TextField
              label="Code"
              value={editForm.CODE}
              onChange={handleInputChange('CODE')}
              fullWidth
            />
            <TextField
              label="Organization"
              value={editForm.organization}
              onChange={handleInputChange('organization')}
              fullWidth
            />
            <TextField
              label="Title"
              value={editForm.title}
              onChange={handleInputChange('title')}
              fullWidth
            />
            <TextField
              label="Number of Feeds"
              type="number"
              value={editForm.numberFeeds}
              onChange={handleInputChange('numberFeeds')}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersTable; 