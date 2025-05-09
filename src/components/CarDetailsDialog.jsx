import React from 'react';
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
  Divider
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

const CarDetailsDialog = ({
  open,
  car,
  onClose,
  onAddToCompare,
  onToggleFavorite,
  isFavorite
}) => {
  if (!car) return null;

  // Format fuel type in Latvian
  const formatFuelType = (type) => {
    if (!type) return null;
    
    switch(type.toLowerCase()) {
      case 'petrol': return 'Benzīns';
      case 'diesel': return 'Dīzelis';
      case 'hybrid': return 'Hibrīds';
      case 'electric': return 'Elektriskais';
      case 'gas': return 'Gāze';
      default: return type;
    }
  };
  
  // Format transmission in Latvian
  const formatTransmission = (transmission) => {
    if (!transmission) return null;
    
    switch(transmission.toLowerCase()) {
      case 'manual': return 'Manuālā';
      case 'automatic': return 'Automātiskā';
      case 'semi-automatic': return 'Pusautomātiskā';
      default: return transmission;
    }
  };

  // Get properly formatted engine text
  let engineText = 'Nav norādīts';
  if (car.engine) {
    engineText = car.engine;
  } else if (car.engine_volume && car.engine_type) {
    engineText = `${car.engine_volume}L ${formatFuelType(car.engine_type) || car.engine_type}`;
  } else if (car.engine_type) {
    engineText = formatFuelType(car.engine_type) || car.engine_type;
  }

  // Get properly formatted transmission text
  const transmissionText = formatTransmission(car.transmission) || car.transmission || 'Nav norādīts';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DirectionsCarIcon sx={{ mr: 1 }} color="primary" />
          {car.brand} {car.model} ({car.year})
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Main Car Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <DirectionsCarIcon fontSize="small" sx={{ mr: 1 }} color="primary" />
              Automašīnas informācija
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Marka un modelis: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.brand} {car.model}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Gads: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.year || 'Nav norādīts'}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocalGasStationIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.light' }} />
                    Dzinējs: <Typography component="span" variant="body2" fontWeight="medium" sx={{ ml: 0.5 }}>
                      {engineText}
                    </Typography>
                    {car.engine_type && (
                      <Chip 
                        label={formatFuelType(car.engine_type) || car.engine_type} 
                        size="small" 
                        sx={{ ml: 1 }} 
                        color={
                          car.engine_type.toLowerCase() === 'diesel' ? 'primary' :
                          car.engine_type.toLowerCase() === 'petrol' ? 'secondary' :
                          car.engine_type.toLowerCase() === 'electric' ? 'success' :
                          car.engine_type.toLowerCase() === 'hybrid' ? 'info' : 'default'
                        }
                      />
                    )}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Ātrumkārba: <Typography component="span" variant="body2" fontWeight="medium">
                      {transmissionText}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <SpeedIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.light' }} />
                    Nobraukums: <Typography component="span" variant="body2" fontWeight="medium" sx={{ ml: 0.5 }}>
                      {car.mileage ? `${car.mileage.toLocaleString()} km` : 'Nav norādīts'}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Virsbūves tips: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.body_type || 'Nav norādīts'}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Krāsa: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.color || 'Nav norādīts'}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Reģions: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.region || 'Nav norādīts'}
                    </Typography>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
          
          {/* Listing Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <AttachMoneyIcon fontSize="small" sx={{ mr: 1 }} color="primary" />
              Sludinājuma informācija
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Cena: <Typography component="span" variant="body2" fontWeight="bold" color="primary">
                      €{car.price?.toLocaleString() || 'Nav norādīts'}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Publicēšanas datums: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.listing_date ? new Date(car.listing_date).toLocaleDateString() : new Date().toLocaleDateString()}
                    </Typography>
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Avots: <Typography component="span" variant="body2" fontWeight="medium">
                      SS.LV
                    </Typography>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            
            {(car.listing_url || car.url) && (
              <Button
                variant="contained"
                component="a"
                href={car.listing_url || car.url}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
                sx={{ mt: 2 }}
                fullWidth
              >
                Skatīt oriģinālo sludinājumu
              </Button>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Aizvērt</Button>
        <Button 
          variant="outlined" 
          startIcon={<CompareArrowsIcon />}
          onClick={() => {
            onAddToCompare(car);
            onClose();
          }}
        >
          Pievienot salīdzinājumam
        </Button>
        <Button 
          variant="outlined"
          color={isFavorite ? "error" : "primary"}
          startIcon={isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          onClick={() => {
            onToggleFavorite(car);
          }}
        >
          {isFavorite ? "Noņemt no izlases" : "Pievienot izlasei"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CarDetailsDialog;