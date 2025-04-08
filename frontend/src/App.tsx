import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
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
      </Router>
    </ThemeProvider>
  );
}

export default App;
