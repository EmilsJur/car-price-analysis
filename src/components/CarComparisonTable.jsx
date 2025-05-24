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
  Link,
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
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LinkIcon from '@mui/icons-material/Link';

const CarComparisonTable = ({
  cars = [],
  onRemoveCar = () => {},
  onExportComparison = () => {},
  isAuthenticated = false // Add this prop
}) => {
  
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
  
  // Format
  const formatTransmission = (transmission) => {
    switch(transmission) {
      case 'Manual': return 'Manuālā';
      case 'Automatic': return 'Automātiskā';
      case 'Semi-Automatic': return 'Pusautomātiskā';
      default: return transmission;
    }
  };
  
  // Find the best value in a row (low price, new year, low km)
  const getBestValue = (attribute) => {
  if (cars.length <= 1) return null;
  
  // Tikai aprēķināmi atribūti var būt "labākie"
  const calculateableAttributes = ['price', 'year', 'mileage', 'engine_volume'];
  if (!calculateableAttributes.includes(attribute)) {
    return null;
  }
  
  // Savācam tikai tos auto, kuriem ir derīgas vērtības
  const validCars = [];
  cars.forEach((car, index) => {
    const value = car[attribute];
    
    // Ignorē "Nav norādīts", null, undefined, 0 (mazāk mileage gadījumā)
    if (value === undefined || value === null || value === 0 || 
        value === "Nav norādīts" || value === "" ||
        isNaN(parseFloat(value)) || !isFinite(value)) {
      return; // Šo auto ignorējam
    }
    
    validCars.push({ index, value: parseFloat(value) });
  });
  
  // Ja nav vismaz 2 derīgas vērtības, nav ko salīdzināt
  if (validCars.length < 2) return null;
  
  // Pārbaudām, vai ir atšķirības starp derīgajām vērtībām
  const firstValue = validCars[0].value;
  const hasVariation = validCars.some(car => car.value !== firstValue);
  
  if (!hasVariation) return null; // Visas vienādas = nav "labākās"
  
  // Atrast labāko starp derīgajiem auto
  const isHigherBetter = attribute === 'year';
  let bestCar = validCars[0];
  
  for (let i = 1; i < validCars.length; i++) {
    const currentCar = validCars[i];
    
    if (isHigherBetter && currentCar.value > bestCar.value) {
      bestCar = currentCar;
    } else if (!isHigherBetter && currentCar.value < bestCar.value) {
      bestCar = currentCar;
    }
  }
  
  return bestCar.index; // Atgriezam oriģinālo indeksu cars masīvā
};
  
  // Get comparison rows - separated by those with icons and those without
  const getComparisonRows = () => {
    // Attributes with icons (prioritized)
    const attributesWithIcons = [
      { 
        key: 'year', 
        label: 'Izlaiduma gads', 
        icon: <CalendarMonthIcon color="primary" fontSize="small" /> 
      },
      { 
        key: 'engine_type', 
        label: 'Degvielas tips', 
        format: (value) => formatFuelType(value),
        icon: <LocalGasStationIcon color="primary" fontSize="small" />
      },
      { 
        key: 'transmission', 
        label: 'Ātrumkārba', 
        format: (value) => formatTransmission(value),
        icon: <SettingsIcon color="primary" fontSize="small" />
      },
      { 
        key: 'mileage', 
        label: 'Nobraukums', 
        format: (value) => value ? `${value.toLocaleString()} km` : 'Nav norādīts',
        icon: <SpeedIcon color="primary" fontSize="small" />
      },
      { 
        key: 'body_type', 
        label: 'Virsbūves tips',
        icon: <DirectionsCarIcon color="primary" fontSize="small" />
      },
      { 
        key: 'color', 
        label: 'Krāsa',
        icon: <PaletteIcon color="primary" fontSize="small" />
      },
      { 
        key: 'region', 
        label: 'Reģions',
        icon: <LocationOnIcon color="primary" fontSize="small" />
      }
    ];
    
    // Attributes without icons (shown after)
    const attributesWithoutIcons = [
      { 
        key: 'engine_volume', 
        label: 'Motora tilpums', 
        format: (value) => value ? `${value}L` : 'Nav norādīts' 
      }
    ];
    
    // Combine both arrays
    const allAttributes = [...attributesWithIcons, ...attributesWithoutIcons];
    
    return allAttributes.map(attr => {
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
        
        {isAuthenticated ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={onExportComparison}
            disabled={cars.length === 0}
          >
            Eksportēt
          </Button>
        ) : (
          <Tooltip title="Pieslēdzieties, lai eksportētu salīdzinājumu">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                disabled
              >
                Eksportēt
              </Button>
            </span>
          </Tooltip>
        )}
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
            {/* Price row with its own special icon and styling */}
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
              <TableCell component="th" scope="row" sx={{ display: 'flex', alignItems: 'center' }}>
                <LinkIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
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