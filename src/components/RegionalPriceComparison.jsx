import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Chip,
  useTheme,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const RegionalPriceComparison = ({ 
  regionData = [], 
  loading = false,
  onRegionSelect = () => {},
  selectedRegion = null,
  brandName = '',
  modelName = ''
}) => {
  const theme = useTheme();

  // Format price for display
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '€0';
    return `€${price.toLocaleString()}`;
  };

  // Get trend icon and color based on national average comparison
  const getTrendDisplay = (price, avgPrice) => {
    if (!price || !avgPrice) return null;
    
    const difference = ((price - avgPrice) / avgPrice) * 100;
    
    if (difference > 5) {
      return {
        icon: <TrendingUpIcon fontSize="small" />,
        color: 'error.main',
        text: `+${difference.toFixed(1)}%`
      };
    } else if (difference < -5) {
      return {
        icon: <TrendingDownIcon fontSize="small" />,
        color: 'success.main',
        text: `${difference.toFixed(1)}%`
      };
    }
    
    return null;
  };

  // Calculate national average if we have region data
  const calculateNationalAverage = () => {
    if (!regionData || regionData.length === 0) return 0;
    
    let totalSum = 0;
    let totalCount = 0;
    
    regionData.forEach(region => {
      if (region.avgPrice && region.count) {
        totalSum += region.avgPrice * region.count;
        totalCount += region.count;
      }
    });
    
    return totalCount > 0 ? totalSum / totalCount : 0;
  };
  
  const nationalAvg = calculateNationalAverage();

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOnIcon color="primary" />
        Vidējās cenas pa reģioniem
        {brandName && (
          <Chip
            icon={<DirectionsCarIcon />}
            label={`${brandName} ${modelName || ''}`}
            color="primary"
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        )}
      </Typography>
      
      {regionData && regionData.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Reģions</TableCell>
                <TableCell align="right">Vidējā cena</TableCell>
                <TableCell align="right">Sal. ar vidējo</TableCell>
                <TableCell align="right">Min. cena</TableCell>
                <TableCell align="right">Max. cena</TableCell>
                <TableCell align="right">Sludinājumi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {regionData.map((region) => {
                const trendDisplay = getTrendDisplay(region.avgPrice, nationalAvg);
                
                return (
                  <TableRow 
                    key={region.name}
                    hover
                    onClick={() => onRegionSelect(region.name)}
                    selected={selectedRegion === region.name}
                    sx={{ 
                      cursor: 'pointer',
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(25, 118, 210, 0.16)' 
                          : 'rgba(25, 118, 210, 0.08)'
                      }
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {selectedRegion === region.name && (
                          <LocationOnIcon color="primary" fontSize="small" />
                        )}
                        {region.name}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={selectedRegion === region.name ? 'bold' : 'normal'}>
                        {formatPrice(region.avgPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {trendDisplay && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          {trendDisplay.icon}
                          <Typography variant="body2" color={trendDisplay.color}>
                            {trendDisplay.text}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">{formatPrice(region.minPrice)}</TableCell>
                    <TableCell align="right">{formatPrice(region.maxPrice)}</TableCell>
                    <TableCell align="right">{region.count}</TableCell>
                  </TableRow>
                );
              })}
              
              {/* National avrg row */}
              <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                <TableCell>
                  <Typography fontWeight="bold">Vidēji valstī</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">{formatPrice(nationalAvg)}</Typography>
                </TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">
                  {formatPrice(Math.min(...regionData.map(r => r.minPrice || Infinity)))}
                </TableCell>
                <TableCell align="right">
                  {formatPrice(Math.max(...regionData.map(r => r.maxPrice || 0)))}
                </TableCell>
                <TableCell align="right">
                  {regionData.reduce((sum, r) => sum + (r.count || 0), 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nav pieejamu datu par reģioniem. Mēģiniet veikt meklēšanu ar mazāk ierobežojošiem kritērijiem.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default RegionalPriceComparison;