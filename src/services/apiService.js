
/**
 * API service for communicating with the backend
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Search for cars based on specified criteria
 * @param {Object} params - Search parameters
 * @returns {Promise} Promise object representing the search results
 */
export const searchCars = async (params) => {
  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching cars:', error);
    throw error;
  }
};

/**
 * Estimate car value based on specified parameters
 * @param {Object} params - Car parameters
 * @returns {Promise} Promise object representing the estimation results
 */
export const estimateCarValue = async (params) => {
  try {
    const response = await fetch(`${API_BASE_URL}/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error estimating car value:', error);
    throw error;
  }
};

/**
 * Get price history for a specific car model
 * @param {string} brand - Car brand
 * @param {string} model - Car model
 * @param {number} months - Number of months to look back
 * @returns {Promise} Promise object representing the price history data
 */
export const getPriceHistory = async (brand, model, months = 6) => {
  try {
    const url = new URL(`${API_BASE_URL}/price-history`);
    url.searchParams.append('brand', brand);
    url.searchParams.append('model', model);
    url.searchParams.append('months', months);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting price history:', error);
    throw error;
  }
};

/**
 * Get price distribution chart
 * @param {string} brand - Car brand (optional)
 * @param {string} model - Car model (optional)
 * @param {number} yearFrom - Minimum year (optional)
 * @param {number} yearTo - Maximum year (optional)
 * @returns {Promise} Promise object representing the chart data
 */
export const getPriceDistributionChart = async (brand, model, yearFrom, yearTo) => {
  try {
    const url = new URL(`${API_BASE_URL}/charts/price-distribution`);
    if (brand) url.searchParams.append('brand', brand);
    if (model) url.searchParams.append('model', model);
    if (yearFrom) url.searchParams.append('yearFrom', yearFrom);
    if (yearTo) url.searchParams.append('yearTo', yearTo);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting price distribution chart:', error);
    throw error;
  }
};

/**
 * Get price trend chart
 * @param {string} brand - Car brand
 * @param {string} model - Car model
 * @param {number} months - Number of months to look back
 * @returns {Promise} Promise object representing the chart data
 */
export const getPriceTrendChart = async (brand, model, months = 12) => {
  try {
    const url = new URL(`${API_BASE_URL}/charts/price-trend`);
    url.searchParams.append('brand', brand);
    url.searchParams.append('model', model);
    url.searchParams.append('months', months);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting price trend chart:', error);
    throw error;
  }
};

/**
 * Get popular car brands
 * @param {number} limit - Maximum number of brands to return
 * @returns {Promise} Promise object representing the popular brands data
 */
export const getPopularBrands = async (limit = 10) => {
  try {
    const url = new URL(`${API_BASE_URL}/popular/brands`);
    url.searchParams.append('limit', limit);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting popular brands:', error);
    throw error;
  }
};

/**
 * Get popular car models
 * @param {string} brand - Car brand (optional)
 * @param {number} limit - Maximum number of models to return
 * @returns {Promise} Promise object representing the popular models data
 */
export const getPopularModels = async (brand, limit = 10) => {
  try {
    const url = new URL(`${API_BASE_URL}/popular/models`);
    if (brand) url.searchParams.append('brand', brand);
    url.searchParams.append('limit', limit);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting popular models:', error);
    throw error;
  }
};

/**
 * Get system status
 * @returns {Promise} Promise object representing the system status data
 */
export const getSystemStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting system status:', error);
      throw error;
    }
  };
  
  /**
   * Trigger data scraping process (admin only)
   * @returns {Promise} Promise object representing the scraping results
   */
  export const triggerScraping = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error triggering scraping:', error);
      throw error;
    }
  };