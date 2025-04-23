import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActionArea
} from '@mui/material';
import { useUser } from '../contexts/UserContext';
import {
  getOrganizations,
  getDepartments,
  getFeedTypes,
  createFeed,
  getWeight,
  Organization,
  Department,
  FeedType
} from '../api/trackingService';

// Steps in the tracking sequence
const steps = [
  'User Authentication',
  'Select Organization',
  'Select Department',
  'Select Feed Type',
  'Confirm & Submit'
];

const TrackingSequence: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  
  // Selected values
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedFeedType, setSelectedFeedType] = useState<FeedType | null>(null);
  
  const { currentUser, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  
  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Start the sequence - first step is already done (user authenticated)
    const timer = setTimeout(() => {
      fetchOrganizations();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);
  
  // Fetch organizations for the tracking sequence
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getOrganizations();
      setOrganizations(response.organizations);
      
      // If we should auto-select, do so
      if (response.autoSelect) {
        setSelectedOrganization(response.autoSelect);
        // Move to the next step automatically if auto-selected
        await fetchDepartments(response.autoSelect.name);
      } else {
        setActiveStep(1); // Move to select organization step
      }
      
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch departments for the selected organization
  const fetchDepartments = async (organizationName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDepartments(organizationName);
      setDepartments(response.departments);
      
      // If we should auto-select, do so
      if (response.autoSelect) {
        setSelectedDepartment(response.autoSelect);
        // Move to the next step automatically if auto-selected
        await fetchFeedTypes(organizationName, response.autoSelect.name);
      } else {
        setActiveStep(2); // Move to select department step
      }
      
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch feed types for the selected organization and department
  const fetchFeedTypes = async (organizationName: string, departmentName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getFeedTypes(organizationName, departmentName);
      setFeedTypes(response.feedTypes);
      
      // If we should auto-select, do so
      if (response.autoSelect) {
        setSelectedFeedType(response.autoSelect);
        // Move to the next step automatically if auto-selected
        await fetchWeight();
      } else {
        setActiveStep(3); // Move to select feed type step
      }
      
    } catch (err) {
      console.error('Error fetching feed types:', err);
      setError('Failed to load feed types. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch the current weight from the scale
  const fetchWeight = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const weightValue = await getWeight();
      setWeight(weightValue);
      setActiveStep(4); // Move to confirmation step
      
    } catch (err) {
      console.error('Error fetching weight:', err);
      setError('Failed to get weight from scale. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle organization selection
  const handleSelectOrganization = async (organization: Organization) => {
    setSelectedOrganization(organization);
    await fetchDepartments(organization.name);
  };
  
  // Handle department selection
  const handleSelectDepartment = async (department: Department) => {
    if (!selectedOrganization) return;
    
    setSelectedDepartment(department);
    await fetchFeedTypes(selectedOrganization.name, department.name);
  };
  
  // Handle feed type selection
  const handleSelectFeedType = async (feedType: FeedType) => {
    setSelectedFeedType(feedType);
    await fetchWeight();
  };
  
  // Submit the feed entry
  const handleSubmitFeed = async () => {
    if (!selectedOrganization || !selectedDepartment || !selectedFeedType || !weight || !currentUser) {
      setError('Missing required information. Please try again.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const feedData = {
        weight,
        userId: currentUser.name,
        organization: selectedOrganization.name,
        department: selectedDepartment.name,
        type: selectedFeedType.type,
        typeDisplayName: selectedFeedType.displayName,
        feedTypeId: selectedFeedType.id
      };
      
      await createFeed(feedData);
      
      // Show success message
      alert('Feed entry successfully created!');
      
      // Reset the form and return to home
      setActiveStep(0);
      setSelectedOrganization(null);
      setSelectedDepartment(null);
      setSelectedFeedType(null);
      setWeight(null);
      
      // Navigate back to home
      navigate('/');
      
    } catch (err) {
      console.error('Error submitting feed:', err);
      setError('Failed to submit feed entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExit = () => {
    // Option to log out the user when exiting the sequence
    logout();
    // Navigate back to the home page
    navigate('/');
  };
  
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Initializing tracking sequence...
            </Typography>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Select an Organization
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {organizations.map((org) => (
                  <Grid item xs={12} sm={6} md={4} key={org.name}>
                    <Card>
                      <CardActionArea onClick={() => handleSelectOrganization(org)}>
                        <CardContent>
                          <Typography variant="h6">{org.displayName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {org.name}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );
      case 2:
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Select a Department
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {departments.map((dept) => (
                  <Grid item xs={12} sm={6} md={4} key={dept.name}>
                    <Card>
                      <CardActionArea onClick={() => handleSelectDepartment(dept)}>
                        <CardContent>
                          <Typography variant="h6">{dept.displayName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {dept.name}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );
      case 3:
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Select a Feed Type
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {feedTypes.map((feedType) => (
                  <Grid item xs={12} sm={6} md={4} key={feedType.id}>
                    <Card sx={{ 
                      bgcolor: `#${feedType.buttonColor}`, 
                      color: isLightColor(feedType.buttonColor) ? '#000' : '#fff' 
                    }}>
                      <CardActionArea onClick={() => handleSelectFeedType(feedType)}>
                        <CardContent>
                          <Typography variant="h6">{feedType.displayName}</Typography>
                          <Typography variant="body2">
                            {feedType.explanation}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );
      case 4:
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Confirm Feed Entry
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ my: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Weight:</strong> {weight?.toFixed(2)} lbs
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Organization:</strong> {selectedOrganization?.displayName}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Department:</strong> {selectedDepartment?.displayName}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Feed Type:</strong> {selectedFeedType?.displayName}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>User:</strong> {currentUser?.name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmitFeed}
                    disabled={loading}
                  >
                    Submit Feed Entry
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleExit}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Box>
              </>
            )}
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };
  
  // Helper function to determine if a color is light or dark
  const isLightColor = (hexColor: string): boolean => {
    if (!hexColor) return true;
    
    // Remove the # if it's there
    hexColor = hexColor.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate the brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return true if color is light
    return brightness > 128;
  };
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tracking Sequence
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Welcome, {currentUser?.name || 'User'}
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#ffeeee', borderRadius: 1 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}
          
          <Box sx={{ mt: 4 }}>
            {getStepContent(activeStep)}
          </Box>

          {/* Global exit button that's always visible */}
          {activeStep === 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleExit}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default TrackingSequence; 