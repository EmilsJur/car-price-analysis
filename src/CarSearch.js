import React, { useState, useEffect } from 'react';
import { 
  Container, Form, Button, Card, Table, 
  Spinner, Alert, Row, Col 
} from 'react-bootstrap';
import axios from 'axios';

const CarSearch = () => {
  // State management
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [listings, setListings] = useState([]);
  const [chartUrl, setChartUrl] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    yearFrom: '',
    yearTo: '',
    fuelType: '',
    transmission: ''
  });
  
  // Load brands when component mounts
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get('/api/popular/brands?limit=20');
        setBrands(response.data.brands);
      } catch (err) {
        setError('Error loading brands: ' + err.message);
      }
    };
    
    fetchBrands();
  }, []);
  
  // Load models when brand changes
  useEffect(() => {
    if (!formData.brand) {
      setModels([]);
      return;
    }
    
    const fetchModels = async () => {
      try {
        const response = await axios.get(`/api/popular/models?brand=${formData.brand}&limit=30`);
        setModels(response.data.models);
      } catch (err) {
        setError('Error loading models: ' + err.message);
      }
    };
    
    fetchModels();
  }, [formData.brand]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear model if brand changes
    if (name === 'brand') {
      setFormData(prev => ({ ...prev, model: '' }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Search request
      const response = await axios.post('/api/search', formData);
      setStatistics(response.data.statistics);
      setListings(response.data.listings);
      
      // Get price distribution chart
      if (formData.brand) {
        const chartParams = new URLSearchParams({
          brand: formData.brand,
          ...(formData.model && { model: formData.model }),
          ...(formData.yearFrom && { yearFrom: formData.yearFrom }),
          ...(formData.yearTo && { yearTo: formData.yearTo })
        });
        
        const chartResponse = await axios.get(`/api/charts/price-distribution?${chartParams}`);
        if (chartResponse.data.chart) {
          setChartUrl(`data:image/png;base64,${chartResponse.data.chart}`);
        }
      }
    } catch (err) {
      setError('Error searching: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="py-4">
      <h1 className="mb-4">Car Price Analysis</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Header as="h5">Search Parameters</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Brand</Form.Label>
                  <Form.Select 
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                  >
                    <option value="">Select Brand</option>
                    {brands.map(brand => (
                      <option key={brand.name} value={brand.name}>
                        {brand.name} ({brand.count})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Model</Form.Label>
                  <Form.Select 
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    disabled={!formData.brand}
                  >
                    <option value="">Select Model</option>
                    {models.map(model => (
                      <option key={model.model} value={model.model}>
                        {model.model} ({model.count})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Year From</Form.Label>
                  <Form.Control
                    type="number"
                    name="yearFrom"
                    value={formData.yearFrom}
                    onChange={handleChange}
                    placeholder="e.g. 2015"
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Year To</Form.Label>
                  <Form.Control
                    type="number"
                    name="yearTo"
                    value={formData.yearTo}
                    onChange={handleChange}
                    placeholder="e.g. 2022"
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Fuel Type</Form.Label>
                  <Form.Select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleChange}
                  >
                    <option value="">Any</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                    <option value="Gas">Gas</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Transmission</Form.Label>
                  <Form.Select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleChange}
                  >
                    <option value="">Any</option>
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <div className="d-grid">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading || !formData.brand}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    {" "}Searching...
                  </>
                ) : "Search"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      {statistics && (
        <Card className="mb-4">
          <Card.Header as="h5">Price Statistics</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Table striped bordered hover>
                  <tbody>
                    <tr>
                      <th>Sample Size</th>
                      <td>{statistics.count}</td>
                    </tr>
                    <tr>
                      <th>Average Price</th>
                      <td>€{statistics.average_price.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th>Median Price</th>
                      <td>€{statistics.median_price.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th>Min Price</th>
                      <td>€{statistics.min_price.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th>Max Price</th>
                      <td>€{statistics.max_price.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              
              <Col md={6}>
                {chartUrl && (
                  <div className="text-center">
                    <img 
                      src={chartUrl} 
                      alt="Price Distribution" 
                      className="img-fluid" 
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      
      {listings.length > 0 && (
        <Card>
          <Card.Header as="h5">Similar Listings</Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Model</th>
                    <th>Engine</th>
                    <th>Transmission</th>
                    <th>Mileage</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing, index) => (
                    <tr key={index}>
                      <td>{listing.year}</td>
                      <td>{listing.brand} {listing.model}</td>
                      <td>{listing.engine}</td>
                      <td>{listing.transmission}</td>
                      <td>{listing.mileage.toLocaleString()} km</td>
                      <td>€{listing.price.toLocaleString()}</td>
                      <td>
                        {listing.url && (
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            href={listing.url}
                            target="_blank"
                          >
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default CarSearch;