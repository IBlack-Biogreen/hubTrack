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
import Training from './pages/Training';
import Settings from './pages/Settings';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { TimeoutProvider } from './contexts/TimeoutContext';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7EAA92',
    },
    secondary: {
      main: '#C8E4B2',
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
      main: '#7EAA92',
    },
    secondary: {
      main: '#C8E4B2',
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/feed-viewer" element={<FeedViewer />} />
        <Route path="/covers" element={<Covers />} />
        <Route path="/events" element={<Events />} />
        <Route path="/audits" element={<Audits />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/training" element={<Training />} />
        <Route path="/settings" element={<Settings />} />
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
            <ThemeWrapper />
          </LanguageProvider>
        </TimeoutProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
