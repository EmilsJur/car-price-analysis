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
  CircularProgress,
  Link,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import SpeedIcon from '@mui/icons-material/Speed';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getListingDetails } from '../services/apiService';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PaletteIcon from '@mui/icons-material/Palette';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

const CarDetailsDialog = ({
  open,
  car,
  onClose,
  onAddToCompare,
  onToggleFavorite,
  isFavorite
}) => {
  
  // State for dialog content
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [expanded, setExpanded] = useState({
    basic: true,
    technical: false,
    equipment: false,
    description: false
  });
  
  // Load car details when dialog opens
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Getting details for:', car.listing_url);
        const response = await getListingDetails(car.listing_url);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        // Merge with existing car data
        const fullDetails = {
          ...car,
          description: response.description,
          equipment: response.equipment || [],
          image_url: response.image_url,
          region: response.region || car.region,
          year: response.year_detail || car.year,
          engine: response.engine_detail || car.engine,
          transmission: response.transmission_detail || car.transmission,
          mileage: response.mileage_detail || car.mileage,
          color: response.color_detail || car.color,
          body_type: response.body_type_detail || car.body_type,
          tech_inspection: response.tech_inspection || car.tech_inspection,
          price: response.price_detail || car.price
        };
        
        console.log('Details loaded:', fullDetails);
        setDetails(fullDetails);
        
      } catch (err) {
        console.error('Failed to get details:', err);
        setError('Neizdevās ielādēt pilnu informāciju. Rāda pamata datus.');
        setDetails(car);
      } finally {
        setLoading(false);
      }
    };

    if (open && car) {
      setDetails(null);
      setLoading(false);
      setError(null);
      setImageErrors({});
      
      if (car.listing_url) {
        fetchDetails();
      } else {
        setDetails(car);
      }
    }
  }, [open, car]);
  
  const handleImageError = (imageIndex) => {
    setImageErrors(prev => ({
      ...prev,
      [imageIndex]: true
    }));
  };
  
  const toggleSection = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  if (!car) return null;
  
  const currentDetails = details || car;
  
  // Helper functions
  const formatValue = (value, defaultText = 'Nav norādīts') => {
    if (value === null || value === undefined || value === '') {
      return defaultText;
    }
    return value;
  };
  
  const formatPrice = (value) => {
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

  // Engine info helper
  const getEngineInfo = () => {
    if (currentDetails.engine) {
      return currentDetails.engine
        .replace(/Petrol/i, 'Benzīns')
        .replace(/Diesel/i, 'Dīzelis')
        .replace(/Hybrid/i, 'Hibrīds')
        .replace(/Electric/i, 'Elektriskais')
        .replace(/Gas/i, 'Gāze');
    }

    const volume = currentDetails.engine_volume ? `${currentDetails.engine_volume}L` : '';
    const type = formatEngineType(currentDetails.engine_type);
    
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
          <Typography variant="h6">
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
            {/* Car image */}
            {(currentDetails.image_url || currentDetails.image || currentDetails.images) && (
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Box
                  component="img"
                  src={currentDetails.image_url || currentDetails.image || (currentDetails.images && currentDetails.images[0])}
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
            
            {/* Price header */}
            <Paper elevation={1} sx={{ p: 2, m: 2, bgcolor: 'background.default' }}>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {formatPrice(currentDetails.price)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Publicēts: {formatDate(currentDetails.listing_date)}
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
            
            {/* Basic info */}
            <Accordion 
              expanded={expanded.basic} 
              onChange={() => toggleSection('basic')}
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
                    <Typography variant="caption" color="text.secondary">Gads</Typography>
                    <Typography variant="body1">{formatValue(currentDetails.year)}</Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Reģions</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon fontSize="small" color="action" />
                      {formatValue(currentDetails.region)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Krāsa</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PaletteIcon fontSize="small" color="action" />
                      {formatValue(currentDetails.color)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Virsbūve</Typography>
                    <Typography variant="body1">{formatValue(currentDetails.body_type)}</Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Tehniskā apskate</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarMonthIcon fontSize="small" color="action" />
                      {formatValue(currentDetails.tech_inspection)}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Technical info */}
            <Accordion 
              expanded={expanded.technical} 
              onChange={() => toggleSection('technical')}
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
                    <Typography variant="caption" color="text.secondary">Motors</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocalGasStationIcon fontSize="small" color="action" />
                      {getEngineInfo()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Ātrumkārba</Typography>
                    <Typography variant="body1">{formatValue(currentDetails.transmission)}</Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Nobraukums</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <SpeedIcon fontSize="small" color="action" />
                      {formatMileage(currentDetails.mileage)}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Equipment */}
            {currentDetails.equipment && currentDetails.equipment.length > 0 && (
              <Accordion 
                expanded={expanded.equipment} 
                onChange={() => toggleSection('equipment')}
                sx={{ mx: 2, mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="primary" />
                    Aprīkojums ({currentDetails.equipment.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {currentDetails.equipment.map((item, index) => (
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
            
            {/* Description */}
            {currentDetails.description && (
              <Accordion 
                expanded={expanded.description} 
                onChange={() => toggleSection('description')}
                sx={{ mx: 2, mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon color="primary" />
                    Apraksts
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
                    {currentDetails.description}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose}>Aizvērt</Button>
        
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