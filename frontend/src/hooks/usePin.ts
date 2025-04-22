import { useState } from 'react';

interface VerifyPinResponse {
  success: boolean;
  user?: {
    _id: string;
    name: string;
    role: 'admin' | 'user';
    DEVICES: string[];
  };
  error?: string;
}

interface UsePinReturn {
  verifyPin: (pin: string) => Promise<VerifyPinResponse>;
  loading: boolean;
  error: string | null;
}

export const usePin = (): UsePinReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const verifyPin = async (pin: string): Promise<VerifyPinResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to verify PIN');
        return {
          success: false,
          error: data.error || 'Failed to verify PIN'
        };
      }
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return { verifyPin, loading, error };
};

export default usePin; 
 