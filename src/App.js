import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import SearchForm from './components/SearchForm';
import ResultsSection from './components/ResultsSection';
import { searchCars, getSystemStatus } from './services/apiService';

function App() {
  // State to manage search results
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Define systemStatus state here
  const [systemStatus, setSystemStatus] = useState(null);
  
  // Initial search parameters
  const [searchParams, setSearchParams] = useState({
    brand: '',
    model: '',
    yearFrom: new Date().getFullYear() - 10,
    yearTo: new Date().getFullYear(),
    priceFrom: 0,
    priceTo: 100000,
    fuelType: '',
    transmission: ''
  });
  
  // Fetch system status on component mount
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const status = await getSystemStatus();
        setSystemStatus(status);
      } catch (error) {
        console.error("Error fetching system status:", error);
        // We don't set an error state here as this is not critical for the app functionality
      }
    };
    
    fetchSystemStatus();
  }, []);

  // Function to handle search submission
  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the API to search for cars
      const searchResults = await searchCars(searchParams);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      setError("Kļūda meklēšanas laikā. Lūdzu, mēģiniet vēlreiz.");
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle parameter change
  const handleParamChange = (param, value) => {
    setSearchParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  return (
    <div className="app">
      <Header systemStatus={systemStatus} />
      <main className="container">
        <SearchForm 
          params={searchParams}
          onParamChange={handleParamChange}
          onSearch={handleSearch}
          loading={isLoading}
        />
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        <ResultsSection 
          cars={results?.listings || []} 
          isLoading={isLoading} 
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;