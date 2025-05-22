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
import { useLanguage } from '../contexts/LanguageContext';
import { useTrackingSequence } from '../contexts/TrackingSequenceContext';
import {
  getOrganizations,
  getDepartments,
  getFeedTypes,
  createFeed,
  getWeight,
  getWeightHistory,
  updateFeedWeights,
  Organization,
  Department,
  FeedType
} from '../api/trackingService';
import Webcam from 'react-webcam';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';

// Steps in the tracking sequence
const steps = [
  'Capture Image',
  'selectOrganization',
  'selectDepartment',
  'selectFeedType',
  'summary'
];

const SEQUENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

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
  
  // Add weightIntervalRef
  const weightIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add rawWeights state with correct type
  const [rawWeights, setRawWeights] = useState<Record<string, { timestamp: string; value: string }>>({});
  const [feedStartTime, setFeedStartTime] = useState<Date | null>(null);
  const [postSequenceWeights, setPostSequenceWeights] = useState<Record<string, { timestamp: string; value: string }>>({});
  const [isPostSequence, setIsPostSequence] = useState<boolean>(false);
  const postSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [feedSummaryData, setFeedSummaryData] = useState<any>(null);
  const [cartSettings, setCartSettings] = useState<any>(null);
  
  const { currentUser, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setIsInTrackingSequence, setSequenceStartTime } = useTrackingSequence();
  
  // Add submission lock
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Add refs to track timeouts
  const cameraCheckIntervalRef = useRef<number | null>(null);
  const cameraTimeoutRef = useRef<number | null>(null);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundCollectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCreatingFeedRef = useRef<boolean>(false);
  const lastFeedCreationTimeRef = useRef<number>(0);
  
  // Add new state for auto-selection
  const [pendingAutoSelect, setPendingAutoSelect] = useState<{
    organization?: Organization;
    department?: Department;
    feedType?: FeedType;
  }>({});
  
  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Set tracking sequence state
    setIsInTrackingSequence(true);
    const startTime = new Date();
    setSequenceStartTime(startTime);
    
    // Start the sequence - first step is already done (user authenticated)
    const timer = setTimeout(() => {
      // The camera will take a photo automatically when loaded via handleCameraLoad
      fetchOrganizations();
      
      // Record feed start time
      setFeedStartTime(startTime);
      console.log('Feed started at:', startTime.toISOString());
      
      // Start collecting raw weights
      startCollectingWeights();
    }, 1000);
    
    // Set up sequence timeout
    sequenceTimeoutRef.current = setTimeout(() => {
      console.log('Sequence timeout reached - returning to home');
      handleExit();
    }, SEQUENCE_TIMEOUT);
    
    return () => {
      clearTimeout(timer);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
      // Clean up weight collection interval
      if (weightIntervalRef.current) {
        clearInterval(weightIntervalRef.current);
      }
      // Reset tracking sequence state
      setIsInTrackingSequence(false);
      setSequenceStartTime(null);
    };
  }, [isAuthenticated, navigate, setIsInTrackingSequence, setSequenceStartTime]);
  
  // Create a fallback image if the webcam fails
  const createFallbackImage = useCallback(() => {
    console.log('Creating fallback image... CALL STACK:', new Error().stack);
    console.log('Current capturedImage:', capturedImage ? 'exists' : 'null');
    console.log('Current activeStep:', activeStep);
    
    // Don't create a fallback image if we're on the summary step
    if (activeStep === 4) {
      console.log('Skipping fallback image creation on summary step');
      return;
    }
    
    // Generate a static placeholder image and filename
    const now = new Date();
    const deviceLabel = localStorage.getItem('selectedDeviceLabel');
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
    console.log('Setting capturedImage to placeholder');
    setCapturedImage(placeholderImage);
    setImageFilename(filename);
    
    // Set placeholder flag
    setIsPlaceholderImage(true);
    
    // Save the placeholder image
    saveImageLocally(placeholderImage, filename);
  }, [activeStep, capturedImage]);
  
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
        const deviceLabel = localStorage.getItem('selectedDeviceLabel');
        
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
    // But only if we don't already have a captured image
    if (!capturedImage) {
      console.log('No existing image, creating fallback after delay');
      setTimeout(() => {
        // Double-check we still don't have an image before creating fallback
        if (!capturedImage) {
          createFallbackImage();
          // Proceed to next step after creating fallback image
          fetchOrganizations();
        }
      }, 1000);
    } else {
      console.log('Camera error occurred but keeping existing captured image');
      // Proceed to next step if we already have an image
      fetchOrganizations();
    }
  };
  
  // Webcam loaded handler
  const handleCameraLoad = () => {
    console.log('Camera loaded successfully');
    setCameraError(null);
    setCameraReady(true);
    
    // Only attempt capture if we don't already have an image and we're on step 0
    if (!capturedImage && activeStep === 0) {
      // Wait for camera to be fully initialized
      const checkCameraReady = setInterval(() => {
        if (webcamRef.current) {
          console.log('Webcam ref is now available, attempting capture...');
          clearInterval(checkCameraReady);
          // Clear the ref
          cameraCheckIntervalRef.current = null;
          
          try {
            const imageSrc = webcamRef.current.getScreenshot({
              width: 640,
              height: 480
            });
            
            if (imageSrc) {
              console.log('Capture successful!');
              setCapturedImage(imageSrc);
              setIsPlaceholderImage(false);
              
              // Generate filename
              const now = new Date();
              const deviceLabel = localStorage.getItem('selectedDeviceLabel');
              const timestamp = now.toISOString();
              let filename = `${deviceLabel}_${timestamp}.jpg`;
              filename = sanitizeFilename(filename);
              
              console.log('Generated filename:', filename);
              setImageFilename(filename);
              saveImageLocally(imageSrc, filename);
              
              // Proceed to next step after successful capture
              fetchOrganizations();
            } else {
              console.error('Capture returned null image');
              createFallbackImage();
            }
          } catch (error) {
            console.error('Error during capture:', error);
            createFallbackImage();
          }
        } else {
          console.log('Waiting for webcam ref to be available...');
        }
      }, 100); // Check every 100ms
      
      // Store the interval ID in the ref
      cameraCheckIntervalRef.current = checkCameraReady as unknown as number;
      
      // Clear interval after 5 seconds if camera isn't ready
      const timeoutId = setTimeout(() => {
        console.log('Checking if camera ready after 5 seconds, active step:', activeStep);
        if (cameraCheckIntervalRef.current) {
          clearInterval(cameraCheckIntervalRef.current);
          cameraCheckIntervalRef.current = null;
        }
        
        // Only create fallback if still on step 0
        if (activeStep === 0 && !capturedImage && !webcamRef.current) {
          console.error('Camera not ready after 5 seconds');
          createFallbackImage();
          // Proceed to next step after creating fallback image
          fetchOrganizations();
        }
        
        // Clear the ref
        cameraTimeoutRef.current = null;
      }, 5000);
      
      // Store the timeout ID in the ref
      cameraTimeoutRef.current = timeoutId as unknown as number;
    }
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
    console.log('Image source type:', typeof imageSrc);
    console.log('Image source length:', imageSrc.length);
    console.log('Filename:', filename);
    
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
      
      // For web development environment
      console.log('Using web development mode - saving to backend');
      try {
        // Convert base64 to blob
        const base64Data = imageSrc.replace(/^data:image\/jpeg;base64,/, '');
        console.log('Base64 data length after cleanup:', base64Data.length);
        
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
        console.log('Blob size:', blob.size);
        
        // Create form data
        const formData = new FormData();
        formData.append('image', blob, filename);
        
        console.log('Sending image to backend...');
        // Send to backend
        const response = await axios.post('http://localhost:5000/api/save-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('Backend response:', response.data);
        
        if (response.data.success) {
          console.log('Image saved successfully via backend');
          return;
        } else {
          throw new Error('Backend returned unsuccessful response');
        }
      } catch (apiError) {
        console.error('Failed to save via backend:', apiError);
        if (apiError.response) {
          console.error('Backend error response:', apiError.response.data);
        }
      }
      
      // Fallback to browser download if all else fails
      console.log('Using browser download fallback');
      triggerBrowserDownload(imageSrc, filename);
      
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
  
  // Effect to handle organization auto-selection
  useEffect(() => {
    if (pendingAutoSelect.organization) {
      const org = pendingAutoSelect.organization;
      setSelectedOrganization(org);
      setActiveStep(1); // Move to organization step
      fetchDepartments(org.name);
      setPendingAutoSelect(prev => ({ ...prev, organization: undefined }));
    }
  }, [pendingAutoSelect.organization]);

  // Effect to handle department auto-selection
  useEffect(() => {
    if (pendingAutoSelect.department && selectedOrganization) {
      const dept = pendingAutoSelect.department;
      setSelectedDepartment(dept);
      setActiveStep(2); // Move to department step
      fetchFeedTypes(selectedOrganization.name, dept.name);
      setPendingAutoSelect(prev => ({ ...prev, department: undefined }));
    }
  }, [pendingAutoSelect.department, selectedOrganization]);

  // Effect to handle feed type auto-selection
  useEffect(() => {
    if (pendingAutoSelect.feedType && selectedOrganization && selectedDepartment) {
      const feedType = pendingAutoSelect.feedType;
      setSelectedFeedType(feedType);
      setActiveStep(3); // Move to feed type step
      // Use setTimeout to ensure state updates are complete
      setTimeout(() => {
        handleSelectFeedType(feedType, true);
      }, 100);
      setPendingAutoSelect(prev => ({ ...prev, feedType: undefined }));
    }
  }, [pendingAutoSelect.feedType, selectedOrganization, selectedDepartment]);

  // Fetch organizations for the tracking sequence
  const fetchOrganizations = async () => {
    console.log('Starting fetchOrganizations...');
    setLoading(true);
    setError(null);
    try {
      console.log('Calling getOrganizations API...');
      const response = await getOrganizations();
      console.log('getOrganizations response:', response);
      
      if (!response || !response.organizations) {
        console.error('Invalid response from getOrganizations:', response);
        throw new Error('Invalid response from server');
      }
      
      console.log('Setting organizations:', response.organizations);
      setOrganizations(response.organizations);
      
      if (response.autoSelect) {
        console.log('Auto-selecting organization:', response.autoSelect);
        setPendingAutoSelect(prev => ({ ...prev, organization: response.autoSelect }));
      } else {
        console.log('No auto-select organization, moving to step 1');
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Error in fetchOrganizations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch organizations');
    } finally {
      console.log('fetchOrganizations complete, setting loading to false');
      setLoading(false);
    }
  };
  
  // Fetch departments for the selected organization
  const fetchDepartments = async (organizationName: string) => {
    console.log('Starting fetchDepartments for organization:', organizationName);
    try {
      setLoading(true);
      setError(null);
      
      console.log('Calling getDepartments API...');
      const response = await getDepartments(organizationName);
      console.log('getDepartments response:', response);
      
      setDepartments(response.departments);
      console.log('Departments set:', response.departments);
      
      // If we should auto-select, do so
      if (response.autoSelect) {
        console.log('Auto-selecting department:', response.autoSelect);
        setPendingAutoSelect(prev => ({ ...prev, department: response.autoSelect }));
      } else {
        console.log('No auto-select department, moving to step 2');
        setActiveStep(2); // Move to select department step
      }
      
    } catch (err) {
      console.error('Error in fetchDepartments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      console.log('fetchDepartments complete, setting loading to false');
      setLoading(false);
    }
  };
  
  // Fetch feed types for the selected organization and department
  const fetchFeedTypes = async (organizationName: string, departmentName: string) => {
    console.log('Starting fetchFeedTypes for org:', organizationName, 'dept:', departmentName);
    try {
      setLoading(true);
      setError(null);
      
      console.log('Calling getFeedTypes API...');
      const response = await getFeedTypes(organizationName, departmentName);
      console.log('getFeedTypes response:', response);
      
      setFeedTypes(response.feedTypes);
      console.log('Feed types set:', response.feedTypes);
      
      // If we should auto-select, do so
      if (response.autoSelect) {
        console.log('Auto-selecting feed type:', response.autoSelect);
        setPendingAutoSelect(prev => ({ ...prev, feedType: response.autoSelect }));
      } else {
        console.log('No auto-select feed type, moving to step 3');
        setActiveStep(3); // Move to select feed type step
      }
      
    } catch (err) {
      console.error('Error in fetchFeedTypes:', err);
      setError('Failed to load feed types. Please try again.');
    } finally {
      console.log('fetchFeedTypes complete, setting loading to false');
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
      
    } catch (err) {
      console.error('Error fetching weight:', err);
      setError('Failed to get weight from scale. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle organization selection
  const handleSelectOrganization = async (organization: Organization) => {
    console.log('handleSelectOrganization called with:', organization);
    setSelectedOrganization(organization);
    console.log('Selected organization set, calling fetchDepartments...');
    try {
      await fetchDepartments(organization.name);
      console.log('fetchDepartments completed');
    } catch (error) {
      console.error('Error in handleSelectOrganization:', error);
    }
  };
  
  // Handle department selection
  const handleSelectDepartment = async (department: Department) => {
    if (!selectedOrganization) return;
    
    setSelectedDepartment(department);
    setActiveStep(3); // Move to feed type selection step
    await fetchFeedTypes(selectedOrganization.name, department.name);
  };
  
  // Function to handle background weight collection
  const startBackgroundWeightCollection = async (
    feedType: FeedType, 
    initialWeight: number,
    binWeight: number | null,
    cartSettings: any
  ) => {
    // Check if we're already creating a feed
    if (isCreatingFeedRef.current) {
      console.log('Feed creation already in progress, skipping');
      return null;
    }

    // Check if we've created a feed too recently (within last 2 seconds)
    const now = Date.now();
    if (now - lastFeedCreationTimeRef.current < 2000) {
      console.log('Feed creation too soon after last feed, skipping');
      return null;
    }

    try {
      isCreatingFeedRef.current = true;
      lastFeedCreationTimeRef.current = now;
      
      console.log('Background collection - cart settings:', cartSettings);
      console.log('Background collection - tareVoltage:', cartSettings.tareVoltage);
      console.log('Background collection - scaleFactor:', cartSettings.scaleFactor);
      
      // Clear any existing background collection
      if (backgroundCollectionIntervalRef.current) {
        console.log('Clearing existing background collection interval');
        clearInterval(backgroundCollectionIntervalRef.current);
        backgroundCollectionIntervalRef.current = null;
      }
      
      // Create initial feed document
      const initialFeedData = {
        weight: parseFloat(initialWeight.toFixed(2)),
        totalWeight: parseFloat(initialWeight.toFixed(2)),
        userId: currentUser?.name,
        organization: selectedOrganization?.displayName,
        department: selectedDepartment?.displayName,
        type: feedType.type,
        typeDisplayName: feedType.displayName,
        feedTypeId: feedType.id,
        imageFilename: imageFilename || undefined,
        feedStartedTime: feedStartTime?.toISOString(),
        rawWeights: rawWeights,
        binWeight: parseFloat((binWeight || 0).toFixed(2)),
        tareVoltage: cartSettings.tareVoltage,
        scaleFactor: cartSettings.scaleFactor
      };
      
      console.log('Background collection - final feed data:', initialFeedData);
      
      // Create the feed and get its ID
      const createResponse = await createFeed(initialFeedData);
      const feedId = createResponse.feedId;
      
      // Start background collection
      const collectionInterval = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:5001/api/labjack/ain1');
          if (response.ok) {
            const data = await response.json();
            const newWeight = {
              timestamp: data.timestamp,
              value: data.voltage.toString()
            };
            
            // Update the feed document with new weight using the service function
            await updateFeedWeights(feedId, newWeight);
          }
        } catch (error) {
          console.error('Error in background weight collection:', error);
        }
      }, 1000);
      
      // Store the interval reference
      backgroundCollectionIntervalRef.current = collectionInterval;
      
      // Stop collection after 30 seconds
      setTimeout(() => {
        if (backgroundCollectionIntervalRef.current === collectionInterval) {
          console.log('Stopping background weight collection after 30 seconds');
          clearInterval(collectionInterval);
          backgroundCollectionIntervalRef.current = null;
        }
      }, 30000);
      
      return feedId;
    } finally {
      isCreatingFeedRef.current = false;
    }
  };
  
  // Handle feed type selection
  const handleSelectFeedType = async (feedType: FeedType, isAutoSelect: boolean = false) => {
    console.log('Feed type selected:', feedType);
    console.log('Current active step:', activeStep);
    console.log('Is auto-select:', isAutoSelect);
    
    // Only check step and submitting state if this is not an auto-selection
    if (!isAutoSelect && (activeStep !== 3 || isSubmitting)) {
      console.log('Not on feed type selection step or already submitting, ignoring selection');
      return;
    }

    // Check if we're already creating a feed
    if (isCreatingFeedRef.current) {
      console.log('Feed creation already in progress, ignoring selection');
      return;
    }

    // Check if we've created a feed too recently (within last 2 seconds)
    const now = Date.now();
    if (now - lastFeedCreationTimeRef.current < 2000) {
      console.log('Feed creation too soon after last feed, ignoring selection');
      return;
    }

    // Ensure we have all required data
    if (!selectedOrganization || !selectedDepartment) {
      console.error('Missing required data:', {
        organization: selectedOrganization,
        department: selectedDepartment
      });
      setError('Missing required data. Please try again.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setLoading(true);
      setError(null);
      
      // Set the selected feed type first
      setSelectedFeedType(feedType);
      
      // Get the current weight and ensure it's a valid number
      const weightValue = await getWeight();
      console.log('Got weight value:', weightValue);
      
      if (weightValue === null || isNaN(weightValue)) {
        throw new Error('Invalid weight value received from scale');
      }
      
      // Set the weight state
      setWeight(weightValue);
      
      // Create weight data object - allow zero values
      const weightData = {
        weight: parseFloat(weightValue.toFixed(2)),
        totalWeight: parseFloat(weightValue.toFixed(2))
      };
      
      console.log('Weight data prepared:', weightData);

      // Fetch the device label string from the backend
      let binWeight = null;
      let deviceLabelString = null;
      let deviceSettings = null;
      let cartSettings = null;
      try {
        const response = await fetch('http://localhost:5000/api/device-labels');
        if (!response.ok) {
          throw new Error(`Failed to fetch device labels: ${response.status} ${response.statusText}`);
        }
        const deviceLabels = await response.json();
        if (!Array.isArray(deviceLabels) || deviceLabels.length === 0) {
          throw new Error('No device labels found in local collection');
        }
        deviceLabelString = deviceLabels[0].deviceLabel;
        
        // Fetch settings from device-labels collection
        const settingsResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabelString}/settings`);
        if (!settingsResponse.ok) {
          throw new Error(`Failed to fetch device settings: ${settingsResponse.status} ${settingsResponse.statusText}`);
        }
        deviceSettings = await settingsResponse.json();
        console.log('Fetched device settings:', deviceSettings);
        binWeight = deviceSettings.binWeight;

        // Fetch cart settings
        const savedCartSerial = localStorage.getItem('selectedCart');
        if (!savedCartSerial) {
          throw new Error('No cart selected');
        }
        const cartResponse = await fetch(`http://localhost:5000/api/carts/${savedCartSerial}`);
        if (!cartResponse.ok) {
          throw new Error(`Failed to fetch cart settings: ${cartResponse.status} ${cartResponse.statusText}`);
        }
        cartSettings = await cartResponse.json();
        console.log('Raw cart settings from API:', cartSettings);

        // Validate required cart settings
        if (!cartSettings.tareVoltage || !cartSettings.scaleFactor) {
          throw new Error('Missing required cart settings: tareVoltage or scaleFactor');
        }
        
        // Create initial feed document with validated weight data
        const initialFeedData = {
          ...weightData, // Spread the validated weight data
          userId: currentUser?.name,
          organization: selectedOrganization.displayName,
          department: selectedDepartment.displayName,
          type: feedType.type,
          typeDisplayName: feedType.displayName,
          feedTypeId: feedType.id,
          imageFilename: imageFilename || undefined,
          feedStartedTime: feedStartTime?.toISOString(),
          rawWeights: rawWeights,
          binWeight: parseFloat((binWeight || 0).toFixed(2)),
          tareVoltage: cartSettings.tareVoltage,
          scaleFactor: cartSettings.scaleFactor
        };

        // Validate all required fields - allow zero values for weight fields
        const requiredFields = [
          'userId', 'organization', 'department',
          'type', 'typeDisplayName', 'feedTypeId', 'feedStartedTime',
          'tareVoltage', 'scaleFactor'
        ];

        const missingFields = requiredFields.filter(field => !initialFeedData[field]);
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Validate weight fields separately to allow zero values
        if (initialFeedData.weight === undefined || initialFeedData.weight === null) {
          throw new Error('Weight value is missing');
        }
        if (initialFeedData.totalWeight === undefined || initialFeedData.totalWeight === null) {
          throw new Error('Total weight value is missing');
        }
        
        console.log('Final feed data being sent:', initialFeedData);
        
        // Update summary data for display
        setFeedSummaryData(initialFeedData);
        
        // Move to summary step
        setActiveStep(4);
        
        // Start background weight collection
        await startBackgroundWeightCollection(feedType, weightValue, binWeight, cartSettings);
        
        // Wait 5 seconds before resetting and navigating
        setTimeout(() => {
          // Reset the form
          setActiveStep(0);
          setSelectedOrganization(null);
          setSelectedDepartment(null);
          setSelectedFeedType(null);
          setWeight(null);
          setCapturedImage(null);
          setImageFilename(null);
          setRawWeights({});
          setPostSequenceWeights({});
          setFeedStartTime(null);
          setIsPostSequence(false);
          
          // Log the user out before navigating back to home
          logout();
          
          // Navigate back to home
          navigate('/');
        }, 5000);
      } catch (err) {
        console.error('Error in feed creation:', err);
        setError(err instanceof Error ? err.message : 'Failed to create feed. Please try again.');
        // Reset to feed type selection step
        setActiveStep(3);
      }
    } catch (err) {
      console.error('Error in feed type selection:', err);
      setError('Failed to process feed. Please try again.');
      // Reset to feed type selection step
      setActiveStep(3);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };
  
  // Add useEffect to handle the timeout when we reach the summary step
  useEffect(() => {
    if (activeStep === 4) {
      console.log('Summary step reached - setting timeout and locking image state');
      
      // Store current image state in a ref to preserve it
      const currentCapturedImage = capturedImage;
      const currentIsPlaceholder = isPlaceholderImage;
      
      // Create a function to reset back to the stored state if something changes it
      const preserveImageState = () => {
        if (capturedImage !== currentCapturedImage) {
          console.log('Image changed in summary view - restoring original');
          setCapturedImage(currentCapturedImage);
          setIsPlaceholderImage(currentIsPlaceholder);
        }
      };
      
      // Check every 100ms to make sure image doesn't change
      const preserveInterval = setInterval(preserveImageState, 100);
      
      const timeoutId = setTimeout(() => {
        console.log('Timeout triggered - returning to home');
        clearInterval(preserveInterval);
        logout();
        navigate('/');
      }, 5000);

      // Clean up timeout and interval on component unmount
      return () => {
        clearTimeout(timeoutId);
        clearInterval(preserveInterval);
      };
    }
  }, [activeStep, navigate, capturedImage, isPlaceholderImage]);
  
  const handleExit = () => {
    // Only allow exit if we're not on the summary step
    if (activeStep !== 4) {
      // Clear any existing timeouts
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
      // Reset tracking sequence state
      setIsInTrackingSequence(false);
      setSequenceStartTime(null);
      logout();
      navigate('/');
    }
  };
  
  // Get step content based on active step
  const getStepContent = (step: number) => {
    console.log('Rendering step content for step:', step);
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography variant="h6" sx={{ mt: 2, mb: 4 }}>
              {t('userAuthentication')}
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
                {activeStep === 0 ? (
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
                ) : (
                  /* Placeholder div to maintain layout when webcam is hidden */
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '480px', 
                      backgroundColor: '#eee',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography color="textSecondary">Camera inactive in this step</Typography>
                  </div>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={captureImage}
                  disabled={!cameraReady || activeStep !== 0}
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
              {t('selectOrganization')}
            </Typography>
            <Typography>
              {t('selectOrganizationDescription')}
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
              {t('selectDepartment')}
            </Typography>
            <Typography>
              {t('selectDepartmentDescription')}
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
              {t('selectFeedType')}
            </Typography>
            <Typography>
              {t('selectFeedTypeDescription')}
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
                      <CardActionArea 
                        onClick={() => {
                          console.log('Feed type card clicked:', feedType);
                          console.log('Current active step:', activeStep);
                          handleSelectFeedType(feedType);
                        }}
                      >
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
              {t('summary')}
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
                      <Typography variant="h6" gutterBottom>
                        Feed Details
                      </Typography>
                      {/* Calculate net weight for display */}
                      {(() => {
                        let netWeight = 'Not available';
                        if (feedSummaryData?.weight !== undefined && feedSummaryData?.weight !== null && !isNaN(Number(feedSummaryData.weight))) {
                          netWeight = Number(feedSummaryData.weight).toFixed(2);
                        }
                        return (
                          <Typography variant="body1" gutterBottom>
                            <strong>Weight:</strong> {netWeight} lbs
                          </Typography>
                        );
                      })()}
                      <Typography variant="body1" gutterBottom>
                        <strong>Bin Weight:</strong> {feedSummaryData?.binWeight !== undefined && feedSummaryData?.binWeight !== null ? `${Number(feedSummaryData.binWeight).toFixed(2)} lbs` : 'Not available'}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Organization:</strong> {feedSummaryData?.organization || 'Not selected'}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Department:</strong> {feedSummaryData?.department || 'Not selected'}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Feed Type:</strong> {feedSummaryData?.typeDisplayName || 'Not selected'}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>User:</strong> {feedSummaryData?.userId || 'Not available'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  {/* Image preview */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Image Preview
                      </Typography>
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
                              border: '1px solid #ccc',
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
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="success.main" sx={{ mb: 2 }}>
                    Feed entry successfully created! Returning to home screen...
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        );
      default:
        return null;
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
  
  // Add a function to start collecting weight data
  const startCollectingWeights = async () => {
    console.log('Starting to collect weight data...');
    
    // Get initial weight history (past 2 minutes)
    try {
      const history = await getWeightHistory();
      const formattedWeights: Record<string, { timestamp: string; value: string }> = {};
      
      // Only keep the last 120 samples (2 minutes at 1Hz)
      const recentHistory = history.slice(-120);
      
      recentHistory.forEach((entry) => {
        formattedWeights[entry.timestamp] = {
          timestamp: entry.timestamp,
          value: entry.voltage.toString()
        };
      });
      
      setRawWeights(formattedWeights);
      console.log(`Initialized with ${Object.keys(formattedWeights).length} weight readings`);
    } catch (error) {
      console.error('Error getting initial weight history:', error);
    }
    
    // Start collecting new weights at 1Hz
    const weightsInterval = setInterval(collectWeight, 1000);
    weightIntervalRef.current = weightsInterval;

    return () => {
      if (weightIntervalRef.current !== null) {
        clearInterval(weightIntervalRef.current);
        weightIntervalRef.current = null;
      }
    };
  };

  // Separate function to collect a single weight reading
  const collectWeight = async () => {
    try {
      console.log('Collecting a weight sample...');
      const response = await fetch('http://localhost:5001/api/labjack/ain1');
      if (response.ok) {
        const data = await response.json();
        console.log('Weight sample collected:', data);
        
        // Add to appropriate weights state
        const newEntry = { 
          timestamp: data.timestamp, 
          value: data.voltage.toString() 
        };
        
        if (isPostSequence) {
          setPostSequenceWeights(prevWeights => {
            // Keep only the last 30 samples for post-sequence (30 seconds at 1Hz)
            const updatedWeights = { ...prevWeights, [data.timestamp]: newEntry };
            const entries = Object.entries(updatedWeights);
            if (entries.length > 30) {
              const oldestEntries = entries.slice(0, entries.length - 30);
              oldestEntries.forEach(([key]) => delete updatedWeights[key]);
            }
            return updatedWeights;
          });
        } else {
          setRawWeights(prevWeights => {
            // Keep only the last 120 samples (2 minutes at 1Hz)
            const updatedWeights = { ...prevWeights, [data.timestamp]: newEntry };
            const entries = Object.entries(updatedWeights);
            if (entries.length > 120) {
              const oldestEntries = entries.slice(0, entries.length - 120);
              oldestEntries.forEach(([key]) => delete updatedWeights[key]);
            }
            return updatedWeights;
          });
        }
      } else {
        console.error('Failed to get weight reading:', response.statusText);
      }
    } catch (error) {
      console.error('Error collecting weight data:', error);
    }
  };
  
  // Clean up timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up all timeouts and intervals');
      
      if (weightIntervalRef.current !== null) {
        clearInterval(weightIntervalRef.current);
        weightIntervalRef.current = null;
      }
      
      if (postSequenceTimeoutRef.current !== null) {
        clearTimeout(postSequenceTimeoutRef.current);
        postSequenceTimeoutRef.current = null;
      }
      
      // Clean up camera timeouts
      if (cameraCheckIntervalRef.current) {
        clearInterval(cameraCheckIntervalRef.current);
        cameraCheckIntervalRef.current = null;
      }
      
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }

      // Clean up background collection
      if (backgroundCollectionIntervalRef.current) {
        console.log('Cleaning up background collection interval on unmount');
        clearInterval(backgroundCollectionIntervalRef.current);
        backgroundCollectionIntervalRef.current = null;
      }
    };
  }, []);
  
  // Add useEffect to track step changes for debugging
  useEffect(() => {
    console.log(`Step changed to: ${activeStep}`);
    
    // Clean up camera timeouts when the step changes
    if (activeStep !== 0) {
      console.log('Cleaning up camera timeouts on step change');
      if (cameraCheckIntervalRef.current) {
        clearInterval(cameraCheckIntervalRef.current);
        cameraCheckIntervalRef.current = null;
      }
      
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
    }
    
    // We handle step 4 in a dedicated useEffect, so don't duplicate tracking
    if (activeStep !== 4) {
      console.log('Image state:', {
        capturedImage: capturedImage ? 'exists' : 'null',
        isPlaceholderImage,
        imageFilename
      });
    }
  }, [activeStep, capturedImage, isPlaceholderImage, imageFilename]);
  
  // Add useEffect to track capturedImage changes
  useEffect(() => {
    console.log('capturedImage changed:', capturedImage ? 'exists' : 'null', 'placeholder:', isPlaceholderImage);
  }, [capturedImage, isPlaceholderImage]);
  
  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 2 }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ p: 2 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{t(label)}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Box sx={{ p: 2, bgcolor: '#ffeeee', borderRadius: 1, mx: 2 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}
          
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {getStepContent(activeStep)}
          </Box>

          {/* Global exit button that's always visible */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
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