import os
import json
from pathlib import Path

class Config:
    """Configuration settings for Car Price Analysis System"""
    
    def __init__(self, config_file=None):
        """Initialize configuration from file or environment variables"""
        self.config = {}
        
        # Default configuration
        self.config = {
            'db_url': os.environ.get('CAR_PRICE_DB_URL', 'sqlite:///car_price_analysis.db'),
            'api_host': os.environ.get('CAR_PRICE_API_HOST', '0.0.0.0'),
            'api_port': int(os.environ.get('CAR_PRICE_API_PORT', 5000)),
            'debug': os.environ.get('CAR_PRICE_DEBUG', 'False').lower() == 'true',
            'log_level': os.environ.get('CAR_PRICE_LOG_LEVEL', 'INFO'),
            'scrape_interval_hours': int(os.environ.get('CAR_PRICE_SCRAPE_INTERVAL', 24)),
            'max_listings_per_source': int(os.environ.get('CAR_PRICE_MAX_LISTINGS', 1000)),
            'frontend_url': os.environ.get('CAR_PRICE_FRONTEND_URL', 'http://localhost:3000')
        }
        
        # Load from config file if provided
        if config_file:
            self._load_from_file(config_file)
    
    def _load_from_file(self, config_file):
        """Load configuration from JSON file"""
        try:
            config_path = Path(config_file)
            if config_path.exists():
                with open(config_path, 'r') as file:
                    file_config = json.load(file)
                    self.config.update(file_config)
        except Exception as e:
            print(f"Error loading config file: {str(e)}")
    
    def get(self, key, default=None):
        """Get configuration value"""
        return self.config.get(key, default)
    
    def __getitem__(self, key):
        """Get configuration value using dictionary syntax"""
        return self.config[key]
    
    def __setitem__(self, key, value):
        """Set configuration value using dictionary syntax"""
        self.config[key] = value