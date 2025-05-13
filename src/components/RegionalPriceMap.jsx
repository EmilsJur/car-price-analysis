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
  Zoom,
  Chip,
  Button
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

// Latvian regions with accurate paths
const LATVIA_REGIONS = [
  {
    id: 'riga',
    name: 'Rīga',
    path: 'M240,140 L230,130 L235,123 L245,125 L253,132 L249,142 Z',
    center: [242, 133]
  },
  {
    id: 'vidzeme',
    name: 'Vidzeme',
    path: 'M250,142 L253,132 L245,125 L235,123 L230,130 L240,140 L249,142 L255,150 L270,130 L295,110 L320,105 L345,120 L330,140 L310,160 L285,165 L265,160 Z',
    center: [290, 135]
  },
  {
    id: 'zemgale',
    name: 'Zemgale',
    path: 'M200,145 L230,130 L240,140 L249,142 L255,150 L265,160 L240,180 L220,190 L200,180 L185,165 Z',
    center: [225, 160]
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
  const [showMapAnimation, setShowMapAnimation] = useState(false);
  const [previousData, setPreviousData] = useState({});

  // Process region data for display
  useEffect(() => {
    const processed = {};
    
    // Default values for all regions
    LATVIA_REGIONS.forEach(region => {
      processed[region.id] = {
        name: region.name,
        avgPrice: 0,
        count: 0,
        minPrice: 0,
        maxPrice: 0,
        color: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
        priceChange: 0
      };
    });
    
    // Update with actual data
    regionData.forEach(data => {
      // Find the matching region by name (case insensitive)
      const region = LATVIA_REGIONS.find(r => 
        r.name.toLowerCase() === data.name.toLowerCase()
      );
      
      if (region) {
        // Calculate price change if we have previous data
        let priceChange = 0;
        if (previousData[region.id] && previousData[region.id].avgPrice) {
          priceChange = data.avgPrice - previousData[region.id].avgPrice;
        }
        
        processed[region.id] = {
          name: region.name,
          avgPrice: data.avgPrice,
          count: data.count,
          minPrice: data.minPrice || 0,
          maxPrice: data.maxPrice || 0,
          color: getColorForPrice(data.avgPrice),
          priceChange: priceChange
        };
      }
    });
    
    // Store current data for future comparison
    setPreviousData(processed);
    
    // Set processed data with animation effect
    setProcessedData(processed);
    setShowMapAnimation(true);
    
    // Reset animation flag after 1 second
    const timer = setTimeout(() => {
      setShowMapAnimation(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [regionData, theme.palette]);

  // Get color based on price
  const getColorForPrice = (price) => {
    if (!price) return theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300];
    
    // Calculate colors based on price ranges
    if (price >= 30000) return '#f44336'; // Red for expensive
    if (price >= 20000) return '#ff9800'; // Orange for moderately expensive
    if (price >= 10000) return '#2196f3'; // Blue for moderate
    return '#4caf50'; // Green for affordable
  };

  // Format price as currency
  const formatPrice = (price) => {
    return `€${price?.toLocaleString() || 0}`;
  };

  // Get icon for price change
  const getPriceChangeIcon = (change) => {
    if (change > 0) return <TrendingUpIcon fontSize="small" color="error" />;
    if (change < 0) return <TrendingDownIcon fontSize="small" color="success" />;
    return null;
  };

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
          />
        )}
        <Tooltip title="Kartē attēlotās cenas ir vidējās vērtības katrā reģionā, balstītas uz aktīvajiem sludinājumiem">
          <InfoIcon fontSize="small" color="action" sx={{ ml: 'auto' }} />
        </Tooltip>
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Box sx={{ 
            position: 'relative', 
            height: 400, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderRadius: 2,
            p: 2,
            overflow: 'hidden'
          }}>
            <svg 
              viewBox="0 0 450 250" 
              width="100%" 
              height="100%" 
              style={{ maxHeight: '400px', position: 'relative', zIndex: 1 }}
            >
              {/* Latvia outline */}
              <path
                d="M100,90 L125,80 L150,85 L175,100 L185,110 L190,130 L200,145 L230,130 L235,123 L245,125 L253,132 L270,130 L295,110 L320,105 L345,120 L370,130 L385,150 L380,175 L360,195 L335,205 L310,195 L290,180 L265,160 L240,180 L220,190 L200,180 L185,165 L165,175 L140,180 L110,175 L90,160 L80,140 L85,120 Z"
                fill="none"
                stroke={theme.palette.divider}
                strokeWidth={1.5}
                opacity={0.8}
              />

              {/* Region paths with colors */}
              {LATVIA_REGIONS.map(region => {
                const regionInfo = processedData[region.id] || {};
                const isSelected = selectedRegion === region.id;
                const isHovered = hoveredRegion === region.id;
                
                return (
                  <path
                    key={region.id}
                    d={region.path}
                    fill={regionInfo.color}
                    stroke={theme.palette.divider}
                    strokeWidth={isSelected || isHovered ? 3 : 1.5}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.4s ease',
                      opacity: (isSelected || isHovered || !selectedRegion) ? 1 : 0.6,
                      transform: showMapAnimation && regionInfo.avgPrice > 0 ? 'scale(1.02)' : 'scale(1)',
                      transformOrigin: 'center'
                    }}
                    onClick={() => onRegionClick(region.id)}
                    onMouseEnter={() => setHoveredRegion(region.id)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />
                );
              })}

              {/* Region labels */}
              {LATVIA_REGIONS.map(region => {
                const regionInfo = processedData[region.id] || {};
                const isActive = hoveredRegion === region.id || selectedRegion === region.id;
                
                return (
                  <g 
                    key={`text-${region.id}`}
                    style={{ 
                      cursor: 'pointer',
                      pointerEvents: 'none',
                      transition: 'all 0.3s ease',
                      opacity: isActive ? 1 : 0.9
                    }}
                  >
                    <text
                      x={region.center[0]}
                      y={region.center[1] - 10}
                      textAnchor="middle"
                      fill={theme.palette.getContrastText(regionInfo.color)}
                      style={{ 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        userSelect: 'none',
                        textShadow: theme.palette.mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 3px rgba(0,0,0,0.5)'
                      }}
                    >
                      {region.name}
                    </text>
                    
                    {regionInfo.avgPrice > 0 && (
                      <text
                        x={region.center[0]}
                        y={region.center[1] + 10}
                        textAnchor="middle"
                        fill={theme.palette.getContrastText(regionInfo.color)}
                        style={{ 
                          fontSize: '11px',
                          fontWeight: isActive ? 'bold' : 'normal',
                          userSelect: 'none',
                          textShadow: theme.palette.mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 3px rgba(0,0,0,0.5)'
                        }}
                      >
                        {formatPrice(regionInfo.avgPrice)}
                      </text>
                    )}
                  </g>
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
                      {processedData[hoveredRegion || selectedRegion]?.name || 'N/A'}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Vidējā cena:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {formatPrice(processedData[hoveredRegion || selectedRegion]?.avgPrice)}
                        </Typography>
                        {processedData[hoveredRegion || selectedRegion]?.priceChange !== 0 && (
                          <Chip 
                            size="small"
                            icon={getPriceChangeIcon(processedData[hoveredRegion || selectedRegion]?.priceChange)}
                            label={processedData[hoveredRegion || selectedRegion]?.priceChange > 0 
                              ? `+${formatPrice(processedData[hoveredRegion || selectedRegion]?.priceChange)}` 
                              : formatPrice(processedData[hoveredRegion || selectedRegion]?.priceChange)
                            }
                            color={processedData[hoveredRegion || selectedRegion]?.priceChange > 0 ? "error" : "success"}
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Sludinājumu skaits:
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {processedData[hoveredRegion || selectedRegion]?.count || 0}
                      </Typography>
                      
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Min cena:
                          </Typography>
                          <Typography variant="body1" color="success.main" fontWeight="500">
                            {formatPrice(processedData[hoveredRegion || selectedRegion]?.minPrice)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Max cena:
                          </Typography>
                          <Typography variant="body1" color="error.main" fontWeight="500">
                            {formatPrice(processedData[hoveredRegion || selectedRegion]?.maxPrice)}
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