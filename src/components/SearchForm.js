import React, { useState, useEffect } from 'react';
import {
  Box, 
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider,
  Button,
  Grid,
  Chip,
  Autocomplete,
  Collapse,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { getRegions } from '../services/apiService';

const SearchForm = ({ 
  brands = [], 
  models = [], 
  params = {
    brand: '',
    model: '',
    yearFrom: new Date().getFullYear() - 10,
    yearTo: new Date().getFullYear(),
    priceFrom: 0,
    priceTo: 100000,
    fuelType: '',
    transmission: '',
    region: '',
    sortBy: 'price',
    sortOrder: 'asc'
  }, 
  onParamChange = () => {}, 
  onSearch = () => {}, 
  loading = false
}) => {

  // Local state for form values with validation
  const [localParams, setLocalParams] = useState({...params});
  const [advanced, setAdvanced] = useState(false);
  const [errors, setErrors] = useState({});
  const [regions, setRegions] = useState([]);

  // Fetch regions on component mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await getRegions();
        if (response && response.regions) {
          setRegions(response.regions);
        }
      } catch (err) {
        console.error('Error fetching regions:', err);
      }
    };
    
    fetchRegions();
  }, []);

  // Sync local params with parent state
  useEffect(() => {
    setLocalParams({...params});
  }, [params]);

  // Validate price range
  useEffect(() => {
    const newErrors = {};
    
    if (localParams.priceFrom > localParams.priceTo) {
      newErrors.price = 'Minimālā cena nevar pārsniegt maksimālo cenu';
    }
    
    if (localParams.yearFrom > localParams.yearTo) {
      newErrors.year = 'Minimālais gads nevar pārsniegt maksimālo gadu';
    }
    
    setErrors(newErrors);
  }, [localParams.priceFrom, localParams.priceTo, localParams.yearFrom, localParams.yearTo]);

  // Handle local changes before propagating to parent
  const handleLocalChange = (name, value) => {
    setLocalParams(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Propagate to parent component
    onParamChange(name, value);
  };

  // Handle year range changes
  const handleYearChange = (event, newValue) => {
    handleLocalChange('yearFrom', newValue[0]);
    handleLocalChange('yearTo', newValue[1]);
  };

  // Handle price range changes
  const handlePriceChange = (event, newValue) => {
    handleLocalChange('priceFrom', newValue[0]);
    handleLocalChange('priceTo', newValue[1]);
  };

  // Reset all filters
  const handleReset = () => {
    const resetParams = {
      brand: '',
      model: '',
      yearFrom: new Date().getFullYear() - 10,
      yearTo: new Date().getFullYear(),
      priceFrom: 0,
      priceTo: 100000,
      fuelType: '',
      transmission: '',
      region: '',
      sortBy: 'price',
      sortOrder: 'asc'
    };
    
    // Update local state
    setLocalParams(resetParams);
    
    // Update parent state for each param
    Object.entries(resetParams).forEach(([key, value]) => {
      onParamChange(key, value);
    });
    
    setAdvanced(false);
  };

  // Format currencies
  const formatCurrency = (value) => {
    if (value === undefined || value === null) {
      return '€0';
    }
    return `€${value.toLocaleString()}`;
  };

  // Fuel type options - updated to match backend expectations
  const fuelTypes = [
    { value: 'Petrol', label: 'Benzīns' },
    { value: 'Diesel', label: 'Dīzelis' },
    { value: 'Hybrid', label: 'Hibrīds' },
    { value: 'Electric', label: 'Elektriskais' },
    { value: 'Gas', label: 'Gāze/LPG' }
  ];

  // Transmission options
  const transmissionTypes = [
    { value: 'Manual', label: 'Manuālā' },
    { value: 'Automatic', label: 'Automātiskā' },
    { value: 'Semi-Automatic', label: 'Pusautomātiskā' }
  ];

  return (
    <Box>
      {/* Main filters */}
      <FormControl fullWidth margin="normal">
        <Autocomplete
          id="brand-select"
          options={brands}
          getOptionLabel={(option) => option?.name || ''}
          value={brands.find(b => b.name === localParams.brand) || null}
          onChange={(event, newValue) => {
            handleLocalChange('brand', newValue ? newValue.name : '');
            handleLocalChange('model', ''); // Reset model when brand changes
          }}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Marka" 
              variant="outlined"
              placeholder="Jebkura marka"
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              {option.name} {option.count && <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>({option.count})</Typography>}
            </li>
          )}
          disabled={loading}
        />
      </FormControl>
      
      <FormControl fullWidth margin="normal" disabled={!localParams.brand || loading}>
        <Autocomplete
          id="model-select"
          options={models}
          getOptionLabel={(option) => option?.model || ''}
          value={models.find(m => m.model === localParams.model) || null}
          onChange={(event, newValue) => {
            handleLocalChange('model', newValue ? newValue.model : '');
          }}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Modelis" 
              variant="outlined"
              placeholder="Jebkurš modelis"
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              {option.model} {option.count && <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>({option.count})</Typography>}
            </li>
          )}
        />
      </FormControl>
      
      <Box sx={{ mt: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography id="year-range-slider" gutterBottom>
            Izlaiduma gads {localParams.yearFrom} - {localParams.yearTo}
          </Typography>
          {errors.year && (
            <Typography variant="caption" color="error">
              {errors.year}
            </Typography>
          )}
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Slider
              value={[localParams.yearFrom, localParams.yearTo]}
              onChange={handleYearChange}
              min={1990}
              max={new Date().getFullYear()}
              step={1}
              valueLabelDisplay="auto"
              aria-labelledby="year-range-slider"
              disabled={loading}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              size="small"
              label="No"
              value={localParams.yearFrom}
              onChange={(e) => handleLocalChange('yearFrom', parseInt(e.target.value) || 1990)}
              inputProps={{ min: 1990, max: new Date().getFullYear() }}
              type="number"
              fullWidth
              disabled={loading}
              error={!!errors.year}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              size="small"
              label="Līdz"
              value={localParams.yearTo}
              onChange={(e) => handleLocalChange('yearTo', parseInt(e.target.value) || new Date().getFullYear())}
              inputProps={{ min: 1990, max: new Date().getFullYear() }}
              type="number"
              fullWidth
              disabled={loading}
              error={!!errors.year}
            />
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ mt: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography id="price-range-slider" gutterBottom>
            Cena {formatCurrency(localParams.priceFrom)} - {formatCurrency(localParams.priceTo)}
          </Typography>
          {errors.price && (
            <Typography variant="caption" color="error">
              {errors.price}
            </Typography>
          )}
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Slider
              value={[localParams.priceFrom, localParams.priceTo]}
              onChange={handlePriceChange}
              min={0}
              max={150000}
              step={1000}
              valueLabelDisplay="auto"
              aria-labelledby="price-range-slider"
              valueLabelFormat={formatCurrency}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              size="small"
              label="No"
              value={localParams.priceFrom}
              onChange={(e) => handleLocalChange('priceFrom', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 1000000 }}
              type="number"
              fullWidth
              disabled={loading}
              error={!!errors.price}
              InputProps={{
                startAdornment: <Typography variant="body2" sx={{ mr: 0.5 }}>€</Typography>
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              size="small"
              label="Līdz"
              value={localParams.priceTo}
              onChange={(e) => handleLocalChange('priceTo', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 1000000 }}
              type="number"
              fullWidth
              disabled={loading}
              error={!!errors.price}
              InputProps={{
                startAdornment: <Typography variant="body2" sx={{ mr: 0.5 }}>€</Typography>
              }}
            />
          </Grid>
        </Grid>
      </Box>
      
      {/* Advanced filters section */}
      <Box sx={{ mt: 2 }}>
        <Button
          fullWidth
          variant="text"
          onClick={() => setAdvanced(!advanced)}
          startIcon={advanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          disabled={loading}
        >
          {advanced ? "Slēpt papildu filtrus" : "Rādīt papildu filtrus"}
        </Button>
        
        <Collapse in={advanced}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="fuel-type-label">Degvielas tips</InputLabel>
                  <Select
                    labelId="fuel-type-label"
                    id="fuel-type"
                    value={localParams.fuelType}
                    label="Degvielas tips"
                    onChange={(e) => handleLocalChange('fuelType', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="">Jebkurš</MenuItem>
                    {fuelTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="transmission-label">Ātrumkārba</InputLabel>
                  <Select
                    labelId="transmission-label"
                    id="transmission"
                    value={localParams.transmission}
                    label="Ātrumkārba"
                    onChange={(e) => handleLocalChange('transmission', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="">Jebkura</MenuItem>
                    {transmissionTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="region-label">Reģions</InputLabel>
                  <Select
                    labelId="region-label"
                    id="region"
                    value={localParams.region}
                    label="Reģions"
                    onChange={(e) => handleLocalChange('region', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="">Jebkurš</MenuItem>
                    {regions.map((region) => (
                      <MenuItem key={region.id || region.name} value={region.name}>
                        {region.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sort-by-label">Kārtot pēc</InputLabel>
                  <Select
                    labelId="sort-by-label"
                    id="sort-by"
                    value={localParams.sortBy}
                    label="Kārtot pēc"
                    onChange={(e) => handleLocalChange('sortBy', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="price">Cenas</MenuItem>
                    <MenuItem value="year">Gada</MenuItem>
                    <MenuItem value="mileage">Nobraukuma</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sort-order-label">Kārtošanas secība</InputLabel>
                  <Select
                    labelId="sort-order-label"
                    id="sort-order"
                    value={localParams.sortOrder}
                    label="Kārtošanas secība"
                    onChange={(e) => handleLocalChange('sortOrder', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="asc">Augoša</MenuItem>
                    <MenuItem value="desc">Dilstoša</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>
      
      {/* Active filters */}
      <Box sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Aktīvie filtri:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {localParams.brand && (
            <Chip 
              label={`Marka: ${localParams.brand}`} 
              size="small" 
              onDelete={() => handleLocalChange('brand', '')}
              disabled={loading}
            />
          )}
          {localParams.model && (
            <Chip 
              label={`Modelis: ${localParams.model}`} 
              size="small" 
              onDelete={() => handleLocalChange('model', '')}
              disabled={loading}
            />
          )}
          {(localParams.yearFrom !== new Date().getFullYear() - 10 || localParams.yearTo !== new Date().getFullYear()) && (
            <Chip 
              label={`Gads: ${localParams.yearFrom}-${localParams.yearTo}`} 
              size="small" 
              onDelete={() => {
                handleLocalChange('yearFrom', new Date().getFullYear() - 10);
                handleLocalChange('yearTo', new Date().getFullYear());
              }}
              disabled={loading}
            />
          )}
          {(localParams.priceFrom !== 0 || localParams.priceTo !== 100000) && (
            <Chip 
              label={`Cena: ${formatCurrency(localParams.priceFrom)}-${formatCurrency(localParams.priceTo)}`} 
              size="small" 
              onDelete={() => {
                handleLocalChange('priceFrom', 0);
                handleLocalChange('priceTo', 100000);
              }}
              disabled={loading}
            />
          )}
          {localParams.fuelType && (
            <Chip 
              label={`Degviela: ${fuelTypes.find(t => t.value === localParams.fuelType)?.label || localParams.fuelType}`} 
              size="small" 
              onDelete={() => handleLocalChange('fuelType', '')}
              disabled={loading}
            />
          )}
          {localParams.transmission && (
            <Chip 
              label={`Ātrumkārba: ${transmissionTypes.find(t => t.value === localParams.transmission)?.label || localParams.transmission}`} 
              size="small" 
              onDelete={() => handleLocalChange('transmission', '')}
              disabled={loading}
            />
          )}
          {localParams.region && (
            <Chip 
              label={`Reģions: ${localParams.region}`} 
              size="small" 
              onDelete={() => handleLocalChange('region', '')}
              disabled={loading}
            />
          )}
        </Box>
      </Box>
      
      {/* Form actions*/}
      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<SearchIcon />}
          onClick={onSearch}
          disabled={loading || Object.keys(errors).length > 0}
          color="primary"
        >
          {loading ? "Meklē..." : "Meklēt"}
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          onClick={handleReset}
          disabled={loading}
        >
          Atiestatīt
        </Button>
      </Box>
    </Box>
  );
};

export default SearchForm;