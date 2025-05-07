import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container, 
  Tooltip, 
  IconButton, 
  Menu, 
  MenuItem, 
  Avatar, 
  Badge, 
  Divider,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CompareIcon from '@mui/icons-material/Compare';
import SettingsIcon from '@mui/icons-material/Settings';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import HelpIcon from '@mui/icons-material/Help';

const Header = ({ 
  darkMode = false, 
  onToggleTheme = () => {},
  isAuthenticated = false,
  onLogout = () => {},
  navigateTo = () => {},
  currentPage = 'home',
  favouriteCount = 0,
  notificationCount = 0,
  userName = '',
  systemStatus = null
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for menus and drawer
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Handle opening the user menu
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  // Handle opening the notifications menu
  const handleOpenNotificationsMenu = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };
  
  // Handle closing menus
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };
  
  // Toggle mobile drawer
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Get user data
  const user = isAuthenticated ? 
    (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null) : 
    null;
  
  // Get unread notifications count
  const getUnreadNotificationsCount = () => {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      return notifications.filter(n => !n.read).length;
    } catch (e) {
      return 0;
    }
  };
  
  const unreadNotifications = getUnreadNotificationsCount();
  
  // Navigation items - with Latvian text
  const navItems = [
    { name: 'Sākums', icon: <DirectionsCarIcon />, page: 'home' },
    { name: 'Meklēt', icon: <SearchIcon />, page: 'home' },
    { name: 'Analīze', icon: <AnalyticsIcon />, page: 'home' },
    { name: 'Salīdzināt', icon: <CompareIcon />, page: 'home' },
  ];
  
  // Mobile drawer
  const mobileDrawer = (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={toggleMobileMenu}
    >
      <Box
        sx={{ width: 250 }}
        role="presentation"
        onClick={toggleMobileMenu}
        onKeyDown={toggleMobileMenu}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <DirectionsCarIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div">
            Auto Tirgus Analīze
          </Typography>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <ListItemButton onClick={() => navigateTo(item.page)}>
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigateTo('profile')}>
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Profils" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigateTo('notifications')}>
              <ListItemIcon>
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Paziņojumi" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={onToggleTheme}>
              <ListItemIcon>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </ListItemIcon>
              <ListItemText primary={darkMode ? "Gaišais režīms" : "Tumšais režīms"} />
            </ListItemButton>
          </ListItem>
          {isAuthenticated && (
            <ListItem disablePadding>
              <ListItemButton onClick={onLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Iziet" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Box>
    </Drawer>
  );
  
  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Mobile menu icon */}
          {isMobile ? (
            <>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={toggleMobileMenu}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              {mobileDrawer}
            </>
          ) : null}
          
          {/* Logo */}
          <DirectionsCarIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onClick={() => navigateTo('home')}
          >
            Auto Tirgus Analīze
          </Typography>
          
          {/* Mobile logo */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onClick={() => navigateTo('home')}
          >
            Auto Tirgus
          </Typography>
          
          {/* Desktop navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {navItems.map((item) => (
              <Button
                key={item.name}
                sx={{ my: 2, color: 'white', display: 'block' }}
                startIcon={item.icon}
                onClick={() => navigateTo(item.page)}
              >
                {item.name}
              </Button>
            ))}
          </Box>
          
          {/* Right side icons */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Theme toggle */}
            <Tooltip title={darkMode ? "Gaišais režīms" : "Tumšais režīms"}>
              <IconButton onClick={onToggleTheme} color="inherit">
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            {/* Notifications */}
            <Tooltip title="Paziņojumi">
              <IconButton 
                color="inherit" 
                onClick={() => navigateTo('notifications')}
              >
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            {/* User menu */}
            {isAuthenticated ? (
              <Tooltip title="Konta iestatījumi">
                <IconButton 
                  onClick={handleOpenUserMenu} 
                  sx={{ ml: 1 }}
                >
                  <Avatar 
                    alt={user?.name || 'Lietotājs'} 
                    src="/static/images/avatar/1.jpg" 
                    sx={{ width: 32, height: 32 }}
                  />
                </IconButton>
              </Tooltip>
            ) : (
              <Button 
                color="inherit" 
                onClick={() => navigateTo('login')}
                sx={{ ml: 1 }}
              >
                Pieslēgties
              </Button>
            )}
            
            <Menu
              id="user-menu"
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1">{user?.name || 'Lietotājs'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Lietotāja Konts
                </Typography>
              </Box>
              
              <Divider />
              
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                navigateTo('profile');
              }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Profils" />
              </MenuItem>
              
              <MenuItem onClick={handleCloseUserMenu}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Iestatījumi" />
              </MenuItem>
              
              <MenuItem onClick={handleCloseUserMenu}>
                <ListItemIcon>
                  <HelpIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Palīdzība" />
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                onLogout();
              }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Iziet" />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;