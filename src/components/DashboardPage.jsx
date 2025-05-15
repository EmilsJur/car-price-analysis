import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SearchForm from '../components/SearchForm';
import PriceAnalysisChart from '../components/PriceAnalysisChart';
import CarEstimationForm from '../components/CarEstimationForm';
import MarketInsights from '../components/MarketInsights';
import RegionalPriceComparison from '../components/RegionalPriceComparison';
import SimilarListings from '../components/SimilarListings';
import CarComparisonTable from '../components/CarComparisonTable';
import PriceByFuelTypeChart from '../components/PriceByFuelTypeChart';
import PriceYearTrendChart from '../components/PriceYearTrendChart';
import ReportIcon from '@mui/icons-material/Report';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import TuneIcon from '@mui/icons-material/Tune';

// Import API
import { 
  searchCars, 
  estimateCarValue, 
  getPriceDistributionChart,
  getPriceTrendChart,
  getPopularBrands,
  getPopularModels,
  getRegionStatistics
} from '../services/apiService';

const DashboardPage = () => {
  const theme = useTheme();
  
  // Stāvoklis cilnēm
  const [tabValue, setTabValue] = useState(0);
  
  // Stāvoklis API datiem
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [estimationResult, setEstimationResult] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('distribution');
  const [marketInsights, setMarketInsights] = useState({});
  
  // Stāvoklis reģionu datiem
  const [regionStatistics, setRegionStatistics] = useState(null);
  const [regionStatsLoading, setRegionStatsLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  
  // Stāvoklis salīdzināšanai
  const [compareMode, setCompareMode] = useState(false);
  const [carsToCompare, setCarsToCompare] = useState([]);
  
  // Stāvoklis ielādei un kļūdām
  const [loading, setLoading] = useState({
    search: false,
    estimation: false,
    chart: false,
    brands: false,
    regions: false
  });
  const [error, setError] = useState({
    search: null,
    estimation: null,
    chart: null,
    brands: null,
    regions: null
  });
  
  // Stāvoklis paziņojumiem
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Stāvoklis izlasei
  const [favorites, setFavorites] = useState([]);
  
  // Stāvoklis meklēšanas parametriem
  const [searchParams, setSearchParams] = useState({
    brand: '',
    model: '',
    yearFrom: new Date().getFullYear() - 10,
    yearTo: new Date().getFullYear(),
    priceFrom: 0,
    priceTo: 100000,
    fuelType: '',
    transmission: '',
    region: ''
  });
  
  // Iegūt markas, kad komponente ielādējas
  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(prev => ({ ...prev, brands: true }));
      setError(prev => ({ ...prev, brands: null }));
      
      try {
        const response = await getPopularBrands(20);
        setBrands(response.brands || []);
      } catch (err) {
        console.error('Error fetching brands:', err);
        setError(prev => ({ 
          ...prev, 
          brands: 'Neizdevās ielādēt marku sarakstu. Lūdzu, mēģiniet vēlreiz.'
        }));
      } finally {
        setLoading(prev => ({ ...prev, brands: false }));
      }
    };

    fetchBrands();
    fetchRegionStatistics(); // Iegūt start reģionu datus

    // Ielādēt saglabāto izlasi no localStorage
    const savedFavorites = localStorage.getItem('carFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (err) {
        console.error('Failed to load favorites:', err);
      }
    }

    // Ielādēt saglabātos salīdzināmos auto no localStorage
    const savedComparison = localStorage.getItem('carsToCompare');
    if (savedComparison) {
      try {
        setCarsToCompare(JSON.parse(savedComparison));
      } catch (err) {
        console.error('Failed to load comparison:', err);
      }
    }
  }, []);

  // Iegūt modeļus, kad marka mainās
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
        // Nav kritiska kļūda, tāpēc nev error stāvoklii
      }
    };

    fetchModels();
  }, [searchParams.brand]);

  //Saglabāt izlasi localStorage kad mainās
  useEffect(() => {
    localStorage.setItem('carFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Saglabāt salīdzināmos auto localStorage kad mainās
  useEffect(() => {
    localStorage.setItem('carsToCompare', JSON.stringify(carsToCompare));
  }, [carsToCompare]);

  // reģiona statistika no API
  const fetchRegionStatistics = async (brand = '', model = '') => {
    setRegionStatsLoading(true);
    setError(prev => ({ ...prev, regions: null }));
    
    try {
      // Izsaucam API
      const response = await getRegionStatistics(
        brand, 
        model,
        searchParams.yearFrom,
        searchParams.yearTo
      );
      
      setRegionStatistics(response);
    } catch (err) {
      console.error('Error fetching region statistics:', err);
      setError(prev => ({ 
        ...prev, 
        regions: 'Neizdevās ielādēt reģionu statistiku.'
      }));
      
      setNotification({
        open: true,
        message: 'Neizdevās ielādēt reģionu statistiku',
        severity: 'warning'
      });
    } finally {
      setRegionStatsLoading(false);
    }
  };

  // Apstrādāt tab maiņu
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Atjauninām reģionu statistiku, kad pārejam uz analīzes tab
    if (newValue === 1 && searchParams.brand) {
      fetchRegionStatistics(searchParams.brand, searchParams.model);
      handleFetchChart(chartType);
    }
  };

  // Apstrādāt parametru maiņu
  const handleParamChange = (param, value) => {
    setSearchParams(prev => ({
      ...prev,
      [param]: value
    }));
    
    // Ja reģions mainās, atjauninām atlasīto reģionu
    if (param === 'region' && value) {
      setSelectedRegion(value);
    } else if (param === 'region' && !value) {
      setSelectedRegion(null);
    }
  };

  // Apstrādāt meklēšanu
  const handleSearch = async () => {
    setLoading(prev => ({ ...prev, search: true }));
    setError(prev => ({ ...prev, search: null }));

    try {
      const response = await searchCars(searchParams);
      setSearchResults(response);
      
      // show notif
      setNotification({
        open: true,
        message: `Atrasti ${response.listings?.length || 0} sludinājumi`,
        severity: response.listings?.length > 0 ? 'success' : 'info'
      });
      
      // Iegūt grafiku, ja marka izvēlēta
      if (searchParams.brand) {
        handleFetchChart(chartType);
      }
      
      // Atjaunināt reģionu statistiku, balstoties uz meklēšanas parametriem
      if (searchParams.brand) {
        await fetchRegionStatistics(searchParams.brand, searchParams.model);
      }
      
    } catch (err) {
      console.error('Error searching cars:', err);
      setError(prev => ({ 
        ...prev, 
        search: 'Neizdevās veikt meklēšanu. Lūdzu, mēģiniet vēlreiz.' 
      }));
      
      setNotification({
        open: true,
        message: 'Neizdevās veikt meklēšanu',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  // Apstrādāt auto vērtējumu
  const handleEstimateCar = async (carData) => {
    setLoading(prev => ({ ...prev, estimation: true }));
    setError(prev => ({ ...prev, estimation: null }));

    try {
      const response = await estimateCarValue(carData);
      setEstimationResult(response.estimation);
      
      // Parādīt paziņojumu
      setNotification({
        open: true,
        message: 'Automašīnas vērtība aprēķināta',
        severity: 'success'
      });
      
    } catch (err) {
      console.error('Error estimating car value:', err);
      setError(prev => ({ 
        ...prev, 
        estimation: 'Neizdevās aprēķināt automašīnas vērtību. Lūdzu, mēģiniet vēlreiz.' 
      }));
      
      setNotification({
        open: true,
        message: 'Neizdevās aprēķināt automašīnas vērtību',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, estimation: false }));
    }
  };

  // Apstrādāt grafika tipa maiņu
  const handleChartTypeChange = (type) => {
    setChartType(type);
    handleFetchChart(type);
  };

  // Iegūt grafiku
  const handleFetchChart = async (type) => {
    if (!searchParams.brand) return;

    setLoading(prev => ({ ...prev, chart: true }));
    setError(prev => ({ ...prev, chart: null }));

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
          12 // last 12 mont
        );
      } else {
        response = { chart: null };
      }
      
      setChartData(response.chart);
      
    } catch (err) {
      console.error('Error fetching chart:', err);
      setError(prev => ({ 
        ...prev, 
        chart: 'Neizdevās ielādēt grafiku. Lūdzu, mēģiniet vēlreiz.' 
      }));
      
      setNotification({
        open: true,
        message: 'Neizdevās ielādēt grafiku',
        severity: 'warning'
      });
    } finally {
      setLoading(prev => ({ ...prev, chart: false }));
    }
  };

  // auto izlase
  const handleToggleFavorite = (car) => {
    const isFavorite = favorites.some(fav => fav.id === car.id);

    if (isFavorite) {
      setFavorites(prev => prev.filter(fav => fav.id !== car.id));
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} noņemts no izlases`,
        severity: 'info'
      });
    } else {
      // parliecamies ka tam ir visi nepieciešamie lauki
      const enhancedCar = {
        ...car,
        id: car.id || car.external_id || `car-${Date.now()}`,
        brand: car.brand || 'Nav norādīts',
        model: car.model || 'Nav norādīts',
        year: car.year || 'Nav norādīts',
        price: car.price || 0
      };
      
      setFavorites(prev => [...prev, enhancedCar]);
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} pievienots izlasei`,
        severity: 'success'
      });
    }
  };

  // Pievienot auto salīdzināšanai
  const handleAddToCompare = (car) => {
    const isAlreadyAdded = carsToCompare.some(c => c.id === car.id);

    if (isAlreadyAdded) {
      // Nonemt, ja jau pievienots
      setCarsToCompare(prev => prev.filter(c => c.id !== car.id));
      
      setNotification({
        open: true,
        message: `${car.brand} ${car.model} noņemts no salīdzinājuma`,
        severity: 'info'
      });
    } else {
      // Pievienot ja vel
      if (carsToCompare.length >= 3) {
        setNotification({
          open: true,
          message: 'Var salīdzināt ne vairāk kā 3 automašīnas',
          severity: 'warning'
        });
        return;
      }
      
      // objektu salidzinasana
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
      
      // Parsledzamies uz salidz tab
      if (tabValue !== 3) {
        setTabValue(3);
      }
    }
  };

  // Nonemt auto no salidz
  const handleRemoveFromCompare = (car) => {
    setCarsToCompare(prev => prev.filter(c => c.id !== car.id));

    setNotification({
      open: true,
      message: `${car.brand} ${car.model} noņemts no salīdzinājuma`,
      severity: 'info'
    });
  };

  // regiona atlase
  const handleRegionSelect = (regionName) => {
    // Ja tas pats reģiona, notiram
    if (selectedRegion === regionName) {
      setSelectedRegion(null);
      handleParamChange('region', '');
      return;
    }
    
    setSelectedRegion(regionName);
    handleParamChange('region', regionName);
    
    setNotification({
      open: true,
      message: `Atlasīti sludinājumi no reģiona: ${regionName}`,
      severity: 'info'
    });
  };

  // Export salidzinasanas dati
  const handleExportComparison = () => {
    if (carsToCompare.length === 0) return;

    try {
      const exportData = {
        date: new Date().toISOString(),
        cars: carsToCompare.map(car => ({
          brand: car.brand,
          model: car.model,
          year: car.year,
          price: car.price,
          engine: car.engine_type,
          engine_volume: car.engine_volume,
          transmission: car.transmission,
          mileage: car.mileage,
          body_type: car.body_type,
          color: car.color,
          region: car.region
        }))
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
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
      
      setNotification({
        open: true,
        message: 'Salīdzinājums eksportēts',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error exporting comparison:', err);
      
      setNotification({
        open: true,
        message: 'Neizdevās eksportēt salīdzinājumu',
        severity: 'error'
      });
    }
  };

  // close notif
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // grafiks
  const handleChartDownload = () => {
    if (!chartData) return;

    try {
      // Konvert base64 uz blob
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Auto Tirgus Analīzes Sistēma
        </Typography>
        
        <Typography variant="body1" paragraph color="text.secondary">
          Pētiet automašīnu cenas, tendences un veiciet vērtējumus, izmantojot aktuālus tirgus datus
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<TuneIcon />} label="Meklēšana" id="tab-0" />
            <Tab icon={<QueryStatsIcon />} label="Tirgus Analīze" id="tab-1" />
            <Tab icon={<ReportIcon />} label="Vērtējums" id="tab-2" />
            <Tab 
              icon={<CompareArrowsIcon />} 
              label={`Salīdzinājums ${carsToCompare.length > 0 ? `(${carsToCompare.length})` : ''}`} 
              id="tab-3" 
            />
          </Tabs>
        </Box>
        
        {/* Meklesanas tab */}
        <Box role="tabpanel" hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <Grid container spacing={3}>
              {/* serach form */}
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Meklēšanas parametri
                  </Typography>
                  
                  <SearchForm 
                    brands={brands}
                    models={models}
                    params={searchParams}
                    onParamChange={handleParamChange}
                    onSearch={handleSearch}
                    loading={loading.search}
                    error={error.search}
                  />
                </Paper>
              </Grid>
              
              {/* search results */}
              <Grid item xs={12} md={8}>
                <RegionalPriceComparison 
                  regionData={regionStatistics?.regions || []} 
                  loading={loading.regions}
                  onRegionSelect={handleRegionSelect}
                  selectedRegion={selectedRegion}
                  brandName={searchParams.brand}
                  modelName={searchParams.model}
                />
                
                {searchResults?.statistics && (
                  <PriceAnalysisChart 
                    brandName={searchParams.brand}
                    modelName={searchParams.model}
                    chartData={chartData}
                    chartType={chartType}
                    loading={loading.chart}
                    onChartTypeChange={handleChartTypeChange}
                    onRefresh={() => handleFetchChart(chartType)}
                    onDownload={handleChartDownload}
                  />
                )}
                
                {searchResults?.listings && searchResults.listings.length > 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <PriceByFuelTypeChart 
                        data={searchResults.listings} 
                        loading={loading.search}
                        brandName={searchParams.brand}
                        modelName={searchParams.model}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <PriceYearTrendChart 
                        data={searchResults.listings} 
                        loading={loading.search}
                        brandName={searchParams.brand}
                        modelName={searchParams.model}
                      />
                    </Grid>
                  </Grid>
                )}
                
                <SimilarListings
                  listings={searchResults?.listings || []}
                  title="Meklēšanas rezultāti"
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCompare={handleAddToCompare}
                  onShowDetails={() => {}}
                  favorites={favorites}
                  viewMode="table"
                />
              </Grid>
            </Grid>
          )}
        </Box>
        
        {/* Tirgus analize tab */}
        <Box role="tabpanel" hidden={tabValue !== 1}>
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <MarketInsights insights={marketInsights} />
              </Grid>
              
              <Grid item xs={12}>
                <RegionalPriceComparison 
                  regionData={regionStatistics?.regions || []} 
                  loading={loading.regions}
                  onRegionSelect={handleRegionSelect}
                  selectedRegion={selectedRegion}
                  brandName={searchParams.brand}
                  modelName={searchParams.model}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <PriceAnalysisChart 
                  brandName={searchParams.brand}
                  modelName={searchParams.model}
                  chartData={chartData}
                  chartType={chartType}
                  loading={loading.chart}
                  onChartTypeChange={handleChartTypeChange}
                  onRefresh={() => handleFetchChart(chartType)}
                  onDownload={handleChartDownload}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Papildu tirgus informācija
                  </Typography>
                  
                  <Typography variant="body1" paragraph>
                    Tirgus datu priekšrocības, salīdzinot ar citiem avotiem:
                  </Typography>
                  
                  <ul>
                    <li>
                      <Typography variant="body2" paragraph>
                        Reāllaika dati no SS.lv - svaigākā informācija par Latvijas tirgu
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" paragraph>
                        Detalizēta cenu salīdzināšana visā Latvijā - atrodi, kur auto ir lētāki
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" paragraph>
                        Vēsturiskie dati ļauj noteikt labāko laiku auto iegādei
                      </Typography>
                    </li>
                  </ul>
                  
                  <Button 
                    variant="contained" 
                    onClick={() => setTabValue(0)}
                  >
                    Sākt meklēšanu
                  </Button>
                </Paper>
              </Grid>
              
              {searchResults?.listings && searchResults.listings.length > 0 && (
                <>
                  <Grid item xs={12} md={6}>
                    <PriceByFuelTypeChart 
                      data={searchResults.listings} 
                      loading={loading.search}
                      brandName={searchParams.brand}
                      modelName={searchParams.model}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <PriceYearTrendChart 
                      data={searchResults.listings} 
                      loading={loading.search}
                      brandName={searchParams.brand}
                      modelName={searchParams.model}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </Box>
        
        {/* vertejumu tab */}
        <Box role="tabpanel" hidden={tabValue !== 2}>
          {tabValue === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <CarEstimationForm 
                  brands={brands}
                  models={models}
                  onEstimate={handleEstimateCar}
                  loading={loading.estimation}
                  estimationResult={estimationResult}
                  error={error.estimation}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <SimilarListings 
                  listings={estimationResult?.similar_listings || []}
                  title="Līdzīgi sludinājumi"
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCompare={handleAddToCompare}
                  onShowDetails={() => {}}
                  favorites={favorites}
                  viewMode="card"
                />
              </Grid>
            </Grid>
          )}
        </Box>
        
        {/* Salidzinasana tab */}
        <Box role="tabpanel" hidden={tabValue !== 3}>
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <CarComparisonTable 
                  cars={carsToCompare}
                  onRemoveCar={handleRemoveFromCompare}
                  onExportComparison={handleExportComparison}
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
                     
                     <Button 
                       variant="contained" 
                       onClick={() => setTabValue(0)}
                       sx={{ mt: 1 }}
                     >
                       Meklēt automašīnas
                     </Button>
                   </Box>
                 </Paper>
               </Grid>
             )}
           </Grid>
         )}
       </Box>
       
       {/* notif */}
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
     </Container>
     
     <Footer />
   </Box>
 );
};

export default DashboardPage;