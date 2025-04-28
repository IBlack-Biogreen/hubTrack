import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  getWeightHistory,
  Organization,
  Department,
  FeedType
} from '../api/trackingService';
import Webcam from 'react-webcam';

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
  
  // Weight tracking
  const [weightHistory, setWeightHistory] = useState<Array<{voltage: number, weight: number, timestamp: string}>>([]);
  const [rawWeights, setRawWeights] = useState<Record<string, any>>({});
  const [feedStartTime, setFeedStartTime] = useState<Date | null>(null);
  
  // Selected values
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedFeedType, setSelectedFeedType] = useState<FeedType | null>(null);
  
  // Webcam state
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [isPlaceholderImage, setIsPlaceholderImage] = useState<boolean>(false);
  
  // Add camera facing mode state
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  
  const { currentUser, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  
  // Weight tracking interval reference
  const weightIntervalRef = useRef<number | null>(null);
  
  // Start weight tracking when the component mounts
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Starting weight tracking...');
      
      // Set feed start time to two minutes ago
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - 2);
      setFeedStartTime(startTime);
      console.log('Feed start time set to:', startTime.toISOString());
      
      // Function to fetch and format weight data
      const fetchWeightData = async () => {
        try {
          const history = await getWeightHistory();
          setWeightHistory(history);
          
          // Format weights in the exact structure needed for MongoDB
          // MongoDB expects: "rawWeights": { {timestamp:"2025-04-22T19:08:29.717Z", value:"1.7"}, ... }
          const formattedWeights: Record<string, any> = {};
          
          history.forEach((entry, index) => {
            // Use index as key
            formattedWeights[index.toString()] = {
              timestamp: entry.timestamp,
              value: entry.voltage.toString()
            };
          });
          
          setRawWeights(formattedWeights);
          console.log(`Updated rawWeights with ${Object.keys(formattedWeights).length} entries`);
        } catch (err) {
          console.error('Error fetching weight history:', err);
        }
      };
      
      // Initial fetch
      fetchWeightData();
      
      // Set up polling interval (every 1 second)
      const intervalId = window.setInterval(fetchWeightData, 1000);
      weightIntervalRef.current = intervalId;
      
      // Cleanup interval on unmount
      return () => {
        if (weightIntervalRef.current !== null) {
          window.clearInterval(weightIntervalRef.current);
          weightIntervalRef.current = null;
          console.log('Weight tracking stopped');
        }
      };
    }
  }, [isAuthenticated]);
  
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
  
  // Create a fallback image if the webcam fails
  // ... existing code ...

  // Fetch the current weight from the scale
  const fetchWeight = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current weight reading
      const weightValue = await getWeight();
      setWeight(weightValue);
      
      // Log the current state of rawWeights
      console.log(`Current rawWeights contains ${Object.keys(rawWeights).length} entries`);
      console.log('First 3 entries:', Object.entries(rawWeights).slice(0, 3));
      
      setActiveStep(4); // Move to confirmation step
      
    } catch (err) {
      console.error('Error fetching weight:', err);
      setError('Failed to get weight from scale. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
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
      
      // Log how many raw weight readings we've collected
      console.log(`Submitting with ${Object.keys(rawWeights).length} rawWeight readings`);
      
      // Debug the rawWeights object
      console.log('rawWeights content:', rawWeights);
      console.log('rawWeights type:', typeof rawWeights);
      console.log('Sample of rawWeights:', Object.entries(rawWeights).slice(0, 3));
      
      const feedData = {
        weight,
        userId: currentUser.name,
        organization: selectedOrganization.name,
        department: selectedDepartment.name,
        type: selectedFeedType.type,
        typeDisplayName: selectedFeedType.displayName,
        feedTypeId: selectedFeedType.id,
        imageFilename: imageFilename || undefined,
        feedStartedTime: feedStartTime?.toISOString(),
        rawWeights: rawWeights
      };
      
      console.log('Feed data being submitted:', JSON.stringify(feedData, null, 2));
      
      // Stop the weight tracking interval before submission
      if (weightIntervalRef.current !== null) {
        window.clearInterval(weightIntervalRef.current);
        weightIntervalRef.current = null;
        console.log('Weight tracking stopped before submission');
      }
      
      const response = await createFeed(feedData);
      console.log('Feed creation response:', response);
      
      // Show success message
      alert('Feed entry successfully created!');
      
      // Reset the form
      setActiveStep(0);
      setSelectedOrganization(null);
      setSelectedDepartment(null);
      setSelectedFeedType(null);
      setWeight(null);
      setCapturedImage(null);
      setImageFilename(null);
      setRawWeights({});
      setFeedStartTime(null);
      
      // Log the user out before navigating back to home
      logout();
      
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
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Organization
            </Typography>
            {organizations.length > 0 ? (
              <Grid container spacing={2}>
                {organizations.map((org) => (
                  <Grid item xs={12} sm={6} md={4} key={org.id}>
                    <Card 
                      raised={selectedOrganization?.id === org.id}
                      sx={{ 
                        bgcolor: selectedOrganization?.id === org.id ? 'primary.light' : 'background.paper',
                        transition: 'all 0.3s'
                      }}
                    >
                      <CardActionArea onClick={() => handleSelectOrganization(org)}>
                        <CardContent>
                          <Typography variant="h6">{org.name}</Typography>
                          {org.description && (
                            <Typography variant="body2" color="text.secondary">
                              {org.description}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography>No organizations found.</Typography>
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Department for {selectedOrganization?.name}
            </Typography>
            {departments.length > 0 ? (
              <Grid container spacing={2}>
                {departments.map((dept) => (
                  <Grid item xs={12} sm={6} md={4} key={dept.id}>
                    <Card 
                      raised={selectedDepartment?.id === dept.id}
                      sx={{ 
                        bgcolor: selectedDepartment?.id === dept.id ? 'primary.light' : 'background.paper',
                        transition: 'all 0.3s'
                      }}
                    >
                      <CardActionArea onClick={() => handleSelectDepartment(dept)}>
                        <CardContent>
                          <Typography variant="h6">{dept.name}</Typography>
                          {dept.description && (
                            <Typography variant="body2" color="text.secondary">
                              {dept.description}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography>No departments found.</Typography>
            )}
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Feed Type
            </Typography>
            {feedTypes.length > 0 ? (
              <Grid container spacing={2}>
                {feedTypes.map((type) => (
                  <Grid item xs={12} sm={6} md={4} key={type.id}>
                    <Card 
                      raised={selectedFeedType?.id === type.id}
                      sx={{ 
                        bgcolor: selectedFeedType?.id === type.id ? 'primary.light' : 'background.paper',
                        transition: 'all 0.3s'
                      }}
                    >
                      <CardActionArea onClick={() => handleSelectFeedType(type)}>
                        <CardContent>
                          <Typography variant="h6">{type.displayName}</Typography>
                          {type.description && (
                            <Typography variant="body2" color="text.secondary">
                              {type.description}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography>No feed types found.</Typography>
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