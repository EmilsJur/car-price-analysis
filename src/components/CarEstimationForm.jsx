import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  CircularProgress,
  Grid,
  Divider,
  Alert,
  useTheme
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import ReportIcon from '@mui/icons-material/Report';

const CarEstimationForm = ({
  brands = [],
  models = [],
  onEstimate = () => {},
  loading = false,
  estimationResult = null,
  error = null
}) => {
  const theme = useTheme();
  
  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear() - 5,
    mileage: 100000,
    fuelType: '',
    transmission: ''
  });
  
  // Available models for selected brand
  const [availableModels, setAvailableModels] = useState([]);
  
  // Update available models when brand changes
  useEffect(() => {
    if (!formData.brand) {
      setAvailableModels([]);
      return;
    }
    
    const brandModels = models.filter(model => 
      model.brand?.toLowerCase() === formData.brand.toLowerCase()
    );
    
    setAvailableModels(brandModels);
    
    // Reset model if current selection is not valid for new brand
    if (brandModels.length > 0 && !brandModels.some(m => m.model === formData.model)) {
      setFormData(prev => ({ ...prev, model: '' }));
    }
  }, [formData.brand, models]);
  
  // Handle form changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onEstimate(formData);
  };
  
  // Fuel type options in Latvian
  const fuelTypes = [
    { value: 'Petrol', label: 'Benzīns' },
    { value: 'Diesel', label: 'Dīzelis' },
    { value: 'Hybrid', label: 'Hibrīds' },
    { value: 'Electric', label: 'Elektriskais' },
    { value: 'Gas', label: 'Gāze' }
  ];
  
  // Transmission options in Latvian
  const transmissionTypes = [
    { value: 'Manual', label: 'Manuālā' },
    { value: 'Automatic', label: 'Automātiskā' },
    { value: 'Semi-Automatic', label: 'Pusautomātiskā' }
  ];
  
  // Format mileage with thousand separator
  const formatMileage = (value) => {
    return `${value.toLocaleString()} km`;
  };
  
  // Render estimation result
  const renderEstimationResult = () => {
    if (!estimationResult) return null;
    
    return (
      <Box sx={{ mt: 3, mb: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Vērtējuma rezultāts
        </Typography>
        
        <Box sx={{ 
          p: 2, 
          bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="h5" align="center" gutterBottom>
            €{estimationResult.estimated_value?.toLocaleString()}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
            Aptuvena tirgus vērtība
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Min: €{estimationResult.value_min?.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Max: €{estimationResult.value_max?.toLocaleString()}
            </Typography>
          </Box>
          
          <Slider
            value={estimationResult.estimated_value}
            min={estimationResult.value_min}
            max={estimationResult.value_max}
            disabled
            valueLabelDisplay="off"
            sx={{ mt: 1 }}
          />
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Ticamības līmenis: 
              <Typography 
                component="span" 
                color={
                  estimationResult.confidence_level === 'high' ? 'success.main' :
                  estimationResult.confidence_level === 'medium' ? 'warning.main' : 'error.main'
                }
                sx={{ ml: 1, fontWeight: 'bold' }}
              >
                {estimationResult.confidence_level === 'high' ? 'Augsts' :
                 estimationResult.confidence_level === 'medium' ? 'Vidējs' : 'Zems'}
              </Typography>
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Balstīts uz {estimationResult.sample_size} līdzīgiem sludinājumiem
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Automašīnas vērtības aprēķins
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Ievadiet automašīnas informāciju, lai aprēķinātu aptuveno tirgus vērtību
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" margin="normal">
              <InputLabel id="brand-label">Marka *</InputLabel>
              <Select
                labelId="brand-label"
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                label="Marka *"
                required
              >
                <MenuItem value="">
                  <em>Izvēlieties marku</em>
                </MenuItem>
                {brands.map((brand, index) => (
                  <MenuItem key={index} value={brand.name}>
                    {brand.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" margin="normal" disabled={!formData.brand}>
              <InputLabel id="model-label">Modelis *</InputLabel>
              <Select
                labelId="model-label"
                id="model"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                label="Modelis *"
                required
              >
                <MenuItem value="">
                  <em>Izvēlieties modeli</em>
                </MenuItem>
                {availableModels.map((model, index) => (
                  <MenuItem key={index} value={model.model}>
                    {model.model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              margin="normal"
              id="year"
              label="Izlaiduma gads *"
              type="number"
              value={formData.year}
              onChange={(e) => handleChange('year', parseInt(e.target.value))}
              inputProps={{ min: 1990, max: new Date().getFullYear() }}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" margin="normal">
              <InputLabel id="fuel-type-label">Degvielas tips</InputLabel>
              <Select
                labelId="fuel-type-label"
                id="fuel-type"
                value={formData.fuelType}
                onChange={(e) => handleChange('fuelType', e.target.value)}
                label="Degvielas tips"
              >
                <MenuItem value="">
                  <em>Nav norādīts</em>
                </MenuItem>
                {fuelTypes.map((type, index) => (
                  <MenuItem key={index} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" margin="normal">
              <InputLabel id="transmission-label">Ātrumkārba</InputLabel>
              <Select
                labelId="transmission-label"
                id="transmission"
                value={formData.transmission}
                onChange={(e) => handleChange('transmission', e.target.value)}
                label="Ātrumkārba"
              >
                <MenuItem value="">
                  <em>Nav norādīts</em>
                </MenuItem>
                {transmissionTypes.map((type, index) => (
                  <MenuItem key={index} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mt: 2, mb: 3 }}>
              <Typography id="mileage-slider" gutterBottom>
                Nobraukums: {formatMileage(formData.mileage)}
              </Typography>
              <Slider
                value={formData.mileage}
                onChange={(e, newValue) => handleChange('mileage', newValue)}
                aria-labelledby="mileage-slider"
                min={0}
                max={500000}
                step={5000}
                valueLabelDisplay="auto"
                valueLabelFormat={formatMileage}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              startIcon={<CalculateIcon />}
              disabled={!formData.brand || !formData.model || !formData.year || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Aprēķināt vērtību'}
            </Button>
          </Grid>
        </Grid>
      </form>
      
      {renderEstimationResult()}
      
      {estimationResult && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
            <ReportIcon fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
            Vērtējums ir aptuvens un balstīts uz līdzīgiem sludinājumiem. Faktiskā vērtība var atšķirties atkarībā no automašīnas stāvokļa un papildaprīkojuma.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CarEstimationForm;