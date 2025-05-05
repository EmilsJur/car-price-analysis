import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Slider, 
  Chip,
  CircularProgress, 
  Stack, 
  Card, 
  CardContent, 
  Tabs, 
  Tab, 
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar, 
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InfoIcon from '@mui/icons-material/Info';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CloseIcon from '@mui/icons-material/Close';
import Header from './Header';
import Footer from './Footer';
import SearchForm from './SearchForm';
import ResultsSection from './ResultsSection';
import PriceChart from './PriceChart';
import axios from 'axios';

function CarPriceAnalysisDashboard() {
  // State for car data and search parameters
  const [carData, setCarData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [chartData, setChartData] = useState(null);
  
  // Search parameters state
  const [searchParams, setSearchParams] = useState({
    brand: '',
    model: '',
    yearFrom: 2010,
    yearTo: new Date().getFullYear(),
    priceFrom: 0,
    priceTo: 100000,
    fuelType: '',
    transmission: ''
  });
  
  // UI state
  const [tabValue, setTabValue] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCars, setSelectedCars] = useState([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get('/api/popular/brands');
        setBrands(response.data.brands || []);
      } catch (error) {
        console.error('Error fetching brands:', error);
        setNotification({
          open: true,
          message: 'Error fetching brands: ' + (error.message || 'Unknown error'),
          severity: 'error'
        });
      }
    };

    fetchBrands();
  }, []);

  // Fetch models when brand changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!searchParams.brand) {
        setModels([]);
        return;
      }

      try {
        const response = await axios.get(`/api/popular/models?brand=${searchParams.brand}`);
        setModels(response.data.models || []);
      } catch (error) {
        console.error('Error fetching models:', error);
        setNotification({
          open: true,
          message: 'Error fetching models: ' + (error.message || 'Unknown error'),
          severity: 'error'
        });
      }
    };

    fetchModels();
  }, [searchParams.brand]);

  // Handle search function
  const handleSearch = async () => {
    setLoading(true);
    try {
      // Search for car listings
      const searchResponse = await axios.post('/api/search', searchParams);
      
      // Add a unique ID to each car for comparison feature
      const carsWithIds = (searchResponse.data.listings || []).map((car, index) => ({
        ...car,
        id: car.external_id || `car-${index}`
      }));
      
      setCarData(carsWithIds);
      setStatistics(searchResponse.data.statistics || null);

      // Reset selected cars when new search is performed
      setSelectedCars([]);

      // Get price distribution chart if brand is selected
      if (searchParams.brand) {
        try {
          const chartResponse = await axios.get(
            `/api/charts/price-distribution?brand=${searchParams.brand}&model=${searchParams.model || ''}&yearFrom=${searchParams.yearFrom}&yearTo=${searchParams.yearTo}`
          );
          setChartData(chartResponse.data.chart);
        } catch (chartError) {
          console.error('Error fetching chart data:', chartError);
          setChartData(null);
          setNotification({
            open: true,
            message: 'Error fetching chart data',
            severity: 'warning'
          });
        }
      }
      
      // Show success notification
      setNotification({
        open: true,
        message: `Found ${carsWithIds.length} cars matching your criteria`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error searching cars:', error);
      setNotification({
        open: true,
        message: 'Error searching cars: ' + (error.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle parameter change
  const handleParamChange = (param, value) => {
    setSearchParams({
      ...searchParams,
      [param]: value
    });
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Toggle compare mode
  const toggleCompareMode = () => {
    setCompareMode(prev => !prev);
    if (compareMode) {
      setSelectedCars([]);
    } else {
      setNotification({
        open: true,
        message: 'Compare mode enabled: Select up to 3 cars to compare',
        severity: 'info'
      });
    }
  };
  
  // Handle selecting cars for comparison
  const handleSelectCar = (car) => {
    if (!compareMode) return;
    
    const isSelected = selectedCars.some(selected => selected.id === car.id);
    
    if (isSelected) {
      setSelectedCars(prev => prev.filter(selected => selected.id !== car.id));
    } else {
      if (selectedCars.length < 3) {
        setSelectedCars(prev => [...prev, car]);
      } else {
        setNotification({
          open: true,
          message: 'You can compare up to 3 cars at a time',
          severity: 'warning'
        });
      }
    }
  };
  
  // Handle exporting statistics
  const handleExportStatistics = () => {
    if (!statistics) return;
    
    try {
      const jsonStr = JSON.stringify(statistics, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `car_price_statistics_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      setNotification({
        open: true,
        message: 'Statistics exported successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error exporting statistics:', error);
      setNotification({
        open: true,
        message: 'Error exporting statistics',
        severity: 'error'
      });
    }
  };
  
  // Handle exporting comparison data
  const handleExportComparison = () => {
    if (!selectedCars.length) return;
    
    try {
      const comparisonData = selectedCars.map(car => ({
        brand: car.brand,
        model: car.model,
        year: car.year,
        price: car.price,
        engine: car.engine || `${car.engine_volume}L ${car.engine_type}`,
        transmission: car.transmission,
        mileage: car.mileage,
        region: car.region
      }));
      
      const jsonStr = JSON.stringify(comparisonData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `car_comparison_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      setCompareDialogOpen(false);
      setNotification({
        open: true,
        message: 'Comparison exported successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error exporting comparison:', error);
      setNotification({
        open: true,
        message: 'Error exporting comparison',
        severity: 'error'
      });
    }
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  // Render price statistics
  const renderPriceStatistics = () => {
    if (!statistics) return null;
    
    return (
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="div" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} color="primary" />
            Market Price Statistics
            <Tooltip title="Based on all listings matching your search criteria">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(25, 118, 210, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Average Price</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                  €{statistics.average_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Median Price</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'success.main' }}>
                  €{statistics.median_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(0, 200, 83, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Lowest Price</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'success.dark' }}>
                  €{statistics.min_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(211, 47, 47, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Highest Price</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'error.main' }}>
                  €{statistics.max_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1}>
              <Chip 
                label={`${statistics.count || 0} listings`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                label={`Price Range: €${statistics.min_price?.toLocaleString() || 0} - €${statistics.max_price?.toLocaleString() || 0}`} 
                size="small" 
                color="secondary" 
                variant="outlined"
              />
            </Stack>
            
            <Button 
              size="small" 
              startIcon={<DownloadIcon />}
              onClick={handleExportStatistics}
            >
              Export
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Render results tabs
  const renderResultsTabs = () => (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="results view tabs">
        <Tab label="Table View" />
        <Tab label="Card View" />
        <Tab label="Price Chart" />
      </Tabs>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1">
          {carData && carData.length > 0 
            ? `Showing ${carData.length} car listings` 
            : 'No results to display'}
        </Typography>
        
        {carData && carData.length > 0 && (
          <Button
            variant={compareMode ? "contained" : "outlined"}
            color={compareMode ? "primary" : "inherit"}
            startIcon={<CompareArrowsIcon />}
            onClick={toggleCompareMode}
            size="small"
            disabled={carData.length < 2}
          >
            {compareMode ? "Exit Compare Mode" : "Compare Cars"}
          </Button>
        )}
        
        {compareMode && selectedCars.length >= 2 && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setCompareDialogOpen(true)}
            size="small"
            sx={{ ml: 1 }}
          >
            Compare Selected ({selectedCars.length})
          </Button>
        )}
      </Box>
    </Box>
  );
  
  // Render card view
  const renderCardView = () => {
    if (!carData || carData.length === 0) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No cars found matching your search criteria.
          </Typography>
        </Box>
      );
    }
    
    return (
      <Grid container spacing={2}>
        {carData.map((car, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: compareMode && selectedCars.some(selected => selected.id === car.id) 
                  ? '2px solid #1976d2' 
                  : 'none',
                cursor: compareMode ? 'pointer' : 'default',
              }}
              onClick={() => handleSelectCar(car)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {car.brand} {car.model}
                  </Typography>
                  <Chip 
                    label={`€${car.price?.toLocaleString()}`}
                    color="primary"
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Year: <Typography component="span" variant="body2" fontWeight="medium">{car.year}</Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Engine: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.engine || `${car.engine_volume}L ${car.engine_type}`}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Transmission: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.transmission}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mileage: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.mileage ? `${car.mileage.toLocaleString()} km` : 'N/A'}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Region: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.region}
                    </Typography>
                  </Typography>
                </Box>
              </CardContent>
              
              <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                {car.listing_url && (
                  <Button
                    size="small"
                    href={car.listing_url}
                    target="_blank"
                    rel="noopener"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Listing
                  </Button>
                )}
                
                {compareMode && (
                  <Button
                    size="small"
                    color={selectedCars.some(selected => selected.id === car.id) ? "primary" : "inherit"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCar(car);
                    }}
                  >
                    {selectedCars.some(selected => selected.id === car.id) ? "Selected" : "Select"}
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  // Render comparison dialog
  const renderCompareDialog = () => (
    <Dialog 
      open={compareDialogOpen} 
      onClose={() => setCompareDialogOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        Car Comparison
        <IconButton
          aria-label="close"
          onClick={() => setCompareDialogOpen(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {selectedCars.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Feature</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      {car.brand} {car.model} ({car.year})
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Price</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      <Typography fontWeight="bold">
                        €{car.price?.toLocaleString() || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Year</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>{car.year || 'N/A'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Engine</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      {car.engine || `${car.engine_volume}L ${car.engine_type}` || 'N/A'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Transmission</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>{car.transmission || 'N/A'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Mileage</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      {car.mileage ? `${car.mileage.toLocaleString()} km` : 'N/A'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Region</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>{car.region || 'N/A'}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No cars selected for comparison.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
        {selectedCars.length > 0 && (
          <Button 
            variant="contained" 
            onClick={handleExportComparison}
            startIcon={<DownloadIcon />}
          >
            Export Comparison
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
  
  // Render notification
  const renderNotification = () => (
    <Snackbar 
      open={notification.open} 
      autoHideDuration={6000} 
      onClose={handleCloseNotification}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={handleCloseNotification} severity={notification.severity} variant="filled">
        {notification.message}
      </Alert>
    </Snackbar>
  );

  // Main render
  return (
    <div className="dashboard-container">
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Car Price Analysis Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Search, analyze, and track car prices across different marketplaces
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Search Form */}
          <Grid item xs={12} md={3}>
            <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 20 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FilterAltIcon sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Search Filters
                </Typography>
              </Box>
              <SearchForm 
                brands={brands}
                models={models}
                params={searchParams}
                onParamChange={handleParamChange}
                onSearch={handleSearch}
                loading={loading}
              />
            </Paper>
          </Grid>

          {/* Results Section */}
          <Grid item xs={12} md={9}>
            {/* Statistics */}
            {renderPriceStatistics()}
            
            {/* Results */}
            <Paper elevation={3} sx={{ p: 2 }}>
              {renderResultsTabs()}
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {tabValue === 0 && (
                    <ResultsSection 
                      cars={carData} 
                      compareMode={compareMode}
                      selectedCars={selectedCars}
                      onSelectCar={handleSelectCar}
                    />
                  )}
                  
                  {tabValue === 1 && renderCardView()}
                  
                  {tabValue === 2 && (
                    <Box sx={{ height: 400 }}>
                      <PriceChart chartData={chartData} />
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
      
      <Footer />
      
      {/* Comparison Dialog */}
      {renderCompareDialog()}
      
      {/* Notifications */}
      {renderNotification()}
    </div>
  );
}

export default CarPriceAnalysisDashboard;