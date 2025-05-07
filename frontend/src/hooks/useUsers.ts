import { useState, useEffect } from 'react';

// Define the User interface based on the API response
export interface User {
  _id: string;
  name: string;
  LANGUAGE: string;
  CODE: string;
  organization: string;
  title: string;
  siteChampion: boolean;
  numberFeeds: number;
  status: 'active' | 'inactive';
  lastSignIn?: string;
  avatar: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.status}`);
      }
      
      const data = await response.json();
      // Handle the PowerShell wrapped response if necessary
      const usersData = Array.isArray(data) ? data : (data.value || []);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, error, refetch: fetchUsers };
};

export default useUsers; 