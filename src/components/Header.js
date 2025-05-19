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
import NotificationsIcon from '@mui/icons-material/Notifications';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';

const Header = ({ 
  darkMode = false, 
  onToggleTheme = () => {},
  isAuthenticated = false,
  onLogout = () => {},
  navigateTo = () => {},
  currentPage = 'home',
  user = null,
  notificationCount = 0
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for menus and drawer
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Handle opening the user menu
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  
  // Handle closing menus
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  
  // Toggle mobile drawer
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Get unread notification count
  const unreadNotifications = notificationCount || 0;
  
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
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
          <DirectionsCarIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div">
            Auto Tirgus Analīze
          </Typography>
        </Box>
        
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigateTo('home')}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="Sākums" />
            </ListItemButton>
          </ListItem>
          
          {isAuthenticated && (
            <>
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
            </>
          )}
          
          <ListItem disablePadding>
            <ListItemButton onClick={onToggleTheme}>
              <ListItemIcon>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </ListItemIcon>
              <ListItemText primary={darkMode ? "Gaišais režīms" : "Tumšais režīms"} />
            </ListItemButton>
          </ListItem>
          
          {isAuthenticated ? (
            <ListItem disablePadding>
              <ListItemButton onClick={onLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Iziet" />
              </ListItemButton>
            </ListItem>
          ) : (
            <ListItem disablePadding>
              <ListItemButton onClick={() => navigateTo('login')}>
                <ListItemIcon>
                  <AccountCircleIcon />
                </ListItemIcon>
                <ListItemText primary="Pieslēgties" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Box>
    </Drawer>
  );
  
  return (
    <AppBar position="static" sx={{ 
      bgcolor: darkMode ? 'grey.900' : 'primary.main',
      color: 'white'
    }}>
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
          
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            <Button 
              color="inherit" 
              onClick={() => navigateTo('home')}
              sx={{ my: 2, display: 'block' }}
            >
              Sākums
            </Button>
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
            {isAuthenticated && (
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
            )}
            
            {/* User menu */}
            {isAuthenticated ? (
              <Tooltip title="Konta iestatījumi">
                <IconButton 
                  onClick={handleOpenUserMenu} 
                  sx={{ ml: 1 }}
                >
                  <Avatar 
                    alt={user?.username || 'Lietotājs'} 
                    sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                  >
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
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
                <Typography variant="subtitle1">{user?.username || 'Lietotājs'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || 'Lietotāja Konts'}
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
              
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                navigateTo('notifications');
              }}>
                <ListItemIcon>
                  <NotificationsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Paziņojumi" />
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