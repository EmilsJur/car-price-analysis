import os
import argparse
import logging
from models import init_db
from ss_scraper import run_ss_scraper
from api import app as api_app

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='app.log'
)
logger = logging.getLogger('car_app')

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Car Price Analysis System')
    
    parser.add_argument('--mode', choices=['api', 'scrape', 'init'], default='api',
                      help='Run mode: api (default), scrape (run scraping only), init (initialize database)')
    
    parser.add_argument('--port', type=int, default=5000,
                      help='Port number for API server (default: 5000)')
    
    parser.add_argument('--debug', action='store_true',
                      help='Run in debug mode')
    
    # New arguments for the scraper
    parser.add_argument('--brands', type=int, default=4,
                      help='Maximum number of brands to scrape (default: 4)')
    
    parser.add_argument('--models', type=int, default=3,
                      help='Maximum number of models per brand (default: 3)')
    
    parser.add_argument('--pages', type=int, default=2,
                      help='Maximum number of pages per model (default: 2)')
    
    return parser.parse_args()

def init_database():
    """Initialize database with default data"""
    logger.info("Initializing database")
    
    # Just initialize the database
    session, _ = init_db()
    
    logger.info("Database initialization completed")

def run_scraper(args):
    """Run scraping process with our scraper"""
    logger.info("Starting scraping process")
    
    # Use our scraper with parameters from command line
    target_brands = ["tesla", "infiniti", "smart", "suzuki"]
    
    results = run_ss_scraper(
        target_brands=target_brands,
        pages_per_model=args.pages,
        debug_mode=args.debug
    )
    
    logger.info("Scraping process completed")
    
    if results["success"]:
        logger.info(f"Scraping successful: {results['total_listings']} listings processed")
        logger.info(f"New: {results['new_listings']}, Updated: {results['updated_listings']}")
    else:
        logger.error(f"Scraping failed: {results['error']}")

def run_api_server(port, debug):
    """Run API server"""
    logger.info(f"Starting API server on port {port}")
    api_app.run(host='0.0.0.0', port=port, debug=debug)

def main():
    """Main entry point"""
    args = parse_arguments()
    
    if args.mode == 'init':
        init_database()
    elif args.mode == 'scrape':
        run_scraper(args)
    elif args.mode == 'api':
        run_api_server(args.port, args.debug)
    else:
        logger.error(f"Unknown mode: {args.mode}")

if __name__ == "__main__":
    main()