import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  useTheme,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';

const PriceByFuelTypeChart = ({ 
  data = [], 
  loading = false,
  brandName = '',
  modelName = ''
}) => {
  const theme = useTheme();
  
  // janoformate cena, lai butu smuki
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '€0';
    return `€${price.toLocaleString()}`;
  };
  
  // Sagrupe datus pec degvielas tipa,aprekinu vidējas cenas
  const processData = () => {
    if (!data || data.length === 0) return [];
    
    const fuelGroups = {};
    
    // Grupejam peec degvielas tipa
    data.forEach(car => {
      const fuelType = car.engine_type_latvian || 'Nav norādīts';
      
      if (!fuelGroups[fuelType]) {
        fuelGroups[fuelType] = {
          type: fuelType,
          count: 0,
          totalPrice: 0,
          minPrice: Infinity,
          maxPrice: 0
        };
      }
      
      fuelGroups[fuelType].count++;
      fuelGroups[fuelType].totalPrice += car.price || 0;
      
      if (car.price) {
        fuelGroups[fuelType].minPrice = Math.min(fuelGroups[fuelType].minPrice, car.price);
        fuelGroups[fuelType].maxPrice = Math.max(fuelGroups[fuelType].maxPrice, car.price);
      }
    });
    
    // Aprekinu videjs cenas un sagatavojam datus attel
    return Object.values(fuelGroups).map(group => ({
      ...group,
      avgPrice: group.count > 0 ? group.totalPrice / group.count : 0,
      minPrice: group.minPrice === Infinity ? 0 : group.minPrice
    })).sort((a, b) => b.count - a.count); // Kartojam pec skaita
  };
  
  // Nosaka kraasu katram degvielas tipam
  const getFuelTypeColor = (fuelType) => {
    const lowerType = fuelType.toLowerCase();
    
    if (lowerType.includes('benzīn')) return theme.palette.error.main; // Benzīns - sarkans
    if (lowerType.includes('dīzel')) return theme.palette.primary.main; // Dīzelis - zils
    if (lowerType.includes('elektr')) return theme.palette.success.main; // Elektriskais - zaļš
    if (lowerType.includes('hibrīd')) return theme.palette.info.main; // Hibrīds - gaiši zils
    if (lowerType.includes('gāz')) return theme.palette.warning.main; // Gāze - oranžs
    
    return theme.palette.grey[500]; // Noklusejums  = peleks
  };
  
  const fuelTypesData = processData();
  
  // ielades indikatoru kameer dati tiek ielādēti
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocalGasStationIcon color="primary" />
        Cenas sadalījums pēc degvielas tipa
      </Typography>
      
      {fuelTypesData.length > 0 ? (
        <Grid container spacing={2}>
          {fuelTypesData.map((fuelData) => (
            <Grid item xs={12} sm={6} md={4} key={fuelData.type}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1, 
                    borderBottom: `2px solid ${getFuelTypeColor(fuelData.type)}` 
                  }}>
                    <LocalGasStationIcon sx={{ color: getFuelTypeColor(fuelData.type), mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      {fuelData.type}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {formatPrice(fuelData.avgPrice)}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary">
                    Vidējā cena
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Min:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatPrice(fuelData.minPrice)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Max:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatPrice(fuelData.maxPrice)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Skaits:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {fuelData.count}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nav pieejamu datu par cenu sadalījumu pēc degvielas tipa.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PriceByFuelTypeChart;