import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Types for the tracking sequence
export interface Organization {
  name: string;
  displayName: string;
}

export interface Department {
  name: string;
  displayName: string;
}

export interface FeedType {
  id: string;
  type: string;
  displayName: string;
  buttonColor: string;
  explanation: string;
}

export interface OrganizationsResponse {
  organizations: Organization[];
  autoSelect: Organization | null;
}

export interface DepartmentsResponse {
  departments: Department[];
  autoSelect: Department | null;
}

export interface FeedTypesResponse {
  feedTypes: FeedType[];
  autoSelect: FeedType | null;
}

export interface CreateFeedRequest {
  weight: number;
  userId: string;
  organization: string;
  department: string;
  type: string;
  typeDisplayName?: string;
  feedTypeId: string;
  imageFilename?: string;
}

export interface CreateFeedResponse {
  success: boolean;
  feedId: string;
  message: string;
}

// API functions
export const getOrganizations = async (): Promise<OrganizationsResponse> => {
  const response = await axios.get(`${API_URL}/tracking-sequence/organizations`);
  return response.data;
};

export const getDepartments = async (organization: string): Promise<DepartmentsResponse> => {
  const response = await axios.get(`${API_URL}/tracking-sequence/departments/${encodeURIComponent(organization)}`);
  return response.data;
};

export const getFeedTypes = async (organization: string, department: string): Promise<FeedTypesResponse> => {
  const response = await axios.get(
    `${API_URL}/tracking-sequence/feed-types/${encodeURIComponent(organization)}/${encodeURIComponent(department)}`
  );
  return response.data;
};

export const createFeed = async (feedData: CreateFeedRequest): Promise<CreateFeedResponse> => {
  const response = await axios.post(`${API_URL}/feeds`, feedData);
  return response.data;
};

export const verifyUserPin = async (pin: string): Promise<any> => {
  const response = await axios.post(`${API_URL}/verify-pin`, { pin });
  return response.data;
};

export const getWeight = async (): Promise<number> => {
  // Use mock weight by default until we know LabJack is working
  const useMockWeight = true;
  
  if (useMockWeight) {
    // Generate a consistent mock weight 
    const now = new Date();
    const seed = now.getDate() + now.getMonth() + 1;
    const mockWeight = (5 + (seed % 10)) + ((now.getMinutes() % 10) / 10);
    
    console.log('Using mock weight:', mockWeight.toFixed(2), 'lbs');
    return parseFloat(mockWeight.toFixed(2));
  }
  
  // Only try to connect to LabJack if we're not using mock data
  try {
    console.log('Attempting to get weight from LabJack sensor...');
    // Get the weight from the LabJack sensor
    const response = await axios.get(`${API_URL}/labjack/ain1`);
    console.log('LabJack response:', response.data);
    return response.data.value || 0;
  } catch (error) {
    console.error('Error getting weight:', error);
    
    // Fallback to mock weight
    const now = new Date();
    const seed = now.getDate() + now.getMonth() + 1;
    const mockWeight = (5 + (seed % 10)) + ((now.getMinutes() % 10) / 10);
    
    console.log('Using mock weight after LabJack error:', mockWeight.toFixed(2), 'lbs');
    return parseFloat(mockWeight.toFixed(2));
  }
}; 