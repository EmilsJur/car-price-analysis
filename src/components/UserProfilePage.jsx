// src/components/UserProfilePage.jsx - Updated to use the new auth system

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Button,
  TextField,
  Grid,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Favorite as FavoriteIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

// Import authentication services
import { 
  getUserProfile, 
  updatePreferences, 
  getFavorites,
  getSearchHistory,
  logout,
  removeFavorite,
  getToken
} from '../services/authService';

const UserProfilePage = ({ 
  darkMode = false, 
  onToggleTheme = () => {},
  navigateTo = () => {},
  onLogout = () => {},
  showHeader = true,
  showFooter = true
}) => {
  // User state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode for profile information
  const [editMode, setEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  
  // Tab state for profile sections
  const [tabValue, setTabValue] = useState(0);
  
  // User data
  const [favorites, setFavorites] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch user profile when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get user profile
        const userData = await getUserProfile();
        setUser(userData);
        setEditedUser(userData);
        
        // Get favorites and search history
        const favoritesData = await getFavorites();
        setFavorites(favoritesData || []);
        
        const historyData = await getSearchHistory();
        setSearchHistory(historyData || []);
        
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Neizdevās ielādēt lietotāja datus. Lūdzu, mēģiniet vēlreiz.');
        
        // If unauthorized, redirect to login
        if (err.message.includes('token') || err.message.includes('authentication')) {
          setNotification({
            open: true,
            message: 'Sesija beigusies. Lūdzu, pieslēdzieties vēlreiz.',
            severity: 'warning'
          });
          
          setTimeout(() => {
            logout();
            onLogout();
            navigateTo('login');
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigateTo, onLogout]);
  
  // Handle profile edit
  const handleEditProfile = () => {
    setEditedUser({...user});
    setEditMode(true);
  };
  
  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      // Actually update the profile in the backend
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          username: editedUser.username,
          email: editedUser.email
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditMode(false);
      
      showNotification('Profils saglabāts', 'success');
    } catch (err) {
      console.error('Error updating profile:', err);
      showNotification('Neizdevās saglabāt profilu', 'error');
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedUser({...user});
    setEditMode(false);
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle preference change
  const handlePreferenceChange = async (preference, value) => {
    try {
      // Build the new preferences object
      const newPreferences = {
        ...user.preferences,
        [preference]: value
      };
      
      // Update preferences in backend
      const updatedUser = await updatePreferences(newPreferences);
      setUser(updatedUser);
      
      // If changing darkMode, also trigger the app-level theme switch
      if (preference === 'darkMode') {
        onToggleTheme();
      }
      
      showNotification('Iestatījumi saglabāti', 'success');
    } catch (err) {
      showNotification('Neizdevās saglabāt iestatījumus', 'error');
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle user logout
  const handleLogout = () => {
    logout();
    onLogout();
    navigateTo('login');
  };
  
  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Nav norādīts';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('lv-LV', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigateTo('login')}
          sx={{ mt: 2 }}
        >
          Pieslēgties
        </Button>
      </Box>
    );
  }
  
  // Show 404 if no user found
  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Lietotājs nav atrasts
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigateTo('login')}
          sx={{ mt: 2 }}
        >
          Pieslēgties
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ flexGrow: 1 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Mans profils
        </Typography>
        
        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  margin: '0 auto 16px',
                  bgcolor: 'primary.main'
                }}
              >
                <PersonIcon sx={{ fontSize: 64 }} />
              </Avatar>
              
              {!editMode ? (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {user.username}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {user.email}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Reģistrējies: {formatDate(user.created_at)}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Pēdējā pieslēgšanās: {formatDate(user.last_login)}
                  </Typography>
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={handleEditProfile}
                    >
                      Rediģēt profilu
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<LogoutIcon />}
                      onClick={handleLogout}
                    >
                      Iziet
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box component="form" noValidate autoComplete="off">
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Vārds"
                    name="username"
                    value={editedUser.username || ''}
                    onChange={handleInputChange}
                  />
                  <TextField
                    fullWidth
                    margin="normal"
                    label="E-pasts"
                    name="email"
                    type="email"
                    value={editedUser.email || ''}
                    onChange={handleInputChange}
                    disabled // Email cannot be changed for simplicity
                  />
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      onClick={handleCancelEdit}
                    >
                      Atcelt
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveProfile}
                    >
                      Saglabāt
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Profile Content */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 0 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Izlase" icon={<FavoriteIcon />} iconPosition="start" />
                <Tab label="Meklēšanas vēsture" icon={<HistoryIcon />} iconPosition="start" />
                <Tab label="Iestatījumi" icon={<SettingsIcon />} iconPosition="start" />
              </Tabs>
              
              {/* Favorites Tab */}
              <Box role="tabpanel" hidden={tabValue !== 0} sx={{ p: 3 }}>
                {tabValue === 0 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Izlase
                    </Typography>
                    
                    {favorites.length > 0 ? (
                      <List>
                        {favorites.map((car) => (
                          <ListItem
                            key={car.id}
                            secondaryAction={
                              <IconButton edge="end" onClick={async () => {
                                try {
                                  // Remove from backend
                                  await removeFavorite(car.id);
                                  
                                  // Update local state
                                  setFavorites(prev => prev.filter(c => c.id !== car.id));
                                  
                                  showNotification('Automašīna noņemta no izlases', 'info');
                                } catch (error) {
                                  console.error('Error removing favorite:', error);
                                  showNotification('Neizdevās noņemt no izlases', 'error');
                                }
                              }}>
                                <DeleteIcon />
                              </IconButton>
                            }
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
                          >
                            <ListItemText
                              primary={`${car.brand} ${car.model} (${car.year})`}
                              secondary={
                                <React.Fragment>
                                  <Typography variant="body2" component="span">
                                    {car.price ? `€${car.price.toLocaleString()}` : ''} 
                                    {car.mileage ? `, ${car.mileage.toLocaleString()} km` : ''}
                                    {car.engine_type ? `, ${car.engine_type}` : ''}
                                    {car.transmission ? `, ${car.transmission}` : ''}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Pievienots: {formatDate(car.added_at || new Date().toISOString())}
                                  </Typography>
                                </React.Fragment>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography color="text.secondary">
                          Nav saglabātu automašīnu
                        </Typography>
                        <Button 
                          variant="contained" 
                          onClick={() => navigateTo('home')}
                          sx={{ mt: 2 }}
                        >
                          Meklēt automašīnas
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Box>
              
              {/* Search History Tab */}
              <Box role="tabpanel" hidden={tabValue !== 1} sx={{ p: 3 }}>
                {tabValue === 1 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Meklēšanas vēsture
                      </Typography>
                    </Box>
                    
                    {searchHistory.length > 0 ? (
                      <List>
                        {searchHistory.map((item, index) => (
                          <ListItem
                            key={index}
                            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                            button
                            onClick={() => {
                              // In a full implementation, would trigger a search with these parameters
                              navigateTo('home');
                              showNotification('Meklēšanas parametri ielādēti', 'info');
                            }}
                          >
                            <ListItemIcon>
                              <HistoryIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                              primary={item.query_text || 'Meklēšana'}
                              secondary={formatDate(item.executed_at)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography color="text.secondary">
                          Nav meklēšanas vēstures
                        </Typography>
                        <Button 
                          variant="contained" 
                          onClick={() => navigateTo('home')}
                          sx={{ mt: 2 }}
                        >
                          Sākt meklēšanu
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Box>
              
              {/* Settings Tab */}
              <Box role="tabpanel" hidden={tabValue !== 2} sx={{ p: 3 }}>
                {tabValue === 2 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Iestatījumi
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Tumšais režīms"
                          secondary="Izmantot tumšo krāsu shēmu"
                        />
                        <Button
                          variant={user.preferences?.darkMode ? "contained" : "outlined"}
                          color={user.preferences?.darkMode ? "primary" : "inherit"}
                          onClick={() => handlePreferenceChange('darkMode', !user.preferences?.darkMode)}
                        >
                          {user.preferences?.darkMode ? "Ieslēgts" : "Izslēgts"}
                        </Button>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Paziņojumi"
                          secondary="Saņemt paziņojumus par jauniem sludinājumiem"
                        />
                        <Button
                          variant={user.preferences?.notificationsEnabled ? "contained" : "outlined"}
                          color={user.preferences?.notificationsEnabled ? "primary" : "inherit"}
                          onClick={() => handlePreferenceChange('notificationsEnabled', !user.preferences?.notificationsEnabled)}
                        >
                          {user.preferences?.notificationsEnabled ? "Ieslēgts" : "Izslēgts"}
                        </Button>
                      </ListItem>
                      
                      <Divider component="li" />
                      
                      <ListItem>
                        <ListItemText
                          primary="Valoda"
                          secondary="Izvēlieties lietotnes valodu"
                        />
                        <Button
                          variant="outlined"
                          onClick={() => handlePreferenceChange('language', user.preferences?.language === 'lv' ? 'en' : 'lv')}
                        >
                          {user.preferences?.language === 'lv' ? "Latviešu" : "English"}
                        </Button>
                      </ListItem>
                    </List>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfilePage;
