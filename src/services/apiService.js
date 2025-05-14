const API_BASE_URL = 'http://localhost:5000/api'; // adresi vajag izmainit production vide

/**
 * Searches for cars based on given criteria.
 * @param {Object} params - Search filters (e.g., brand, model, year).
 * @returns {Promise<Array>} Array of car objects matching the search.
 */
export const searchCars = async (params) => {
  try {
    // izveidojam POST request ar visiem meklesanas parametriem
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      // ja serveris atmet kludu, metam to talak
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error: Failed to search cars:', error);
    throw error; // nodod kludu talak lai komponente zinat ka ir bijusi problema
  }
};

/**
 * Estimates a car's value based on its parameters.
 * @param {Object} params - Car details for estimation.
 * @returns {Promise<Object>} Estimation result.
 */
export const estimateCarValue = async (params) => {
  try {
    // sut auto datus serverim lai apreikinatu vertibu
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
  // vajadzetu parlabot API lai tikskotr ar lielam months vertibam
  try {
    const url = new URL(`${API_BASE_URL}/price-history`);
    url.searchParams.append('brand', brand);
    url.searchParams.append('model', model);
    url.searchParams.append('months', String(months)); // jabut string formatam

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
    // izveidojam URL ar visiem filtracijas parametriem
    const url = new URL(`${API_BASE_URL}/charts/price-distribution`);
    if (brand) url.searchParams.append('brand', brand);
    if (model) url.searchParams.append('model', model);
    if (yearFrom) url.searchParams.append('yearFrom', String(yearFrom));
    if (yearTo) url.searchParams.append('yearTo', String(yearTo));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
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
  // reizem šis darbojas diezgan leni, drusku jauzlabo
  try {
    const apiUrl = new URL(`${API_BASE_URL}/listing-details`);
    // servers gaida url ka query param
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
    // pieprasa cenu tendences grafiku no servera
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
    // dabu visus pieejamos regionus no servera
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
    
    // pievieno parametrus ja tie eksiste
    if (brand) url.searchParams.append('brand', brand);
    if (model) url.searchParams.append('model', model);
    if (yearFrom) url.searchParams.append('yearFrom', yearFrom);
    if (yearTo) url.searchParams.append('yearTo', yearTo);
    
    console.log('Fetching region statistics:', url.toString());
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // parbaudi vai sanemtie dati ir derigi
    if (!data.regions || !Array.isArray(data.regions)) {
      console.warn('Invalid region statistics data received:', data);
      throw new Error('Invalid data format received from server');
    }
    
    return data;
    
  } catch (error) {
    console.error('Error fetching region statistics:', error);
    throw error;
  }
};

/**
 * Gets a list of popular car brands.
 * @param {number} [limit=10] - Max number of brands to return.
 * @returns {Promise<Array>} List of popular brands.
 */
export const getPopularBrands = async (limit = 10) => {
  try {
    // dabu popularakas auto markas no servera
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
    // dabu popularakos modelus priekš konkretas markas
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
  // labi butu šito parbadit regulari lai redz vai sistema strada
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
    // šito vajag aizsargat ar kaut kadu autentifikaciju
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
    console.error('API Error: Failed to trigger scraping:', error);
    throw error;
  }
};