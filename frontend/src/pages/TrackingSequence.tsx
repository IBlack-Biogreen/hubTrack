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
  
  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Start the sequence - first step is already done (user authenticated)
    const timer = setTimeout(() => {
      // The camera will take a photo automatically when loaded via handleCameraLoad
      fetchOrganizations();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);
  
  // Create a fallback image if the webcam fails
  const createFallbackImage = useCallback(() => {
    console.log('Creating fallback image...');
    // Generate a static placeholder image and filename
    const now = new Date();
    const deviceLabel = localStorage.getItem('selectedDeviceLabel') || 'bgtrack_61';
    const timestamp = now.toISOString();
    const filename = sanitizeFilename(`${deviceLabel}_${timestamp}_placeholder.jpg`);
    
    // Use a placeholder image (gray square with text)
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#CCCCCC';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#333333';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No Camera Available', 320, 240);
      ctx.fillText(new Date().toLocaleString(), 320, 280);
    }
    
    const placeholderImage = canvas.toDataURL('image/jpeg');
    setCapturedImage(placeholderImage);
    setImageFilename(filename);
    
    // Set placeholder flag
    setIsPlaceholderImage(true);
    
    // Save the placeholder image
    saveImageLocally(placeholderImage, filename);
  }, []);
  
  // Helper function to sanitize filenames
  const sanitizeFilename = (filename: string): string => {
    // Replace colons with hyphens, and other unsafe characters
    return filename
      .replace(/:/g, '-')
      .replace(/\//g, '_')
      .replace(/\\/g, '_')
      .replace(/\?/g, '')
      .replace(/\*/g, '')
      .replace(/"/g, '')
      .replace(/</g, '')
      .replace(/>/g, '')
      .replace(/\|/g, '')
      .replace(/\s+/g, '_');
  };
  
  // Capture image from webcam
  const captureImage = useCallback(() => {
    console.log('captureImage called, webcamRef:', webcamRef.current ? 'available' : 'not available', 'cameraReady:', cameraReady);
    
    if (!webcamRef.current) {
      console.error('Webcam reference not available');
      setCameraError('Webcam not available for capture');
      
      // Generate a fallback image
      createFallbackImage();
      return;
    }
    
    if (!cameraReady) {
      console.error('Camera not ready yet');
      setCameraError('Camera not ready yet. Please wait a moment and try again.');
      return;
    }
    
    console.log('Capturing image from webcam...');
    
    try {
      // Set proper webcam options
      const imageSrc = webcamRef.current.getScreenshot({
        width: 640,
        height: 480
      });
      
      if (imageSrc) {
        console.log('Image captured successfully');
        setCapturedImage(imageSrc);
        
        // Reset placeholder flag - this is a real image
        setIsPlaceholderImage(false);
        
        // Generate filename matching the MongoDB format
        const now = new Date();
        const deviceLabel = localStorage.getItem('selectedDeviceLabel') || 'bgtrack_61';
        
        // Format to match: "bgtrack_61_2025-04-24T200025.178Z.jpg"
        const timestamp = now.toISOString();
        let filename = `${deviceLabel}_${timestamp}.jpg`;
        
        // Sanitize the filename to ensure it's compatible with all file systems
        filename = sanitizeFilename(filename);
        console.log('Generated filename:', filename);
        
        setImageFilename(filename);
        
        // Save image locally
        saveImageLocally(imageSrc, filename);
      } else {
        console.error('Failed to capture image from webcam');
        setCameraError('Failed to capture image from webcam');
        createFallbackImage();
      }
    } catch (error) {
      console.error('Error in captureImage:', error);
      setCameraError('Error capturing image: ' + (error instanceof Error ? error.message : String(error)));
      createFallbackImage();
    }
  }, [webcamRef, cameraReady, createFallbackImage]);
  
  // Webcam error handler
  const handleCameraError = (error: string | DOMException) => {
    console.error('Camera error:', error);
    setCameraError('Failed to access camera. Please check your camera permissions and connection.');
    setCameraReady(false);
    
    // If we get a camera error, create a fallback image after a short delay
    setTimeout(() => {
      createFallbackImage();
    }, 1000);
  };
  
  // Webcam loaded handler
  const handleCameraLoad = () => {
    console.log('Camera loaded successfully');
    setCameraError(null);
    setCameraReady(true);
    
    // Try to capture image immediately while we know the webcam ref is valid
    setTimeout(() => {
      console.log('Attempting immediate capture after camera load...');
      if (webcamRef.current) {
        try {
          const imageSrc = webcamRef.current.getScreenshot({
            width: 640,
            height: 480
          });
          
          if (imageSrc) {
            console.log('Immediate capture successful!');
            setCapturedImage(imageSrc);
            setIsPlaceholderImage(false);
            
            // Generate filename
            const now = new Date();
            const deviceLabel = localStorage.getItem('selectedDeviceLabel') || 'bgtrack_61';
            const timestamp = now.toISOString();
            let filename = `${deviceLabel}_${timestamp}.jpg`;
            filename = sanitizeFilename(filename);
            
            setImageFilename(filename);
            saveImageLocally(imageSrc, filename);
          } else {
            console.error('Immediate capture returned null image');
          }
        } catch (error) {
          console.error('Error during immediate capture:', error);
        }
      } else {
        console.error('Webcam ref not available for immediate capture');
      }
    }, 500); // Very short delay to ensure camera is fully initialized
  };
  
  // Effect to observe camera ready state - no longer trying to auto-capture here
  useEffect(() => {
    if (cameraReady) {
      console.log('Camera is ready - manual capture available');
    }
  }, [cameraReady]);
  
  // Save image to local storage
  const saveImageLocally = async (imageSrc: string, filename: string) => {
    console.log('Attempting to save image locally...');
    
    try {
      // In an Electron environment, we would use the exposed electron API
      // For web development, we'll save to localStorage temporarily
      if (window.electron) {
        console.log('Electron detected, using native file system');
        
        // Try using IPC channel (most reliable method)
        try {
          console.log('Attempting to save via IPC...');
          const result = await window.electron.ipcRenderer.saveImage(imageSrc, filename);
          console.log('IPC save result:', result);
          
          // Show success message with file location
          if (result.success) {
            alert(`Image saved to Documents folder!\n\nPath: ${result.originalFilePath}`);
          }
          
          return; // Success! No need to try other methods
        } catch (ipcError) {
          console.error('Failed to save via IPC:', ipcError);
          // Continue to fallback methods
        }
      }
      
      // For web environment or if IPC failed
      console.log('Using browser download fallback');
      triggerBrowserDownload(imageSrc, filename);
      
      // For web environment, also store in localStorage
      if (!window.electron) {
        console.log('Electron not detected, using localStorage');
        localStorage.setItem(`image_${filename}`, imageSrc);
      }
      
    } catch (err) {
      console.error('Error in saveImageLocally:', err);
      setCameraError('Failed to save image locally: ' + (err instanceof Error ? err.message : String(err)));
      
      // Try browser download as last resort
      triggerBrowserDownload(imageSrc, filename);
    }
  };
  
  // Helper function to trigger browser download
  const triggerBrowserDownload = (dataUrl: string, filename: string) => {
    console.log('Triggering browser download for:', filename);
    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.target = '_blank';
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      console.log('Browser download triggered successfully');
    } catch (err) {
      console.error('Browser download failed:', err);
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
        feedTypeId: selectedFeedType.id,
        imageFilename: imageFilename || undefined  // Include the image filename
      };
      
      await createFeed(feedData);
      
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
  
  // Get step content based on active step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography variant="h6" sx={{ mt: 2, mb: 4 }}>
              Initializing tracking sequence...
            </Typography>
            
            {/* Camera status indicator */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%',
                  bgcolor: cameraReady ? 'success.main' : cameraError ? 'error.main' : 'warning.main'
                }} 
              />
              <Typography variant="body2">
                Camera Status: {cameraReady ? 'Ready' : cameraError ? 'Error' : 'Initializing'}
              </Typography>
            </Box>
            
            {/* Camera component */}
            <Paper elevation={3} sx={{ p: 2, mb: 3, maxWidth: '640px', margin: '0 auto' }}>
              <Typography variant="subtitle1" gutterBottom align="center" fontWeight="bold">
                Camera Feed
              </Typography>
              <Box sx={{ position: 'relative', width: '100%', height: 'auto' }}>
                <Webcam
                  key={key}
                  ref={webcamRef}
                  onUserMediaError={handleCameraError}
                  onUserMedia={handleCameraLoad}
                  screenshotFormat="image/jpeg"
                  width={640}
                  height={480}
                  audio={false}
                  imageSmoothing={true}
                  mirrored={false}
                  videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: cameraFacingMode
                  }}
                  style={{ width: '100%', borderRadius: '4px' }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={captureImage}
                  disabled={!cameraReady}
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                  }}
                >
                  Capture
                </Button>
              </Box>
              {cameraError && (
                <Typography color="error" sx={{ mt: 2 }}>
                  {cameraError}
                </Typography>
              )}
              
              {/* Camera control buttons */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button 
                  variant="outlined"
                  color="primary"
                  onClick={retryCamera}
                  startIcon={<span>🔄</span>}
                >
                  Retry Camera
                </Button>
                
                <Button 
                  variant="outlined"
                  color="info"
                  onClick={toggleCameraFacing}
                  startIcon={<span>{cameraFacingMode === "environment" ? "📱" : "🤳"}</span>}
                >
                  {cameraFacingMode === "environment" ? "Switch to Front" : "Switch to Back"}
                </Button>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={captureImage}
                  disabled={!cameraReady}
                  startIcon={<span>📸</span>}
                >
                  Take Photo
                </Button>
                
                <Button 
                  variant="outlined" 
                  color="warning"
                  onClick={createFallbackImage}
                >
                  Use Placeholder
                </Button>
              </Box>
            </Paper>
            
            {/* Show captured image if available */}
            {capturedImage && (
              <Paper elevation={3} sx={{ p: 2, mb: 3, maxWidth: '640px', margin: '0 auto' }}>
                <Typography variant="subtitle1" gutterBottom align="center" fontWeight="bold">
                  {isPlaceholderImage ? 'Placeholder Image' : 'Captured Image'}
                </Typography>
                {isPlaceholderImage && (
                  <Typography color="warning.main" sx={{ mb: 2, fontStyle: 'italic', textAlign: 'center' }}>
                    Using a placeholder image because the camera is not available
                  </Typography>
                )}
                <Box sx={{ textAlign: 'center' }}>
                  <img 
                    src={capturedImage} 
                    alt={isPlaceholderImage ? "Placeholder" : "Captured"}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '300px',
                      border: `1px solid ${isPlaceholderImage ? '#f57c00' : '#ccc'}`,
                      borderRadius: '4px'
                    }} 
                  />
                  {imageFilename && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Filename: {imageFilename}
                    </Typography>
                  )}
                </Box>
              </Paper>
            )}
            
            <CircularProgress sx={{ mt: 2 }} />
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
                <Grid container spacing={3}>
                  {/* Feed details */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Feed Details
                      </Typography>
                      <Box sx={{ my: 2 }}>
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
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>Image:</strong> {imageFilename || 'None'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Image preview */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        {isPlaceholderImage ? 'Placeholder Image' : 'Image Preview'}
                      </Typography>
                      {isPlaceholderImage && (
                        <Typography color="warning.main" sx={{ mb: 1, fontStyle: 'italic' }}>
                          Using a placeholder image
                        </Typography>
                      )}
                      {capturedImage ? (
                        <Box sx={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          mt: 2
                        }}>
                          <img 
                            src={capturedImage} 
                            alt="Feed"
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '300px',
                              border: `1px solid ${isPlaceholderImage ? '#f57c00' : '#ccc'}`,
                              borderRadius: '4px'
                            }} 
                          />
                        </Box>
                      ) : (
                        <Box sx={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          bgcolor: '#f5f5f5',
                          borderRadius: 1
                        }}>
                          <Typography color="text.secondary">
                            No image captured
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
                
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
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" color="error">
              Unknown step
            </Typography>
          </Box>
        );
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
  
  // Function to toggle camera facing mode
  const toggleCameraFacing = useCallback(() => {
    setCameraFacingMode(prev => prev === "environment" ? "user" : "environment");
    setKey(prevKey => prevKey + 1); // Force webcam re-render
    setCameraReady(false);
    setCameraError(null);
  }, []);
  
  // Function to retry camera initialization
  const retryCamera = useCallback(() => {
    console.log('Retrying camera initialization...');
    setCameraError(null);
    setCameraReady(false);
    
    // If we've already tried the environment camera and it failed, try the user-facing camera
    if (cameraFacingMode === "environment" && cameraError) {
      console.log('Switching to user-facing camera...');
      setCameraFacingMode("user");
    }
    
    // Force a re-render of the Webcam component
    setKey(prevKey => prevKey + 1);
  }, [cameraError, cameraFacingMode]);
  
  // Add a key state to force webcam re-render
  const [key, setKey] = useState<number>(0);
  
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
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleExit}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default TrackingSequence; 