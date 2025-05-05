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
  favouriteCount = 0,
  notificationCount = 0,
  userName = '',
  onLogout = () => {}
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
  
  // Navigation items
  const navItems = [
    { name: 'Dashboard', icon: <DirectionsCarIcon />, href: '/' },
    { name: 'Search', icon: <SearchIcon />, href: '/search' },
    { name: 'Analysis', icon: <AnalyticsIcon />, href: '/analysis' },
    { name: 'Compare', icon: <CompareIcon />, href: '/compare' },
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
            Car Market Analysis
          </Typography>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <ListItemButton component="a" href={item.href}>
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
            <ListItemButton component="a" href="/favorites">
              <ListItemIcon>
                <FavoriteIcon />
              </ListItemIcon>
              <ListItemText primary="Favorites" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component="a" href="/history">
              <ListItemIcon>
                <HistoryIcon />
              </ListItemIcon>
              <ListItemText primary="Search History" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component="a" href="/settings">
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
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
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Car Market Analysis
          </Typography>
          
          {/* Mobile logo */}
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Car Market
          </Typography>
          
          {/* Desktop navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {navItems.map((item) => (
              <Button
                key={item.name}
                href={item.href}
                sx={{ my: 2, color: 'white', display: 'block' }}
                startIcon={item.icon}
              >
                {item.name}
              </Button>
            ))}
          </Box>
          
          {/* Right side icons */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Theme toggle */}
            <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <IconButton onClick={onToggleTheme} color="inherit">
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            {/* Favorites */}
            <Tooltip title="Favorites">
              <IconButton color="inherit" href="/favorites">
                <Badge badgeContent={favouriteCount} color="error">
                  <FavoriteIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit" 
                onClick={handleOpenNotificationsMenu}
                aria-controls={Boolean(anchorElNotifications) ? 'notifications-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorElNotifications) ? 'true' : undefined}
              >
                <Badge badgeContent={notificationCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              id="notifications-menu"
              anchorEl={anchorElNotifications}
              open={Boolean(anchorElNotifications)}
              onClose={handleCloseNotificationsMenu}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleCloseNotificationsMenu}>
                <ListItemText 
                  primary="New price alerts available" 
                  secondary="5 minutes ago"
                />
              </MenuItem>
              <MenuItem onClick={handleCloseNotificationsMenu}>
                <ListItemText 
                  primary="Price dropped for your watched cars" 
                  secondary="2 hours ago"
                />
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleCloseNotificationsMenu}>
                <Typography variant="body2" color="primary" align="center" sx={{ width: '100%' }}>
                  View all notifications
                </Typography>
              </MenuItem>
            </Menu>
            
            {/* User menu */}
            <Tooltip title="Account settings">
              <IconButton 
                onClick={handleOpenUserMenu} 
                sx={{ ml: 1 }}
                aria-controls={Boolean(anchorElUser) ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorElUser) ? 'true' : undefined}
              >
                {userName ? (
                  <Avatar 
                    alt={userName} 
                    src="/static/images/avatar/1.jpg" 
                    sx={{ width: 32, height: 32 }}
                  />
                ) : (
                  <AccountCircleIcon />
                )}
              </IconButton>
            </Tooltip>
            <Menu
              id="user-menu"
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {userName ? (
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1">{userName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    User Account
                  </Typography>
                </Box>
              ) : null}
              <Divider />
              <MenuItem onClick={handleCloseUserMenu} component="a" href="/profile">
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </MenuItem>
              <MenuItem onClick={handleCloseUserMenu} component="a" href="/settings">
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </MenuItem>
              <MenuItem onClick={handleCloseUserMenu} component="a" href="/help">
                <ListItemIcon>
                  <HelpIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Help" />
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                onLogout();
              }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;