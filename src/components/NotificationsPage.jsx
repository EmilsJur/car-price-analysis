import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Divider,
  Switch,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Badge
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  NewReleases as NewReleasesIcon,
  MonetizationOn as MonetizationOnIcon
} from '@mui/icons-material';

const NotificationsPage = ({ 
  darkMode = false, 
  onToggleTheme = () => {},
  navigateTo = () => {},
  showHeader = true, 
  showFooter = true
}) => {
  // Tab state for notification types
  const [tabValue, setTabValue] = useState(0);
  
  // Notification preferences
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('notificationPreferences');
    return saved ? JSON.parse(saved) : {
      priceAlerts: true,
      newListings: true,
      systemUpdates: true,
      email: true,
      browser: true
    };
  });
  
  // Mock notifications with localStorage persistence
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        type: 'price',
        title: 'Cenas izmaiņas',
        message: 'BMW 5. sērijas cena samazinājusies par 1200€',
        date: '2023-06-15T09:30:00Z',
        read: false
      },
      {
        id: 2,
        type: 'listing',
        title: 'Jauns sludinājums',
        message: 'Jauns Audi Q5 sludinājums, kas atbilst jūsu meklēšanas kritērijiem',
        date: '2023-06-14T15:45:00Z',
        read: true
      },
      {
        id: 3,
        type: 'system',
        title: 'Sistēmas atjauninājums',
        message: 'Ir pieejami jauni analīzes rīki. Izmēģiniet tos tagad!',
        date: '2023-06-10T11:20:00Z',
        read: false
      },
      {
        id: 4,
        type: 'price',
        title: 'Cenas izmaiņas',
        message: 'Volkswagen Golf vidējā cena samazinājusies par 3%',
        date: '2023-06-08T14:10:00Z',
        read: true
      },
      {
        id: 5,
        type: 'system',
        title: 'Lietotāja profils',
        message: 'Jūsu profils ir veiksmīgi atjaunināts',
        date: '2023-06-05T16:30:00Z',
        read: true
      }
    ];
  });
  
  // Notification state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  }, [preferences]);
  
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);
  
  // Get unread notifications count
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    showSnackbar('Visi paziņojumi atzīmēti kā izlasīti', 'success');
  };
  
  // Delete notification
  const handleDeleteNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    showSnackbar('Paziņojums dzēsts', 'success');
  };
  
  // Delete all notifications
  const handleDeleteAllNotifications = () => {
    setNotifications([]);
    showSnackbar('Visi paziņojumi dzēsti', 'success');
  };
  
  // Toggle notification preference
  const handleTogglePreference = (preference) => {
    setPreferences(prev => ({
      ...prev,
      [preference]: !prev[preference]
    }));
    showSnackbar('Iestatījumi saglabāti', 'success');
  };
  
  // Show snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };
  
  // Filter notifications based on tab
  const filteredNotifications = notifications.filter(notification => {
    if (tabValue === 0) return true; // All notifications
    if (tabValue === 1) return notification.type === 'price'; // Price alerts
    if (tabValue === 2) return notification.type === 'listing'; // New listings
    if (tabValue === 3) return notification.type === 'system'; // System updates
    return true;
  });
  
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
  
  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'price':
        return <MonetizationOnIcon color="primary" />;
      case 'listing':
        return <NewReleasesIcon color="secondary" />;
      case 'system':
        return <InfoIcon color="info" />;
      default:
        return <NotificationsIcon />;
    }
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 2 }}>
            <NotificationsIcon fontSize="large" color="primary" />
          </Badge>
          <Typography variant="h4" component="h1">
            Paziņojumi
          </Typography>
        </Box>
        
        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Visi (${notifications.length})`} />
            <Tab label="Cenu izmaiņas" />
            <Tab label="Jauni sludinājumi" />
            <Tab label="Sistēmas paziņojumi" />
          </Tabs>
          
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              size="small"
              startIcon={<CheckIcon />}
              onClick={handleMarkAllAsRead}
              disabled={notifications.length === 0 || notifications.every(n => n.read)}
            >
              Atzīmēt visus kā izlasītus
            </Button>
            
            <Button
              size="small"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteAllNotifications}
              disabled={notifications.length === 0}
              color="error"
            >
              Dzēst visus
            </Button>
          </Box>
          
          <Divider />
          
          <List sx={{ p: 0 }}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      bgcolor: notification.read ? 'inherit' : 'action.hover',
                      transition: 'background-color 0.3s'
                    }}
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {notification.title}
                          {!notification.read && (
                            <Chip
                              label="Jauns"
                              size="small"
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {formatDate(notification.date)}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                    <IconButton edge="end" onClick={() => handleDeleteNotification(notification.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))
            ) : (
              <ListItem>
                <ListItemText
                  primary="Nav paziņojumu"
                  secondary="Šeit parādīsies jūsu paziņojumi par cenu izmaiņām, jauniem sludinājumiem un sistēmas atjauninājumiem"
                  sx={{ textAlign: 'center', py: 3 }}
                />
              </ListItem>
            )}
          </List>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ mr: 1 }} />
            Paziņojumu iestatījumi
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <MonetizationOnIcon />
              </ListItemIcon>
              <ListItemText
                primary="Cenu izmaiņu brīdinājumi"
                secondary="Saņemt paziņojumus, kad mainās jūs interesējošo automašīnu cenas"
              />
              <Switch
                edge="end"
                checked={preferences.priceAlerts}
                onChange={() => handleTogglePreference('priceAlerts')}
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemIcon>
                <NewReleasesIcon />
              </ListItemIcon>
              <ListItemText
                primary="Jaunu sludinājumu paziņojumi"
                secondary="Saņemt paziņojumus par jauniem sludinājumiem, kas atbilst jūsu kritērijiem"
              />
              <Switch
                edge="end"
                checked={preferences.newListings}
                onChange={() => handleTogglePreference('newListings')}
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Sistēmas atjauninājumi"
                secondary="Saņemt paziņojumus par platformas jaunumiem un uzlabojumiem"
              />
              <Switch
                edge="end"
                checked={preferences.systemUpdates}
                onChange={() => handleTogglePreference('systemUpdates')}
              />
            </ListItem>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom sx={{ pl: 2 }}>
              Paziņojumu saņemšanas veidi
            </Typography>
            
            <ListItem>
              <ListItemText
                primary="E-pasta paziņojumi"
                secondary="Saņemt paziņojumus e-pastā"
              />
              <Switch
                edge="end"
                checked={preferences.email}
                onChange={() => handleTogglePreference('email')}
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemText
                primary="Pārlūka paziņojumi"
                secondary="Saņemt paziņojumus pārlūkā"
              />
              <Switch
                edge="end"
                checked={preferences.browser}
                onChange={() => handleTogglePreference('browser')}
              />
            </ListItem>
          </List>
        </Paper>
      </Container>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationsPage;