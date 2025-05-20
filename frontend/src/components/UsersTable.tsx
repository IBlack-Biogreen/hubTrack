import React, { useState, useEffect } from 'react';
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
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { User } from '../hooks/useUsers';
import { Keyboard } from './keyboard';
import { NumberPad } from './keyboard';

type Order = 'asc' | 'desc';
type AddUserTab = 'activate' | 'create';

interface UsersTableProps {
  users: User[];
  loading?: boolean;
  onRefetch?: () => Promise<void>;
}

const UsersTable: React.FC<UsersTableProps> = ({ users: propUsers, loading: propLoading = false, onRefetch }) => {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof User>('name');
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserTab, setAddUserTab] = useState<AddUserTab>('create');
  const [editForm, setEditForm] = useState({
    FIRST: '',
    LAST: '',
    LANGUAGE: '',
    CODE: '',
    organization: '',
    title: '',
    siteChampion: false,
    numberFeeds: 0
  });
  const [newUserForm, setNewUserForm] = useState({
    FIRST: '',
    LAST: '',
    LANGUAGE: 'en',
    CODE: '',
    organization: '',
    numberFeeds: 0,
    status: 'active',
    AVATAR: '👤'
  });
  const [organizations, setOrganizations] = useState<{ _id: string; org: string }[]>([]);
  const [codeError, setCodeError] = useState('');
  const [keyboardDialogOpen, setKeyboardDialogOpen] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);
  const [numberPadDialogOpen, setNumberPadDialogOpen] = useState(false);
  const [numberPadInput, setNumberPadInput] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToActivate, setUserToActivate] = useState<User | null>(null);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);

  const emojiCategories = {
    'People': ['👤', '👨', '👩', '👨‍💻', '👩‍💻', '👨‍🔬', '👩‍🔬', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧'],
    'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇'],
    'Nature': ['🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌸', '💐', '🌺', '🌻', '🌼', '🌷', '🌹'],
    'Food': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒'],
    'Activities': ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥊', '🥋', '⛳️', '⛸️', '🎣', '🤿'],
    'Objects': ['💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️']
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('People');

  const handleEmojiSelect = (emoji: string) => {
    setNewUserForm(prev => ({
      ...prev,
      AVATAR: emoji
    }));
    setShowEmojiPicker(false);
  };

  // Filter out inactive users for display
  const activeUsers = React.useMemo(() => {
    return propUsers.filter(user => user.status !== 'inactive');
  }, [propUsers]);

  const inactiveUsers = React.useMemo(() => {
    return propUsers.filter(user => user.status === 'inactive');
  }, [propUsers]);

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
      FIRST: user.FIRST || '',
      LAST: user.LAST || '',
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

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`http://localhost:5000/api/user/${editingUser._id}`, {
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
      if (onRefetch) {
        await onRefetch();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeactivateUser = async () => {
    if (!editingUser) return;

    try {
      // Update local user
      const response = await fetch(`http://localhost:5000/api/user/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'inactive',
          CODE: '0'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      // Update global user
      const globalResponse = await fetch(`http://localhost:5000/api/global-user/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'inactive',
          CODE: '0'
        }),
      });

      if (!globalResponse.ok) {
        throw new Error('Failed to deactivate global user');
      }

      // Close the modals and refresh the user list
      setDeactivateConfirmOpen(false);
      handleCloseEdit();
      if (onRefetch) {
        await onRefetch();
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
    }
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
      
      // Special handling for name sorting
      if (orderBy === 'name') {
        const aName = `${a.FIRST || ''} ${a.LAST || ''}`.trim();
        const bName = `${b.FIRST || ''} ${b.LAST || ''}`.trim();
        return order === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
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
    setAddUserTab('create');
    setNewUserForm({
      FIRST: '',
      LAST: '',
      LANGUAGE: 'en',
      CODE: '',
      organization: '',
      numberFeeds: 0,
      status: 'active',
      AVATAR: '👤'
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: AddUserTab) => {
    setAddUserTab(newValue);
  };

  const handleActivateUser = async (user: User) => {
    try {
      // Update local user
      const response = await fetch(`http://localhost:5000/api/user/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!response.ok) {
        throw new Error('Failed to activate user');
      }

      // Update global user
      const globalResponse = await fetch(`http://localhost:5000/api/global-user/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!globalResponse.ok) {
        throw new Error('Failed to activate global user');
      }

      // Close the dialog and refresh the user list
      setConfirmDialogOpen(false);
      setUserToActivate(null);
      onRefetch();
    } catch (error) {
      console.error('Error activating user:', error);
      // Instead of alert, we could show a snackbar or other UI notification here
    }
  };

  const validateCode = async (code: string) => {
    if (!/^\d{4}$/.test(code)) {
      setCodeError('Code must be exactly 4 numbers');
      return false;
    }

    // Check if code already exists
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      const codeExists = users.some((user: User) => user.CODE === code);
      if (codeExists) {
        setCodeError('This code is already in use');
        return false;
      }
      setCodeError('');
      return true;
    } catch (error) {
      console.error('Error validating code:', error);
      setCodeError('Error validating code');
      return false;
    }
  };

  const handleNewUserInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewUserForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'CODE') {
      validateCode(value);
    }
  };

  const handleCreateUser = async () => {
    const isValidCode = await validateCode(newUserForm.CODE);
    if (!isValidCode) return;

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
      // Refresh the users list
      if (onRefetch) {
        await onRefetch();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/organizations');
        if (!response.ok) throw new Error('Failed to fetch organizations');
        const orgsData = await response.json();
        setOrganizations(orgsData);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };

    fetchOrganizations();
  }, []);

  const handleOpenKeyboard = (field: string) => {
    setActiveField(field);
    setKeyboardDialogOpen(true);
  };

  const handleKeyboardKeyPress = (key: string) => {
    if (activeField === 'CODE' && !/^\d$/.test(key)) {
      return; // Only allow digits for CODE field
    }
    if (activeField === 'LAST' && keyboardInput.length >= 1) {
      return; // Only allow one character for LAST field
    }
    setKeyboardInput(prev => prev + key);
  };

  const handleKeyboardBackspace = () => {
    setKeyboardInput(prev => prev.slice(0, -1));
  };

  const handleKeyboardClear = () => {
    setKeyboardInput('');
  };

  const handleKeyboardEnter = () => {
    if (activeField === 'FIRST') {
      setNewUserForm(prev => ({
        ...prev,
        FIRST: keyboardInput
      }));
    } else if (activeField === 'LAST') {
      setNewUserForm(prev => ({
        ...prev,
        LAST: keyboardInput.slice(0, 1) // Ensure only one character
      }));
    } else if (activeField === 'CODE') {
      setNewUserForm(prev => ({
        ...prev,
        CODE: keyboardInput
      }));
      validateCode(keyboardInput);
    }
    setKeyboardDialogOpen(false);
    setKeyboardInput('');
    setActiveField(null);
  };

  const handleNumberPadKeyPress = (key: string) => {
    if (numberPadInput.length < 4) {
      setNumberPadInput(prev => prev + key);
    }
  };

  const handleNumberPadBackspace = () => {
    setNumberPadInput(prev => prev.slice(0, -1));
  };

  const handleNumberPadClear = () => {
    setNumberPadInput('');
  };

  const handleNumberPadEnter = () => {
    setNewUserForm(prev => ({
      ...prev,
      CODE: numberPadInput
    }));
    validateCode(numberPadInput);
    setNumberPadDialogOpen(false);
    setNumberPadInput('');
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
            {propLoading ? (
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
                      <Avatar sx={{ mr: 2, fontSize: '1rem' }}>{user.AVATAR || '👤'}</Avatar>
                      {`${user.FIRST || ''} ${user.LAST || ''}`.trim()}
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
                    {user.siteChampion === true && (
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
            <Tab label="Create New User" value="create" />
            <Tab label="Activate User" value="activate" />
          </Tabs>

          {addUserTab === 'create' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
              label="First Name"
              value={newUserForm.FIRST}
              onChange={handleNewUserInputChange('FIRST')}
                fullWidth
                required
              inputProps={{ 
                inputMode: 'text',
                type: 'text',
                readOnly: true
              }}
              onClick={() => handleOpenKeyboard('FIRST')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleOpenKeyboard('FIRST')}>
                      <KeyboardIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              />
              <TextField
              label="Last Initial"
              value={newUserForm.LAST}
              onChange={handleNewUserInputChange('LAST')}
              fullWidth
              required
              inputProps={{ 
                inputMode: 'text',
                maxLength: 1,
                readOnly: true
              }}
              onClick={() => handleOpenKeyboard('LAST')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleOpenKeyboard('LAST')}>
                      <KeyboardIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Avatar</Typography>
              <Box sx={{ position: 'relative' }}>
                <Button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  sx={{
                    width: '100%',
                    height: '56px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '4px',
                    padding: '0 14px',
                    backgroundColor: 'white',
                    '&:hover': {
                      border: '1px solid rgba(0, 0, 0, 0.87)',
                      backgroundColor: 'white',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '24px' }}>{newUserForm.AVATAR}</span>
                    <Typography>Select Avatar</Typography>
                  </Box>
                  <span style={{ fontSize: '20px' }}>{showEmojiPicker ? '▲' : '▼'}</span>
                </Button>
                {showEmojiPicker && (
                  <Paper
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      mt: 1,
                      p: 2,
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}
                  >
                    <Tabs
                      value={selectedCategory}
                      onChange={(_, newValue) => setSelectedCategory(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ mb: 2 }}
                    >
                      {Object.keys(emojiCategories).map((category) => (
                        <Tab key={category} label={category} value={category} />
                      ))}
                    </Tabs>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1 }}>
                      {emojiCategories[selectedCategory as keyof typeof emojiCategories].map((emoji) => (
                        <Button
                          key={emoji}
                          onClick={() => handleEmojiSelect(emoji)}
                          sx={{
                            minWidth: '40px',
                            height: '40px',
                            fontSize: '20px',
                            padding: 0,
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            }
                          }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            </FormControl>
            <FormControl fullWidth required>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Language</Typography>
              <Select
                value={newUserForm.LANGUAGE}
                onChange={(e) => handleNewUserInputChange('LANGUAGE')(e as any)}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="it">Italian</MenuItem>
                <MenuItem value="pt">Portuguese</MenuItem>
              </Select>
            </FormControl>
              <TextField
                label="Code"
                value={newUserForm.CODE}
                onChange={handleNewUserInputChange('CODE')}
                fullWidth
                required
              error={!!codeError}
              helperText={codeError}
              inputProps={{ 
                inputMode: 'numeric',
                maxLength: 4,
                pattern: '[0-9]*',
                readOnly: true
              }}
              onClick={() => setNumberPadDialogOpen(true)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setNumberPadDialogOpen(true)}>
                      <KeyboardIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Organization</InputLabel>
              <Select
                value={newUserForm.organization}
                onChange={(e) => handleNewUserInputChange('organization')(e as any)}
                label="Organization"
              >
                {organizations.map((org) => (
                  <MenuItem key={org._id} value={org.org}>
                    {org.org}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            </Box>
          ) : (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Inactive Users</Typography>
              <List>
                {inactiveUsers.map((user) => (
                  <React.Fragment key={user._id}>
                    <ListItem
                      button
                      onClick={() => {
                        setUserToActivate(user);
                        setConfirmDialogOpen(true);
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar>{user.avatar}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={`Code: ${user.CODE} | Organization: ${user.organization}`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
                {inactiveUsers.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No inactive users found" />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddUser}>Cancel</Button>
          <Button 
            onClick={addUserTab === 'create' ? handleCreateUser : () => {}} 
            variant="contained" 
            color="primary"
            disabled={
              addUserTab === 'create' && (
                !newUserForm.FIRST || 
                !newUserForm.LAST || 
                !newUserForm.CODE || 
                !newUserForm.organization || 
                !!codeError
              )
            }
          >
            {addUserTab === 'create' ? 'Create User' : 'Activate User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Number Pad Dialog */}
      <Dialog
        open={numberPadDialogOpen}
        onClose={() => setNumberPadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enter Code</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              value={numberPadInput}
              variant="outlined"
              InputProps={{
                readOnly: true,
                sx: { fontSize: '1.25rem' }
              }}
            />
          </Box>
          <NumberPad
            onKeyPress={handleNumberPadKeyPress}
            onBackspace={handleNumberPadBackspace}
            onClear={handleNumberPadClear}
            showDecimal={false}
            currentValue={numberPadInput}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNumberPadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNumberPadEnter} variant="contained">Enter</Button>
        </DialogActions>
      </Dialog>

      {/* Keyboard Dialog */}
      <Dialog 
        open={keyboardDialogOpen} 
        onClose={() => setKeyboardDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>On-screen Keyboard</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              value={keyboardInput}
              variant="outlined"
              InputProps={{
                readOnly: true,
                sx: { fontSize: '1.25rem' }
              }}
            />
          </Box>
          <Keyboard
            onKeyPress={handleKeyboardKeyPress}
            onBackspace={handleKeyboardBackspace}
            onClear={handleKeyboardClear}
            onEnter={handleKeyboardEnter}
            currentValue={keyboardInput}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyboardDialogOpen(false)}>Close</Button>
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
              label="First Name"
              value={editForm.FIRST}
              onChange={handleInputChange('FIRST')}
              fullWidth
              required
              inputProps={{ 
                inputMode: 'text',
                type: 'text',
                readOnly: true
              }}
              onClick={() => handleOpenKeyboard('FIRST')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleOpenKeyboard('FIRST')}>
                      <KeyboardIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Last Initial"
              value={editForm.LAST}
              onChange={handleInputChange('LAST')}
              fullWidth
              required
              inputProps={{ 
                inputMode: 'text',
                maxLength: 1,
                readOnly: true
              }}
              onClick={() => handleOpenKeyboard('LAST')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleOpenKeyboard('LAST')}>
                      <KeyboardIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth required>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Language</Typography>
              <Select
                value={editForm.LANGUAGE}
                onChange={(e) => handleInputChange('LANGUAGE')(e as any)}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="it">Italian</MenuItem>
                <MenuItem value="pt">Portuguese</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Code"
              value={editForm.CODE}
              onChange={handleInputChange('CODE')}
              fullWidth
              required
              error={!!codeError}
              helperText={codeError}
              inputProps={{ 
                inputMode: 'numeric',
                maxLength: 4,
                pattern: '[0-9]*',
                readOnly: true
              }}
              onClick={() => setNumberPadDialogOpen(true)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setNumberPadDialogOpen(true)}>
                      <KeyboardIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Organization</InputLabel>
              <Select
                value={editForm.organization}
                onChange={(e) => handleInputChange('organization')(e as any)}
                label="Organization"
              >
                {organizations.map((org) => (
                  <MenuItem key={org._id} value={org.org}>
                    {org.org}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Title"
              value={editForm.title}
              onChange={handleInputChange('title')}
              fullWidth
              inputProps={{ 
                inputMode: 'text',
                type: 'text',
                readOnly: true
              }}
              onClick={() => handleOpenKeyboard('title')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleOpenKeyboard('title')}>
                      <KeyboardIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeactivateConfirmOpen(true)} 
            color="error"
            variant="outlined"
          >
            Deactivate User
          </Button>
          <Box>
            <Button onClick={handleCloseEdit}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained" color="primary" sx={{ ml: 1 }}>
              Save Changes
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Activation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reactivate {userToActivate?.name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              if (userToActivate) {
                handleActivateUser(userToActivate);
                setConfirmDialogOpen(false);
              }
            }} 
            variant="contained" 
            color="primary"
          >
            Activate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deactivateConfirmOpen}
        onClose={() => setDeactivateConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate {editingUser?.name}? This will set their status to inactive and reset their code to 0.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeactivateUser} 
            variant="contained" 
            color="error"
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersTable; 