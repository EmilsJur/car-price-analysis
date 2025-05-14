import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Grid,
  Tooltip,
  useTheme,
  Card,
  CardContent,
  Fade,
  Chip,
  Button,
  Alert
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

// Define standard regions with their map coordinates
const LATVIA_REGIONS = [
  {
    id: 'riga',
    name: 'Rīga',
    path: 'M230,130 L240,120 L250,125 L245,140 Z',
    center: [238, 133]
  },
  {
    id: 'vidzeme',
    name: 'Vidzeme',
    path: 'M230,130 L240,120 L250,125 L270,130 L295,110 L320,105 L345,120 L330,140 L310,160 L285,165 L265,160 L245,140 Z',
    center: [290, 135]
  },
  {
    id: 'zemgale',
    name: 'Zemgale',
    path: 'M190,130 L230,130 L245,140 L240,180 L220,190 L200,180 L185,165 Z',
    center: [215, 160]
  },
  {
    id: 'kurzeme',
    name: 'Kurzeme',
    path: 'M100,90 L125,80 L150,85 L175,100 L185,110 L190,130 L185,165 L165,175 L140,180 L110,175 L90,160 L80,140 L85,120 Z',
    center: [135, 130]
  },
  {
    id: 'latgale',
    name: 'Latgale',
    path: 'M285,165 L310,160 L330,140 L345,120 L370,130 L385,150 L380,175 L360,195 L335,205 L310,195 L290,180 L265,160 Z',
    center: [330, 165]
  }
];

const RegionalPriceMap = ({ 
  regionData = [], 
  loading = false,
  onRegionClick = () => {},
  selectedRegion = null,
  brandName = '',
  modelName = ''
}) => {
  const theme = useTheme();
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [processedData, setProcessedData] = useState({});
  const [error, setError] = useState(null);

  // Process and standardize region data when it changes
  useEffect(() => {
    try {
      // Initialize empty data structure for all regions
      const newProcessedData = {};
      
      // Set default values for all regions
      LATVIA_REGIONS.forEach(region => {
        newProcessedData[region.id] = {
          name: region.name,
          avgPrice: 0,
          count: 0,
          minPrice: 0,
          maxPrice: 0
        };
      });
      
      // Process incoming data if available
      if (regionData && regionData.length > 0) {
        regionData.forEach(item => {
          // Find which standard region this matches
          const matchingRegion = LATVIA_REGIONS.find(r => 
            r.name.toLowerCase() === item.name.toLowerCase() ||
            item.name.toLowerCase().includes(r.name.toLowerCase())
          );
          
          if (matchingRegion) {
            newProcessedData[matchingRegion.id] = {
              name: matchingRegion.name,
              avgPrice: item.avgPrice || 0,
              count: item.count || 0,
              minPrice: item.minPrice || 0,
              maxPrice: item.maxPrice || 0
            };
          }
        });
      }
      
      setProcessedData(newProcessedData);
      setError(null);
    } catch (err) {
      console.error("Error processing region data:", err);
      setError("Neizdevās apstrādāt reģionu datus");
    }
  }, [regionData]);

  // Format price for display
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '€0';
    return `€${price.toLocaleString()}`;
  };

  // Get color based on price
  const getColorForPrice = (price) => {
    if (!price) return theme.palette.mode === 'dark' ? '#424242' : '#e0e0e0';
    
    // Color scale based on price ranges
    if (price >= 30000) return '#f44336'; // Red for expensive
    if (price >= 20000) return '#ff9800'; // Orange for moderately expensive
    if (price >= 10000) return '#2196f3'; // Blue for moderate
    return '#4caf50'; // Green for affordable
  };

  // Get region info from processed data
  const getRegionInfo = (regionId) => {
    return processedData[regionId] || null;
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
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
        <Tooltip title="Kartē attēlotās cenas ir vidējās vērtības katrā reģionā, balstītas uz aktīvajiem sludinājumiem">
          <InfoIcon fontSize="small" color="action" sx={{ ml: 'auto' }} />
        </Tooltip>
      </Typography>
      
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Box sx={{ 
            position: 'relative', 
            height: 400, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderRadius: 2,
            p: 2
          }}>
            {/* Latvia map with regions using SVG */}
            <svg 
              viewBox="0 0 500 250" 
              width="100%" 
              height="100%" 
              style={{ maxHeight: '400px' }}
            >
              {/* Render all regions from the LATVIA_REGIONS array */}
              {LATVIA_REGIONS.map(region => {
                const regionInfo = getRegionInfo(region.id);
                const isSelected = selectedRegion === region.id;
                const isHovered = hoveredRegion === region.id;
                
                return (
                  <React.Fragment key={region.id}>
                    {/* Region path */}
                    <path 
                      d={region.path}
                      fill={getColorForPrice(regionInfo?.avgPrice)}
                      stroke={theme.palette.divider}
                      strokeWidth={isHovered || isSelected ? 3 : 1.5}
                      style={{ 
                        cursor: 'pointer',
                        opacity: (isHovered || isSelected || !selectedRegion) ? 1 : 0.6
                      }}
                      onClick={() => onRegionClick(region.id)}
                      onMouseEnter={() => setHoveredRegion(region.id)}
                      onMouseLeave={() => setHoveredRegion(null)}
                    />
                    
                    {/* Region name */}
                    <text 
                      x={region.center[0]} 
                      y={region.center[1]} 
                      textAnchor="middle" 
                      fill="#fff" 
                      fontWeight="bold" 
                      fontSize={region.id === 'riga' ? 10 : 12}
                      pointerEvents="none"
                      style={{
                        textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
                      }}
                    >
                      {region.name}
                    </text>
                    
                    {/* Price display under region name */}
                    {regionInfo?.avgPrice > 0 && (
                      <text 
                        x={region.center[0]} 
                        y={region.center[1] + 15} 
                        textAnchor="middle" 
                        fill="#fff" 
                        fontSize={region.id === 'riga' ? 9 : 11}
                        pointerEvents="none"
                        style={{
                          textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
                        }}
                      >
                        {formatPrice(regionInfo.avgPrice)}
                      </text>
                    )}
                  </React.Fragment>
                );
              })}
            </svg>
            
            {/* Legend */}
            <Box sx={{ 
              position: 'absolute', 
              bottom: 15, 
              right: 15, 
              bgcolor: theme.palette.background.paper,
              p: 1.5,
              borderRadius: 1,
              boxShadow: 1,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 'bold' }}>
                Vidējās cenas:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', mr: 1, borderRadius: '2px' }} />
                  <Typography variant="caption">{'< €10,000'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#2196f3', mr: 1, borderRadius: '2px' }} />
                  <Typography variant="caption">{'€10,000 - €20,000'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#ff9800', mr: 1, borderRadius: '2px' }} />
                  <Typography variant="caption">{'€20,000 - €30,000'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#f44336', mr: 1, borderRadius: '2px' }} />
                  <Typography variant="caption">{'>= €30,000'}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
        
        {/* Region details panel */}
        <Grid item xs={12} md={4}>
          <Box sx={{ height: '100%' }}>
            {hoveredRegion || selectedRegion ? (
              <Fade in={true}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnIcon color="primary" fontSize="small" />
                      {getRegionInfo(hoveredRegion || selectedRegion)?.name || 'Nav datu'}
                    </Typography>
                    
                    {getRegionInfo(hoveredRegion || selectedRegion)?.avgPrice > 0 ? (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Vidējā cena:
                        </Typography>
                        <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {formatPrice(getRegionInfo(hoveredRegion || selectedRegion).avgPrice)}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary">
                          Sludinājumu skaits:
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {getRegionInfo(hoveredRegion || selectedRegion).count || 0}
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Min cena:
                            </Typography>
                            <Typography variant="body1" color="success.main" fontWeight="500">
                              {formatPrice(getRegionInfo(hoveredRegion || selectedRegion).minPrice)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Max cena:
                            </Typography>
                            <Typography variant="body1" color="error.main" fontWeight="500">
                              {formatPrice(getRegionInfo(hoveredRegion || selectedRegion).maxPrice)}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        {selectedRegion === (hoveredRegion || selectedRegion) && (
                          <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={() => onRegionClick(null)} 
                            sx={{ mt: 2 }}
                          >
                            Atcelt reģiona filtru
                          </Button>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nav datu par šo reģionu pēc pašreizējiem kritērijiem.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Fade>
            ) : (
              <Box sx={{ 
                p: 3, 
                textAlign: 'center', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 2,
              }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Uzbrauciet ar peli vai klikšķiniet uz reģiona, lai redzētu detalizētu informāciju.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kartē attēlotās cenas ir balstītas uz aktīvajiem sludinājumiem.
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RegionalPriceMap;