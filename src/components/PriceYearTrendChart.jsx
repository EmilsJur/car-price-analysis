import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  useTheme,
  Grid,
  Divider
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const PriceYearTrendChart = ({ 
  data = [], 
  loading = false,
  brandName = '',
  modelName = ''
}) => {
  const theme = useTheme();
  
  // formate cene lai butu skaisti ar eiro simbolu
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '€0';
    return `€${price.toLocaleString()}`;
  };
  
  // Grupe un apstradaja datus pec gada
  const processData = () => {
    if (!data || data.length === 0) return [];
    
    const yearGroups = {};
    const currentYear = new Date().getFullYear();
    
    // Grupejam pec gada
    data.forEach(car => {
      if (!car.year) return;
      
      const year = parseInt(car.year);
      if (isNaN(year)) return;
      
      if (!yearGroups[year]) {
        yearGroups[year] = {
          year,
          count: 0,
          totalPrice: 0,
          minPrice: Infinity,
          maxPrice: 0,
          age: currentYear - year
        };
      }
      
      yearGroups[year].count++;
      yearGroups[year].totalPrice += car.price || 0;
      
      if (car.price) {
        yearGroups[year].minPrice = Math.min(yearGroups[year].minPrice, car.price);
        yearGroups[year].maxPrice = Math.max(yearGroups[year].maxPrice, car.price);
      }
    });
    
    // Aprekina vid vert
    return Object.values(yearGroups)
      .map(group => ({
        ...group,
        avgPrice: group.count > 0 ? group.totalPrice / group.count : 0,
        minPrice: group.minPrice === Infinity ? 0 : group.minPrice
      }))
      .sort((a, b) => b.year - a.year); // Kartoju pec gada jaunākie vispirms
  };
  
  // Aprekinu tendences starp yaer
  const calculateYearTrend = (data) => {
    if (!data || data.length < 2) return [];
    
    const result = [];
    
    //Salidzinu katru gadu ar naakamo vecako gadu
    for (let i = 0; i < data.length - 1; i++) {
      const currentYear = data[i];
      const prevYear = data[i + 1];
      
      if (currentYear.avgPrice && prevYear.avgPrice) {
        const priceDiff = currentYear.avgPrice - prevYear.avgPrice;
        const percentDiff = (priceDiff / prevYear.avgPrice) * 100;
        
        result.push({
          year: currentYear.year,
          prevYear: prevYear.year,
          priceDiff,
          percentDiff,
          isIncrease: priceDiff > 0
        });
      }
    }
    
    return result;
  };
  
  const yearData = processData();
  const trendData = calculateYearTrend(yearData);
  
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
        <CalendarMonthIcon color="primary" />
        Cenas attiecībā pret izlaiduma gadu
      </Typography>
      
      {yearData.length > 0 ? (
        <Box>
          {/* Gada dati */}
          <Grid container spacing={2}>
            {yearData.slice(0, 6).map((data) => (
              <Grid item xs={6} sm={4} md={2} key={data.year}>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  border: `1px solid ${theme.palette.divider}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Typography variant="h6" color="primary" align="center">
                    {data.year}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                    {data.age} {data.age === 1 ? 'gads' : 'gadi'}
                  </Typography>
                  
                  <Typography variant="h5" fontWeight="bold" align="center">
                    {formatPrice(data.avgPrice)}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" align="center">
                    {data.count} sludinājumi
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          
          {/* Gadu izmainu tendences*/}
          {trendData.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Izmaiņas pa gadiem
                </Typography>
              </Divider>
              
              <Grid container spacing={2}>
                {trendData.slice(0, 5).map((trend) => (
                  <Grid item xs={12} sm={6} md={4} key={trend.year}>
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                    }}>
                      <Box sx={{ mr: 1 }}>
                        {trend.isIncrease ? 
                          <TrendingUpIcon color="error" /> : 
                          <TrendingDownIcon color="success" />
                        }
                      </Box>
                      
                      <Box>
                        <Typography variant="body2">
                          {trend.year} → {trend.prevYear}: {' '}
                          <Typography 
                            component="span" 
                            variant="body2" 
                            color={trend.isIncrease ? 'error' : 'success'} 
                            fontWeight="bold"
                          >
                            {trend.isIncrease ? '+' : ''}{trend.percentDiff.toFixed(1)}%
                          </Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatPrice(Math.abs(trend.priceDiff))} {trend.isIncrease ? 'dārgāks' : 'lētāks'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nav pieejamu datu par sakarību starp cenām un izlaiduma gadiem.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PriceYearTrendChart;