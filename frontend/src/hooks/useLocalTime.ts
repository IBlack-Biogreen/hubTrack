import { useState, useEffect } from 'react';
import axios from 'axios';

interface TimezoneData {
  timezone: string;
  offset: number;
  offsetHours: number;
  currentTime: string;
  utcTime: string;
}

export function useLocalTime() {
  const [localTime, setLocalTime] = useState<Date>(new Date());
  const [timezoneData, setTimezoneData] = useState<TimezoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch timezone data
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('http://localhost:5000/api/timezone');
        setTimezoneData(response.data);
      } catch (err) {
        console.error('Error fetching timezone:', err);
        setError('Failed to fetch timezone data');
        // Fallback to system time
        setTimezoneData({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          offset: new Date().getTimezoneOffset() * 60, // Convert to seconds
          offsetHours: new Date().getTimezoneOffset() / 60,
          currentTime: new Date().toISOString(),
          utcTime: new Date().toISOString()
        });
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
      if (timezoneData) {
        // Calculate local time based on timezone offset
        const utcTime = new Date();
        const localTime = new Date(utcTime.getTime() + (timezoneData.offset * 1000));
        setLocalTime(localTime);
      } else {
        // Fallback to system time
        setLocalTime(new Date());
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    return () => clearInterval(timer);
  }, [timezoneData]);

  return {
    localTime,
    timezoneData,
    loading,
    error,
    timezone: timezoneData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    offsetHours: timezoneData?.offsetHours || (new Date().getTimezoneOffset() / 60)
  };
} 