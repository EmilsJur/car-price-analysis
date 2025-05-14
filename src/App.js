import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Import components
import Header from './components/Header';
import Footer from './components/Footer';
import SearchForm from './components/SearchForm';
import ResultsSection from './components/ResultsSection';
import PriceAnalysisChart from './components/PriceAnalysisChart';
import CarComparisonTable from './components/CarComparisonTable';
import RegionalPriceComparison from './components/RegionalPriceComparison';
// Import pages
import UserProfilePage from './components/UserProfilePage';
import NotificationsPage from './components/NotificationsPage';
import AuthenticationPage from './components/AuthenticationPage';

// Import services
import { 
  searchCars, 
  getSystemStatus, 
  getPriceDistributionChart, 
  getPriceTrendChart, 
  getPopularBrands,
  getPopularModels,
  getRegionStatistics
} from './services/apiService';

// Import MUI components
import { Box, Container, Grid, Paper, Typography, Tabs, Tab, Snackbar, Alert } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

// Main App component
function App() {
  // Current page state - we'll use this instead of Router for now
  const [currentPage, setCurrentPage] = useState('home');
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const user = localStorage.getItem('user');
    return !!user;
  });
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const userPrefs = localStorage.getItem('userProfile');
    if (userPrefs) {
      try {
        const { preferences } = JSON.parse(userPrefs);
        return preferences?.darkMode || false;
      } catch (e) {
        return false;
      }
    }
    return false;
  });
  
  // Create MUI theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#3498db',
      },
      secondary: {
        main: '#e74c3c',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });
  
  // Toggle dark mode
  const handleToggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Update user preferences in localStorage
    const userPrefs = localStorage.getItem('userProfile');
    if (userPrefs) {
      try {
        const userData = JSON.parse(userPrefs);
        userData.preferences.darkMode = newDarkMode;
        localStorage.setItem('userProfile', JSON.stringify(userData));
      } catch (e) {
        console.error('Error updating dark mode preference:', e);
      }
    }
  };
  
  // Handle user login
  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setCurrentPage('home');
  };
  
  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentPage('home');
  };
  
  // Handle navigation to protected pages
  const navigateTo = (page) => {
    if ((page === 'profile' || page === 'notifications') && !isAuthenticated) {
      setCurrentPage('login');
      setNotification({
        open: true,
        message: 'Lūdzu, pieslēdzieties, lai piekļūtu šai lapai',
        severity: 'warning'
      });
    } else {
      setCurrentPage(page);
    }
  };
  
  // Search and results state
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [regionStatistics, setRegionStatistics] = useState(null);
  const [regionStatsLoading, setRegionStatsLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('distribution');
  const [chartLoading, setChartLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [carsToCompare, setCarsToCompare] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Initial search parameters
  const [searchParams, setSearchParams] = useState({
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
  });
  
  // Fetch system status and brands on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch system status
        const status = await getSystemStatus();
        setSystemStatus(status);
        
        // Fetch brands
        const brandsResponse = await getPopularBrands(20);
        setBrands(brandsResponse.brands || []);
        
        // Load saved favorites from localStorage
        const savedFavorites = localStorage.getItem('carFavorites');
        if (savedFavorites) {
          try {
            setFavorites(JSON.parse(savedFavorites));
          } catch (err) {
            console.error('Failed to load favorites:', err);
          }
        }
        
        // Load saved comparison cars from localStorage
        const savedComparison = localStorage.getItem('carsToCompare');
        if (savedComparison) {
          try {
            setCarsToCompare(JSON.parse(savedComparison));
          } catch (err) {
            console.error('Failed to load comparison:', err);
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    
    fetchInitialData();
  }, []);
       
  // Fetch models when brand changes
  useEffect(() => {
    if (!searchParams.brand) {
      setModels([]);
      return;
    }
    
    const fetchModels = async () => {
      try {
        const response = await getPopularModels(searchParams.brand, 30);
        setModels(response.models || []);
      } catch (err) {
        console.error('Error fetching models:', err);
      }
    };
    
    fetchModels();
  }, [searchParams.brand]);
  
  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem('carFavorites', JSON.stringify(favorites));
  }, [favorites]);
  
  // Save comparison cars to localStorage when they change
  useEffect(() => {
    localStorage.setItem('carsToCompare', JSON.stringify(carsToCompare));
  }, [carsToCompare]);

  // Function to fetch region statistics
  const fetchRegionStatistics = async (brand = '', model = '') => {
    setRegionStatsLoading(true);
    try {
      const response = await getRegionStatistics(
        brand, 
        model,
        searchParams.yearFrom,
        searchParams.yearTo
      );
      
      console.log('Region statistics loaded:', response);
      setRegionStatistics(response);
    } catch (err) {
      console.error('Error fetching region statistics:', err);
      setNotification({
        open: true,
        message: 'Neizdevās ielādēt reģionu statistiku',
        severity: 'warning'
      });
    } finally {
      setRegionStatsLoading(false);
    }
  };

  // Function to handle search submission
  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await searchCars(searchParams);
      
      // Ensure listings have proper IDs
      const processedListings = (response.listings || []).map((car, index) => ({
        ...car,
        id: car.external_id || car.id || `car-${index}`,
        // Ensure price is a number
        price: typeof car.price === 'string' ? parseInt(car.price) : car.price
      }));
      
      setResults({
        ...response,
        listings: processedListings
      });
      
      // Show notification
      setNotification({
        open: true,
        message: `Atrasti ${processedListings.length} sludinājumi`,
        severity: processedListings.length > 0 ? 'success' : 'info'
      });
      
      // Fetch chart if brand is selected
      if (searchParams.brand) {
        handleFetchChart(chartType);
      }
      
      // Update region statistics based on search params
      if (searchParams.brand) {
        await fetchRegionStatistics(searchParams.brand, searchParams.model);
      }
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Neizdevās veikt meklēšanu. Lūdzu, mēģiniet vēlreiz.');
      
      setNotification({
        open: true,
        message: 'Neizdevās veikt meklēšanu',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle parameter change
  const handleParamChange = (param, value) => {
    setSearchParams(prev => ({
      ...prev,
      [param]: value
    }));
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // When switching to the Analysis tab, update region statistics with current search params
    if (newValue === 1 && searchParams.brand) {
      fetchRegionStatistics(searchParams.brand, searchParams.model);
      handleFetchChart(chartType);
    }
  };
  
  // Handle chart type change
  const handleChartTypeChange = (type) => {
    setChartType(type);
    handleFetchChart(type);
  };
  
  // Fetch chart
  const handleFetchChart = async (type) => {
    if (!searchParams.brand) return;
    
    setChartLoading(true);
    
    try {
      let response;
      
      if (type === 'distribution') {
        response = await getPriceDistributionChart(
          searchParams.brand,
          searchParams.model,
          searchParams.yearFrom,
          searchParams.yearTo
        );
      } else if (type === 'trend') {
        response = await getPriceTrendChart(
          searchParams.brand,
          searchParams.model,
          12 // Last 12 months
        );
      } else {
        // Other chart types can be implemented similarly
        response = { chart: null };
      }
      
      setChartData(response.chart);
      
    } catch (err) {
      console.error('Error fetching chart:', err);
      
      setNotification({
        open: true,
        message: 'Neizdevās ielādēt grafiku',
        severity: 'warning'
      });
    } finally {
      setChartLoading(false);
    }
  };
  
  // Toggle favorite car
  const handleToggleFavorite = (car) => {
    const isFavorite = favorites.some(fav => fav.id === car.id);
    
    let updatedFavorites;
    if (isFavorite) {
      updatedFavorites = favorites.filter(fav => fav.id !== car.id);
      setFavorites(updatedFavorites);
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} noņemts no izlases`,
        severity: 'info'
      });
    } else {
      // Ensure the car has all necessary fields
      const carForFavorite = {
        ...car,
        id: car.id || car.external_id || `car-${Date.now()}`,
        brand: car.brand || 'Nav norādīts',
        model: car.model || 'Nav norādīts',
        year: car.year || 'Nav norādīts',
        price: car.price || 0,
        mileage: car.mileage || 0
      };
      
      updatedFavorites = [...favorites, carForFavorite];
      setFavorites(updatedFavorites);
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} pievienots izlasei`,
        severity: 'success'
      });
    }
  };
  
  // Add car to comparison
  const handleAddToCompare = (car) => {
    const isAlreadyAdded = carsToCompare.some(c => c.id === car.id);
    
    if (isAlreadyAdded) {
      setCarsToCompare(prev => prev.filter(c => c.id !== car.id));
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} noņemts no salīdzinājuma`,
        severity: 'info'
      });
    } else {
      if (carsToCompare.length >= 3) {
        setNotification({
          open: true,
          message: 'Var salīdzināt ne vairāk kā 3 automašīnas',
          severity: 'warning'
        });
        return;
      }
      
      // Ensure the car has all required fields for comparison
      const carForComparison = {
        ...car,
        id: car.id || car.external_id || `car-${Date.now()}`,
        brand: car.brand || 'Nav norādīts',
        model: car.model || 'Nav norādīts',
        year: car.year || 'Nav norādīts',
        price: car.price || 0,
        engine: car.engine || `${car.engine_volume || ''}L ${car.engine_type || ''}`,
        transmission: car.transmission || 'Nav norādīts',
        mileage: car.mileage || 0,
        region: car.region || 'Nav norādīts'
      };
      
      setCarsToCompare(prev => [...prev, carForComparison]);
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} pievienots salīdzinājumam`,
        severity: 'success'
      });
      
      // Switch to comparison tab
      if (tabValue !== 2) {
        setTabValue(2);
      }
    }
  };
  
  // Remove car from comparison
  const handleRemoveFromCompare = (car) => {
    setCarsToCompare(prev => prev.filter(c => c.id !== car.id));
    
    setNotification({
      open: true,
      message: `${car.brand} ${car.model} noņemts no salīdzinājuma`,
      severity: 'info'
    });
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Handle chart download
  const handleChartDownload = () => {
    if (!chartData) return;
    
    try {
      // Convert base64 to blob
      const byteString = atob(chartData);
      const mimeString = 'image/png';
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${searchParams.brand}_${searchParams.model || ''}_${chartType}_chart.png`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      setNotification({
        open: true,
        message: 'Grafiks lejupielādēts',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error downloading chart:', err);
      
      setNotification({
        open: true,
        message: 'Neizdevās lejupielādēt grafiku',
        severity: 'error'
      });
    }
  };

  // Handle region click on map
  const handleRegionClick = (regionId) => {
    // Toggle region selection
    setSelectedRegion(prevRegion => prevRegion === regionId ? null : regionId);
    
    // Update search params if region is selected
    if (regionId && regionId !== selectedRegion) {
      // Find real name for the region - uppercase first letter
      const regionName = regionId.charAt(0).toUpperCase() + regionId.slice(1);
      handleParamChange('region', regionName);
      
      setNotification({
        open: true,
        message: `Atlasīti sludinājumi no reģiona: ${regionName}`,
        severity: 'info'
      });
    } else if (selectedRegion) {
      // Clear region filter if deselecting
      handleParamChange('region', '');
    }
  };

  // Main dashboard content
  const renderDashboardContent = () => {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Auto Tirgus Analīzes Sistēma
        </Typography>
        
        <Typography variant="body1" paragraph color="text.secondary">
          Pētiet automašīnu cenas, tendences un veiciet salīdzinājumus, izmantojot aktuālus tirgus datus
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<TuneIcon />} label="Meklēšana" id="tab-0" />
            <Tab icon={<QueryStatsIcon />} label="Analīze" id="tab-1" />
            <Tab 
              icon={<CompareArrowsIcon />} 
              label={`Salīdzinājums ${carsToCompare.length > 0 ? `(${carsToCompare.length})` : ''}`} 
              id="tab-2" 
            />
          </Tabs>
        </Box>
        
        {/* Search Tab */}
        <Box role="tabpanel" hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <Grid container spacing={3}>
              {/* Search Form */}
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <SearchForm 
                    params={searchParams}
                    onParamChange={handleParamChange}
                    onSearch={handleSearch}
                    loading={isLoading}
                    brands={brands}
                    models={models}
                  />
                </Paper>
              </Grid>
              
              {/* Search Results */}
              <Grid item xs={12} md={8}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                <ResultsSection 
                  cars={results?.listings || []} 
                  loading={isLoading}
                  compareMode={false}
                  onSelectCar={handleAddToCompare}
                  onToggleFavorite={handleToggleFavorite}
                  favorites={favorites}
                />
              </Grid>
            </Grid>
          )}
        </Box>
        
        {/* Analysis Tab */}
        <Box role="tabpanel" hidden={tabValue !== 1}>
          {tabValue === 1 && (
            <Grid container spacing={3}>
              {results?.statistics && (
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Cenu statistika
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(25, 118, 210, 0.08)' }}>
                          <Typography variant="body2" color="text.secondary">Vidējā cena</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            €{results.statistics.average_price?.toLocaleString() || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
                          <Typography variant="body2" color="text.secondary">Mediānas cena</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            €{results.statistics.median_price?.toLocaleString() || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(0, 200, 83, 0.08)' }}>
                          <Typography variant="body2" color="text.secondary">Zemākā cena</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                            €{results.statistics.min_price?.toLocaleString() || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(211, 47, 47, 0.08)' }}>
                          <Typography variant="body2" color="text.secondary">Augstākā cena</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                            €{results.statistics.max_price?.toLocaleString() || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <RegionalPriceComparison 
              regionData={regionStatistics?.regions || []} 
              loading={regionStatsLoading}
              selectedRegion={selectedRegion}
              brandName={searchParams.brand}
              modelName={searchParams.model}
            />
              </Grid>
              
              <Grid item xs={12}>
                <PriceAnalysisChart 
                  brandName={searchParams.brand}
                  modelName={searchParams.model}
                  chartData={chartData}
                  chartType={chartType}
                  loading={chartLoading}
                  onChartTypeChange={handleChartTypeChange}
                  onRefresh={() => handleFetchChart(chartType)}
                  onDownload={handleChartDownload}
                />
              </Grid>
            </Grid>
          )}
        </Box>
        
        {/* Comparison Tab */}
        <Box role="tabpanel" hidden={tabValue !== 2}>
          {tabValue === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <CarComparisonTable 
                  cars={carsToCompare}
                  onRemoveCar={handleRemoveFromCompare}
                  onExportComparison={() => {}}
                />
              </Grid>
              
              {carsToCompare.length < 3 && (
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 2 }}>
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body1" gutterBottom>
                        {carsToCompare.length === 0 
                          ? 'Nav izvēlēta neviena automašīna salīdzināšanai' 
                          : `Varat pievienot vēl ${3 - carsToCompare.length} automašīnas salīdzināšanai`}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      </>
    );
  };

  // Render page based on current page state
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return renderDashboardContent();
      case 'profile':
        return (
          <UserProfilePage 
            darkMode={darkMode} 
            onToggleTheme={handleToggleTheme} 
            navigateTo={navigateTo}
            showHeader={false}
            showFooter={false}
          />
        );
      case 'notifications':
        return (
          <NotificationsPage
            darkMode={darkMode}
            onToggleTheme={handleToggleTheme}
            navigateTo={navigateTo}
            showHeader={false}
            showFooter={false}
          />
        );
      case 'login':
        return (
          <AuthenticationPage
            onLogin={handleLogin}
            authMode="login"
            navigateTo={navigateTo}
            showHeader={false}
            showFooter={false}
          />
        );
      case 'register':
        return (
          <AuthenticationPage
            onLogin={handleLogin}
            authMode="register"
            navigateTo={navigateTo}
            showHeader={false}
            showFooter={false}
          />
        );
      default:
        return renderDashboardContent();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app">
        <Header 
          systemStatus={systemStatus} 
          darkMode={darkMode} 
          onToggleTheme={handleToggleTheme}
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          navigateTo={navigateTo}
          currentPage={currentPage}
        />
        
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          {renderCurrentPage()}
        </Container>
        
        {/* Notification */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
        
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;