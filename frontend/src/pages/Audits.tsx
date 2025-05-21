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
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import axios from 'axios';
import { Keyboard } from '../components/keyboard';

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

const API_URL = window.electron ? 'http://localhost:5000/api' : '/api';

function Audits() {
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [keyboardDialogOpen, setKeyboardDialogOpen] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [newFeedType, setNewFeedType] = useState({
    type: '',
    typeDispName: '',
    organization: '',
    orgDispName: '',
    department: '',
    deptDispName: '',
    buttonColor: '000000',
    explanation: '',
    status: 'active'
  });

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

    fetchFeedTypes();
  }, []);

  const handleOpenKeyboard = () => {
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
    setKeyboardDialogOpen(false);
  };

  const handleCreateFeedType = async () => {
    try {
      const response = await axios.post(`${API_URL}/feed-types`, newFeedType);
      setFeedTypes([...feedTypes, response.data]);
      setOpenDialog(false);
      setNewFeedType({
        type: '',
        typeDispName: '',
        organization: '',
        orgDispName: '',
        department: '',
        deptDispName: '',
        buttonColor: '000000',
        explanation: '',
        status: 'active'
      });
    } catch (err) {
      console.error('Error creating feed type:', err);
      setError('Failed to create feed type. Please try again.');
    }
  };

  const handleToggleStatus = async (feedTypeId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const dateDeactivated = newStatus === 'inactive' ? new Date().toISOString() : null;
      await axios.patch(`${API_URL}/feed-types/${feedTypeId}`, { 
        status: newStatus,
        dateDeactivated 
      });
      setFeedTypes(feedTypes.map(ft => 
        ft._id === feedTypeId ? { ...ft, status: newStatus, dateDeactivated } : ft
      ));
    } catch (err) {
      console.error('Error updating feed type status:', err);
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
        <Box>
          <Tooltip title="Open On-screen Keyboard">
            <IconButton onClick={handleOpenKeyboard} sx={{ mr: 2 }}>
              <KeyboardIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Add Feed Type
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {feedTypes
          .sort((a, b) => {
            // Sort active feed types first
            const aIsActive = !a.dateDeactivated || a.dateDeactivated === "null";
            const bIsActive = !b.dateDeactivated || b.dateDeactivated === "null";
            if (aIsActive && !bIsActive) return -1;
            if (!aIsActive && bIsActive) return 1;
            return 0;
          })
          .map((feedType) => (
          <Grid item xs={12} sm={6} md={4} key={feedType._id}>
            <Card sx={{ 
              bgcolor: `#${feedType.buttonColor || '000000'}`, 
              color: '#fff',
              height: '100%',
              opacity: (!feedType.dateDeactivated || feedType.dateDeactivated === "null") ? 1 : 0.6
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {feedType.typeDispName || feedType.type}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Organization:</strong> {feedType.orgDispName || feedType.organization}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Department:</strong> {feedType.deptDispName || feedType.department}
                </Typography>
                {feedType.explanation && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Description:</strong> {feedType.explanation}
                  </Typography>
                )}
                {feedType.dateDeactivated && feedType.dateDeactivated !== "null" ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleToggleStatus(feedType._id, feedType.status)}
                    sx={{ color: '#fff', borderColor: '#fff' }}
                  >
                    Activate
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleToggleStatus(feedType._id, feedType.status)}
                    sx={{ color: '#fff', borderColor: '#fff' }}
                  >
                    Deactivate
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Feed Type</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Type"
              value={newFeedType.type}
              onChange={(e) => setNewFeedType({ ...newFeedType, type: e.target.value })}
              fullWidth
            />
            <TextField
              label="Display Name"
              value={newFeedType.typeDispName}
              onChange={(e) => setNewFeedType({ ...newFeedType, typeDispName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Organization"
              value={newFeedType.organization}
              onChange={(e) => setNewFeedType({ ...newFeedType, organization: e.target.value })}
              fullWidth
            />
            <TextField
              label="Organization Display Name"
              value={newFeedType.orgDispName}
              onChange={(e) => setNewFeedType({ ...newFeedType, orgDispName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Department"
              value={newFeedType.department}
              onChange={(e) => setNewFeedType({ ...newFeedType, department: e.target.value })}
              fullWidth
            />
            <TextField
              label="Department Display Name"
              value={newFeedType.deptDispName}
              onChange={(e) => setNewFeedType({ ...newFeedType, deptDispName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Button Color (hex without #)"
              value={newFeedType.buttonColor}
              onChange={(e) => setNewFeedType({ ...newFeedType, buttonColor: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={newFeedType.explanation}
              onChange={(e) => setNewFeedType({ ...newFeedType, explanation: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateFeedType} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Audits; 