import logging
import os
from ss_scraper import SSScraper, run_ss_scraper

# Create debug directory
os.makedirs("debug_html", exist_ok=True)

# Set up detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("test_ss_scraper.log"),
        logging.StreamHandler()  # Also output to console
    ]
)

# Test a specific brand and model directly
def test_specific_model():
    print("\n======= Testing specific brand/model =======")
    scraper = SSScraper(debug_mode=True)
    
    # Directly scrape a known working brand/model combination
    brand_data = {"name": "Volkswagen", "url": "https://www.ss.lv/lv/transport/cars/volkswagen/"}
    model_data = {"name": "Passat", "url": "https://www.ss.lv/lv/transport/cars/volkswagen/passat/"}
    
    # Try to get listings
    listings = scraper.get_listings_for_model(brand_data, model_data, max_pages=1)
    
    print(f"Found {len(listings)} listings for Volkswagen Passat")
    
    # Process the first listing if available
    if listings:
        first_listing = listings[0]
        print(f"Example listing: {first_listing.get('external_id')} - {first_listing.get('title')}")
        
        # Try to get details and save
        if first_listing.get('url'):
            details = scraper.get_listing_details(first_listing)
            print(f"Details extracted: Year={details.get('year')}, Price={details.get('price')}, Engine={details.get('engine')}")
            
            # Try to save to database
            success = scraper.save_car_and_listing(details)
            print(f"Database save {'successful' if success else 'failed'}")
    else:
        print("No listings found to process")
    
    scraper.session.close()

# Test with minimal parameters to quickly validate
def test_full_scraper():
    print("\n======= Testing full scraper with minimal parameters =======")
    result = run_ss_scraper(
        max_brands=1,   # Just one brand for testing
        models_per_brand=1,  # Just one model 
        pages_per_model=1,   # Just one page
        debug_mode=True      # Save HTML for debugging
    )

    print("\nScraper Test Results:")
    print("=====================")
    if result["success"]:
        print(f"✓ Success!")
        print(f"✓ Total listings processed: {result['total_listings']}")
        print(f"✓ New listings added: {result['new_listings']}")
        print(f"✓ Time taken: {result['elapsed_time']}")
    else:
        print(f"✗ Failed: {result['error']}")

if __name__ == "__main__":
    # Run both tests
    test_specific_model()
    test_full_scraper()