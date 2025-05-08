import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Storage from './pages/Storage';
import FeedViewer from './pages/FeedViewer';
import Covers from './pages/Covers';
import Events from './pages/Events';
import Audits from './pages/Audits';
import Stats from './pages/Stats';
import Materials from './pages/Materials';
import Users from './pages/Users';
import Setup from './pages/Setup';
import Settings from './pages/Settings';
import UserTest from './components/UserTest';
import TrackingSequence from './pages/TrackingSequence';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { TimeoutProvider } from './contexts/TimeoutContext';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserProvider } from './contexts/UserContext';
import { ScreensaverProvider } from './contexts/ScreensaverContext';
import { ScreensaverOverlay } from './components/ScreensaverOverlay';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#588c66',
    },
    secondary: {
      main: '#588c66',
    },
    info: {
      main: '#FFD9B7',
    },
    success: {
      main: '#9ED2BE',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2b8f45',
    },
    secondary: {
      main: '#2b8f45',
    },
    info: {
      main: '#FFD9B7',
    },
    success: {
      main: '#9ED2BE',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function AppContent() {
  useInactivityTimeout();
  return (
    <>
      <Navigation />
      <ScreensaverOverlay />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/feed-viewer" element={<FeedViewer />} />
        <Route path="/covers" element={<Covers />} />
        <Route path="/events" element={<Events />} />
        <Route path="/audits" element={<Audits />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/users" element={<Users />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/user-test" element={<UserTest />} />
        <Route path="/tracking-sequence" element={<TrackingSequence />} />
      </Routes>
    </>
  );
}

function ThemeWrapper() {
  const { isDarkMode } = useThemeContext();
  return (
    <MuiThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <AppContent />
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <TimeoutProvider>
          <LanguageProvider>
            <UserProvider>
              <ScreensaverProvider>
                <ThemeWrapper />
              </ScreensaverProvider>
            </UserProvider>
          </LanguageProvider>
        </TimeoutProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
