import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Card, 
  CardContent,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import axios from 'axios';
import { Keyboard } from '../components/keyboard';
import { ChromePicker } from 'react-color';

interface FeedType {
  _id: string;
  type: string;
  typeDispName: string;
  organization: string;
  orgDispName: string;
  department: string;
  deptDispName: string;
  buttonColor: string;
  explanation: string;
  status: string;
  lastUpdated: string;
  dateDeactivated: string | null;
}

interface Organization {
  _id: string;
  org: string;
}

const API_URL = window.electron ? 'http://localhost:5000/api' : '/api';

const FEED_TYPES = ['Mix', 'Preconsumer', 'Postconsumer'];

const FOOD_EMOJIS = [
  '🌱', '🥬', '🥦', '🥒', '🥑', '🥕', '🌽', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍷', '🥂', '🥃', '🍸', '🍹', '🍾'
];

function Audits() {
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [keyboardDialogOpen, setKeyboardDialogOpen] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newFeedType, setNewFeedType] = useState({
    type: '',
    organization: '',
    department: '',
    deviceLabel: '',
    explanation: '',
    buttonColor: '000000',
    emoji: '',
    orgID: ''
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [customTypeDialogOpen, setCustomTypeDialogOpen] = useState(false);
  const [customDepartmentDialogOpen, setCustomDepartmentDialogOpen] = useState(false);

  useEffect(() => {
    const fetchFeedTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_URL}/feed-types/all`);
        setFeedTypes(response.data);
      } catch (err) {
        console.error('Error fetching feed types:', err);
        setError('Failed to load feed types. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const fetchOrganizations = async () => {
      try {
        const response = await axios.get(`${API_URL}/organizations`);
        setOrganizations(response.data);
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    };

    fetchFeedTypes();
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      if (newFeedType.organization) {
        try {
          const response = await axios.get(`${API_URL}/tracking-sequence/departments/${newFeedType.organization}`);
          const departmentNames = response.data.departments.map((dept: any) => dept.name);
          setDepartments(departmentNames);
        } catch (err) {
          console.error('Error fetching departments:', err);
        }
      }
    };

    fetchDepartments();
  }, [newFeedType.organization]);

  const handleOpenKeyboard = (field: string) => {
    setActiveField(field);
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
      setNewFeedType(prev => ({
        ...prev,
        [activeField]: keyboardInput
      }));
    }
    setKeyboardDialogOpen(false);
    setKeyboardInput('');
    setActiveField(null);
  };

  const handleCreateFeedType = async () => {
    try {
      const selectedOrg = organizations.find(org => org.org === newFeedType.organization);
      const response = await axios.post(`${API_URL}/feed-types`, {
        ...newFeedType,
        orgID: selectedOrg?._id || ''
      });
      setFeedTypes([...feedTypes, response.data]);
      setOpenDialog(false);
      setNewFeedType({
        type: '',
        organization: '',
        department: '',
        deviceLabel: '',
        explanation: '',
        buttonColor: '000000',
        emoji: '',
        orgID: ''
      });
    } catch (err) {
      console.error('Error creating feed type:', err);
      setError('Failed to create feed type. Please try again.');
    }
  };

  const handleColorChange = (color: any) => {
    setNewFeedType(prev => ({
      ...prev,
      buttonColor: color.hex.replace('#', '')
    }));
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewFeedType(prev => ({
      ...prev,
      emoji
    }));
    setShowEmojiPicker(false);
  };

  const handleTypeChange = (e: any) => {
    const value = e.target.value;
    if (value === 'custom') {
      setCustomTypeDialogOpen(true);
    } else {
      setNewFeedType(prev => ({ ...prev, type: value }));
    }
  };

  const handleDepartmentChange = (e: any) => {
    const value = e.target.value;
    if (value === 'custom') {
      setCustomDepartmentDialogOpen(true);
    } else {
      setNewFeedType(prev => ({ ...prev, department: value }));
    }
  };

  const handleCustomTypeEnter = () => {
    const newType = keyboardInput;
    setNewFeedType(prev => ({ ...prev, type: newType }));
    setCustomTypeDialogOpen(false);
    setKeyboardInput('');
    if (!FEED_TYPES.includes(newType)) {
      FEED_TYPES.push(newType);
    }
  };

  const handleCustomDepartmentEnter = () => {
    const newDept = keyboardInput;
    setNewFeedType(prev => ({ ...prev, department: newDept }));
    setCustomDepartmentDialogOpen(false);
    setKeyboardInput('');
    if (!departments.includes(newDept)) {
      setDepartments(prev => [...prev, newDept]);
    }
  };

  const handleToggleActivation = async (feedType: FeedType) => {
    try {
      const isActive = !feedType.dateDeactivated || feedType.dateDeactivated === "null";
      const response = await axios.patch(`${API_URL}/feed-types/${feedType._id}`, {
        status: isActive ? 'inactive' : 'active',
        dateDeactivated: isActive ? new Date().toISOString() : null
      });
      
      if (response.data.success) {
        // Update the local state
        setFeedTypes(prevTypes => prevTypes.map(type => 
          type._id === feedType._id 
            ? {
                ...type,
                status: isActive ? 'inactive' : 'active',
                dateDeactivated: isActive ? new Date().toISOString() : null
              }
            : type
        ));
      }
    } catch (err) {
      console.error('Error toggling feed type activation:', err);
      setError('Failed to update feed type status. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Feed Types
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Feed Type
        </Button>
      </Box>

      <Grid container spacing={3}>
        {feedTypes.map((feedType) => (
          <Grid item xs={12} sm={6} md={4} key={feedType._id}>
            <Card sx={{ 
              bgcolor: `#${feedType.buttonColor || '000000'}`, 
              color: '#fff',
              height: '100%',
              opacity: (!feedType.dateDeactivated || feedType.dateDeactivated === "null") ? 1 : 0.6
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {feedType.typeDispName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Organization:</strong> {feedType.orgDispName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Department:</strong> {feedType.deptDispName}
                </Typography>
                {feedType.explanation && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Description:</strong> {feedType.explanation}
                  </Typography>
                )}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color={(!feedType.dateDeactivated || feedType.dateDeactivated === "null") ? "error" : "success"}
                    onClick={() => handleToggleActivation(feedType)}
                    sx={{ 
                      color: '#fff',
                      backgroundColor: (!feedType.dateDeactivated || feedType.dateDeactivated === "null") ? 'rgba(211, 47, 47, 0.8)' : 'rgba(46, 125, 50, 0.8)',
                      '&:hover': {
                        backgroundColor: (!feedType.dateDeactivated || feedType.dateDeactivated === "null") ? 'rgba(211, 47, 47, 1)' : 'rgba(46, 125, 50, 1)'
                      }
                    }}
                  >
                    {(!feedType.dateDeactivated || feedType.dateDeactivated === "null") ? 'Deactivate' : 'Activate'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Feed Type Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setShowConfirmDialog(true)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Add New Feed Type</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', gap: 4, minHeight: 400 }}>
            {/* Left column: dropdowns and description */}
            <Box sx={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Organization</InputLabel>
                <Select
                  value={newFeedType.organization}
                  onChange={(e) => setNewFeedType(prev => ({ ...prev, organization: e.target.value }))}
                  label="Organization"
                >
                  {organizations.map((org) => (
                    <MenuItem key={org._id} value={org.org}>
                      {org.org}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  value={newFeedType.department}
                  onChange={handleDepartmentChange}
                  label="Department"
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">Add Custom Department...</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newFeedType.type}
                  onChange={handleTypeChange}
                  label="Type"
                >
                  {FEED_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">Add Custom Type...</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Description"
                value={newFeedType.explanation}
                onChange={(e) => setNewFeedType(prev => ({ ...prev, explanation: e.target.value }))}
                fullWidth
                multiline
                rows={3}
                inputProps={{ 
                  inputMode: 'text',
                  type: 'text',
                  readOnly: true
                }}
                onClick={() => handleOpenKeyboard('explanation')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => handleOpenKeyboard('explanation')}>
                        <KeyboardIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
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
                    onClick={() => setNewFeedType(prev => ({ ...prev, buttonColor: color.replace('#', '') }))}
                    sx={{
                      minWidth: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: color,
                      border: newFeedType.buttonColor === color.replace('#', '') ? '3px solid #222' : '2px solid #fff',
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
                  backgroundColor: `#${newFeedType.buttonColor}`,
                  '&:hover': {
                    border: '1px solid rgba(0, 0, 0, 0.87)',
                  }
                }}
              />
              {showColorPicker && (
                <Box sx={{ position: 'absolute', zIndex: 2, mt: 1 }}>
                  <Box sx={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }} onClick={() => setShowColorPicker(false)} />
                  <ChromePicker color={`#${newFeedType.buttonColor}`} onChange={handleColorChange} />
                </Box>
              )}
            </Box>

            {/* Right column: emoji picker grid */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 220 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Type Emoji</Typography>
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
                        backgroundColor: newFeedType.emoji === emoji ? '#e0e0e0' : 'transparent',
                        border: newFeedType.emoji === emoji ? '2px solid #1976d2' : '2px solid transparent',
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
          <Button onClick={() => setShowConfirmDialog(true)}>Cancel</Button>
          <Button 
            onClick={handleCreateFeedType} 
            variant="contained"
            disabled={
              !newFeedType.type ||
              !newFeedType.organization ||
              !newFeedType.department
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Type Dialog */}
      <Dialog 
        open={customTypeDialogOpen} 
        onClose={() => setCustomTypeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Enter Custom Type</DialogTitle>
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
            onEnter={handleCustomTypeEnter}
            currentValue={keyboardInput}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomTypeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCustomTypeEnter} variant="contained">Enter</Button>
        </DialogActions>
      </Dialog>

      {/* Custom Department Dialog */}
      <Dialog 
        open={customDepartmentDialogOpen} 
        onClose={() => setCustomDepartmentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Enter Custom Department</DialogTitle>
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
            onEnter={handleCustomDepartmentEnter}
            currentValue={keyboardInput}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDepartmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCustomDepartmentEnter} variant="contained">Enter</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to close? Any unsaved changes will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>No, Stay</Button>
          <Button 
            onClick={() => {
              setShowConfirmDialog(false);
              setOpenDialog(false);
              setNewFeedType({
                type: '',
                organization: '',
                department: '',
                deviceLabel: '',
                explanation: '',
                buttonColor: '000000',
                emoji: '',
                orgID: ''
              });
            }} 
            variant="contained" 
            color="error"
          >
            Yes, Close
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
    </Container>
  );
}

export default Audits; 