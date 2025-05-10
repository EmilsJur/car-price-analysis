import React, { useState, useEffect } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/localStorage';
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
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Favorite as FavoriteIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const UserProfilePage = ({ 
  darkMode = false, 
  onToggleTheme = () => {},
  navigateTo = () => {},
  showHeader = true,
  showFooter = true
}) => {
  // Use localStorage to persist user profile information
  const [user, setUser] = useState(() => {
  return loadFromLocalStorage('userProfile', {
    name: 'Lietotājs',
    email: 'lietotajs@example.com',
    phone: '',
    bio: '',
    preferences: {
      notifications: true,
      darkMode: false,
      language: 'lv',
    },
    avatar: null
  });
});
  
  // Edit mode for profile information
  const [editMode, setEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState({...user});
  
  // Tab state for profile sections
  const [tabValue, setTabValue] = useState(0);
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Mock data for saved searches and favorites
  const [savedSearches, setSavedSearches] = useState(() => {
    const saved = localStorage.getItem('savedSearches');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        name: 'BMW 5. sērija',
        params: {
          brand: 'BMW',
          model: '5 Series',
          yearFrom: 2015,
          yearTo: 2020,
          priceFrom: 15000,
          priceTo: 30000
        },
        date: '2023-04-15T10:30:00Z'
      },
      {
        id: 2,
        name: 'Audi Q7 Dīzelis',
        params: {
          brand: 'Audi',
          model: 'Q7',
          yearFrom: 2018,
          yearTo: 2022,
          priceFrom: 35000,
          priceTo: 60000,
          fuelType: 'Diesel'
        },
        date: '2023-05-20T14:15:00Z'
      }
    ];
  });
  
  // Mock data for favorite cars
  const [favoriteCars, setFavoriteCars] = useState(() => {
    const saved = localStorage.getItem('favoriteCars');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        brand: 'Volkswagen',
        model: 'Golf',
        year: 2019,
        price: 18500,
        mileage: 45000,
        engine_type: 'Petrol',
        transmission: 'Manual',
        image: null
      },
      {
        id: 2,
        brand: 'Toyota',
        model: 'RAV4',
        year: 2020,
        price: 29800,
        mileage: 32000,
        engine_type: 'Hybrid',
        transmission: 'Automatic',
        image: null
      }
    ];
  });
  
  // Mock data for search history
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        query: 'Volkswagen Golf',
        date: '2023-06-10T09:45:00Z'
      },
      {
        id: 2,
        query: 'Toyota RAV4 2020',
        date: '2023-06-08T16:20:00Z'
      },
      {
        id: 3,
        query: 'Audi Q5 dīzelis',
        date: '2023-06-05T11:30:00Z'
      }
    ];
  });
  
  // Save data to localStorage when it changes
  useEffect(() => {
  saveToLocalStorage('userProfile', user);
}, [user]);
  
  useEffect(() => {
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
  }, [savedSearches]);
  
  useEffect(() => {
    localStorage.setItem('favoriteCars', JSON.stringify(favoriteCars));
  }, [favoriteCars]);
  
  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);
  
  // Handle profile edit
  const handleEditProfile = () => {
    setEditedUser({...user});
    setEditMode(true);
  };
  
  // Handle save profile
  const handleSaveProfile = () => {
    setUser(editedUser);
    setEditMode(false);
    showNotification('Profils saglabāts', 'success');
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
  const handlePreferenceChange = (preference, value) => {
    setUser(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
    
    // If changing darkMode, also trigger the app-level theme switch
    if (preference === 'darkMode') {
        onToggleTheme();
      }
      
      showNotification('Iestatījumi saglabāti', 'success');
    };
    
    // Handle tab change
    const handleTabChange = (event, newValue) => {
      setTabValue(newValue);
    };
    
    // Remove saved search
    const handleRemoveSavedSearch = (id) => {
      setSavedSearches(prev => prev.filter(search => search.id !== id));
      showNotification('Meklēšana dzēsta', 'success');
    };
    
    // Remove favorite car
    const handleRemoveFavoriteCar = (id) => {
      setFavoriteCars(prev => prev.filter(car => car.id !== id));
      showNotification('Auto izņemts no izlases', 'success');
    };
    
    // Clear search history
    const handleClearSearchHistory = () => {
      setSearchHistory([]);
      showNotification('Meklēšanas vēsture dzēsta', 'success');
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
      const date = new Date(dateString);
      return date.toLocaleString('lv-LV', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
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
                  src={user.avatar}
                  sx={{
                    width: 120,
                    height: 120,
                    margin: '0 auto 16px',
                    bgcolor: 'primary.main'
                  }}
                >
                  {!user.avatar && (
                    <PersonIcon sx={{ fontSize: 64 }} />
                  )}
                </Avatar>
                
                {!editMode ? (
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      {user.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {user.email}
                    </Typography>
                    {user.phone && (
                      <Typography variant="body2" color="text.secondary">
                        {user.phone}
                      </Typography>
                    )}
                    {user.bio && (
                      <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                        {user.bio}
                      </Typography>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={handleEditProfile}
                      sx={{ mt: 2 }}
                    >
                      Rediģēt profilu
                    </Button>
                  </Box>
                ) : (
                  <Box component="form" noValidate autoComplete="off">
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Vārds"
                      name="name"
                      value={editedUser.name}
                      onChange={handleInputChange}
                    />
                    <TextField
                      fullWidth
                      margin="normal"
                      label="E-pasts"
                      name="email"
                      type="email"
                      value={editedUser.email}
                      onChange={handleInputChange}
                    />
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Telefons"
                      name="phone"
                      value={editedUser.phone}
                      onChange={handleInputChange}
                    />
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Par mani"
                      name="bio"
                      multiline
                      rows={4}
                      value={editedUser.bio}
                      onChange={handleInputChange}
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
                  <Tab label="Saglabātie meklējumi" icon={<FavoriteIcon />} iconPosition="start" />
                  <Tab label="Izlase" icon={<FavoriteIcon />} iconPosition="start" />
                  <Tab label="Meklēšanas vēsture" icon={<HistoryIcon />} iconPosition="start" />
                  <Tab label="Iestatījumi" icon={<SettingsIcon />} iconPosition="start" />
                </Tabs>
                
                {/* Saved Searches Tab */}
                <Box role="tabpanel" hidden={tabValue !== 0} sx={{ p: 3 }}>
                  {tabValue === 0 && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Saglabātie meklējumi
                      </Typography>
                      
                      {savedSearches.length > 0 ? (
                        <List>
                          {savedSearches.map((search) => (
                            <ListItem
                              key={search.id}
                              secondaryAction={
                                <IconButton edge="end" onClick={() => handleRemoveSavedSearch(search.id)}>
                                  <DeleteIcon />
                                </IconButton>
                              }
                              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
                            >
                              <ListItemText
                                primary={search.name}
                                secondary={
                                  <React.Fragment>
                                    <Typography variant="body2" component="span">
                                      {search.params.brand} {search.params.model}, {search.params.yearFrom}-{search.params.yearTo}, {search.params.priceFrom}€-{search.params.priceTo}€
                                    </Typography>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      Saglabāts: {formatDate(search.date)}
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
                            Nav saglabātu meklējumu
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
                
                {/* Favorites Tab */}
                <Box role="tabpanel" hidden={tabValue !== 1} sx={{ p: 3 }}>
                  {tabValue === 1 && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Izlase
                      </Typography>
                      
                      {favoriteCars.length > 0 ? (
                        <List>
                          {favoriteCars.map((car) => (
                            <ListItem
                              key={car.id}
                              secondaryAction={
                                <IconButton edge="end" onClick={() => handleRemoveFavoriteCar(car.id)}>
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
                                      {car.price}€, {car.mileage} km, {car.engine_type}, {car.transmission}
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
                        </Box>
                      )}
                    </>
                  )}
                </Box>
                
                {/* Search History Tab */}
                <Box role="tabpanel" hidden={tabValue !== 2} sx={{ p: 3 }}>
                  {tabValue === 2 && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                          Meklēšanas vēsture
                        </Typography>
                        
                        {searchHistory.length > 0 && (
                          <Button
                            size="small"
                            onClick={handleClearSearchHistory}
                            startIcon={<DeleteIcon />}
                          >
                            Dzēst vēsturi
                          </Button>
                        )}
                      </Box>
                      
                      {searchHistory.length > 0 ? (
                        <List>
                          {searchHistory.map((item) => (
                            <ListItem
                              key={item.id}
                              sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                            >
                              <ListItemIcon>
                                <HistoryIcon color="action" />
                              </ListItemIcon>
                              <ListItemText
                                primary={item.query}
                                secondary={formatDate(item.date)}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Typography color="text.secondary">
                            Nav meklēšanas vēstures
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
                
                {/* Settings Tab */}
                <Box role="tabpanel" hidden={tabValue !== 3} sx={{ p: 3 }}>
                  {tabValue === 3 && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Iestatījumi
                      </Typography>
                      
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Paziņojumi"
                            secondary="Saņemt paziņojumus par jauniem sludinājumiem"
                          />
                          <Button
                            variant={user.preferences.notifications ? "contained" : "outlined"}
                            color={user.preferences.notifications ? "primary" : "inherit"}
                            onClick={() => handlePreferenceChange('notifications', !user.preferences.notifications)}
                          >
                            {user.preferences.notifications ? "Ieslēgts" : "Izslēgts"}
                          </Button>
                        </ListItem>
                        
                        <Divider component="li" />
                        
                        <ListItem>
                          <ListItemText
                            primary="Tumšais režīms"
                            secondary="Izmantot tumšo krāsu shēmu"
                          />
                          <Button
                            variant={user.preferences.darkMode ? "contained" : "outlined"}
                            color={user.preferences.darkMode ? "primary" : "inherit"}
                            onClick={() => handlePreferenceChange('darkMode', !user.preferences.darkMode)}
                          >
                            {user.preferences.darkMode ? "Ieslēgts" : "Izslēgts"}
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
                            onClick={() => handlePreferenceChange('language', user.preferences.language === 'lv' ? 'en' : 'lv')}
                          >
                            {user.preferences.language === 'lv' ? "Latviešu" : "English"}
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