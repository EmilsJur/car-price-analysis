import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  useTheme
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import InfoIcon from '@mui/icons-material/Info';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import SpeedIcon from '@mui/icons-material/Speed';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const MarketInsights = ({ insights = {} }) => {
  const theme = useTheme();
  
  const {
    popularBrands = [],
    priceChanges = [],
    fuelTypeDistribution = [],
    marketStats = {},
    latestUpdate = new Date().toISOString()
  } = insights;
  
  // Generate trend icon and color based on change percentage
  const getTrendDetails = (changePercent) => {
    if (!changePercent && changePercent !== 0) return { icon: <TrendingFlatIcon />, color: 'text.secondary' };
    
    if (changePercent > 0) {
      return { 
        icon: <TrendingUpIcon />, 
        color: 'success.main',
        text: `+${changePercent}%`
      };
    } else if (changePercent < 0) {
      return { 
        icon: <TrendingDownIcon />, 
        color: 'error.main',
        text: `${changePercent}%`
      };
    } else {
      return { 
        icon: <TrendingFlatIcon />, 
        color: 'text.secondary',
        text: '0%'
      };
    }
  };
  
  // Format date to Latvian format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('lv-LV', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h3">
          Tirgus tendences un ieskati
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Atjaunots: {formatDate(latestUpdate)}
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Market Statistics */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Tirgus statistika
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h4" color="primary">
                      {marketStats.listingCount?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Aktīvi sludinājumi
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h4" color="primary">
                      €{marketStats.avgPrice?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vidējā cena
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h4" color="primary">
                      {marketStats.avgAge || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vidējais vecums (gadi)
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h4" color="primary">
                      {marketStats.dailyListings?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Jauni sludinājumi dienā
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Popular Brands */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Populārākās markas
              </Typography>
              
              <List dense disablePadding>
                {popularBrands.slice(0, 5).map((brand, index) => {
                  const trendDetails = getTrendDetails(brand.change);
                  
                  return (
                    <ListItem key={index} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <DirectionsCarIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={brand.name} 
                        secondary={`${brand.count} sludinājumi`}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ color: trendDetails.color, display: 'flex', alignItems: 'center' }}>
                          {trendDetails.icon}
                          <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>
                            {trendDetails.text}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  );
                })}
                
                {popularBrands.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Nav pieejamu datu" 
                      secondary="Informācija par populārākajām markām nav pieejama"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Price Changes */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Cenu izmaiņas (pēdējais mēnesis)
              </Typography>
              
              <List dense disablePadding>
                {priceChanges.slice(0, 5).map((item, index) => {
                  const trendDetails = getTrendDetails(item.changePercent);
                  
                  return (
                    <ListItem key={index} disableGutters>
                      <ListItemText 
                        primary={`${item.brand} ${item.model}`} 
                        secondary={`Vidējā cena: €${item.avgPrice?.toLocaleString()}`}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ color: trendDetails.color, display: 'flex', alignItems: 'center' }}>
                          {trendDetails.icon}
                          <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>
                            {trendDetails.text}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  );
                })}
                
                {priceChanges.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Nav pieejamu datu" 
                      secondary="Informācija par cenu izmaiņām nav pieejama"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Fuel Type Distribution */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Degvielas tipu sadalījums
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {fuelTypeDistribution.map((item, index) => {
                  let color;
                  let icon;
                  
                  switch(item.type) {
                    case 'Petrol':
                    case 'Benzīns':
                      color = 'error';
                      icon = <LocalGasStationIcon fontSize="small" />;
                      break;
                    case 'Diesel':
                    case 'Dīzelis':
                      color = 'primary';
                      icon = <LocalGasStationIcon fontSize="small" />;
                      break;
                    case 'Electric':
                    case 'Elektriskais':
                      color = 'success';
                      icon = <SpeedIcon fontSize="small" />;
                      break;
                    case 'Hybrid':
                    case 'Hibrīds':
                      color = 'info';
                      icon = <SpeedIcon fontSize="small" />;
                      break;
                    default:
                      color = 'default';
                      icon = <LocalGasStationIcon fontSize="small" />;
                  }
                  
                  const label = item.type === 'Petrol' ? 'Benzīns' :
                                item.type === 'Diesel' ? 'Dīzelis' :
                                item.type === 'Electric' ? 'Elektriskais' :
                                item.type === 'Hybrid' ? 'Hibrīds' : item.type;
                  
                  return (
                    <Chip 
                      key={index}
                      icon={icon}
                      label={`${label}: ${item.percentage}%`}
                      color={color}
                      variant="outlined"
                    />
                  );
                })}
                
                {fuelTypeDistribution.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Nav pieejamu datu par degvielas tipu sadalījumu
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon fontSize="small" sx={{ mr: 1 }} />
          <InfoIcon fontSize="small" sx={{ mr: 1 }} />
              Dati ir balstīti uz aktīvajiem sludinājumiem un tiek atjaunināti ik dienu. Tendences atspoguļo izmaiņas pēdējo 30 dienu laikā.
            </Typography>
          </Box>
        </Paper>
      );
    };
    
    export default MarketInsights;