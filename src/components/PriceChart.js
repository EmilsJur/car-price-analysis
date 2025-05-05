import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Tabs, 
  Tab, 
  FormControl, 
  FormControlLabel, 
  Radio, 
  RadioGroup, 
  Tooltip, 
  IconButton,
  CircularProgress,
  Button
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

const PriceChart = ({ 
  chartData, 
  chartType = 'distribution', 
  onChartTypeChange = () => {},
  onRefresh = () => {},
  loading = false
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('default');
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  useEffect(() => {
    // Handle tab value based on chartType
    switch(chartType) {
      case 'distribution':
        setTabValue(0);
        break;
      case 'trend':
        setTabValue(1);
        break;
      case 'comparison':
        setTabValue(2);
        break;
      case 'scatter':
        setTabValue(3);
        break;
      default:
        setTabValue(0);
    }
  }, [chartType]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Map tab index to chart type
    let type;
    switch(newValue) {
      case 0:
        type = 'distribution';
        break;
      case 1:
        type = 'trend';
        break;
      case 2:
        type = 'comparison';
        break;
      case 3:
        type = 'scatter';
        break;
      default:
        type = 'distribution';
    }
    
    onChartTypeChange(type);
  };
  
  // Handle zoom in
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 20, 200));
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 20, 60));
  };
  
  // Toggle fullscreen view
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };
  
  // Handle download chart
  const handleDownload = () => {
    if (!chartData) return;
    
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
    link.download = `car_price_${chartType}_chart.png`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  // Get tab panel content
  const getChartContent = () => {
    // If loading, show progress
    if (loading) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: fullscreen ? '90vh' : 400 
        }}>
          <CircularProgress />
        </Box>
      );
    }
    
    // If no chart data, show message
    if (!chartData) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: fullscreen ? '90vh' : 400 
        }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No chart data available.
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Generate Chart
          </Button>
        </Box>
      );
    }
    
    // Return the chart
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        height: fullscreen ? '90vh' : 400,
        overflow: 'auto',
        position: 'relative'
      }}>
        <img 
          src={`data:image/png;base64,${chartData}`} 
          alt={`${chartType} Chart`}
          style={{ 
            maxWidth: `${zoom}%`, 
            maxHeight: '100%', 
            objectFit: 'contain'
          }}
        />
      </Box>
    );
  };
  
  // Fullscreen overlay
  if (fullscreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          p: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">
            {chartType === 'distribution' && 'Price Distribution Chart'}
            {chartType === 'trend' && 'Price Trend Chart'}
            {chartType === 'comparison' && 'Brand Comparison Chart'}
            {chartType === 'scatter' && 'Price vs. Year Scatter Plot'}
          </Typography>
          
          <Box>
            <IconButton onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
            <IconButton onClick={handleZoomIn}>
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={toggleFullscreen}>
              <FullscreenIcon />
            </IconButton>
          </Box>
        </Box>
        
        {getChartContent()}
      </Box>
    );
  }
  
  // Default view
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="chart type tabs">
          <Tab label="Distribution" />
          <Tab label="Trend" />
          <Tab label="Comparison" />
          <Tab label="Scatter Plot" />
        </Tabs>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1">
          {tabValue === 0 && 'Price Distribution'}
          {tabValue === 1 && 'Price Trend Over Time'}
          {tabValue === 2 && 'Brand Comparison'}
          {tabValue === 3 && 'Price vs. Year'}
          
          <Tooltip title="Explanation about this chart type">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Box>
          <Tooltip title="Download Chart">
            <IconButton 
              onClick={handleDownload}
              disabled={!chartData}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh Chart">
            <IconButton 
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom In">
            <IconButton 
              onClick={handleZoomIn}
              disabled={!chartData || zoom >= 200}
            >
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out">
            <IconButton 
              onClick={handleZoomOut}
              disabled={!chartData || zoom <= 60}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Fullscreen">
            <IconButton 
              onClick={toggleFullscreen}
              disabled={!chartData}
            >
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* View options */}
      {chartData && (
        <Box sx={{ mb: 2 }}>
          <FormControl component="fieldset">
            <RadioGroup
              row
              aria-label="chart view mode"
              name="chart-view-mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              <FormControlLabel value="default" control={<Radio />} label="Default" />
              <FormControlLabel value="detailed" control={<Radio />} label="Detailed" />
              <FormControlLabel value="simplified" control={<Radio />} label="Simplified" />
            </RadioGroup>
          </FormControl>
        </Box>
      )}
      
      {getChartContent()}
    </Paper>
  );
};

export default PriceChart;