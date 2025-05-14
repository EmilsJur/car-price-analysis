const API_BASE_URL = 'http://localhost:5000/api';

// Helper to store the authentication token
const setToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Helper to get the stored token
export const getToken = () => {
  return localStorage.getItem('authToken');
};

// Helper to remove the token (logout)
const removeToken = () => {
  localStorage.removeItem('authToken');
};

// Check if user is logged in
export const isAuthenticated = () => {
  const token = getToken();
  
  if (!token) {
    return false;
  }
  
  // Very basic check for token expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

// Register a new user
export const register = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to register');
    }
    
    // Store the authentication token
    if (data.token) {
      setToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login an existing user
export const login = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to login');
    }
    
    // Store the authentication token
    if (data.token) {
      setToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Logout user
export const logout = () => {
  removeToken();
};

// Get user profile
export const getUserProfile = async () => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get user profile');
    }
    
    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

// Update user preferences
export const updatePreferences = async (preferences) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const response = await fetch(`${API_BASE_URL}/user/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(preferences),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update preferences');
    }
    
    return data;
  } catch (error) {
    console.error('Update preferences error:', error);
    throw error;
  }
};

// Get user's favorites
export const getFavorites = async () => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const response = await fetch(`${API_BASE_URL}/user/favorites`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get favorites');
    }
    
    return data.favorites;
  } catch (error) {
    console.error('Get favorites error:', error);
    throw error;
  }
};

// Add car to favorites
export const addFavorite = async (car) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const response = await fetch(`${API_BASE_URL}/user/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ car }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add favorite');
    }
    
    return data;
  } catch (error) {
    console.error('Add favorite error:', error);
    throw error;
  }
};

// Remove car from favorites
export const removeFavorite = async (carId) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const response = await fetch(`${API_BASE_URL}/user/favorites/${carId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove favorite');
    }
    
    return data;
  } catch (error) {
    console.error('Remove favorite error:', error);
    throw error;
  }
};

// Get user's search history
export const getSearchHistory = async (limit = 10) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const response = await fetch(`${API_BASE_URL}/user/search-history?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get search history');
    }
    
    return data.history;
  } catch (error) {
    console.error('Get search history error:', error);
    throw error;
  }
};

// Add search to history
export const addSearchHistory = async (params) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const response = await fetch(`${API_BASE_URL}/user/search-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ params }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add search to history');
    }
    
    return data;
  } catch (error) {
    console.error('Add search history error:', error);
    throw error;
  }
};