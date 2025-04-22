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
  CircularProgress
} from '@mui/material';
import { useUser } from '../contexts/UserContext';

// Steps in the tracking sequence
const steps = [
  'User Authentication',
  'Cart Selection',
  'Device Calibration',
  'Ready to Track'
];

const TrackingSequence: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { currentUser, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  
  // Check if user is authenticated
  useEffect(() => {
    // If no user is authenticated, redirect to home page
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Start the sequence - first step is already done (user authenticated)
    const timer = setTimeout(() => {
      setActiveStep(1);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);
  
  // Mock functions for each step - these would be replaced with actual API calls
  const selectCart = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setActiveStep(2);
  };
  
  const calibrateDevice = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setActiveStep(3);
  };
  
  const startTracking = () => {
    // Navigate to the main tracking interface
    navigate('/storage');
  };
  
  const handleNext = () => {
    switch (activeStep) {
      case 1:
        selectCart();
        break;
      case 2:
        calibrateDevice();
        break;
      case 3:
        startTracking();
        break;
      default:
        break;
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
              Authenticating...
            </Typography>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Select a Cart
            </Typography>
            <Typography variant="body1" paragraph>
              Please select the cart you're working with today.
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                >
                  Select Cart
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleExit}
                >
                  Exit
                </Button>
              </Box>
            )}
          </Box>
        );
      case 2:
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Calibrate Device
            </Typography>
            <Typography variant="body1" paragraph>
              Please calibrate the tracking device.
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                >
                  Calibrate
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleExit}
                >
                  Exit
                </Button>
              </Box>
            )}
          </Box>
        );
      case 3:
        return (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Ready to Track
            </Typography>
            <Typography variant="body1" paragraph>
              Your tracking device is now ready to use.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
              >
                Start Tracking
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleExit}
              >
                Exit
              </Button>
            </Box>
          </Box>
        );
      default:
        return 'Unknown step';
    }
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