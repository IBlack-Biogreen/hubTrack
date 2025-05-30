import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { ChromePicker } from 'react-color';
import { useLanguage } from '../contexts/LanguageContext';
import { Keyboard } from '../components/keyboard';
import axios from 'axios';

interface Organization {
  _id: string;
  org: string;
}

const API_URL = 'http://localhost:5000/api';

const FOOD_EMOJIS = [
  '🌱', '🥬', '🥦', '🥒', '🥑', '🥕', '🌽', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍷', '🥂', '🥃', '🍸', '🍹', '🍾'
];

export default function Covers() {
  const { t } = useLanguage();
  const [openDialog, setOpenDialog] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [keyboardDialogOpen, setKeyboardDialogOpen] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newCover, setNewCover] = useState({
    organization: '',
    outlet: '',
    buttonColor: '000000',
    emoji: '',
    orgID: '',
    daysOfOperation: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await axios.get(`${API_URL}/organizations`);
        setOrganizations(response.data);
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    };

    fetchOrganizations();
  }, []);

  useEffect(() => {
    const fetchOutlets = async () => {
      if (!selectedOrg) return;
      try {
        const response = await axios.get(`${API_URL}/outlets/${selectedOrg}`);
        console.log('Fetched outlets:', response.data);
        setOutlets(response.data);
      } catch (err) {
        console.error('Error fetching outlets:', err);
      }
    };

    fetchOutlets();
  }, [selectedOrg]);

  const handleOpenKeyboard = (field: string) => {
    setActiveField(field);
    setKeyboardInput(newCover[field as keyof typeof newCover] as string || '');
    setKeyboardDialogOpen(true);
  };

  const handleKeyboardKeyPress = (key: string) => {
    setKeyboardInput(prev => prev + key);
  };

  const handleKeyboardBackspace = () => {
    setKeyboardInput(prev => prev.slice(0, -1));
  };

  const handleKeyboardClear = () => {
    setKeyboardInput('');
  };

  const handleKeyboardEnter = () => {
    if (activeField) {
      setNewCover(prev => ({
        ...prev,
        [activeField.toLowerCase()]: keyboardInput
      }));
    }
    setKeyboardDialogOpen(false);
    setKeyboardInput('');
    setActiveField(null);
  };

  const handleColorChange = (color: any) => {
    setNewCover(prev => ({
      ...prev,
      buttonColor: color.hex.replace('#', '')
    }));
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewCover(prev => ({
      ...prev,
      emoji
    }));
    setShowEmojiPicker(false);
  };

  const handleCreateOutlet = async () => {
    try {
      setIsCreating(true);
      await axios.post(`${API_URL}/outlets`, {
        ...newCover,
        status: 'active',
        dateDeactivated: null
      });
      setOpenDialog(false);
      setNewCover({
        organization: '',
        outlet: '',
        buttonColor: '',
        emoji: '',
        orgID: '',
        daysOfOperation: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      });
      // Refresh outlets list
      if (selectedOrg) {
        const outletsResponse = await axios.get(`${API_URL}/outlets/${selectedOrg}`);
        setOutlets(outletsResponse.data);
      }
    } catch (err) {
      console.error('Error creating outlet:', err);
      // TODO: Add error handling UI
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActivation = async (outlet: any) => {
    try {
      console.log('Toggling outlet:', outlet);
      const isActive = outlet.status === 'active';
      const newStatus = isActive ? 'inactive' : 'active';
      const dateDeactivated = isActive ? new Date().toISOString() : null;

      await axios.patch(`${API_URL}/outlets/${selectedOrg}/${outlet._id}`, {
        status: newStatus,
        dateDeactivated
      });

      // Update local state
      setOutlets(prevOutlets => 
        prevOutlets.map(o => 
          o._id === outlet._id 
            ? { ...o, status: newStatus, dateDeactivated } 
            : o
        )
      );
      // Show success message
      setSnackbar({
        open: true,
        message: `Outlet ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error toggling outlet status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update outlet status',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          {t('covers')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          {t('Outlet')}
        </Button>
      </Box>

      {/* Organization Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>{t('Select Organization')}</InputLabel>
          <Select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            label={t('Select Organization')}
          >
            {organizations.map((org) => (
              <MenuItem key={org._id} value={org.org}>
                {org.org}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Outlets Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
        {outlets.map((outlet, index) => (
        <Paper
            key={index}
          sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              backgroundColor: `#${outlet.buttonColor}`,
              color: '#fff',
              opacity: outlet.status === 'active' ? 1 : 0.6
            }}
          >
            <Typography variant="h6" sx={{ fontSize: '2rem' }}>
              {outlet.emoji}
          </Typography>
            <Typography variant="h6" sx={{ textAlign: 'center' }}>
              {outlet.outlet}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {Object.entries(outlet.daysOfOperation).map(([day, isOpen]) => (
                <Typography
                  key={day}
                  variant="caption"
                  sx={{
                    opacity: isOpen ? 1 : 0.5,
                    fontWeight: isOpen ? 'bold' : 'normal'
                  }}
                >
                  {t(day.slice(0, 3))}
                </Typography>
              ))}
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button
                variant="contained"
                color={outlet.status === 'active' ? "error" : "success"}
                onClick={() => handleToggleActivation(outlet)}
                sx={{ 
                  color: '#fff',
                  backgroundColor: outlet.status === 'active' ? 'rgba(211, 47, 47, 0.8)' : 'rgba(46, 125, 50, 0.8)',
                  '&:hover': {
                    backgroundColor: outlet.status === 'active' ? 'rgba(211, 47, 47, 1)' : 'rgba(46, 125, 50, 1)'
                  }
                }}
              >
                {outlet.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
          </Box>
        </Paper>
        ))}
      </Box>

      {/* Add Cover Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>{t('Add New Outlet')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', gap: 4, minHeight: 400 }}>
            {/* Left column: organization and outlet */}
            <Box sx={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('Organization')}</InputLabel>
                <Select
                  value={newCover.organization}
                  onChange={(e) => {
                    const selectedOrg = organizations.find(org => org.org === e.target.value);
                    setNewCover(prev => ({ 
                      ...prev, 
                      organization: e.target.value,
                      orgID: selectedOrg?._id || ''
                    }));
                  }}
                  label={t('Organization')}
                >
                  {organizations.map((org) => (
                    <MenuItem key={org._id} value={org.org}>
                      {org.org}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label={t('Outlet')}
                value={newCover.outlet}
                fullWidth
                inputProps={{ 
                  inputMode: 'text',
                  type: 'text',
                  readOnly: true
                }}
                onClick={() => handleOpenKeyboard('Outlet')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => handleOpenKeyboard('Outlet')}>
                        <KeyboardIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>{t('daysOfOperation')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(newCover.daysOfOperation).map(([day, isOpen]) => (
                  <Button
                    key={day}
                    variant={isOpen ? "contained" : "outlined"}
                    onClick={() => {
                      setNewCover(prev => ({
                        ...prev,
                        daysOfOperation: {
                          ...prev.daysOfOperation,
                          [day]: !isOpen
                        }
                      }));
                    }}
                    sx={{ 
                      minWidth: '80px',
                      textTransform: 'capitalize'
                    }}
                  >
                    {t(day.slice(0, 3))}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Middle column: color picker */}
            <Box sx={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Button Color</Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1,
                mb: 2
              }}>
                {[
                  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
                  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
                  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
                  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
                  '#FFD600', '#FFB300', '#FF6F00', '#FF3D00'
                ].map((color) => (
                  <Button
                    key={color}
                    onClick={() => setNewCover(prev => ({ ...prev, buttonColor: color.replace('#', '') }))}
                    sx={{
                      minWidth: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: color,
                      border: newCover.buttonColor === color.replace('#', '') ? '3px solid #222' : '2px solid #fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      transition: 'border 0.2s',
                      '&:hover': {
                        border: '3px solid #888',
                        backgroundColor: color,
                        opacity: 0.85
                      }
                    }}
                  />
                ))}
              </Box>
              <Button
                onClick={() => setShowColorPicker(!showColorPicker)}
                sx={{
                  width: '100%',
                  height: '56px',
                  border: '1px solid rgba(0, 0, 0, 0.23)',
                  borderRadius: '4px',
                  backgroundColor: `#${newCover.buttonColor}`,
                  '&:hover': {
                    border: '1px solid rgba(0, 0, 0, 0.87)',
                  }
                }}
              />
              {showColorPicker && (
                <Box sx={{ position: 'absolute', zIndex: 2, mt: 1 }}>
                  <Box sx={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }} onClick={() => setShowColorPicker(false)} />
                  <ChromePicker color={`#${newCover.buttonColor}`} onChange={handleColorChange} />
                </Box>
              )}
            </Box>

            {/* Right column: emoji picker grid */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 220 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Cover Emoji</Typography>
        <Paper
                sx={{
                  width: '100%',
                  p: 2,
                  maxHeight: 340,
                  overflow: 'auto',
                  boxShadow: 2,
                  background: '#fafafa',
                  borderRadius: 2
                }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1 }}>
                  {FOOD_EMOJIS.map((emoji) => (
                    <Button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
          sx={{
                        minWidth: '40px',
                        height: '40px',
                        fontSize: '20px',
                        padding: 0,
                        backgroundColor: newCover.emoji === emoji ? '#e0e0e0' : 'transparent',
                        border: newCover.emoji === emoji ? '2px solid #1976d2' : '2px solid transparent',
                        borderRadius: 2,
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        }
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
          </Box>
        </Paper>
      </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={isCreating}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleCreateOutlet} 
            variant="contained"
            disabled={
              !newCover.organization || 
              !newCover.outlet || 
              isCreating
            }
          >
            {isCreating ? t('Creating...') : t('create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Keyboard Dialog */}
      <Dialog 
        open={keyboardDialogOpen} 
        onClose={() => setKeyboardDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('onScreenKeyboard')}</DialogTitle>
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
          <Button onClick={() => setKeyboardDialogOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 