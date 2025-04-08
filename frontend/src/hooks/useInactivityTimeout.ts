import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimeout } from '../contexts/TimeoutContext';

export function useInactivityTimeout() {
  const navigate = useNavigate();
  const { timeout } = useTimeout();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        navigate('/');
      }, timeout);
    };

    // Set up event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate, timeout]);
} 