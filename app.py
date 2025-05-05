import os
import argparse
import logging
from models import init_db
from all_in_one_scraper import init_default_sources, scrape_all_sources
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
    
    return parser.parse_args()

def init_database():
    """Initialize database with default data"""
    logger.info("Initializing database")
    
    session, _ = init_db()
    init_default_sources(session)
    
    logger.info("Database initialization completed")

def run_scraper():
    """Run scraping process for all sources"""
    logger.info("Starting scraping process")
    
    session, _ = init_db()
    results = scrape_all_sources(session)
    
    logger.info("Scraping process completed")
    
    for source_name, result in results.items():
        if result["success"]:
            logger.info(f"Source {source_name}: {result['new_listings']} new listings out of {result['total_listings']} total")
        else:
            logger.error(f"Source {source_name}: {result['error']}")

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
        run_scraper()
    elif args.mode == 'api':
        run_api_server(args.port, args.debug)
    else:
        logger.error(f"Unknown mode: {args.mode}")

if __name__ == "__main__":
    main()