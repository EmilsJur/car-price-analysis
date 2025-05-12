import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Link,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import SpeedIcon from '@mui/icons-material/Speed';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getListingDetails } from '../services/apiService';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PaletteIcon from '@mui/icons-material/Palette';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import axios from 'axios';

const CarDetailsDialog = ({
  open,
  car,
  onClose,
  onAddToCompare,
  onToggleFavorite,
  isFavorite,
  onImageError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State management
  const [fullDetails, setFullDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    technical: false,
    equipment: false,
    description: false
  });
  
  // Fetch full details when dialog opens
  useEffect(() => {
    if (open && car) {
      resetState();
      if (car.listing_url) {
        fetchFullDetails();
      } else {
        setFullDetails(car);
      }
    }
  }, [open, car]);
  
  const resetState = () => {
    setFullDetails(null);
    setLoading(false);
    setError(null);
    setImageErrors({});
  };
  
   
  const fetchFullDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching details for URL:', car.listing_url);
      const response = await getListingDetails(car.listing_url);
      
      // Check for error in the response directly
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Merge the original car data with the new details
      const mergedDetails = {
        ...car,
        description: response.description,
        equipment: response.equipment || [],
        image_url: response.image_url,
        region: response.region || car.region,
        // Use the detailed fields if available
        year: response.year_detail || car.year,
        engine: response.engine_detail || car.engine,
        transmission: response.transmission_detail || car.transmission,
        mileage: response.mileage_detail || car.mileage,
        color: response.color_detail || car.color,
        body_type: response.body_type_detail || car.body_type,
        tech_inspection: response.tech_inspection || car.tech_inspection,
        // Add price from the details
        price: response.price_detail || car.price
      };
      
      console.log('Merged details:', mergedDetails);
      setFullDetails(mergedDetails);
      
    } catch (err) {
      console.error('Error fetching car details:', err);
      setError('Neizdevās ielādēt pilno informāciju. Tiek rādīta pamata informācija.');
      setFullDetails(car);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageError = (imageIndex) => {
    setImageErrors(prev => ({
      ...prev,
      [imageIndex]: true
    }));
    if (onImageError) {
      onImageError(imageIndex);
    }
  };
  
  const handleSectionExpand = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  if (!car) return null;
  
  const details = fullDetails || car;
  
  // Format values with fallbacks
  const formatValue = (value, defaultText = 'Nav norādīts') => {
    if (value === null || value === undefined || value === '') {
      return defaultText;
    }
    return value;
  };
  
  const formatCurrency = (value) => {
    return value ? `€${Number(value).toLocaleString()}` : 'Nav norādīts';
  };
  
  const formatEngineType = (type) => {
    if (!type) return 'Nav norādīts';
    
    switch(type.toLowerCase()) {
      case 'petrol': return 'Benzīns';
      case 'diesel': return 'Dīzelis';
      case 'hybrid': return 'Hibrīds';
      case 'electric': return 'Elektriskais';
      case 'gas': return 'Gāze/LPG';
      default: return type;
    }
  };

  const formatMileage = (value) => {
    return value ? `${Number(value).toLocaleString()} km` : 'Nav norādīts';
  };
  
  const formatDate = (date) => {
    if (!date) return 'Nav norādīts';
    try {
      return new Date(date).toLocaleDateString('lv-LV');
    } catch {
      return date;
    }
  };

  
  // Determine engine type details
  const getEngineInfo = () => {
  if (details.engine) {
    return details.engine
      .replace(/Petrol/i, 'Benzīns')
      .replace(/Diesel/i, 'Dīzelis')
      .replace(/Hybrid/i, 'Hibrīds')
      .replace(/Electric/i, 'Elektriskais')
      .replace(/Gas/i, 'Gāze');
  }

  const volume = details.engine_volume ? `${details.engine_volume}L` : '';
  const type = formatEngineType(details.engine_type);
  
  if (volume && type) return `${volume} ${type}`;
  if (type) return type;
  if (volume) return volume;
  return 'Nav norādīts';
};
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsCarIcon color="primary" />
          <Typography variant="h6" component="div">
            {car.brand} {car.model}
          </Typography>
          <Chip 
            label={car.year} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 0 }}>
        {error && (
          <Alert severity="warning" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Image Section */}
            {(details.image_url || details.image || details.images) && (
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Box
                  component="img"
                  src={details.image_url || details.image || (details.images && details.images[0])}
                  alt={`${car.brand} ${car.model}`}
                  onError={() => handleImageError(0)}
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'contain',
                    bgcolor: 'grey.100',
                    display: imageErrors[0] ? 'none' : 'block'
                  }}
                />
                {imageErrors[0] && (
                  <Box sx={{ 
                    width: '100%', 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: 'grey.100',
                    border: '1px dashed',
                    borderColor: 'grey.400'
                  }}>
                    <Typography color="text.secondary">
                      Attēlu nevar ielādēt
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Price Header */}
            <Paper elevation={1} sx={{ p: 2, m: 2, bgcolor: 'background.default' }}>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Typography variant="h5" component="div" color="primary" fontWeight="bold">
                    {formatCurrency(details.price)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Publicēts: {formatDate(details.listing_date)}
                  </Typography>
                </Grid>
                <Grid item>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={isFavorite ? "Noņemt no izlases" : "Pievienot izlasei"}>
                      <IconButton 
                        onClick={() => onToggleFavorite(car)}
                        color={isFavorite ? "error" : "default"}
                      >
                        {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Pievienot salīdzinājumam">
                      <IconButton onClick={() => onAddToCompare(car)}>
                        <CompareArrowsIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Basic Information Section */}
            <Accordion 
              expanded={expandedSections.basic} 
              onChange={() => handleSectionExpand('basic')}
              sx={{ mx: 2, mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon color="primary" />
                  Pamatinformācija
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Izlaiduma gads
                    </Typography>
                    <Typography variant="body1">
                      {formatValue(details.year)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Reģions
                    </Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon fontSize="small" color="action" />
                      {formatValue(details.region)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Krāsa
                    </Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PaletteIcon fontSize="small" color="action" />
                      {formatValue(details.color)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Virsbūves tips
                    </Typography>
                    <Typography variant="body1">
                      {formatValue(details.body_type)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Tehniskā apskate
                    </Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarMonthIcon fontSize="small" color="action" />
                      {formatValue(details.tech_inspection)}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Technical Information Section */}
            <Accordion 
              expanded={expandedSections.technical} 
              onChange={() => handleSectionExpand('technical')}
              sx={{ mx: 2, mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BuildIcon color="primary" />
                  Tehniskā informācija
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Motors
                    </Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocalGasStationIcon fontSize="small" color="action" />
                      {getEngineInfo()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Ātrumkārba
                    </Typography>
                    <Typography variant="body1">
                      {formatValue(details.transmission)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Nobraukums
                    </Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <SpeedIcon fontSize="small" color="action" />
                      {formatMileage(details.mileage)}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Equipment Section */}
            {details.equipment && details.equipment.length > 0 && (
              <Accordion 
                expanded={expandedSections.equipment} 
                onChange={() => handleSectionExpand('equipment')}
                sx={{ mx: 2, mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="primary" />
                    Aprīkojums ({details.equipment.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {details.equipment.map((item, index) => (
                      <Chip 
                        key={index} 
                        label={item} 
                        size="small" 
                        variant="outlined"
                        color="success"
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
            
            {/* Description Section */}
            {details.description && (
              <Accordion 
                expanded={expandedSections.description} 
                onChange={() => handleSectionExpand('description')}
                sx={{ mx: 2, mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon color="primary" />
                    Sludinājuma apraksts
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.6
                    }}
                  >
                    {details.description}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <Button onClick={onClose}>
            Aizvērt
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {car.listing_url && (
            <Button
              variant="contained"
              component={Link}
              href={car.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon />}
            >
              Skatīt SS.LV
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CarDetailsDialog;