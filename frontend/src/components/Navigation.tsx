import { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Button,
  MenuItem,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useLocalTime } from '../hooks/useLocalTime';
import { useLanguage, availableLanguages } from '../contexts/LanguageContext';
import { useTrackingSequence } from '../contexts/TrackingSequenceContext';
import biogreenLogo from '../assets/biogreen-logo.svg';

interface DeviceLabel {
  _id: string;
  deviceLabel: string;
  deviceType: string;
  status: string;
  feedOrgID: string[];
  lastUpdated: string;
  hasStorage?: boolean;
  settings?: any;
}

const basePages = [
  { name: 'home', path: '/' },
  { name: 'history', path: '/feed-viewer' },
  { name: 'covers', path: '/covers' },
  { name: 'events', path: '/events' },
  { name: 'audits', path: '/audits' },
  { name: 'stats', path: '/stats' },
  { name: 'users', path: '/users' }
];

function Navigation() {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElLang, setAnchorElLang] = useState<null | HTMLElement>(null);
  const [pages, setPages] = useState(basePages);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const { localTime, timezone, formatTimeInTimezone } = useLocalTime();
  const { currentLanguage, setLanguage, enabledLanguages, t } = useLanguage();
  const { isInTrackingSequence } = useTrackingSequence();

  useEffect(() => {
    const fetchDeviceLabel = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/device-labels');
        if (!response.ok) {
          throw new Error('Failed to fetch device labels');
        }
        const labels = await response.json();
        console.log('Device labels response:', labels);
        const currentLabel = labels[0]; // Get the first device label
        console.log('Current device label:', currentLabel);
        
        // Update pages based on hasStorage property
        if (currentLabel?.hasStorage) {
          console.log('hasStorage is true, adding Storage tab');
          setPages([
            ...basePages.slice(0, 1),
            { name: 'Storage', path: '/storage' },
            ...basePages.slice(1)
          ]);
        } else {
          console.log('hasStorage is false or undefined, using base pages');
          setPages(basePages);
        }
      } catch (error) {
        console.error('Error fetching device label:', error);
      }
    };

    fetchDeviceLabel();
  }, []);

  // Add online/offline event listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleOpenLangMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElLang(event.currentTarget);
  };

  const handleCloseLangMenu = () => {
    setAnchorElLang(null);
  };

  const handleLanguageChange = (language: typeof availableLanguages[0]) => {
    setLanguage(language);
    handleCloseLangMenu();
  };

  const formatTime = (date: Date) => {
    return formatTimeInTimezone(date, timezone, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return formatTimeInTimezone(date, timezone, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AppBar position="static" color="primary">
      <Container maxWidth={false} sx={{ px: { xs: 1, sm: 2 } }}>
        <Toolbar disableGutters sx={{ minHeight: { xs: '32px', sm: '40px' }, py: 0 }}>
          <Box
            component={!isInTrackingSequence ? RouterLink : 'div'}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              height: { xs: '32px', sm: '40px' },
              lineHeight: 0,
              '& img': {
                height: '100%',
                width: 'auto',
                maxWidth: '100%',
                display: 'block',
                margin: 0,
                padding: 0,
                objectFit: 'contain'
              }
            }}
          >
            <img src={biogreenLogo} alt="BioGreen Logo" />
          </Box>

          {isMobile && !isInTrackingSequence && (
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                }}
              >
                {pages.map((page) => (
                  <MenuItem
                    key={page.name}
                    onClick={handleCloseNavMenu}
                    component={RouterLink}
                    to={page.path}
                    selected={location.pathname === page.path}
                  >
                    <Typography textAlign="center">
                      {t(page.name)}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}

          <Box
            component={!isInTrackingSequence ? RouterLink : 'div'}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              height: '40px',
              lineHeight: 0,
              '& img': {
                height: '100%',
                width: 'auto',
                display: 'block',
                margin: 0,
                padding: 0
              }
            }}
          >
            <img src={biogreenLogo} alt="BioGreen Logo" />
          </Box>

          {!isMobile && !isInTrackingSequence && (
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {pages.map((page) => (
                <Button
                  key={page.name}
                  onClick={handleCloseNavMenu}
                  sx={{ 
                    my: 2, 
                    color: 'white', 
                    display: 'block',
                    backgroundColor: location.pathname === page.path ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    '&:hover': {
                      backgroundColor: location.pathname === page.path 
                        ? 'rgba(255, 255, 255, 0.25)' 
                        : 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  component={RouterLink}
                  to={page.path}
                >
                  {t(page.name)}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
            ml: 'auto',
            minWidth: 0
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end',
              color: 'white',
              minWidth: 0,
              '& .MuiTypography-root': {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%'
              }
            }}>
              <Typography variant="caption" noWrap>
                {formatDate(localTime)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }} noWrap>
                {formatTime(localTime)}
              </Typography>
            </Box>

            <Tooltip title={isOnline ? "Database connected" : "Working Offline"}>
              <IconButton
                size="small"
                color="inherit"
                sx={{
                  color: isOnline ? 'white' : 'error.main',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                {isOnline ? <WifiIcon /> : <WifiOffIcon />}
              </IconButton>
            </Tooltip>

            <IconButton
              component={RouterLink}
              to="/settings"
              size="small"
              aria-label="settings"
              color="inherit"
            >
              <SettingsIcon />
            </IconButton>

            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title={t('language')}>
                <IconButton 
                  onClick={handleOpenLangMenu} 
                  sx={{ 
                    p: 0,
                    '&:focus': {
                      outline: 'none'
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <Typography sx={{ color: 'white', mr: 1 }}>
                    {currentLanguage.nativeName}
                  </Typography>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElLang}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElLang)}
                onClose={handleCloseLangMenu}
              >
                {enabledLanguages.map((language) => (
                  <MenuItem key={language.code} onClick={() => handleLanguageChange(language)}>
                    <Typography textAlign="center">{language.nativeName}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navigation; 