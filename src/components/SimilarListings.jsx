import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Link,
  Button,
  IconButton,
  Tooltip,
  Collapse,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InfoIcon from '@mui/icons-material/Info';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const SimilarListings = ({ 
  listings = [], 
  title = 'Līdzīgi sludinājumi', 
  onToggleFavorite = () => {},
  onAddToCompare = () => {},
  onShowDetails = () => {},
  favorites = [],
  viewMode = 'table'  // 'table' or 'card'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [expandedRow, setExpandedRow] = useState(null);
  
  // If no listings, show message
  if (!listings || listings.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nav atrasti līdzīgi sludinājumi.
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Toggle row expansion
  const toggleRowExpansion = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };
  
  // Check if car is in favorites
  const isFavorite = (car) => {
    return favorites.some(fav => fav.id === car.id);
  };
  
  // Format fuel type in Latvian
  const formatFuelType = (type) => {
    switch(type) {
      case 'Petrol': return 'Benzīns';
      case 'Diesel': return 'Dīzelis';
      case 'Hybrid': return 'Hibrīds';
      case 'Electric': return 'Elektriskais';
      case 'Gas': return 'Gāze';
      default: return type;
    }
  };
  
  // Format transmission in Latvian
  const formatTransmission = (transmission) => {
    switch(transmission) {
      case 'Manual': return 'Manuālā';
      case 'Automatic': return 'Automātiskā';
      case 'Semi-Automatic': return 'Pusautomātiskā';
      default: return transmission;
    }
  };
  
  // Render card view
  const renderCardView = () => {
    return (
      <Grid container spacing={2}>
        {listings
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((car, index) => (
            <Grid item xs={12} sm={6} md={4} key={car.id || `car-${index}`}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                        {car.engine || `${car.engine_volume}L ${formatFuelType(car.engine_type)}`}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ātrumkārba: <Typography component="span" variant="body2" fontWeight="medium">
                        {formatTransmission(car.transmission)}
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
                  <IconButton 
                    size="small" 
                    onClick={() => onToggleFavorite(car)}
                    color={isFavorite(car) ? "error" : "default"}
                  >
                    {isFavorite(car) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  
                  <IconButton 
                    size="small"
                    onClick={() => onShowDetails(car)}
                  >
                    <InfoIcon />
                  </IconButton>
                  
                  <IconButton 
                    size="small"
                    onClick={() => onAddToCompare(car)}
                  >
                    <CompareArrowsIcon />
                  </IconButton>
                  
                  {car.url && (
                    <IconButton
                      size="small"
                      component={Link}
                      href={car.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
      </Grid>
    );
  };
  
  // Render table view
  const renderTableView = () => {
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Marka un Modelis</TableCell>
              <TableCell>Gads</TableCell>
              <TableCell>Dzinējs</TableCell>
              <TableCell>Ātrumkārba</TableCell>
              <TableCell>Nobraukums</TableCell>
              <TableCell>Cena</TableCell>
              <TableCell align="right">Darbības</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listings
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((car, index) => {
                const isExpanded = expandedRow === (car.id || `car-${index}`);
                
                return (
                  <React.Fragment key={car.id || `car-${index}`}>
                    <TableRow hover>
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpansion(car.id || `car-${index}`)}
                        >
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        {car.brand} {car.model}
                      </TableCell>
                      <TableCell>{car.year}</TableCell>
                      <TableCell>
                        {car.engine || (car.engine_type && formatFuelType(car.engine_type))}
                      </TableCell>
                      <TableCell>
                        {formatTransmission(car.transmission)}
                      </TableCell>
                      <TableCell>
                        {car.mileage ? `${car.mileage.toLocaleString()} km` : 'Nav norādīts'}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">
                          €{car.price?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title={isFavorite(car) ? "Noņemt no izlases" : "Pievienot izlasei"}>
                            <IconButton 
                              size="small" 
                              onClick={() => onToggleFavorite(car)}
                              color={isFavorite(car) ? "error" : "default"}
                            >
                              {isFavorite(car) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Pievienot salīdzinājumam">
                            <IconButton 
                              size="small"
                              onClick={() => onAddToCompare(car)}
                            >
                              <CompareArrowsIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {car.url && (
                            <Tooltip title="Skatīt sludinājumu">
                              <IconButton
                                size="small"
                                component={Link}
                                href={car.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <OpenInNewIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded details row */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography variant="subtitle2" gutterBottom component="div">
                              Papildu informācija
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  Reģions: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.region || 'Nav norādīts'}
                                  </Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Virsbūves tips: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.body_type || 'Nav norādīts'}
                                  </Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Krāsa: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.color || 'Nav norādīts'}
                                  </Typography>
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => onShowDetails(car)}
                                  sx={{ mr: 1 }}
                                >
                                  Detaļas
                                </Button>
                                
                                {car.url && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    component={Link}
                                    href={car.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    endIcon={<OpenInNewIcon />}
                                  >
                                    Skatīt
                                  </Button>
                                )}
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      {/* View mode toggle can be added here if needed */}
      
      {viewMode === 'card' || isMobile ? renderCardView() : renderTableView()}
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={listings.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Rindas lapā:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} no ${count !== -1 ? count : `vairāk nekā ${to}`}`
        }
      />
    </Paper>
  );
};

export default SimilarListings;