# schedule_scraper.py
import os
import sys
import logging
import time
from datetime import datetime, timedelta
from ss_scraper import run_ss_scraper

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='scheduled_scraper.log'
)
logger = logging.getLogger('schedule_scraper')

def run_scheduled_job():
    """Run the scraper as a scheduled job with optimal parameters"""
    logger.info(f"Starting scheduled scrape job at {datetime.now()}")
    
    try:
        # Run the scraper with more extensive parameters
        result = run_ss_scraper(
            max_brands=10,           # Scrape more brands in scheduled job
            models_per_brand=5,      # More models per brand
            pages_per_model=3,       # More pages per model
            max_concurrent_requests=5,  # Be gentle with the server
            mark_inactive_after_days=30  # Mark as inactive after 30 days
        )
        
        # Log results
        if result["success"]:
            logger.info(f"Scheduled scrape completed successfully:")
            logger.info(f"Total listings: {result['total_listings']}")
            logger.info(f"New listings: {result['new_listings']}")
            logger.info(f"Updated listings: {result['updated_listings']}")
            logger.info(f"Deactivated listings: {result['deactivated_listings']}")
            logger.info(f"Time taken: {result['elapsed_time']}")
            
            # Create a report file
            report_dir = "scraper_reports"
            os.makedirs(report_dir, exist_ok=True)
            
            report_file = os.path.join(
                report_dir, 
                f"scraper_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            )
            
            with open(report_file, 'w') as f:
                f.write(f"Scraper Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("-" * 50 + "\n")
                f.write(f"Total listings processed: {result['total_listings']}\n")
                f.write(f"New listings added: {result['new_listings']}\n")
                f.write(f"Listings updated: {result['updated_listings']}\n")
                f.write(f"Listings marked inactive: {result['deactivated_listings']}\n")
                f.write(f"Time taken: {result['elapsed_time']}\n")
                f.write(f"Timestamp: {result['timestamp']}\n")
            
            logger.info(f"Report saved to {report_file}")
            return True
        else:
            logger.error(f"Scheduled scrape failed: {result['error']}")
            return False
            
    except Exception as e:
        logger.error(f"Error in scheduled job: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Schedule SS.LV Car Scraper")
    parser.add_argument('--now', action='store_true', help='Run immediately instead of waiting')
    parser.add_argument('--time', type=str, default="03:00", help='Time to run daily (24h format, e.g. 03:00)')
    
    args = parser.parse_args()
    
    if args.now:
        print(f"Running scraper now...")
        run_scheduled_job()
    else:
        try:
            import schedule
            
            # Set up schedule to run daily at specified time (default 3 AM)
            schedule.every().day.at(args.time).do(run_scheduled_job)
            
            print(f"Scheduled scraping set up to run daily at {args.time}.")
            print("Press Ctrl+C to exit.")
            
            # Keep the script running
            while True:
                n = schedule.idle_seconds()
                if n is None:
                    # No more jobs
                    break
                elif n > 0:
                    # Sleep until the next job
                    time.sleep(min(n, 60))  # Check at least every minute
                
                schedule.run_pending()
                
        except ModuleNotFoundError:
            print("Schedule module not found. Install it with: pip install schedule")
            print("Running a single scrape instead...")
            run_scheduled_job()
        except KeyboardInterrupt:
            print("\nStopping scheduled scraper.")
            sys.exit(0)