import React, { useState, useEffect } from 'react';
import {  
  Typography, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  TableSortLabel,
  Button,
  IconButton,
  Collapse,
  Tooltip,
  CircularProgress,
  Checkbox,
  Menu,
  MenuItem,
  Grid,
  Paper
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import { visuallyHidden } from '@mui/utils';

// Import export helpers
import { exportToCSV } from '../utils/exporthelpers';
// Import CarDetailsDialog
import CarDetailsDialog from './CarDetailsDialog';

const ResultsSection = ({
  cars = [], 
  loading = false,
  compareMode = false,
  selectedCars = [],
  onSelectCar = () => {},
  onOpenCarDetails = () => {},
  onToggleFavorite = () => {},
  favorites = []
}) => {
  // State for pagination and sorting
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('price');
  const [expandedRow, setExpandedRow] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [actionCar, setActionCar] = useState(null);
  
  // State for CarDetailsDialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCarForDetails, setSelectedCarForDetails] = useState(null);

  // Reset pagination when cars change
  useEffect(() => {
    setPage(0);
  }, [cars]);

  // Handle opening car details dialog
  const handleOpenCarDetails = (car) => {
    setSelectedCarForDetails(car);
    setDetailsOpen(true);
    // Also call the parent's handler if it exists
    onOpenCarDetails(car);
  };

  // Handle closing car details dialog
  const handleCloseCarDetails = () => {
    setDetailsOpen(false);
    setSelectedCarForDetails(null);
  };

  // Handle change page
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle change rows per page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Toggle row expansion
  const toggleRowExpansion = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Open actions menu
  const handleOpenMenu = (event, car) => {
    setAnchorEl(event.currentTarget);
    setActionCar(car);
  };

  // Close actions menu
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActionCar(null);
  };

  // Check if car is in favorites
  const isFavorite = (car) => {
  if (!car || !favorites) return false;
  return favorites.some(fav => fav && car && fav.id === car.id);
};

  // Export to CSV function
  const handleExportCSV = () => {
    if (!cars || cars.length === 0) return;
    
    const exportData = cars.map(car => ({
      'Marka': car.brand,
      'Modelis': car.model,
      'Gads': car.year,
      'Cena': car.price,
      'Nobraukums': car.mileage,
      'Dzinējs': car.engine,
      'Ātrumkārba': car.transmission,
      'Reģions': car.region,
      'Saite': car.url || car.listing_url || ''
    }));
    
    exportToCSV(exportData, 'car_search_results');
  };

  // Format fuel type in Latvian
  const formatFuelType = (type) => {
  if (!type) return null;
  
  switch(type.toLowerCase()) {
    case 'petrol': return 'Benzīns';
    case 'diesel': return 'Dīzelis';
    case 'hybrid': return 'Hibrīds';
    case 'electric': return 'Elektriskais';
    case 'gas': return 'Gāze';
    default: return type;
  }
}
  
  // Format transmission in Latvian
  const formatTransmission = (transmission) => {
    if (!transmission) return null;
    
    switch(transmission.toLowerCase()) {
      case 'manual': return 'Manuālā';
      case 'automatic': return 'Automātiskā';
      case 'semi-automatic': return 'Pusautomātiskā';
      default: return transmission;
    }
  };

  // Sort cars based on the current order and orderBy
  const sortedCars = React.useMemo(() => {
    if (!cars || !cars.length) return [];
    
    const comparator = (a, b) => {
      let valueA, valueB;
      
      if (orderBy === 'price') {
        valueA = a.price || 0;
        valueB = b.price || 0;
      } else if (orderBy === 'year') {
        valueA = a.year || 0;
        valueB = b.year || 0;
      } else if (orderBy === 'mileage') {
        valueA = a.mileage || 0;
        valueB = b.mileage || 0;
      } else {
        valueA = a[orderBy] || '';
        valueB = b[orderBy] || '';
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return order === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      return order === 'asc' ? valueA - valueB : valueB - valueA;
    };
    
    return [...cars].sort(comparator);
  }, [cars, order, orderBy]);

  // Calculate empty rows for consistent table height
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - sortedCars.length) : 0;

  // If loading, show progress
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If no cars, show message
  if (!cars || cars.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Nav atrasta neviena automašīna, kas atbilst jūsu meklēšanas kritērijiem.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Mēģiniet pielāgot filtrus, lai redzētu vairāk rezultātu.
        </Typography>
      </Box>
    );
  }

  // Table header for sorting
  const TableHeader = () => (
    <TableHead>
      <TableRow>
        {compareMode && (
          <TableCell padding="checkbox">
            <Typography variant="srOnly">Izvēlēties</Typography>
          </TableCell>
        )}
        <TableCell>
          <TableSortLabel
            active={orderBy === 'brand'}
            direction={orderBy === 'brand' ? order : 'asc'}
            onClick={() => handleRequestSort('brand')}
          >
            Marka un Modelis
            {orderBy === 'brand' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'kārtots dilstoši' : 'kārtots augoši'}
              </Box>
            ) : null}
          </TableSortLabel>
        </TableCell>
        <TableCell>
          <TableSortLabel
            active={orderBy === 'year'}
            direction={orderBy === 'year' ? order : 'asc'}
            onClick={() => handleRequestSort('year')}
          >
            Gads
            {orderBy === 'year' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'kārtots dilstoši' : 'kārtots augoši'}
              </Box>
            ) : null}
          </TableSortLabel>
        </TableCell>
        <TableCell>Dzinējs</TableCell>
        <TableCell>Ātrumkārba</TableCell>
        <TableCell>
          <TableSortLabel
            active={orderBy === 'mileage'}
            direction={orderBy === 'mileage' ? order : 'asc'}
            onClick={() => handleRequestSort('mileage')}
          >
            Nobraukums
            {orderBy === 'mileage' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'kārtots dilstoši' : 'kārtots augoši'}
              </Box>
            ) : null}
          </TableSortLabel>
        </TableCell>
        <TableCell>
          <TableSortLabel
            active={orderBy === 'price'}
            direction={orderBy === 'price' ? order : 'asc'}
            onClick={() => handleRequestSort('price')}
          >
            Cena
            {orderBy === 'price' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'kārtots dilstoši' : 'kārtots augoši'}
              </Box>
            ) : null}
          </TableSortLabel>
        </TableCell>
        <TableCell>Darbības</TableCell>
      </TableRow>
    </TableHead>
  );

  return (
    <Box>
      {/* Results header with export button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Meklēšanas rezultāti ({cars.length})
        </Typography>
        
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          disabled={!cars || cars.length === 0}
        >
          Eksportēt CSV
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table size="small" aria-label="automašīnu saraksta tabula">
          <TableHeader />
          <TableBody>
            {/* Car rows */}
            {sortedCars
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((car) => {
                const isItemSelected = selectedCars && selectedCars.some(selected => selected.id === car.id);
                const isExpanded = expandedRow === car.id;
                
                // Get properly formatted engine text
                let engineText = 'Nav norādīts';
                if (car.engine) {
                  engineText = car.engine;
                } else if (car.engine_volume && car.engine_type) {
                  engineText = `${car.engine_volume}L ${formatFuelType(car.engine_type) || car.engine_type}`;
                } else if (car.engine_type) {
                  engineText = formatFuelType(car.engine_type) || car.engine_type;
                }
                
                // Get properly formatted transmission text
                const transmissionText = formatTransmission(car.transmission) || car.transmission || 'Nav norādīts';
                
                return (
                  <React.Fragment key={car.id || car.external_id || `car-${car.brand}-${car.model}-${car.year}`}>
                    <TableRow 
                      hover
                      onClick={() => compareMode ? onSelectCar(car) : toggleRowExpansion(car.id)}
                      selected={isItemSelected}
                      sx={{ 
                        cursor: 'pointer',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)'
                        }
                      }}
                    >
                      {compareMode && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={isItemSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCar(car);
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {car.brand} {car.model}
                          </Typography>
                          {isFavorite(car) && (
                            <Tooltip title="Izlase">
                              <FavoriteIcon 
                                color="error" 
                                fontSize="small" 
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{car.year || 'Nav norādīts'}</TableCell>
                      <TableCell>
                        {engineText}
                      </TableCell>
                      <TableCell>
                        {transmissionText}
                      </TableCell>
                      <TableCell>
                        {car.mileage ? `${car.mileage.toLocaleString()} km` : 'Nav norādīts'}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">
                          €{car.price ? car.price.toLocaleString() : 'Nav norādīts'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(car);
                            }}
                            color={isFavorite(car) ? "error" : "default"}
                          >
                            {isFavorite(car) ? (
                              <FavoriteIcon fontSize="small" />
                            ) : (
                              <FavoriteBorderIcon fontSize="small" />
                            )}
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCarDetails(car);
                            }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                          
                          {(car.listing_url || car.url) && (
                            <IconButton
                              size="small"
                              component="a"
                              href={car.listing_url || car.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          )}
                          
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMenu(e, car);
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded row details */}
                    <TableRow>
                      <TableCell 
                        style={{ paddingBottom: 0, paddingTop: 0 }} 
                        colSpan={compareMode ? 8 : 7}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography variant="subtitle1" gutterBottom component="div">
                              {car.brand} {car.model} Detaļas
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={4}>
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
                              
                              <Grid item xs={12} sm={6} md={4}>
                                <Typography variant="body2" color="text.secondary">
                                  Sludinājuma datums: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.listing_date ? new Date(car.listing_date).toLocaleDateString() : new Date().toLocaleDateString()}
                                  </Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Avots: <Typography component="span" variant="body2" fontWeight="medium">
                                    SS.LV
                                  </Typography>
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={6} md={4}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenCarDetails(car);
                                    }}
                                  >
                                    Skatīt detaļas
                                  </Button>
                                  
                                  {(car.listing_url || car.url) && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      component="a"
                                      href={car.listing_url || car.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      endIcon={<OpenInNewIcon />}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Skatīt sludinājumu
                                    </Button>
                                  )}
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={compareMode ? 8 : 7} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedCars.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Rindas lapā:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} no ${count !== -1 ? count : `vairāk nekā ${to}`}`
        }
      />
      
      {/* Actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          handleOpenCarDetails(actionCar);
          handleCloseMenu();
        }}>
          <InfoIcon fontSize="small" sx={{ mr: 1 }} />
          Skatīt detaļas
        </MenuItem>
        
        <MenuItem onClick={() => {
          onToggleFavorite(actionCar);
          handleCloseMenu();
        }}>
          {isFavorite(actionCar) ? (
            <>
              <FavoriteIcon fontSize="small" sx={{ mr: 1 }} color="error" />
              Noņemt no izlases
            </>
          ) : (
            <>
              <FavoriteBorderIcon fontSize="small" sx={{ mr: 1 }} />
              Pievienot izlasei
            </>
          )}
        </MenuItem>
        
        {compareMode && actionCar && (
          <MenuItem onClick={() => {
            onSelectCar(actionCar);
            handleCloseMenu();
          }}>
            <CompareArrowsIcon fontSize="small" sx={{ mr: 1 }} />
            {selectedCars && selectedCars.some(selected => selected.id === actionCar?.id) 
              ? 'Noņemt no salīdzinājuma' 
              : 'Pievienot salīdzinājumam'}
          </MenuItem>
        )}
        
        {(actionCar?.listing_url || actionCar?.url) && (
          <MenuItem
            component="a"
            href={actionCar?.listing_url || actionCar?.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCloseMenu}
          >
            <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
            Atvērt oriģinālo sludinājumu
          </MenuItem>
        )}
      </Menu>
      
      {/* Car Details Dialog */}
      <CarDetailsDialog
        open={detailsOpen}
        car={selectedCarForDetails}
        onClose={handleCloseCarDetails}
        onAddToCompare={selectedCars && onSelectCar ? 
          (car) => {
            onSelectCar(car);
            handleCloseCarDetails();
          } 
          : undefined
        }
        onToggleFavorite={onToggleFavorite}
        isFavorite={selectedCarForDetails ? isFavorite(selectedCarForDetails) : false}
      />
    </Box>
  );
};

export default ResultsSection;