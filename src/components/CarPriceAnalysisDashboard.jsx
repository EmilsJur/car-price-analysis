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
import CarDetailsDialog from './CarDetailsDialog';

function CarPriceAnalysisDashboard() {
  // Pamatdati par automašīnām un meklēšanas parametriem
  const [carData, setCarData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [carDetailsOpen, setCarDetailsOpen] = useState(false);
  const [selectedCarDetails, setSelectedCarDetails] = useState(null);
  const [favorites, setFavorites] = useState([]);
  
  // Search stuff - meklēšanas parametri
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
  
  // UI state - dažādi UI mainīgie
  const [tabValue, setTabValue] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCars, setSelectedCars] = useState([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Iegūstam markas when component loads
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get('/api/popular/brands');
        setBrands(response.data.brands || []);
      } catch (error) {
        console.error('Error getting brands:', error);
        setNotification({
          open: true,
          message: 'Kļūda ielādējot markas: ' + (error.message || 'Nezināma kļūda'),
          severity: 'error'
        });
      }
    };

    fetchBrands();
  }, []);

  // Kad marka mainās, iegūstam modeļus
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
        console.error('Models loading failed:', error);
        setNotification({
          open: true,
          message: 'Neizdevās ielādēt modeļus: ' + (error.message || 'Nezināma kļūda'),
          severity: 'error'
        });
      }
    };

    fetchModels();
  }, [searchParams.brand]);

  // Meklēšanas funkcija - the main search logic
  const handleSearch = async () => {
    setLoading(true);
    try {
      // Meklējam automašīnas
      const searchResponse = await axios.post('/api/search', searchParams);
      
      // Pievienojam unique ID katrai mašīnai comparison feature jauns
      const carsWithIds = (searchResponse.data.listings || []).map((car, index) => ({
        ...car,
        id: car.external_id || `car-${index}`
      }));
      
      setCarData(carsWithIds);
      setStatistics(searchResponse.data.statistics || null);

      // Notiram selected cars kad jauna meklēšana
      setSelectedCars([]);

      // Iegūstam price distribution chart ja ir brand
      if (searchParams.brand) {
        try {
          const chartResponse = await axios.get(
            `/api/charts/price-distribution?brand=${searchParams.brand}&model=${searchParams.model || ''}&yearFrom=${searchParams.yearFrom}&yearTo=${searchParams.yearTo}`
          );
          setChartData(chartResponse.data.chart);
        } catch (chartError) {
          console.error('Chart loading error:', chartError);
          setChartData(null);
          setNotification({
            open: true,
            message: 'Grafika ielāde neizdevās',
            severity: 'warning'
          });
        }
      }
      
      // Success notification
      setNotification({
        open: true,
        message: `Atrasti ${carsWithIds.length} auto atbilstoši kritērijiem`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Search error:', error);
      setNotification({
        open: true,
        message: 'Meklēšana neizdevās: ' + (error.message || 'Nezināma kļūda'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle parametru maiņu
  const handleParamChange = (param, value) => {
    setSearchParams({
      ...searchParams,
      [param]: value
    });
  };

  // Toggle favorite automašīna
  const handleToggleFavorite = (car) => {
    const isFavorite = favorites.some(fav => fav.id === car.id);
    
    if (isFavorite) {
      // Noņemam no favorites
      setFavorites(prev => prev.filter(fav => fav.id !== car.id));
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} noņemts no favorītiem`,
        severity: 'info'
      });
    } else {
      // Pievienojam to favorites
      setFavorites(prev => [...prev, car]);
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} pievienots favorītiem`,
        severity: 'success'
      });
    }
  };

  const handleOpenCarDetails = (car) => {
    setSelectedCarDetails(car);
    setCarDetailsOpen(true);
  };

  const handleCloseCarDetails = () => {
    setCarDetailsOpen(false);
  };
  
  // Tab nomaiņa
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
        message: 'Compare mode ieslēgts: Izvēlies līdz 3 auto salīdzināšanai',
        severity: 'info'
      });
    }
  };
  
  // Handle car selection priekš comparison
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
          message: 'Var salīdzināt maksimum 3 auto vienlaikus',
          severity: 'warning'
        });
      }
    }
  };
  
  // Export statistiku
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
      
      // Cleanup after download
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      setNotification({
        open: true,
        message: 'Statistika eksportēta veiksmīgi',
        severity: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      setNotification({
        open: true,
        message: 'Eksportēšana neizdevās',
        severity: 'error'
      });
    }
  };
  
  // Export comparison dati
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
        message: 'Salīdzinājums eksportēts veiksmīgi',
        severity: 'success'
      });
    } catch (error) {
      console.error('Comparison export error:', error);
      setNotification({
        open: true,
        message: 'Salīdzinājuma eksportēšana neizdevās',
        severity: 'error'
      });
    }
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  // Price statistics rendering
  const renderPriceStatistics = () => {
    if (!statistics) return null;
    
    return (
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="div" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} color="primary" />
            Tirgus cenu statistika
            <Tooltip title="Balstīts uz visiem sludinājumiem kas atbilst jūsu meklēšanas kritērijiem">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(25, 118, 210, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Vidējā cena</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                  €{statistics.average_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Mediāna cena</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'success.main' }}>
                  €{statistics.median_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(0, 200, 83, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Zemākā cena</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'success.dark' }}>
                  €{statistics.min_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(211, 47, 47, 0.08)' }}>
                <Typography variant="body2" color="text.secondary">Augstākā cena</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'error.main' }}>
                  €{statistics.max_price?.toLocaleString() || 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1}>
              <Chip 
                label={`${statistics.count || 0} sludinājumi`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                label={`Cenu diapazons: €${statistics.min_price?.toLocaleString() || 0} - €${statistics.max_price?.toLocaleString() || 0}`} 
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
              Eksportēt
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Results tabs renderēšana
  const renderResultsTabs = () => (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="rezultātu skatīšanas tabi">
        <Tab label="Tabulas skats" />
        <Tab label="Kartīšu skats" />
        <Tab label="Cenu grafiks" />
      </Tabs>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1">
          {carData && carData.length > 0 
            ? `Rāda ${carData.length} auto sludinājumus` 
            : 'Nav rezultātu ko rādīt'}
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
            {compareMode ? "Iziet no salīdzināšanas" : "Salīdzināt auto"}
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
            Salīdzināt izvēlētos ({selectedCars.length})
          </Button>
        )}
      </Box>
    </Box>
  );
  
  // Card view renderēšana
  const renderCardView = () => {
    if (!carData || carData.length === 0) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nav atrasti auto kas atbilst jūsu meklēšanas kritērijiem.
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
                    Gads: <Typography component="span" variant="body2" fontWeight="medium">{car.year}</Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dzinējs: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.engine || `${car.engine_volume}L ${car.engine_type}`}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ātrumkārba: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.transmission}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Nobraukums: <Typography component="span" variant="body2" fontWeight="medium">
                      {car.mileage ? `${car.mileage.toLocaleString()} km` : 'Nav norādīts'}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reģions: <Typography component="span" variant="body2" fontWeight="medium">
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
                    Skatīt sludinājumu
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
                    {selectedCars.some(selected => selected.id === car.id) ? "Izvēlēts" : "Izvēlēties"}
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  // Comparison dialog renderēšana
  const renderCompareDialog = () => (
    <Dialog 
      open={compareDialogOpen} 
      onClose={() => setCompareDialogOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        Auto salīdzinājums
        <IconButton
          aria-label="aizvērt"
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
                  <TableCell>Īpašība</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      {car.brand} {car.model} ({car.year})
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Cena</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      <Typography fontWeight="bold">
                        €{car.price?.toLocaleString() || 'Nav norādīts'}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Gads</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>{car.year || 'Nav norādīts'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Dzinējs</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      {car.engine || `${car.engine_volume}L ${car.engine_type}` || 'Nav norādīts'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Ātrumkārba</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>{car.transmission || 'Nav norādīts'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Nobraukums</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>
                      {car.mileage ? `${car.mileage.toLocaleString()} km` : 'Nav norādīts'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Reģions</TableCell>
                  {selectedCars.map((car, index) => (
                    <TableCell key={index}>{car.region || 'Nav norādīts'}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Nav izvēlēti auto salīdzināšanai.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCompareDialogOpen(false)}>Aizvērt</Button>
        {selectedCars.length > 0 && (
          <Button 
            variant="contained" 
            onClick={handleExportComparison}
            startIcon={<DownloadIcon />}
          >
            Eksportēt salīdzinājumu
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
  
  // Notification renderēšana
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

  // Main render - galvenā renderēšana
  return (
    <div className="dashboard-container">
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Auto cenu analīzes dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Meklē, analizē un izseko auto cenas dažādos marketplace
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Search Form */}
          <Grid item xs={12} md={3}>
            <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 20 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FilterAltIcon sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Meklēšanas filtri
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
            {/* Statistika */}
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
                      onOpenCarDetails={handleOpenCarDetails}
                      onToggleFavorite={handleToggleFavorite}
                      favorites={favorites}
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
          <CarDetailsDialog
          open={carDetailsOpen}
          car={selectedCarDetails}
          onClose={handleCloseCarDetails}
          onAddToCompare={handleSelectCar}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={selectedCarDetails ? favorites.some(fav => fav.id === selectedCarDetails.id) : false}
        />
      </Container>
      
      <Footer />
      
      {/* Comparison Dlog */}
      {renderCompareDialog()}
      
      {/* Notifications */}
      {renderNotification()}
    </div>
  );
}

export default CarPriceAnalysisDashboard;