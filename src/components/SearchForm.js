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
  IconButton,
  Paper,
  Collapse,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const SearchForm = ({ 
  brands = [], 
  models = [], 
  params = {}, 
  onParamChange, 
  onSearch, 
  loading = false,
  savedSearches = [],
  onSaveSearch = () => {}
}) => {
  const theme = useTheme();

  // Local state for form values with validation
  const [localParams, setLocalParams] = useState(params);
  const [advanced, setAdvanced] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchName, setSearchName] = useState('');
  const [showSavedSearches, setShowSavedSearches] = useState(false);

  // Sync local params with parent state
  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  // Validate price range
  useEffect(() => {
    const newErrors = {};
    
    if (localParams.priceFrom > localParams.priceTo) {
      newErrors.price = 'Minimum price cannot exceed maximum price';
    }
    
    if (localParams.yearFrom > localParams.yearTo) {
      newErrors.year = 'Minimum year cannot exceed maximum year';
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

  // Save current search
  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      alert('Please enter a name for this search');
      return;
    }
    
    onSaveSearch({
      name: searchName,
      params: { ...localParams },
      date: new Date().toISOString()
    });
    
    setSearchName('');
  };

  // Apply saved search
  const handleApplySavedSearch = (savedSearch) => {
    // Update parent state for each param
    Object.entries(savedSearch.params).forEach(([key, value]) => {
      onParamChange(key, value);
    });
    
    setShowSavedSearches(false);
  };

  // Active filters count for chip display
  const activeFiltersCount = Object.entries(localParams).filter(([key, value]) => {
    if (key === 'yearFrom' && value !== new Date().getFullYear() - 10) return true;
    if (key === 'yearTo' && value !== new Date().getFullYear()) return true;
    if (key === 'priceFrom' && value !== 0) return true;
    if (key === 'priceTo' && value !== 100000) return true;
    if (key === 'sortBy' || key === 'sortOrder') return false;
    return value !== '';
  }).length;

  // Format currencies
  const formatCurrency = (value) => `€${value.toLocaleString()}`;

  // Fuel type options
  const fuelTypes = [
    { value: 'Petrol', label: 'Petrol' },
    { value: 'Diesel', label: 'Diesel' },
    { value: 'Hybrid', label: 'Hybrid' },
    { value: 'Electric', label: 'Electric' },
    { value: 'Gas', label: 'Gas/LPG' }
  ];

  // Transmission options
  const transmissionTypes = [
    { value: 'Manual', label: 'Manual' },
    { value: 'Automatic', label: 'Automatic' },
    { value: 'Semi-Automatic', label: 'Semi-Automatic' }
  ];

  // Region options (example - replace with actual data)
  const regions = [
    { value: 'Riga', label: 'Riga' },
    { value: 'Kurzeme', label: 'Kurzeme' },
    { value: 'Vidzeme', label: 'Vidzeme' },
    { value: 'Latgale', label: 'Latgale' },
    { value: 'Zemgale', label: 'Zemgale' }
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
              label="Brand" 
              variant="outlined"
              placeholder="Any brand"
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
              label="Model" 
              variant="outlined"
              placeholder="Any model"
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
            Year Range {localParams.yearFrom} - {localParams.yearTo}
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
              label="From"
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
              label="To"
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
            Price Range {formatCurrency(localParams.priceFrom)} - {formatCurrency(localParams.priceTo)}
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
              label="From"
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
              label="To"
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
          {advanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
        </Button>
        
        <Collapse in={advanced}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="fuel-type-label">Fuel Type</InputLabel>
                  <Select
                    labelId="fuel-type-label"
                    id="fuel-type"
                    value={localParams.fuelType}
                    label="Fuel Type"
                    onChange={(e) => handleLocalChange('fuelType', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="">Any</MenuItem>
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
                  <InputLabel id="transmission-label">Transmission</InputLabel>
                  <Select
                    labelId="transmission-label"
                    id="transmission"
                    value={localParams.transmission}
                    label="Transmission"
                    onChange={(e) => handleLocalChange('transmission', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="">Any</MenuItem>
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
                  <InputLabel id="region-label">Region</InputLabel>
                  <Select
                    labelId="region-label"
                    id="region"
                    value={localParams.region}
                    label="Region"
                    onChange={(e) => handleLocalChange('region', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="">Any</MenuItem>
                    {regions.map((region) => (
                      <MenuItem key={region.value} value={region.value}>
                        {region.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sort-by-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-by-label"
                    id="sort-by"
                    value={localParams.sortBy}
                    label="Sort By"
                    onChange={(e) => handleLocalChange('sortBy', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="price">Price</MenuItem>
                    <MenuItem value="year">Year</MenuItem>
                    <MenuItem value="mileage">Mileage</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sort-order-label">Sort Order</InputLabel>
                  <Select
                    labelId="sort-order-label"
                    id="sort-order"
                    value={localParams.sortOrder}
                    label="Sort Order"
                    onChange={(e) => handleLocalChange('sortOrder', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>
      
      {/* Active filters */}
      {activeFiltersCount > 0 && (
        <Box sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Active Filters:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {localParams.brand && (
              <Chip 
                label={`Brand: ${localParams.brand}`} 
                size="small" 
                onDelete={() => handleLocalChange('brand', '')}
                disabled={loading}
              />
            )}
            {localParams.model && (
              <Chip 
                label={`Model: ${localParams.model}`} 
                size="small" 
                onDelete={() => handleLocalChange('model', '')}
                disabled={loading}
              />
            )}
            {(localParams.yearFrom !== new Date().getFullYear() - 10 || localParams.yearTo !== new Date().getFullYear()) && (
              <Chip 
                label={`Year: ${localParams.yearFrom}-${localParams.yearTo}`} 
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
                label={`Price: ${formatCurrency(localParams.priceFrom)}-${formatCurrency(localParams.priceTo)}`} 
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
                label={`Fuel: ${localParams.fuelType}`} 
                size="small" 
                onDelete={() => handleLocalChange('fuelType', '')}
                disabled={loading}
              />
            )}
            {localParams.transmission && (
              <Chip 
                label={`Transmission: ${localParams.transmission}`} 
                size="small" 
                onDelete={() => handleLocalChange('transmission', '')}
                disabled={loading}
              />
            )}
            {localParams.region && (
              <Chip 
                label={`Region: ${localParams.region}`} 
                size="small" 
                onDelete={() => handleLocalChange('region', '')}
                disabled={loading}
              />
            )}
          </Box>
        </Box>
      )}
      
      {/* Saved searches section */}
      {savedSearches.length > 0 && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Button
            variant="text"
            fullWidth
            onClick={() => setShowSavedSearches(!showSavedSearches)}
            startIcon={showSavedSearches ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            disabled={loading}
          >
            {showSavedSearches ? "Hide Saved Searches" : "Show Saved Searches"}
          </Button>
          
          <Collapse in={showSavedSearches}>
            <Paper variant="outlined" sx={{ mt: 1, p: 1 }}>
              {savedSearches.map((search, index) => (
                <Box key={index} sx={{ mb: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {search.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(search.date).toLocaleDateString()}
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    sx={{ mt: 1 }}
                    onClick={() => handleApplySavedSearch(search)}
                    disabled={loading}
                  >
                    Apply
                  </Button>
                </Box>
              ))}
            </Paper>
          </Collapse>
        </Box>
      )}
      
      {/* Form actions */}
      <Box sx={{ mt: 3, display: 'flex', gap: 1, flexDirection: 'column' }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<SearchIcon />}
          onClick={onSearch}
          disabled={loading || Object.keys(errors).length > 0}
          color="primary"
        >
          {loading ? "Searching..." : "Search"}
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </Button>
          
          <Button
            variant="outlined"
            fullWidth
            startIcon={<SaveIcon />}
            onClick={() => document.getElementById('search-name-input')?.focus()}
            disabled={loading}
          >
            Save
          </Button>
        </Box>
      </Box>
      
      {/* Save search form */}
      <Box sx={{ mt: 2 }}>
        <TextField
          id="search-name-input"
          label="Search Name"
          size="small"
          fullWidth
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          disabled={loading}
          placeholder="Enter name to save this search"
          InputProps={{
            endAdornment: (
              <IconButton 
                edge="end"
                onClick={handleSaveSearch}
                disabled={!searchName.trim() || loading}
                size="small"
              >
                <SaveIcon />
              </IconButton>
            )
          }}
        />
      </Box>
    </Box>
  );
};

export default SearchForm;