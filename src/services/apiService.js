const API_BASE_URL = 'http://localhost:5000/api';

// Search for cars with filters
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
    console.error('Search failed:', error);
    throw error;
  }
};

// Get car value estimate
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
    console.error('Estimation failed:', error);
    throw error;
  }
};

// Get price history data
export const getPriceHistory = async (brand, model, months = 6) => {
  try {
    const url = new URL(`${API_BASE_URL}/price-history`);
    url.searchParams.append('brand', brand);
    url.searchParams.append('model', model);
    url.searchParams.append('months', String(months));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Price history failed:', error);
    throw error;
  }
};

// Get price distribution chart
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

    return await response.json();
  } catch (error) {
    console.error('Chart generation failed:', error);
    throw error;
  }
};

// Get detailed listing info from SS.LV
export const getListingDetails = async (listingUrl) => {
  try {
    const apiUrl = new URL(`${API_BASE_URL}/listing-details`);
    apiUrl.searchParams.append('url', listingUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get listing details:', error);
    throw error;
  }
};

// Get price trend chart
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
    console.error('Trend chart failed:', error);
    throw error;
  }
};

// Get list of regions
export const getRegions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/regions`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch regions:', error);
    throw error;
  }
};

// Get region price stats
export const getRegionStatistics = async (brand, model, yearFrom, yearTo) => {
  try {
    const url = new URL(`${API_BASE_URL}/region-stats`);
    
    if (brand) url.searchParams.append('brand', brand);
    if (model) url.searchParams.append('model', model);
    if (yearFrom) url.searchParams.append('yearFrom', yearFrom);
    if (yearTo) url.searchParams.append('yearTo', yearTo);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.regions || !Array.isArray(data.regions)) {
      console.warn('Invalid region data received:', data);
      throw new Error('Invalid data format');
    }
    
    return data;
    
  } catch (error) {
    console.error('Region stats failed:', error);
    throw error;
  }
};

// Get popular brands
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
    console.error('Failed to get brands:', error);
    throw error;
  }
};

// Get popular models for a brand
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
    console.error('Failed to get models:', error);
    throw error;
  }
};

// System health check
export const getSystemStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/status`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('System status check failed:', error);
    throw error;
  }
};

// Trigger scraping (admin only)
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
    console.error('Scraping trigger failed:', error);
    throw error;
  }
};