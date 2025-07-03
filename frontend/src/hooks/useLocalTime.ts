import { useState, useEffect } from 'react';

export function useLocalTime() {
  const [localTime, setLocalTime] = useState<Date>(new Date());
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch timezone from device settings
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get device labels to find the current device
        const deviceLabelsResponse = await fetch('http://localhost:5000/api/device-labels');
        if (!deviceLabelsResponse.ok) {
          throw new Error('Failed to fetch device labels');
        }
        
        const deviceLabels = await deviceLabelsResponse.json();
        if (!deviceLabels || deviceLabels.length === 0) {
          throw new Error('No device labels found');
        }
        
        // Get the first device label
        const deviceLabel = deviceLabels[0]?.deviceLabel;
        if (!deviceLabel) {
          throw new Error('No device label found');
        }
        
        // Get device settings
        const settingsResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/settings`);
        if (!settingsResponse.ok) {
          throw new Error('Failed to fetch device settings');
        }
        
        const settings = await settingsResponse.json();
        const savedTimezone = settings.timezone || 'America/New_York';
        setTimezone(savedTimezone);
        
      } catch (err) {
        console.error('Error fetching timezone:', err);
        setError('Failed to fetch timezone data');
        // Fallback to system timezone
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      } finally {
        setLoading(false);
      }
    };

    fetchTimezone();
    
    // Refresh timezone data every hour (in case of DST changes)
    const timezoneInterval = setInterval(fetchTimezone, 3600000);
    
    return () => clearInterval(timezoneInterval);
  }, []);

  // Update local time every second
  useEffect(() => {
    const updateTime = () => {
      setLocalTime(new Date());
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Helper function to format time in the target timezone
  const formatTimeInTimezone = (date: Date, timezoneName: string, options?: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezoneName,
        ...options
      }).format(date);
    } catch (error) {
      // Fallback to local timezone if the timezone is invalid
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
  };

  return {
    localTime,
    loading,
    error,
    timezone,
    formatTimeInTimezone
  };
} 