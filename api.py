from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from models import init_db, Brand, Model, Car, Listing, Region, Source # include Source
from ss_scraper import run_ss_scraper
from analysis import CarDataAnalyzer
from sqlalchemy import func, and_, or_, desc, asc, case, distinct
import jwt
from functools import wraps
from auth_models import AuthDB
import re
import sqlite3
#init auth db
auth_db = AuthDB()

logging.basicConfig(
    level=logging.INFO, # You can change to logging.DEBUG for more verbosity
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='api.log' # Logging to api.log
)
logger = logging.getLogger('car_api') # General API logger
logger_listing_details = logging.getLogger('car_api.listing_details') # Specific for details endpoint


# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])

# Initialize database session and analyzer
# This should be how your project sets them up
session, engine = init_db() # Assuming init_db is in models.py and returns session & engine
analyzer = CarDataAnalyzer(session) # Assuming CarDataAnalyzer is in analysis.py


@app.route('/api/search', methods=['POST'])
def search_cars():
    """Handles car search requests based on various criteria."""
    try:
        data = request.json
        
        # Extracting search parameters from the request
        brand = data.get('brand')
        model = data.get('model')
        year_from = data.get('yearFrom')
        year_to = data.get('yearTo')
        fuel_type = data.get('fuelType')
        transmission = data.get('transmission')
        price_from = data.get('priceFrom')
        price_to = data.get('priceTo')
        region = data.get('region')
        
        logger.info(f"Search request with filters - region: {region}, fuel_type: {fuel_type}")
        logger.info(f"Search request received: brand={brand}, model={model}, year={year_from}-{year_to}, fuel={fuel_type}, transmission={transmission}, price={price_from}-{price_to}")
        
        # Fetching price statistics using the analyzer
        statistics = analyzer.get_price_statistics(
            brand=brand,
            model=model,
            year_from=year_from,
            year_to=year_to,
            fuel_type=fuel_type
        )
        
        # Building the query to find matching listings
        listings = []
        if brand:  # Brand is a minimum requirement for searching listings here
            from sqlalchemy import func # Importing func for SQLAlchemy specific functions like lower
            
            query = (
                analyzer.session.query(
                    Brand.name.label('brand'),
                    Model.name.label('model'),
                    Car.year,
                    Car.engine_volume,
                    Car.engine_type,
                    Car.transmission,
                    Car.mileage,
                    Car.body_type, 
                    Car.color,
                    Car.tech_inspection,
                    Listing.price,
                    Listing.listing_date,
                    Listing.listing_url,
                    Listing.external_id,
                    Region.name.label('region')
                )
                .join(Model, Brand.brand_id == Model.brand_id)
                .join(Car, Model.model_id == Car.model_id)
                .join(Listing, Car.car_id == Listing.car_id)
                .join(Region, Car.region_id == Region.region_id) # Ensure Region is joined
                .filter(func.lower(Brand.name) == func.lower(brand))
            )
            
            if model:
                query = query.filter(func.lower(Model.name) == func.lower(model))
            if year_from:
                query = query.filter(Car.year >= year_from)
            if year_to:
                query = query.filter(Car.year <= year_to)
            if fuel_type:
                logger.info(f"Applying fuel type filter: {fuel_type}")
                
                # First, let's handle the standard fuel types with proper pattern matching
                if fuel_type.lower() in ['petrol', 'benzīns', 'benzins']:
                    query = query.filter(func.lower(Car.engine_type).like('%benzīn%') | 
                                        func.lower(Car.engine_type).like('%petrol%'))
                    logger.info("Applied petrol/benzins filter")
                elif fuel_type.lower() in ['diesel', 'dīzelis', 'dizelis']:
                    query = query.filter(func.lower(Car.engine_type).like('%dīzel%') | 
                                        func.lower(Car.engine_type).like('%diesel%'))
                    logger.info("Applied diesel/dizelis filter")
                elif fuel_type.lower() in ['hybrid', 'hibrīds', 'hibrids']:
                    query = query.filter(func.lower(Car.engine_type).like('%hibrīd%') | 
                                        func.lower(Car.engine_type).like('%hybrid%'))
                    logger.info("Applied hybrid filter")
                elif fuel_type.lower() in ['electric', 'elektriskais', 'elektrisks']:
                    query = query.filter(func.lower(Car.engine_type).like('%elektr%'))
                    logger.info("Applied electric filter")
                elif fuel_type.lower() in ['gas', 'gāze', 'gaze']:
                    query = query.filter(func.lower(Car.engine_type).like('%gāz%') | 
                                        func.lower(Car.engine_type).like('%gas%'))
                    logger.info("Applied gas filter")
                else:
                    # Fallback to a partial match
                    query = query.filter(func.lower(Car.engine_type).like(f'%{fuel_type.lower()}%'))
                    logger.info(f"Applied generic filter: %{fuel_type.lower()}%")
            if transmission:
                query = query.filter(func.lower(Car.transmission) == func.lower(transmission))
            if price_from:
                query = query.filter(Listing.price >= price_from)
            if price_to:
                query = query.filter(Listing.price <= price_to)
            if region:
                query = query.filter(func.lower(Region.name) == func.lower(region))
            
            query = query.filter(Listing.is_active == True)

            # Apply sorting based on frontend parameters - kad user izvelas sort order
            sort_by = data.get('sortBy', 'price')
            sort_order = data.get('sortOrder', 'asc')

            logger.info(f"Sorting by: {sort_by}, order: {sort_order}")

            if sort_by == 'price':
                if sort_order == 'desc':
                    query = query.order_by(desc(Listing.price))
                else:
                    query = query.order_by(asc(Listing.price))
            elif sort_by == 'year':
                if sort_order == 'desc':
                    query = query.order_by(desc(Car.year))
                else:
                    query = query.order_by(asc(Car.year))
            elif sort_by == 'mileage':
                # Handle null values properly - put nulls last, treat null as 0 for consistency
                if sort_order == 'desc':
                    query = query.order_by(desc(func.coalesce(Car.mileage, 0)))
                else:
                    query = query.order_by(asc(func.coalesce(Car.mileage, 999999999)))  # Put nulls at end for asc
            else:
                # Default ordering - newest listings first
                query = query.order_by(desc(Listing.listing_date))

            # Limit results for performance
            query = query.limit(200)
            
            results = query.all()
            
            # Formatting the listings for the API response
            for row in results:
                # Translate engine type to Latvian
                engine_type_latvian = "Nav norādīts"
                if row.engine_type:
                    engine_type_lower = row.engine_type.lower()
                    if 'petrol' in engine_type_lower:
                        engine_type_latvian = 'Benzīns'
                    elif 'diesel' in engine_type_lower:
                        engine_type_latvian = 'Dīzelis'
                    elif 'hybrid' in engine_type_lower:
                        engine_type_latvian = 'Hibrīds'
                    elif 'electric' in engine_type_lower:
                        engine_type_latvian = 'Elektriskais'
                    elif 'gas' in engine_type_lower:
                        engine_type_latvian = 'Gāze'
                    else:
                        engine_type_latvian = row.engine_type
                
                engine_display = "Nav norādīts"
                if row.engine_volume and row.engine_type:
                    engine_display = f"{row.engine_volume}L {engine_type_latvian}"
                elif row.engine_type:
                    engine_display = engine_type_latvian

                listings.append({
                    'brand': row.brand,
                    'model': row.model,
                    'year': row.year,
                    'year_display': str(row.year),
                    'engine': engine_display,
                    'engine_type': row.engine_type or "Nav norādīts", 
                    'engine_type_latvian': engine_type_latvian, 
                    'engine_volume': row.engine_volume,
                    'transmission': row.transmission or "Nav norādīts",
                    'mileage': row.mileage or 0,
                    'body_type': row.body_type or "Nav norādīts",
                    'color': row.color or "Nav norādīts",
                    'tech_inspection': row.tech_inspection or "Nav norādīts",
                    'price': row.price,
                    'listing_date': row.listing_date.strftime('%Y-%m-%d') if row.listing_date else "",
                    'listing_url': row.listing_url,
                    'url': row.listing_url, # For compatibility
                    'region': row.region or "Nav norādīts", # Region from the database
                    'id': row.external_id or f"listing-{hash(str(row.listing_url))}" # Unique ID
                })
        
        response_data = {
            "statistics": statistics if statistics else {},
            "listings": listings
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error during car search: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while searching for cars."}), 500

def map_location_to_region(location_name):
    """Maps a location (city, district) name to its proper region in Latvia"""
    if not location_name:
        return "Nav norādīts"
    
    # Normalize input - lowercase, remove "raj." suffix, and strip whitespace
    location = location_name.lower().replace("raj.", "").replace("raj.", "").strip()
    
    # Rīgas reģions
    riga_region = [
        "rīga", "riga", "rīgas", "rigas", "jūrmala", "jurmala", "olaine", "salaspils", 
        "baldone", "ikšķile", "ikskile", "ķekava", "kekava", "baloži", "balozi", 
        "sigulda", "saulkrasti", "ogre", "lielvārde", "lielvarde", "mārupe", "marupe", 
        "ādaži", "adazi", "carnikava", "rīgas rajons", "rigas rajons"
    ]
    
    # Vidzemes reģions
    vidzeme_region = [
        "vidzeme", "cēsis", "cesis", "valmiera", "limbaži", "limbazi", "smiltene", 
        "madona", "gulbene", "alūksne", "aluksne", "cesvaine", "valka", "valkas"
    ]
    
    # Zemgales reģions
    zemgale_region = [
        "zemgale", "jelgava", "jēkabpils", "jekabpils", "bauska", "dobele", 
        "aizkraukle", "pļaviņas", "plavinas", "viesīte", "viesite", "bauskas"
    ]
    
    # Latgales reģions
    latgale_region = [
        "latgale", "daugavpils", "rēzekne", "rezekne", "ludza", "preiļi", "preili", 
        "krāslava", "kraslava", "zilupe", "viļaka", "vilaka", "dagda", "balvi",
        "līvāni", "livani", "ludzas", "rēzeknes", "rezeknes", "daugavpils"
    ]
    
    # Kurzemes reģions
    kurzeme_region = [
        "kurzeme", "liepāja", "liepaja", "ventspils", "talsi", "kuldīga", "kuldiga", 
        "saldus", "tukums", "aizpute", "grobiņa", "grobina", "skrunda", "durbe",
        "talsu", "kurzeme", "kuldīgas", "kuldigas", "tukuma"
    ]
    
    # Handle complex cases with shared cities or alternative spellings
    # Some cities could belong to multiple regions depending on the source
    if any(city in location for city in riga_region):
        return "Rīga"
    elif any(city in location for city in vidzeme_region):
        return "Vidzeme"
    elif any(city in location for city in zemgale_region):
        return "Zemgale"
    elif any(city in location for city in latgale_region):
        return "Latgale"
    elif any(city in location for city in kurzeme_region):
        return "Kurzeme"
    else:
        # If we can't determine the region, return a default
        return "Nav norādīts"

@app.route('/api/regions', methods=['GET'])
def get_regions():
    """Returns available regions."""
    try:
        # Query distinct regions from the database
        regions = session.query(Region.name).distinct().all()
        
        # Format the results
        formatted_regions = [{"name": region[0]} for region in regions]
        
        return jsonify({"regions": formatted_regions})
    except Exception as e:
        logger.error(f"Error fetching regions: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while fetching regions."}), 500


@app.route('/api/region-stats', methods=['GET'])
def region_statistics():
    """Provides car price statistics grouped by region"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        year_from = request.args.get('yearFrom', type=int)
        year_to = request.args.get('yearTo', type=int)
        
        logger.info(f"Region statistics request for: Brand={brand}, Model={model}, YearRange={year_from}-{year_to}")
        
        # Create a simple query that's less likely to fail
        query = session.query(
            Region.name.label('region_name'),
            func.avg(Listing.price).label('avg_price'),
            func.min(Listing.price).label('min_price'),
            func.max(Listing.price).label('max_price'),
            func.count(Listing.listing_id).label('count')
        )
        
        # Build necessary joins
        query = query.join(Car, Listing.car_id == Car.car_id)
        query = query.join(Region, Car.region_id == Region.region_id)
        
        # Only add Model and Brand joins if needed
        if brand or model:
            query = query.join(Model, Car.model_id == Model.model_id)
            query = query.join(Brand, Model.brand_id == Brand.brand_id)
        
        # Filter for active listings
        query = query.filter(Listing.is_active == True)
        
        # Apply filters if provided
        if brand:
            query = query.filter(func.lower(Brand.name) == func.lower(brand))
        
        if model:
            query = query.filter(func.lower(Model.name) == func.lower(model))
            
        if year_from:
            query = query.filter(Car.year >= year_from)
            
        if year_to:
            query = query.filter(Car.year <= year_to)
        
        # Group by region name
        query = query.group_by(Region.name)
        
        # Execute query
        results = query.all()
        
        # Format the response
        regions_data = []
        for row in results:
            # Skip regions with no name
            if not row.region_name:
                continue
                
            # Format values as integers to avoid JSON issues
            avg_price = int(row.avg_price) if row.avg_price else 0
            min_price = int(row.min_price) if row.min_price else 0
            max_price = int(row.max_price) if row.max_price else 0
            
            regions_data.append({
                'name': row.region_name,
                'avgPrice': avg_price,
                'minPrice': min_price,
                'maxPrice': max_price,
                'count': row.count
            })
        
        logger.info(f"Found statistics for {len(regions_data)} regions")
        return jsonify({"regions": regions_data})
        
    except Exception as e:
        # Log the full error for debugging
        logger.error(f"Error in region_statistics endpoint: {str(e)}", exc_info=True)
        
        # Return an empty result to prevent frontend crashes
        return jsonify({"regions": [], "error": str(e)}), 500


#test debug for db map
@app.route('/api/debug/database', methods=['GET'])
def debug_database():
    """Diagnostic endpoint to check database connections and key tables"""
    results = {}
    
    try:
        # Test Region table
        region_count = session.query(func.count(Region.region_id)).scalar()
        results["region_count"] = region_count
        
        # List some regions
        regions = session.query(Region.region_id, Region.name).limit(10).all()
        results["regions"] = [{"id": r.region_id, "name": r.name} for r in regions]
        
        # Test Car table
        car_count = session.query(func.count(Car.car_id)).scalar()
        results["car_count"] = car_count
        
        # Test Listing table
        listing_count = session.query(func.count(Listing.listing_id)).scalar()
        results["listing_count"] = listing_count
        
        # Test Brand table
        brand_count = session.query(func.count(Brand.brand_id)).scalar()
        results["brand_count"] = brand_count
        
        # List some brands
        brands = session.query(Brand.brand_id, Brand.name).limit(10).all()
        results["brands"] = [{"id": b.brand_id, "name": b.name} for b in brands]
        
        # Test join between Car and Region
        car_region_join = session.query(
            Car.car_id, Region.name
        ).join(
            Region, Car.region_id == Region.region_id
        ).limit(5).all()
        
        results["car_region_join"] = [{"car_id": c.car_id, "region": r} for c, r in car_region_join]
        
        return jsonify({"status": "success", "results": results})
    
    except Exception as e:
        logger.error(f"Database debug error: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error", 
            "error": str(e),
            "type": str(type(e).__name__),
            "partial_results": results
        }), 500
    
@app.route('/api/listing-details', methods=['GET'])
def listing_details():
    """Fetches and scrapes full details for a single listing URL."""
    listing_url = request.args.get('url')
    if not listing_url:
        logger_listing_details.warning("Listing details request made without a URL.")
        return jsonify({"error": "URL parameter is required"}), 400

    logger_listing_details.info(f"Attempting to fetch details for URL: {listing_url}")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'lv-LV,lv;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Referer': 'https://www.ss.lv/'
        }
        
        response = requests.get(listing_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        details_to_return = {}

        # 1. Extract just the description text (before the tables)
        description_div = soup.select_one('div#msg_div_msg')
        if description_div:
            # Remove both the parameters table and the price table
            description_copy = description_div.__copy__()
            
            # Remove the options table
            options_table = description_copy.select_one('table.options_list')
            if options_table:
                options_table.extract()
            
            # Remove all tables that contain price-related content
            price_tables = description_copy.find_all('table')
            for table in price_tables:
                # Check if this table contains price information by looking for various indicators
                price_indicators = [
                    table.find('td', class_='ads_opt_name_big'),  # Class used for "Cena:" cell
                    table.find('td', class_='ads_price'),         # Class used for price cell
                    table.find('span', class_='ads_price'),       # Price span
                    table.find('a', class_='a9a'),               # OCTA insurance link
                    table.find('img', src=lambda x: x and 'octa_logo.png' in x)  # OCTA logo
                ]
                
                # If any of these indicators are found, remove the table
                if any(price_indicators):
                    table.extract()
                    continue
                
                # Also check for text content that includes "Cena:" or "€"
                table_text = table.get_text()
                if 'Cena:' in table_text or '€' in table_text or 'apdrošināšanu' in table_text:
                    table.extract()
            
            # Get the text content and clean it up
            description_text = description_copy.get_text(separator='\n', strip=True)
            # Remove extra whitespace and empty lines
            lines = [line.strip() for line in description_text.split('\n') if line.strip()]
            description_text = '\n'.join(lines)
            
            details_to_return['description'] = description_text
        else:
            details_to_return['description'] = None
            logger_listing_details.warning(f"Main description element 'div#msg_div_msg' not found for {listing_url}")

        # 2. Extract publication date from footer
        date_cell = soup.select_one('td.msg_footer[align="right"]')
        if date_cell and 'Datums:' in date_cell.get_text():
            # Extract just the date part after "Datums: "
            date_text = date_cell.get_text().strip()
            if 'Datums:' in date_text:
                publication_date = date_text.split('Datums:')[1].strip()
                details_to_return['publication_date'] = publication_date
        else:
            details_to_return['publication_date'] = None
            logger_listing_details.warning(f"Publication date not found for {listing_url}")

        # 3. Finding the main image URL
        image_elem = soup.select_one('img#msg_img_img')
        if image_elem and image_elem.has_attr('src'):
            details_to_return['image_url'] = image_elem['src']
        else:
            image_elem_fallback = soup.select_one('div#big_pic_div img')
            if image_elem_fallback and image_elem_fallback.has_attr('src'):
                details_to_return['image_url'] = image_elem_fallback['src']
            else:
                details_to_return['image_url'] = None
                logger_listing_details.warning(f"Main image element not found for {listing_url}")

        # 4. Parsing the parameters table
        params_table = soup.select_one('div#msg_div_msg table.options_list')
        extracted_params = {}
        if params_table:
            rows = params_table.select('tr')
            for row in rows:
                label_cell = row.select_one('td.ads_opt_name')
                value_cell = row.select_one('td.ads_opt')
                if label_cell and value_cell:
                    label_text = label_cell.get_text(strip=True).lower()
                    value_text = value_cell.get_text(strip=True)
                    
                    # Clean up the value text (remove extra spaces)
                    value_text = ' '.join(value_text.split())
                    
                    # Mapping labels to our desired keys
                    if 'marka' in label_text:
                        # Extract just the brand and model from the bold text
                        bold_elem = value_cell.select_one('b')
                        if bold_elem:
                            extracted_params['brand_model_detail'] = bold_elem.get_text(strip=True)
                        else:
                            extracted_params['brand_model_detail'] = value_text
                    elif 'izlaiduma gads' in label_text:
                        extracted_params['year_detail'] = value_text
                    elif 'dzinēja tips' in label_text or 'motors' in label_text:
                        extracted_params['engine_detail'] = value_text
                    elif 'ātr.kārba' in label_text or 'ātrumkārba' in label_text:
                        extracted_params['transmission_detail'] = value_text
                    elif 'nobraukums' in label_text:
                        # Clean up mileage text (remove thousands separators)
                        mileage_digits = ''.join(filter(str.isdigit, value_text))
                        extracted_params['mileage_detail'] = mileage_digits
                    elif 'krāsa' in label_text:
                        # Get color without the color swatch
                        color_text = value_text.split('\n')[0].strip()
                        extracted_params['color_detail'] = color_text
                    elif 'virsbūves tips' in label_text:
                        extracted_params['body_type_detail'] = value_text
                    elif 'tehniskā apskate' in label_text:
                        extracted_params['tech_inspection'] = value_text
            details_to_return.update(extracted_params)
        else:
            logger_listing_details.warning(f"Main parameters table not found for {listing_url}")

        # 5. Extract price
        price_elem = soup.select_one('span.ads_price#tdo_8')
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            # Remove currency symbol and spaces
            price_clean = price_text.replace('€', '').replace(' ', '').replace(',', '')
            try:
                details_to_return['price_detail'] = int(price_clean)
            except ValueError:
                details_to_return['price_detail'] = price_text
        else:
            logger_listing_details.warning(f"Price element not found for {listing_url}")

        # 6. Gathering the list of equipment
        equipment_list = []
        # Look for checkboxes in the description area
        if description_div:
            checkboxes = description_div.select('input[type="checkbox"]')
            for checkbox in checkboxes:
                # Get the label text associated with the checkbox
                label = checkbox.find_next_sibling(text=True)
                if label:
                    equipment_list.append(label.strip())
        
        # Also check for equipment in the description text itself
        if details_to_return.get('description'):
            desc_text = details_to_return['description']
            # Look for patterns like "• Equipment item" or "- Equipment item"
            lines = desc_text.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('•') or line.startswith('-'):
                    equipment_list.append(line[1:].strip())
        
        details_to_return['equipment'] = equipment_list
        
        # 7. Extract Region from the Contacts Table
        contacts_table = soup.select_one('table.contacts_table')
        if contacts_table:
            rows = contacts_table.select('tr')
            for row in rows:
                label_cell = row.select_one('td.ads_contacts_name')
                value_cell = row.select_one('td.ads_contacts')
                
                if label_cell and value_cell:
                    label_text_contact = label_cell.get_text(strip=True)
                    if label_text_contact == 'Vieta:':
                        details_to_return['region'] = value_cell.get_text(strip=True)
                        logger_listing_details.info(f"Found Region in contacts section: {details_to_return['region']}")
                        break
        else:
            logger_listing_details.info(f"Contacts table not found for {listing_url}")
        
        # Log a summary of what was found
        logger_listing_details.info(
            f"Scraping for {listing_url} complete. Desc: {bool(details_to_return.get('description'))}, "
            f"Img: {bool(details_to_return.get('image_url'))}, PubDate: {details_to_return.get('publication_date')}, "
            f"TechInsp: {bool(details_to_return.get('tech_inspection'))}, "
            f"Equip#: {len(details_to_return.get('equipment',[]))}, Region: {details_to_return.get('region')}"
        )
        
        return jsonify(details_to_return)
        
    except requests.exceptions.Timeout:
        logger_listing_details.error(f"Timeout while fetching details from {listing_url}")
        return jsonify({"error": "Timeout trying to reach SS.LV to get listing details."}), 504
    except requests.exceptions.RequestException as e:
        logger_listing_details.error(f"Network error while fetching details from {listing_url}: {str(e)}")
        return jsonify({"error": f"Could not connect to SS.LV to get listing details: {type(e).__name__}"}), 502
    except Exception as e:
        logger_listing_details.error(f"An unexpected error occurred while parsing details for {listing_url}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to parse listing details from the page."}), 500


@app.route('/api/debug/counts', methods=['GET'])
def debug_counts():
    """Debug endpoint to get counts of cars by brand and model."""
    try:
        from sqlalchemy import func # Specific import for this function
        
        brand_name_filter = request.args.get('brand') # Optional brand filter
        
        # Query for total cars per brand
        query_cars_by_brand = (
            analyzer.session.query(
                Brand.name, 
                func.count(Car.car_id).label('car_count')
            )
            .join(Model, Brand.brand_id == Model.brand_id)
            .join(Car, Model.model_id == Car.model_id)
            .group_by(Brand.name)
        )
        
        # Query for active listings per brand
        query_active_listings_by_brand = (
            analyzer.session.query(
                Brand.name, 
                func.count(Listing.listing_id).label('listing_count')
            )
            .join(Model, Brand.brand_id == Model.brand_id)
            .join(Car, Model.model_id == Car.model_id)
            .join(Listing, Car.car_id == Listing.car_id)
            .filter(Listing.is_active == True)
            .group_by(Brand.name)
        )
        
        if brand_name_filter: # Apply filter if brand is provided
            query_cars_by_brand = query_cars_by_brand.filter(func.lower(Brand.name) == func.lower(brand_name_filter))
            query_active_listings_by_brand = query_active_listings_by_brand.filter(func.lower(Brand.name) == func.lower(brand_name_filter))
        
        cars_by_brand_results = {row[0]: row[1] for row in query_cars_by_brand.all()}
        active_listings_by_brand_results = {row[0]: row[1] for row in query_active_listings_by_brand.all()}
        
        # If a brand is specified, also get model counts for that brand
        models_data_for_brand = []
        if brand_name_filter:
            query_models_for_brand = (
                analyzer.session.query(
                    Model.name,
                    func.count(Listing.listing_id).label('count')
                )
                .join(Brand, Model.brand_id == Brand.brand_id)
                .join(Car, Model.model_id == Car.model_id)
                .join(Listing, Car.car_id == Listing.car_id)
                .filter(func.lower(Brand.name) == func.lower(brand_name_filter))
                .filter(Listing.is_active == True)
                .group_by(Model.name)
            )
            models_data_for_brand = [{"model": row[0], "count": row[1]} for row in query_models_for_brand.all()]
        
        return jsonify({
            "cars_by_brand": cars_by_brand_results,
            "active_listings_by_brand": active_listings_by_brand_results,
            "models_for_specific_brand": models_data_for_brand if brand_name_filter else "Provide a 'brand' query parameter for model counts."
        })
        
    except Exception as e:
        logger.error(f"Error in debug counts endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve debug counts."}), 500
    

@app.route('/api/estimate', methods=['POST'])
def estimate_value():
    """Estimates car value based on provided parameters."""
    try:
        data = request.json
        
        brand = data.get('brand')
        model = data.get('model')
        year = data.get('year')
        mileage = data.get('mileage')
        fuel_type = data.get('fuelType')  #frontend sends 'fuelType'
        transmission = data.get('transmission')
        
        if not all([brand, model, year, mileage]): # Basic validation
            return jsonify({"error": "Missing required parameters for estimation (brand, model, year, mileage)"}), 400
        
        logger.info(f"Value estimation request for: {brand} {model} ({year}), {mileage}km, Fuel: {fuel_type}, Transmission: {transmission}")
        
        estimation_result = analyzer.estimate_car_value(
            brand=brand,
            model=model,
            year=int(year),
            mileage=int(mileage),
            engine_type=fuel_type, # Pass it as engine_type to analyzer
            transmission=transmission
        )
        
        if not estimation_result:
            logger.warning(f"Could not estimate value for {brand} {model} - insufficient data.")
            return jsonify({"error": "Insufficient data for estimation for the given parameters."}), 404
        
        similar_listings_results = analyzer.get_similar_listings(
            brand=brand,
            model=model,
            year=int(year),
            mileage=int(mileage),
            engine_type=fuel_type,
            limit=10 # Fetch up to 10 similar listings
        )
        
        response_data = {
            "estimation": estimation_result,
            "similar_listings": similar_listings_results
        }
        
        return jsonify(response_data)
        
    except ValueError: # Catch errors from int() conversion
        logger.error(f"Invalid data type for estimation parameters (year/mileage should be numbers).")
        return jsonify({"error": "Invalid data type for year or mileage."}), 400
    except Exception as e:
        logger.error(f"Error during value estimation: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred during value estimation."}), 500


@app.route('/api/price-history', methods=['GET'])
def price_history():
    """Provides price history data for a specific car model."""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        months = request.args.get('months', default=6, type=int) # Default to 6 months
        
        if not brand or not model:
            return jsonify({"error": "Brand and model parameters are required for price history."}), 400
        
        logger.info(f"Price history request for: {brand} {model}, looking back {months} months.")
        
        history_data_results = analyzer.get_price_history(
            brand=brand,
            model=model,
            months=months
        )
        
        if not history_data_results or not history_data_results.get('labels'): # Check if actual data was returned
            logger.warning(f"No price history data found for {brand} {model} for the last {months} months.")
            return jsonify({"error": "No price history data available for the selected criteria."}), 404
        
        return jsonify(history_data_results)
        
    except Exception as e:
        logger.error(f"Error fetching price history: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while fetching price history."}), 500


@app.route('/api/charts/price-distribution', methods=['GET'])
def price_distribution_chart():
    """Generates data for a price distribution chart."""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model') # Optional
        year_from = request.args.get('yearFrom', type=int) # Optional
        year_to = request.args.get('yearTo', type=int) # Optional
        
        logger.info(f"Price distribution chart request: Brand={brand}, Model={model}, YearRange={year_from}-{year_to}")
        
        chart_data_result = analyzer.create_price_distribution_chart(
            brand=brand,
            model=model,
            year_from=year_from,
            year_to=year_to
        )
        
        # If no data for specific model, try for the brand overall (as in original logic)
        if not chart_data_result and model and brand:
            logger.info(f"No chart data for {brand} {model}, attempting brand-level chart for {brand}.")
            chart_data_result = analyzer.create_price_distribution_chart(
                brand=brand,
                model=None, # No model constraint
                year_from=year_from,
                year_to=year_to
            )
        
        if not chart_data_result:
            logger.warning(f"Insufficient data to generate price distribution chart for Brand={brand}, Model={model}.")
            return jsonify({"error": "Insufficient data for chart generation."}), 404
        
        return jsonify({"chart": chart_data_result}) # The chart data is base64 encoded image string
        
    except Exception as e:
        logger.error(f"Error generating price distribution chart: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while generating the price distribution chart."}), 500


@app.route('/api/charts/price-trend', methods=['GET'])
def price_trend_chart():
    """Generates data for a price trend chart."""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model') # Optional
        months = request.args.get('months', default=12, type=int) # Default to 12 months
        
        if not brand: # Brand is mandatory for trend chart
            return jsonify({"error": "Brand parameter is required for price trend chart."}), 400
        
        logger.info(f"Price trend chart request: Brand={brand}, Model={model}, Months={months}")
        
        chart_data_result = analyzer.create_price_trend_chart(
            brand=brand,
            model=model,
            months=months
        )
        
        # If no data for specific model, try for the brand overall
        if not chart_data_result and model:
            logger.info(f"No price trend chart data for {brand} {model}, attempting brand-level trend for {brand}.")
            chart_data_result = analyzer.create_price_trend_chart(
                brand=brand,
                model=None, # No model constraint
                months=months
            )

        if not chart_data_result:
            logger.warning(f"Insufficient data to generate price trend chart for Brand={brand}, Model={model}.")
            return jsonify({"error": "Insufficient data for chart generation."}), 404
        
        return jsonify({"chart": chart_data_result}) # Base64 encoded image string
        
    except Exception as e:
        logger.error(f"Error generating price trend chart: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while generating the price trend chart."}), 500


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        # Get token from header
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401
        
        try:
            # Decode the token
            secret_key = "car_prices_app_secret_key"  # Should match the key in AuthDB
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            user_id = payload['user_id']
            
            # Get user data
            current_user = auth_db.get_user_by_id(user_id)
            if 'error' in current_user:
                return jsonify({"error": "Invalid token"}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        # Add user to request context
        kwargs['current_user'] = current_user
        return f(*args, **kwargs)
    
    return decorated

# New authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.json
        
        # Basic validation
        required_fields = ['email', 'username', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Validate email format
        email = data['email']
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"error": "Invalid email format"}), 400
        
        # Validate password strength
        password = data['password']
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long"}), 400
        
        # Create the user
        result = auth_db.create_user(email, data['username'], password)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Generate token for immediate login
        user_id = result['user_id']
        token = auth_db._generate_token(user_id)
        result['token'] = token
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({"error": "Registration failed"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate a user"""
    try:
        data = request.json
        
        # Validate input
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"error": "Email and password are required"}), 400
        
        # Authenticate user
        result = auth_db.authenticate_user(data['email'], data['password'])
        
        if 'error' in result:
            return jsonify(result), 401
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({"error": "Login failed"}), 500
    
@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get the user's profile information"""
    return jsonify(current_user)

@app.route('/api/user/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile information"""
    try:
        data = request.json
        user_id = current_user['user_id']
        
        # Validate the input data
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get allowed fields to update
        username = data.get('username')
        email = data.get('email')
        
        # Basic validation
        if username and not username.strip():
            return jsonify({"error": "Username cannot be empty"}), 400
        
        if email and not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"error": "Invalid email format"}), 400
        
        # Update user in database using auth_db
        try:
            conn = sqlite3.connect(auth_db.db_path)
            cursor = conn.cursor()
            
            # Build update query dynamically
            update_fields = []
            update_values = []
            
            if username:
                update_fields.append("username = ?")
                update_values.append(username.strip())
            
            if email:
                # Check if email already exists for another user
                cursor.execute("SELECT user_id FROM users WHERE email = ? AND user_id != ?", 
                             (email.lower(), user_id))
                if cursor.fetchone():
                    return jsonify({"error": "Email already exists"}), 400
                
                update_fields.append("email = ?")
                update_values.append(email.lower())
            
            if update_fields:
                # Add user_id for WHERE clause
                update_values.append(user_id)
                
                query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = ?"
                cursor.execute(query, update_values)
                conn.commit()
            
            conn.close()
            
            # Return updated user profile
            updated_user = auth_db.get_user_by_id(user_id)
            return jsonify(updated_user)
            
        except sqlite3.IntegrityError as e:
            return jsonify({"error": "Email already exists"}), 400
        except Exception as e:
            logger.error(f"Database error updating profile: {str(e)}")
            return jsonify({"error": "Failed to update profile"}), 500
        
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update profile"}), 500


@app.route('/api/user/preferences', methods=['PUT'])
@token_required
def update_preferences(current_user):
    """Update user preferences"""
    try:
        data = request.json
        user_id = current_user['user_id']
        
        result = auth_db.update_preferences(user_id, data)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Get updated user profile
        updated_user = auth_db.get_user_by_id(user_id)
        return jsonify(updated_user)
        
    except Exception as e:
        logger.error(f"Update preferences error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update preferences"}), 500

@app.route('/api/user/favorites', methods=['GET'])
@token_required
def get_favorites(current_user):
    """Get user's favorite cars"""
    user_id = current_user['user_id']
    favorites = auth_db.get_user_favorites(user_id)
    
    if isinstance(favorites, dict) and 'error' in favorites:
        return jsonify(favorites), 400
    
    return jsonify({"favorites": favorites})

@app.route('/api/user/favorites', methods=['POST'])
@token_required
def add_favorite(current_user):
    """Add a car to favorites"""
    try:
        data = request.json
        user_id = current_user['user_id']
        
        if not data or not data.get('car'):
            return jsonify({"error": "Car data is required"}), 400
        
        result = auth_db.add_favorite(user_id, data['car'])
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Car added to favorites"})
        
    except Exception as e:
        logger.error(f"Add favorite error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to add favorite"}), 500

@app.route('/api/user/favorites/<car_id>', methods=['DELETE'])
@token_required
def remove_favorite(current_user, car_id):
    """Remove a car from favorites"""
    try:
        user_id = current_user['user_id']
        
        result = auth_db.remove_favorite(user_id, car_id)
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Car removed from favorites"})
        
    except Exception as e:
        logger.error(f"Remove favorite error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to remove favorite"}), 500

@app.route('/api/user/search-history', methods=['GET'])
@token_required
def get_search_history(current_user):
    """Get user's search history"""
    try:
        user_id = current_user['user_id']
        limit = request.args.get('limit', 10, type=int)
        
        history = auth_db.get_search_history(user_id, limit)
        
        if isinstance(history, dict) and 'error' in history:
            return jsonify(history), 400
        
        return jsonify({"history": history})
        
    except Exception as e:
        logger.error(f"Get search history error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get search history"}), 500

@app.route('/api/user/search-history', methods=['POST'])
@token_required
def add_search_history(current_user):
    """Add a search to history"""
    try:
        data = request.json
        user_id = current_user['user_id']
        
        if not data or not data.get('params'):
            return jsonify({"error": "Search parameters are required"}), 400
        
        result = auth_db.add_search_history(user_id, data['params'])
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Search added to history"})
        
    except Exception as e:
        logger.error(f"Add search history error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to add search to history"}), 500

@app.route('/api/popular/brands', methods=['GET'])
def popular_brands():
    """Returns a list of popular car brands."""
    try:
        limit = request.args.get('limit', default=10, type=int) # How many brands to return
        
        popular_brands_results = analyzer.get_popular_brands(limit=limit)
        
        # Formatting for the API response
        formatted_brands = [{"name": name, "count": count} for name, count in popular_brands_results]
        
        return jsonify({"brands": formatted_brands})
        
    except Exception as e:
        logger.error(f"Error fetching popular brands: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while fetching popular brands."}), 500


@app.route('/api/popular/models', methods=['GET'])
def popular_models():
    """Returns a list of popular car models, optionally filtered by brand."""
    try:
        brand = request.args.get('brand') # Optional brand filter
        limit = request.args.get('limit', default=10, type=int) # How many models to return
        
        popular_models_results = analyzer.get_popular_models(brand=brand, limit=limit)
        
        # Formatting for the API response
        formatted_models = [{"brand": b, "model": m, "count": c} for b, m, c in popular_models_results]
        
        return jsonify({"models": formatted_models})
        
    except Exception as e:
        logger.error(f"Error fetching popular models: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while fetching popular models."}), 500


@app.route('/api/scrape', methods=['POST'])
def scrape_data():
    """Triggers the data scraping process. Should be admin-protected in a real app."""
    try:
        # TODO: Implement proper authentication/authorization for this endpoint.
        logger.info("Data scraping process initiated via API request.")
        
        # Parameters for scraping, from request or defaults
        data = request.json or {}
        max_brands_to_scrape = data.get('max_brands', 5) # Example: scrape top 5 brands
        models_per_brand_to_scrape = data.get('models_per_brand', 3) # Top 3 models per brand
        pages_per_model_to_scrape = data.get('pages_per_model', 2) # 2 pages of listings per model
        
        # Calling the scraper function (ensure ss_scraper.py's run_ss_scraper is robust)
        scraping_results = run_ss_scraper( # This function is from your ss_scraper.py
            # target_brands=None, # Or pass specific brands if needed
            pages_per_model=pages_per_model_to_scrape,
            # db_url=None, # Uses default from ss_scraper
            # debug_mode=False # Or get from request
        )
        
        logger.info(f"Scraping completed. Results: {scraping_results}")
        return jsonify({"status": "Scraping process finished.", "results": scraping_results})
        
    except Exception as e:
        logger.error(f"Error during API-triggered scraping: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred during the scraping process."}), 500


@app.route('/api/status', methods=['GET'])
def system_status():
    """Provides current status of the system and database counts."""
    try:
        # Getting various counts from the database
        brand_count = session.query(Brand).count()
        model_count = session.query(Model).count()
        car_count = session.query(Car).count()
        listing_count = session.query(Listing).count()
        source_count = session.query(Source).count() # Assuming you have a Source model
        
        # Finding the last scrape time from the Source table
        latest_scrape_info = session.query(Source.name, Source.last_scraped_at)\
            .filter(Source.last_scraped_at != None)\
            .order_by(Source.last_scraped_at.desc()).first()
            
        last_scraped_details = {
            "source": latest_scrape_info[0] if latest_scrape_info else "N/A",
            "timestamp": latest_scrape_info[1].isoformat() if latest_scrape_info and latest_scrape_info[1] else None
        }
        
        # Finding the date of the newest listing in the database
        latest_listing_date_tuple = session.query(Listing.listing_date)\
            .order_by(Listing.listing_date.desc()).first()
        newest_listing_date = latest_listing_date_tuple[0].isoformat() if latest_listing_date_tuple and latest_listing_date_tuple[0] else None
        
        status_info = {
            "database_counts": {
                "brands": brand_count,
                "models": model_count,
                "cars": car_count,
                "listings": listing_count,
                "sources": source_count
            },
            "last_scrape_activity": {
                "details": last_scraped_details,
                "latest_listing_found_date": newest_listing_date
            },
            "system_info": {
                "version": "1.0.0", # Your app version
                "status_message": "System is operational.",
                "current_server_time": datetime.now().isoformat()
            }
        }
        
        return jsonify(status_info)
        
    except Exception as e:
        logger.error(f"Error retrieving system status: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve system status."}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset user password"""
    try:
        data = request.json
        
        if not data or not data.get('email') or not data.get('new_password'):
            return jsonify({"error": "E-pasts un jauna parole ir nepieciešami"}), 400
        
        # Validate new password
        if len(data['new_password']) < 8:
            return jsonify({"error": "Parolei jābūt vismaz 8 simbolus garai"}), 400
        
        # Reset password using auth_db
        result = auth_db.reset_password(data['email'], data['new_password'])
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Parole veiksmīgi atjaunota"})
        
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}", exc_info=True)
        return jsonify({"error": "Paroles atjaunošana neizdevās"}), 500
    
if __name__ == "__main__":
    # This block runs when the script is executed directly (e.g., python api.py)
    # Ensure your database session and analyzer are available to the routes if they are not already
    # globally initialized or created per request. The current setup initializes them globally.
    
    logger.info("Starting Car Price Analysis API server...")
    app.run(debug=True, port=5000) # Runs the Flask development server