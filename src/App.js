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
  const [systemStatus, setSystemStatus] = useState(null);
  
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
  const handleSearch = async (searchParams) => {
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

  return (
    <div className="app">
      <Header systemStatus={systemStatus} />
      <main className="container">
        <SearchForm onSearch={handleSearch} />
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        <ResultsSection results={results} isLoading={isLoading} />
      </main>
      <Footer />
    </div>
  );
}

export default App;