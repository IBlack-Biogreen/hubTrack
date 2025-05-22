import React, { createContext, useContext, useState, ReactNode } from 'react';
import { verifyUserPin } from '../api/trackingService';
import { useLanguage } from './LanguageContext';

// Define the User type
export interface User {
  _id: string;
  name: string;
  role: string;
  DEVICES?: string[];
  LANGUAGE?: string;
}

// Define the context state type
interface UserContextState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

// Create the context with a default empty value
const UserContext = createContext<UserContextState>({
  currentUser: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {}
});

// Define props for the provider component
interface UserProviderProps {
  children: ReactNode;
}

// Create a provider component that will wrap the app
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { setLanguage, availableLanguages } = useLanguage();

  // Login function using PIN
  const login = async (pin: string): Promise<boolean> => {
    try {
      const response = await verifyUserPin(pin);
      
      if (response.success) {
        setCurrentUser(response.user);
        setIsAuthenticated(true);
        
        // Set the language based on user's preference
        if (response.user.LANGUAGE) {
          console.log('User language from response:', response.user.LANGUAGE);
          console.log('Available languages:', availableLanguages);
          const userLanguage = availableLanguages.find(lang => lang.code.toLowerCase() === response.user.LANGUAGE.toLowerCase());
          console.log('Found matching language:', userLanguage);
          if (userLanguage) {
            console.log('Setting language to:', userLanguage);
            setLanguage(userLanguage);
          }
        }
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Provide the context value to children
  return (
    <UserContext.Provider value={{ currentUser, isAuthenticated, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// Create a custom hook to use the user context
export const useUser = () => useContext(UserContext);

export default UserContext; 