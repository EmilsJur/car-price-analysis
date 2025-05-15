import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Link,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import SpeedIcon from '@mui/icons-material/Speed';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';

const CarComparisonTable = ({
  cars = [],
  onRemoveCar = () => {},
  onExportComparison = () => {}
}) => {
  const theme = useTheme();
  
  // If no cars to compare
  if (!cars || cars.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Automašīnu salīdzinājums
        </Typography>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            Nav izvēlēta neviena automašīna salīdzināšanai.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lūdzu, pievienojiet automašīnas no meklēšanas rezultātiem, lai salīdzinātu.
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  // Format fuel type in Latvian
  const formatFuelType = (type) => {
    switch(type) {
      case 'Petrol': return 'Benzīns';
      case 'Diesel': return 'Dīzelis';
      case 'Hybrid': return 'Hibrīds';
      case 'Electric': return 'Elektriskais';
      case 'Gas': return 'Gāze';
      default: return type;
    }
  };
  
  // Format transmission in Latvian
  const formatTransmission = (transmission) => {
    switch(transmission) {
      case 'Manual': return 'Manuālā';
      case 'Automatic': return 'Automātiskā';
      case 'Semi-Automatic': return 'Pusautomātiskā';
      default: return transmission;
    }
  };
  
  // Find the best value in a row (lowest price, newest year, lowest mileage)
  const getBestValue = (attribute) => {
    if (cars.length <= 1) return null;
    
    let bestIndex = 0;
    let bestValue = cars[0][attribute];
    let isNumeric = !isNaN(parseFloat(bestValue)) && isFinite(bestValue);
    
    // Determine if a higher or lower value is better
    const isHigherBetter = attribute === 'year';
    
    for (let i = 1; i < cars.length; i++) {
      const currentValue = cars[i][attribute];
      
      // Skip if value is missing
      if (currentValue === undefined || currentValue === null) continue;
      
      if (isNumeric) {
        if (isHigherBetter && currentValue > bestValue) {
          bestValue = currentValue;
          bestIndex = i;
        } else if (!isHigherBetter && currentValue < bestValue) {
          bestValue = currentValue;
          bestIndex = i;
        }
      }
    }
    
    return bestIndex;
  };
  
  // Get comparison rows
  const getComparisonRows = () => {
    // Define the attributes to compare
    const attributes = [
      { key: 'price', label: 'Cena', format: (value) => `€${value?.toLocaleString() || 'Nav norādīts'}` },
      { key: 'year', label: 'Izlaiduma gads', icon: <CalendarMonthIcon color="primary" fontSize="small" /> },
      { 
        key: 'engine_type', 
        label: 'Degvielas tips', 
        format: (value) => formatFuelType(value),
        icon: <LocalGasStationIcon color="primary" fontSize="small" />
      },
      { key: 'engine_volume', label: 'Motora tilpums', format: (value) => value ? `${value}L` : 'Nav norādīts' },
      { 
        key: 'transmission', 
        label: 'Ātrumkārba', 
        format: (value) => formatTransmission(value)
      },
      { 
        key: 'mileage', 
        label: 'Nobraukums', 
        format: (value) => value ? `${value.toLocaleString()} km` : 'Nav norādīts',
        icon: <SpeedIcon color="primary" fontSize="small" />
      },
      { key: 'body_type', label: 'Virsbūves tips' },
      { key: 'color', label: 'Krāsa' },
      { key: 'region', label: 'Reģions' }
    ];
    
    return attributes.map(attr => {
      const bestValueIndex = getBestValue(attr.key);
      
      return (
        <TableRow key={attr.key}>
          <TableCell component="th" scope="row" sx={{ display: 'flex', alignItems: 'center' }}>
            {attr.icon && <Box sx={{ mr: 1 }}>{attr.icon}</Box>}
            {attr.label}
          </TableCell>
          
          {cars.map((car, index) => {
            const value = car[attr.key];
            const formattedValue = attr.format ? attr.format(value) : (value || 'Nav norādīts');
            const isBest = index === bestValueIndex && cars.length > 1;
            
            return (
              <TableCell key={index} align="center">
                <Box sx={{ position: 'relative' }}>
                  <Typography
                    variant="body2"
                    component="span"
                    fontWeight={isBest ? 'bold' : 'normal'}
                    color={isBest ? 'primary.main' : 'inherit'}
                  >
                    {formattedValue}
                  </Typography>
                  
                  {isBest && (
                    <Tooltip title="Labākā vērtība">
                      <CheckCircleIcon 
                        color="success" 
                        fontSize="small" 
                        sx={{ 
                          position: 'absolute',
                          top: -8,
                          right: -12,
                          width: 16,
                          height: 16
                        }} 
                      />
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            );
          })}
        </TableRow>
      );
    });
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Automašīnu salīdzinājums
        </Typography>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={onExportComparison}
          disabled={cars.length === 0}
        >
          Eksportēt
        </Button>
      </Box>
      
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '20%' }}>Īpašība</TableCell>
              
              {cars.map((car, index) => (
                <TableCell key={index} align="center">
                  <Box sx={{ position: 'relative', pr: 3 }}>
                    <Typography variant="subtitle2" noWrap>
                      {car.brand} {car.model}
                    </Typography>
                    
                    <Tooltip title="Noņemt no salīdzinājuma">
                      <IconButton
                        size="small"
                        onClick={() => onRemoveCar(car)}
                        sx={{ 
                          position: 'absolute',
                          top: -8,
                          right: -8
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {/* Images row - can be added if you have car images */}
            
            {/* Prices row with highlighting */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ display: 'flex', alignItems: 'center' }}>
                <PriceCheckIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                Cena
              </TableCell>
              
              {cars.map((car, index) => {
                const isPriceLowest = index === getBestValue('price');
                
                return (
                  <TableCell key={index} align="center">
                    <Box sx={{ position: 'relative' }}>
                      <Typography
                        variant="body1"
                        component="span"
                        fontWeight="bold"
                        color={isPriceLowest && cars.length > 1 ? 'success.main' : 'inherit'}
                      >
                        €{car.price?.toLocaleString() || 'Nav norādīts'}
                      </Typography>
                      
                      {isPriceLowest && cars.length > 1 && (
                        <Tooltip title="Zemākā cena">
                          <ArrowDownwardIcon 
                            color="success" 
                            fontSize="small" 
                            sx={{ 
                              position: 'absolute',
                              top: -8,
                              right: -16
                            }} 
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
            
            {/* All other comparison rows */}
            {getComparisonRows()}
            
            {/* Links to listings */}
            <TableRow>
              <TableCell component="th" scope="row">
                Saite
              </TableCell>
              
              {cars.map((car, index) => (
                <TableCell key={index} align="center">
                  {car.url || car.listing_url ? (
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      href={car.url || car.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNewIcon />}
                    >
                      Skatīt
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nav pieejama
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          * Zaļā krāsā atzīmētas labākās vērtības katrā kategorijā. Zemākā cena un nobraukums, kā arī jaunākais izlaiduma gads tiek uzskatīti par labākajiem.
        </Typography>
      </Box>
    </Paper>
  );
};

export default CarComparisonTable;