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
  Chip,
  Link,
  Button,
  IconButton,
  Collapse,
  Tooltip,
  CircularProgress,
  Checkbox,
  Menu,
  MenuItem,
  Grid
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { visuallyHidden } from '@mui/utils';

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

  // Reset pagination when cars change
  useEffect(() => {
    setPage(0);
  }, [cars]);

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
    return favorites.some(fav => fav.id === car.id);
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
          No cars found matching your search criteria.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Try adjusting your filters to see more results.
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
            <Typography variant="srOnly">Select</Typography>
          </TableCell>
        )}
        <TableCell>
          <TableSortLabel
            active={orderBy === 'brand'}
            direction={orderBy === 'brand' ? order : 'asc'}
            onClick={() => handleRequestSort('brand')}
          >
            Brand & Model
            {orderBy === 'brand' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
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
            Year
            {orderBy === 'year' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
              </Box>
            ) : null}
          </TableSortLabel>
        </TableCell>
        <TableCell>Engine</TableCell>
        <TableCell>Transmission</TableCell>
        <TableCell>
          <TableSortLabel
            active={orderBy === 'mileage'}
            direction={orderBy === 'mileage' ? order : 'asc'}
            onClick={() => handleRequestSort('mileage')}
          >
            Mileage
            {orderBy === 'mileage' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
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
            Price
            {orderBy === 'price' ? (
              <Box component="span" sx={visuallyHidden}>
                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
              </Box>
            ) : null}
          </TableSortLabel>
        </TableCell>
        <TableCell>Actions</TableCell>
      </TableRow>
    </TableHead>
  );

  return (
    <Box>
      <TableContainer>
        <Table size="small" aria-label="car listings table">
          <TableHeader />
          <TableBody>
            {/* ResultsSection.js car mapping */}
            {sortedCars
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((car) => {
                const isItemSelected = selectedCars.some(selected => selected.id === car.id);
                const isExpanded = expandedRow === car.id;
                
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
                            <Tooltip title="Favorite">
                              <FavoriteIcon 
                                color="error" 
                                fontSize="small" 
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{car.year}</TableCell>
                      <TableCell>
                        {car.engine || (car.engine_volume && `${car.engine_volume}L ${car.engine_type}`)}
                        {car.engine_type && (
                          <Chip 
                            label={car.engine_type} 
                            size="small" 
                            sx={{ ml: 1 }} 
                            color={
                              car.engine_type === 'Diesel' ? 'primary' :
                              car.engine_type === 'Petrol' ? 'secondary' :
                              car.engine_type === 'Electric' ? 'success' :
                              car.engine_type === 'Hybrid' ? 'info' : 'default'
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>{car.transmission}</TableCell>
                      <TableCell>
                        {car.mileage ? `${car.mileage.toLocaleString()} km` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">
                          €{car.price ? car.price.toLocaleString() : 'N/A'}
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
                              onOpenCarDetails(car);
                            }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                          
                          {car.listing_url && (
                            <IconButton
                              size="small"
                              component={Link}
                              href={car.listing_url}
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
                              {car.brand} {car.model} Details
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={4}>
                                <Typography variant="body2" color="text.secondary">
                                  Region: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.region || 'N/A'}
                                  </Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Body Type: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.body_type || 'N/A'}
                                  </Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Color: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.color || 'N/A'}
                                  </Typography>
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={6} md={4}>
                                <Typography variant="body2" color="text.secondary">
                                  Listing Date: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.listing_date ? new Date(car.listing_date).toLocaleDateString() : 'N/A'}
                                  </Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Source: <Typography component="span" variant="body2" fontWeight="medium">
                                    {car.source || 'Unknown'}
                                  </Typography>
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={6} md={4}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => onOpenCarDetails(car)}
                                  >
                                    View Details
                                  </Button>
                                  
                                  {car.listing_url && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      component={Link}
                                      href={car.listing_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      endIcon={<OpenInNewIcon />}
                                    >
                                      View Listing
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
      />
      
      {/* Actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          onOpenCarDetails(actionCar);
          handleCloseMenu();
        }}>
          <InfoIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        
        <MenuItem onClick={() => {
          onToggleFavorite(actionCar);
          handleCloseMenu();
        }}>
          {isFavorite(actionCar) ? (
            <>
              <FavoriteIcon fontSize="small" sx={{ mr: 1 }} color="error" />
              Remove from Favorites
            </>
          ) : (
            <>
              <FavoriteBorderIcon fontSize="small" sx={{ mr: 1 }} />
              Add to Favorites
            </>
          )}
        </MenuItem>
        
        {compareMode && (
          <MenuItem onClick={() => {
            onSelectCar(actionCar);
            handleCloseMenu();
          }}>
            <CompareArrowsIcon fontSize="small" sx={{ mr: 1 }} />
            {selectedCars.some(selected => selected.id === actionCar?.id) 
              ? 'Remove from Comparison' 
              : 'Add to Comparison'}
          </MenuItem>
        )}
        
        {actionCar?.listing_url && (
          <MenuItem
            component={Link}
            href={actionCar.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCloseMenu}
          >
            <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
            Open Original Listing
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default ResultsSection;