import logging
from models import init_db
from all_in_one_scraper import init_default_sources, scrape_all_sources
from analysis import CarDataAnalyzer

class CarPriceController:
    """Main controller class for the Car Price Analysis System"""
    
    def __init__(self, db_url="sqlite:///car_price_analysis.db"):
        """Initialize the controller with database connection"""
        # Set up logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            filename='controller.log'
        )
        self.logger = logging.getLogger('car_controller')
        
        # Initialize database
        self.session, self.engine = init_db(db_url)
        
        # Initialize analyzer
        self.analyzer = CarDataAnalyzer(self.session)
        
        self.logger.info("Controller initialized")
    
    def initialize_sources(self):
        """Initialize default data sources"""
        try:
            init_default_sources(self.session)
            self.logger.info("Default sources initialized")
            return True
        except Exception as e:
            self.logger.error(f"Error initializing sources: {str(e)}")
            return False
    
    def run_scraper(self, max_listings=1000):
        """Run web scraping for all sources"""
        try:
            results = scrape_all_sources(self.session, max_listings)
            self.logger.info(f"Scraping completed with results: {results}")
            return results
        except Exception as e:
            self.logger.error(f"Error running scrapers: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_price_statistics(self, brand=None, model=None, year_from=None, year_to=None):
        """Get price statistics for specified parameters"""
        try:
            stats = self.analyzer.get_price_statistics(
                brand=brand,
                model=model,
                year_from=year_from,
                year_to=year_to
            )
            return stats
        except Exception as e:
            self.logger.error(f"Error getting price statistics: {str(e)}")
            return None
    
    def get_popular_brands(self, limit=10):
        """Get most popular car brands"""
        try:
            brands = self.analyzer.get_popular_brands(limit=limit)
            return brands
        except Exception as e:
            self.logger.error(f"Error getting popular brands: {str(e)}")
            return []
    
    def get_popular_models(self, brand=None, limit=10):
        """Get most popular car models for a brand"""
        try:
            models = self.analyzer.get_popular_models(brand=brand, limit=limit)
            return models
        except Exception as e:
            self.logger.error(f"Error getting popular models: {str(e)}")
            return []
    
    def close(self):
        """Close database connection"""
        self.session.close()
        self.logger.info("Controller closed")