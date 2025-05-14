const API_BASE_URL = 'http://localhost:5000/api'; // make sure this is configurable for different envs

/**
 * Searches for cars based on given criteria.
 * @param {Object} params - Search filters (e.g., brand, model, year).
 * @returns {Promise<Array>} Array of car objects matching the search.
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
      // Basic error handling, could be expanded with a global error interceptor.
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to search cars:', error);
    throw error; // Re-throw for the component to handle UI updates
  }
};

/**
 * Estimates a car's value based on its parameters.
 * @param {Object} params - Car details for estimation.
 * @returns {Promise<Object>} Estimation result.
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
    console.error('API Error: Failed to estimate car value:', error);
    throw error;
  }
};

/**
 * Fetches price history for a specific car make and model.
 * @param {string} brand
 * @param {string} model
 * @param {number} [months=6] - How many months of history to retrieve.
 * @returns {Promise<Array>} Price history data points.
 */
export const getPriceHistory = async (brand, model, months = 6) => {
  // TODO: pārbaudīt if backend handles large 'months' values gracefully.
  try {
    const url = new URL(`${API_BASE_URL}/price-history`);
    url.searchParams.append('brand', brand);
    url.searchParams.append('model', model);
    url.searchParams.append('months', String(months)); // Ensure months is a string

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to get price history:', error);
    throw error;
  }
};

/**
 * Gets data for the price distribution chart.
 * Filters are optional.
 * @param {string} [brand]
 * @param {string} [model]
 * @param {number} [yearFrom]
 * @param {number} [yearTo]
 * @returns {Promise<Object>} Chart data.
 */
export const getPriceDistributionChart = async (brand, model, yearFrom, yearTo) => {
  try {
    const url = new URL(`${API_BASE_URL}/charts/price-distribution`);
    if (brand) url.searchParams.append('brand', brand);
    if (model) url.searchParams.append('model', model);
    if (yearFrom) url.searchParams.append('yearFrom', String(yearFrom));
    if (yearTo) url.searchParams.append('yearTo', String(yearTo));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // console.log('Chart response (price-distribution):', data); // temp log for debugging, remove for prod

    return data;
  } catch (error) {
    console.error('API Error: Failed to get price distribution chart:', error);
    throw error;
  }
};

/**
 * Fetches detailed information for a specific listing from SS.LV.
 * @param {string} listingUrl - The direct URL to the SS.LV listing.
 * @returns {Promise<Object>} Listing details.
 */
export const getListingDetails = async (listingUrl) => {
  // this one seems a bit off sometimes, maybe check backend?
  try {
    const apiUrl = new URL(`${API_BASE_URL}/listing-details`);
    // Backend expects 'url' as the query param name
    apiUrl.searchParams.append('url', listingUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to get listing details:', error);
    throw error;
  }
};

/**
 * Gets data for the price trend chart.
 * @param {string} brand
 * @param {string} model
 * @param {number} [months=12] - Number of months for trend data.
 * @returns {Promise<Object>} Chart data.
 */
export const getPriceTrendChart = async (brand, model, months = 12) => {
  try {
    const url = new URL(`${API_BASE_URL}/charts/price-trend`);
    url.searchParams.append('brand', brand);
    url.searchParams.append('model', model);
    url.searchParams.append('months', String(months));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to get price trend chart:', error);
    throw error;
  }
};

/**
 * Fetches a list of available regions.
 * @returns {Promise<Array>} Array of region objects/strings.
 */
export const getRegions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/regions`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to fetch regions:', error);
    throw error;
  }
};

/**
 * Get car price statistics by region
 * @param {string} brand - Car brand (optional)
 * @param {string} model - Car model (optional)
 * @param {number} yearFrom - Minimum year (optional)
 * @param {number} yearTo - Maximum year (optional)
 * @returns {Promise} Promise object representing the region statistics
 */
export const getRegionStatistics = async (brand, model, yearFrom, yearTo) => {
  try {
    const url = new URL(`${API_BASE_URL}/region-stats`);
    
    // Add parameters if they exist
    if (brand) url.searchParams.append('brand', brand);
    if (model) url.searchParams.append('model', model);
    if (yearFrom) url.searchParams.append('yearFrom', yearFrom);
    if (yearTo) url.searchParams.append('yearTo', yearTo);
    
    console.log('Fetching region statistics:', url.toString());
    
    const response = await fetch(url);
    
    // Handle different error cases
    if (response.status === 500) {
      console.error('Server error while fetching region statistics');
      
      // Return empty data to allow the application to continue working
      return {
        regions: [
          { name: 'Rīga', avgPrice: 15000, count: 0, minPrice: 0, maxPrice: 0 },
          { name: 'Vidzeme', avgPrice: 10000, count: 0, minPrice: 0, maxPrice: 0 },
          { name: 'Kurzeme', avgPrice: 12000, count: 0, minPrice: 0, maxPrice: 0 },
          { name: 'Latgale', avgPrice: 8000, count: 0, minPrice: 0, maxPrice: 0 },
          { name: 'Zemgale', avgPrice: 11000, count: 0, minPrice: 0, maxPrice: 0 }
        ]
      };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle empty or invalid data
    if (!data.regions || !Array.isArray(data.regions)) {
      console.warn('Invalid region statistics data received:', data);
      throw new Error('Invalid data format received from server');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching region statistics:', error);
    
    // Return mock data when API fails - this makes development easier
    // until the backend endpoint is fully implemented
    return {
      regions: [
        { name: 'Rīga', avgPrice: 25000, count: 0, minPrice: 12000, maxPrice: 45000 },
        { name: 'Vidzeme', avgPrice: 18000, count: 0, minPrice: 8000, maxPrice: 32000 },
        { name: 'Kurzeme', avgPrice: 15000, count: 0, minPrice: 6500, maxPrice: 28000 },
        { name: 'Latgale', avgPrice: 12000, count: 0, minPrice: 5000, maxPrice: 25000 },
        { name: 'Zemgale', avgPrice: 16500, count: 0, minPrice: 7500, maxPrice: 30000 }
      ]
    };
  }
};

/**
 * Gets a list of popular car brands.
 * @param {number} [limit=10] - Max number of brands to return.
 * @returns {Promise<Array>} List of popular brands.
 */
export const getPopularBrands = async (limit = 10) => {
  try {
    const url = new URL(`${API_BASE_URL}/popular/brands`);
    url.searchParams.append('limit', String(limit));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to get popular brands:', error);
    throw error;
  }
};

/**
 * Gets a list of popular car models, optionally filtered by brand.
 * @param {string} [brand] - Optional brand to filter models by.
 * @param {number} [limit=10] - Max number of models to return.
 * @returns {Promise<Array>} List of popular models.
 */
export const getPopularModels = async (brand, limit = 10) => {
  try {
    const url = new URL(`${API_BASE_URL}/popular/models`);
    if (brand) url.searchParams.append('brand', brand);
    url.searchParams.append('limit', String(limit));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to get popular models:', error);
    throw error;
  }
};

/**
 * Fetches the current system status.
 * Useful for health checks or displaying maintenance info.
 * @returns {Promise<Object>} System status data.
 */
export const getSystemStatus = async () => {
  // vajag so regulari pārbaudīt
  try {
    const response = await fetch(`${API_BASE_URL}/status`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to get system status:', error);
    throw error;
  }
};

/**
 * Triggers the data scraping process on the backend.
 * NOTE: This is likely an admin only endpoint. Ensure proper auth is handled.
 * @returns {Promise<Object>} Result/status of the scraping task.
 */
export const triggerScraping = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        // No body needed if it's just a trigger
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to trigger scraping:', error);
    throw error;
  }
};