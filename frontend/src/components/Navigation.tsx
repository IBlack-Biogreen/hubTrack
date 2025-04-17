import { useState } from 'react';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { useLanguage, availableLanguages } from '../contexts/LanguageContext';

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Storage', path: '/storage' },
  { name: 'Feed Viewer', path: '/feed-viewer' },
  { name: 'Covers', path: '/covers' },
  { name: 'Events', path: '/events' },
  { name: 'Audits', path: '/audits' },
  { name: 'Stats', path: '/stats' },
  { name: 'Materials', path: '/materials' },
  { name: 'Users', path: '/users' },
  { name: 'Setup', path: '/setup' },
  { name: 'Settings', path: '/settings' },
];

function Navigation() {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElLang, setAnchorElLang] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const currentTime = useCurrentTime();
  const { currentLanguage, setLanguage, enabledLanguages, t } = useLanguage();

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
    return date.toLocaleTimeString(currentLanguage.code, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(currentLanguage.code, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AppBar position="static" color="primary">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            HubTrack
          </Typography>

          {isMobile && (
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
                      {t(page.name.toLowerCase().replace(' ', '')) || page.name}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}

          <Typography
            variant="h5"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            HubTrack
          </Typography>

          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {pages.map((page) => (
                <Button
                  key={page.name}
                  component={RouterLink}
                  to={page.path}
                  onClick={handleCloseNavMenu}
                  sx={{ 
                    my: 2, 
                    color: 'white', 
                    display: 'block',
                    backgroundColor: location.pathname === page.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {t(page.name.toLowerCase().replace(' ', '')) || page.name}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 2,
            ml: 'auto'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end',
              color: 'white',
            }}>
              <Typography variant="body2">
                {formatDate(currentTime)}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {formatTime(currentTime)}
              </Typography>
            </Box>

            <IconButton
              size="large"
              aria-label="language"
              aria-controls="language-menu"
              aria-haspopup="true"
              onClick={handleOpenLangMenu}
              color="inherit"
            >
              <LanguageIcon />
            </IconButton>
            <Menu
              id="language-menu"
              anchorEl={anchorElLang}
              anchorOrigin={{
                vertical: 'bottom',
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
                <MenuItem
                  key={language.code}
                  onClick={() => handleLanguageChange(language)}
                  selected={currentLanguage.code === language.code}
                >
                  {language.nativeName}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navigation; 