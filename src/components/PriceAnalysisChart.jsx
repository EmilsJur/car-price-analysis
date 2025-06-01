import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';

// Import chart component (used conditionally)
const PriceAnalysisChart = ({ 
  brandName, 
  modelName, 
  chartData, 
  chartType = 'distribution', 
  loading = false,
  onChartTypeChange = () => {},
  onRefresh = () => {},
  onDownload = () => {},
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  
  // Map chart type to tab index
  useEffect(() => {
    const typeToIndex = {
      'distribution': 0,
      'trend': 1
    };
    
    setTabValue(typeToIndex[chartType] || 0);
  }, [chartType]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Map tab index to chart type
    const indexToType = {
      0: 'distribution',
      1: 'trend'
    };
    
    onChartTypeChange(indexToType[newValue]);
  };
  
  // Chart titles in Latvian
  const chartTitles = {
    'distribution': 'Cenu sadalījums',
    'trend': 'Cenu tendences'
  };
  
  // Chart descriptions in Latvian
  const chartDescriptions = {
    'distribution': 'Histogramma, kas parāda, cik bieži sastopamas dažādas automašīnu cenas.',
    'trend': 'Līnijas grafiks, kas parāda, kā mainās vidējās cenas laika gaitā.'
  };
  
  // Handle chart download
  const handleDownload = () => {
    if (!chartData) return;
    onDownload(chartType);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h3">
          {brandName ? 
            `${brandName}${modelName ? ` ${modelName}` : ''} cenu analīze` : 
            'Tirgus cenu analīze'}
        </Typography>
        
        <Box>
          <Tooltip title="Atjaunot">
            <IconButton onClick={onRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lejupielādēt">
            <IconButton onClick={handleDownload} disabled={!chartData || loading}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Cenu sadalījums" />
          <Tab label="Tendences" />
        </Tabs>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
          {chartTitles[chartType]}
          <Tooltip title={chartDescriptions[chartType]}>
            <InfoIcon fontSize="small" sx={{ ml: 1, color: theme.palette.text.secondary }} />
          </Tooltip>
        </Typography>
      </Box>
      
      <Box 
        sx={{ 
          height: 400, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          mt: 2,
          bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
          borderRadius: 1
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : chartData ? (
          <img 
            src={`data:image/png;base64,${chartData}`} 
            alt={`${chartTitles[chartType]} grafiks`}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : chartType === 'trend' ? (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <img 
              src="/trend_example.PNG"
              alt="Cenu tendenču grafiks - demonstrācija"
              style={{ maxWidth: '80%', maxHeight: '300px', opacity: 0.7 }}
              onError={(e) => {
                // Ja nav placeholder bildes, parādi tekstu
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <Box sx={{ display: 'none' }}>
              <Typography variant="body2" color="text.secondary">
                Vēsturiskie dati nav pieejami (nepieciešams laika periods)
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Nav pieejamu datu grafikas attēlošanai.
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
            >
              Ģenerēt grafiku
            </Button>
          </Box>
        )}
      </Box>
      
      {chartData && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {chartType === 'distribution' && 'Grafiks parāda automašīnu cenu sadalījumu. Augstāki stabiņi norāda uz biežāk sastopamām cenām.'}
            {chartType === 'trend' && 'Grafiks parāda, kā automašīnu cenas mainījušās laika gaitā. Var palīdzēt identificēt sezonalitāti vai ilgtermiņa tendences.'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PriceAnalysisChart;