from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from models import init_db, Brand, Model, Car, Listing, Region, Source
from ss_scraper import run_ss_scraper
from analysis import CarDataAnalyzer
from sqlalchemy import func, and_, or_, desc, asc, case, distinct
import jwt
from functools import wraps
from auth_models import AuthDB
import re
import sqlite3

# Setup auth database
auth_db = AuthDB()

# Basic logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='api.log'
)
logger = logging.getLogger('car_api')
logger_listing_details = logging.getLogger('car_api.listing_details')

# Flask app setup
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])

# Database connection
session, engine = init_db()
analyzer = CarDataAnalyzer(session)


@app.route('/api/search', methods=['POST'])
def search_cars():
    """Handle car search with various filters"""
    try:
        data = request.json
        
        # Get search filters
        brand = data.get('brand')
        model = data.get('model')
        year_from = data.get('yearFrom')
        year_to = data.get('yearTo')
        fuel_type = data.get('fuelType')
        transmission = data.get('transmission')
        price_from = data.get('priceFrom')
        price_to = data.get('priceTo')
        region = data.get('region')
        
        logger.info(f"Search: brand={brand}, model={model}, fuel={fuel_type}")
        
        # Get price stats first
        statistics = analyzer.get_price_statistics(
            brand=brand,
            model=model,
            year_from=year_from,
            year_to=year_to,
            fuel_type=fuel_type
        )
        
        # Search for actual cars
        listings = []
        if brand:  # Need at least a brand to search
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
                .join(Region, Car.region_id == Region.region_id)
                .filter(func.lower(Brand.name) == func.lower(brand))
            )
            
            # Apply filters one by one
            if model:
                query = query.filter(func.lower(Model.name) == func.lower(model))
            if year_from:
                query = query.filter(Car.year >= year_from)
            if year_to:
                query = query.filter(Car.year <= year_to)
            if fuel_type:
                logger.info(f"Filtering by fuel: {fuel_type}")
                
                # Handle different fuel type variations
                if fuel_type.lower() in ['petrol', 'benzīns', 'benzins']:
                    query = query.filter(func.lower(Car.engine_type).like('%benzīn%') | 
                                        func.lower(Car.engine_type).like('%petrol%'))
                elif fuel_type.lower() in ['diesel', 'dīzelis', 'dizelis']:
                    query = query.filter(func.lower(Car.engine_type).like('%dīzel%') | 
                                        func.lower(Car.engine_type).like('%diesel%'))
                elif fuel_type.lower() in ['hybrid', 'hibrīds', 'hibrids']:
                    query = query.filter(func.lower(Car.engine_type).like('%hibrīd%') | 
                                        func.lower(Car.engine_type).like('%hybrid%'))
                elif fuel_type.lower() in ['electric', 'elektriskais', 'elektrisks']:
                    query = query.filter(func.lower(Car.engine_type).like('%elektr%'))
                elif fuel_type.lower() in ['gas', 'gāze', 'gaze']:
                    query = query.filter(func.lower(Car.engine_type).like('%gāz%') | 
                                        func.lower(Car.engine_type).like('%gas%'))
                else:
                    # Just try to match whatever they typed
                    query = query.filter(func.lower(Car.engine_type).like(f'%{fuel_type.lower()}%'))
                    
            if transmission:
                query = query.filter(func.lower(Car.transmission) == func.lower(transmission))
            if price_from:
                query = query.filter(Listing.price >= price_from)
            if price_to:
                query = query.filter(Listing.price <= price_to)
            if region:
                query = query.filter(func.lower(Region.name) == func.lower(region))
            
            # Only active listings
            query = query.filter(Listing.is_active == True)

            # Handle sorting from frontend
            sort_by = data.get('sortBy', 'price')
            sort_order = data.get('sortOrder', 'asc')

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
                # Put NULL values last regardless of sort direction
                if sort_order == 'desc':
                    query = query.order_by(desc(func.coalesce(Car.mileage, 0)))
                else:
                    query = query.order_by(asc(func.coalesce(Car.mileage, 999999)))
            else:
                # Default - newest first
                query = query.order_by(desc(Listing.listing_date))

            # Limit results for performance
            query = query.limit(200)
            
            results = query.all()
            
            # Format results for frontend
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
                
                # Format engine display
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
                    'url': row.listing_url,
                    'region': row.region or "Nav norādīts",
                    'id': row.external_id or f"listing-{hash(str(row.listing_url))}"
                })
        
        return jsonify({
            "statistics": statistics if statistics else {},
            "listings": listings
        })
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Meklēšana neizdevās"}), 500

def map_location_to_region(location_name):
    """Map location names to proper Latvian regions"""
    if not location_name:
        return "Nav norādīts"
    
    # Clean up the input
    location = location_name.lower().replace("raj.", "").strip()
    
    # Region mappings
    riga_region = [
        "rīga", "riga", "rīgas", "rigas", "jūrmala", "jurmala", "olaine", "salaspils", 
        "baldone", "ikšķile", "ikskile", "ķekava", "kekava", "baloži", "balozi", 
        "sigulda", "saulkrasti", "ogre", "lielvārde", "lielvarde", "mārupe", "marupe", 
        "ādaži", "adazi", "carnikava", "rīgas rajons", "rigas rajons"
    ]
    
    vidzeme_region = [
        "vidzeme", "cēsis", "cesis", "valmiera", "limbaži", "limbazi", "smiltene", 
        "madona", "gulbene", "alūksne", "aluksne", "cesvaine", "valka", "valkas"
    ]
    
    zemgale_region = [
        "zemgale", "jelgava", "jēkabpils", "jekabpils", "bauska", "dobele", 
        "aizkraukle", "pļaviņas", "plavinas", "viesīte", "viesite", "bauskas"
    ]
    
    latgale_region = [
        "latgale", "daugavpils", "rēzekne", "rezekne", "ludza", "preiļi", "preili", 
        "krāslava", "kraslava", "zilupe", "viļaka", "vilaka", "dagda", "balvi",
        "līvāni", "livani", "ludzas", "rēzeknes", "rezeknes", "daugavpils"
    ]
    
    kurzeme_region = [
        "kurzeme", "liepāja", "liepaja", "ventspils", "talsi", "kuldīga", "kuldiga", 
        "saldus", "tukums", "aizpute", "grobiņa", "grobina", "skrunda", "durbe",
        "talsu", "kurzeme", "kuldīgas", "kuldigas", "tukuma"
    ]
    
    # Check which region it belongs to
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
        return "Nav norādīts"

@app.route('/api/regions', methods=['GET'])
def get_regions():
    """Get available regions"""
    try:
        regions = session.query(Region.name).distinct().all()
        formatted_regions = [{"name": region[0]} for region in regions]
        return jsonify({"regions": formatted_regions})
    except Exception as e:
        logger.error(f"Failed to get regions: {str(e)}", exc_info=True)
        return jsonify({"error": "Neizdevās ielādēt reģionus"}), 500
    
@app.route('/api/region-stats', methods=['GET'])
def region_statistics():
    """Get car price stats by region"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        year_from = request.args.get('yearFrom', type=int)
        year_to = request.args.get('yearTo', type=int)
        
        logger.info(f"Region stats: Brand={brand}, Model={model}")
        
        # Simple query to avoid complex joins
        query = session.query(
            Region.name.label('region_name'),
            func.avg(Listing.price).label('avg_price'),
            func.min(Listing.price).label('min_price'),
            func.max(Listing.price).label('max_price'),
            func.count(Listing.listing_id).label('count')
        )
        
        # Join tables step by step
        query = query.join(Car, Listing.car_id == Car.car_id)
        query = query.join(Region, Car.region_id == Region.region_id)
        
        # Add brand/model joins only if needed
        if brand or model:
            query = query.join(Model, Car.model_id == Model.model_id)
            query = query.join(Brand, Model.brand_id == Brand.brand_id)
        
        # Active listings only
        query = query.filter(Listing.is_active == True)
        
        # Apply filters
        if brand:
            query = query.filter(func.lower(Brand.name) == func.lower(brand))
        
        if model:
            query = query.filter(func.lower(Model.name) == func.lower(model))
            
        if year_from:
            query = query.filter(Car.year >= year_from)
            
        if year_to:
            query = query.filter(Car.year <= year_to)
        
        # Group by region
        query = query.group_by(Region.name)
        
        results = query.all()
        
        # Format response
        regions_data = []
        for row in results:
            if not row.region_name:
                continue
                
            # Convert to integers to avoid JSON issues
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
        
        logger.info(f"Found stats for {len(regions_data)} regions")
        return jsonify({"regions": regions_data})
        
    except Exception as e:
        logger.error(f"Region stats failed: {str(e)}", exc_info=True)
        return jsonify({"regions": [], "error": str(e)}), 500


# Debug endpoint to check database
@app.route('/api/debug/database', methods=['GET'])
def debug_database():
    """Check database connections and tables"""
    results = {}
    
    try:
        # Test basic counts
        region_count = session.query(func.count(Region.region_id)).scalar()
        results["region_count"] = region_count
        
        # List some regions
        regions = session.query(Region.region_id, Region.name).limit(10).all()
        results["regions"] = [{"id": r.region_id, "name": r.name} for r in regions]
        
        car_count = session.query(func.count(Car.car_id)).scalar()
        results["car_count"] = car_count
        
        listing_count = session.query(func.count(Listing.listing_id)).scalar()
        results["listing_count"] = listing_count
        
        brand_count = session.query(func.count(Brand.brand_id)).scalar()
        results["brand_count"] = brand_count
        
        # List some brands
        brands = session.query(Brand.brand_id, Brand.name).limit(10).all()
        results["brands"] = [{"id": b.brand_id, "name": b.name} for b in brands]
        
        # Test joins
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
            "partial_results": results
        }), 500
    
@app.route('/api/listing-details', methods=['GET'])
def listing_details():
    """Scrape full details from a SS.LV listing"""
    listing_url = request.args.get('url')
    if not listing_url:
        logger_listing_details.warning("No URL provided")
        return jsonify({"error": "URL parameter required"}), 400

    logger_listing_details.info(f"Getting details for: {listing_url}")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'lv-LV,lv;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Referer': 'https://www.ss.lv/'
        }
        
        response = requests.get(listing_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        details = {}

        # Extract description (before tables)
        description_div = soup.select_one('div#msg_div_msg')
        if description_div:
            description_copy = description_div.__copy__()
            
            # Remove the options/price tables
            options_table = description_copy.select_one('table.options_list')
            if options_table:
                options_table.extract()
            
            # Remove price tables
            price_tables = description_copy.find_all('table')
            for table in price_tables:
                # Check if this looks like a price table
                price_indicators = [
                    table.find('td', class_='ads_opt_name_big'),
                    table.find('td', class_='ads_price'),
                    table.find('span', class_='ads_price'),
                    table.find('a', class_='a9a'),
                    table.find('img', src=lambda x: x and 'octa_logo.png' in x)
                ]
                
                if any(price_indicators):
                    table.extract()
                    continue
                
                # Also check text content
                table_text = table.get_text()
                if 'Cena:' in table_text or '€' in table_text or 'apdrošināšanu' in table_text:
                    table.extract()
            
            # Clean up description text
            description_text = description_copy.get_text(separator='\n', strip=True)
            lines = [line.strip() for line in description_text.split('\n') if line.strip()]
            description_text = '\n'.join(lines)
            
            details['description'] = description_text
        else:
            details['description'] = None

        # Get publication date
        date_cell = soup.select_one('td.msg_footer[align="right"]')
        if date_cell and 'Datums:' in date_cell.get_text():
            date_text = date_cell.get_text().strip()
            if 'Datums:' in date_text:
                publication_date = date_text.split('Datums:')[1].strip()
                details['publication_date'] = publication_date
        else:
            details['publication_date'] = None

        # Find main image
        image_elem = soup.select_one('img#msg_img_img')
        if image_elem and image_elem.has_attr('src'):
            details['image_url'] = image_elem['src']
        else:
            image_elem_fallback = soup.select_one('div#big_pic_div img')
            if image_elem_fallback and image_elem_fallback.has_attr('src'):
                details['image_url'] = image_elem_fallback['src']
            else:
                details['image_url'] = None

        # Parse the parameters table
        params_table = soup.select_one('div#msg_div_msg table.options_list')
        if params_table:
            rows = params_table.select('tr')
            for row in rows:
                label_cell = row.select_one('td.ads_opt_name')
                value_cell = row.select_one('td.ads_opt')
                if label_cell and value_cell:
                    label_text = label_cell.get_text(strip=True).lower()
                    value_text = value_cell.get_text(strip=True)
                    
                    # Clean up value
                    value_text = ' '.join(value_text.split())
                    
                    # Map labels to fields
                    if 'marka' in label_text:
                        bold_elem = value_cell.select_one('b')
                        if bold_elem:
                            details['brand_model_detail'] = bold_elem.get_text(strip=True)
                        else:
                            details['brand_model_detail'] = value_text
                    elif 'izlaiduma gads' in label_text:
                        details['year_detail'] = value_text
                    elif 'dzinēja tips' in label_text or 'motors' in label_text:
                        details['engine_detail'] = value_text
                    elif 'ātr.kārba' in label_text or 'ātrumkārba' in label_text:
                        details['transmission_detail'] = value_text
                    elif 'nobraukums' in label_text:
                        # Clean up mileage
                        mileage_digits = ''.join(filter(str.isdigit, value_text))
                        details['mileage_detail'] = mileage_digits
                    elif 'krāsa' in label_text:
                        color_text = value_text.split('\n')[0].strip()
                        details['color_detail'] = color_text
                    elif 'virsbūves tips' in label_text:
                        details['body_type_detail'] = value_text
                    elif 'tehniskā apskate' in label_text:
                        details['tech_inspection'] = value_text

        # Extract price
        price_elem = soup.select_one('span.ads_price#tdo_8')
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            price_clean = price_text.replace('€', '').replace(' ', '').replace(',', '')
            try:
                details['price_detail'] = int(price_clean)
            except ValueError:
                details['price_detail'] = price_text

        # Get equipment list
        equipment_list = []
        if description_div:
            checkboxes = description_div.select('input[type="checkbox"]')
            for checkbox in checkboxes:
                label = checkbox.find_next_sibling(text=True)
                if label:
                    equipment_list.append(label.strip())
        
        # Also check description for equipment
        if details.get('description'):
            desc_text = details['description']
            lines = desc_text.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('•') or line.startswith('-'):
                    equipment_list.append(line[1:].strip())
        
        details['equipment'] = equipment_list
        
        # Extract region from contacts table
        contacts_table = soup.select_one('table.contacts_table')
        if contacts_table:
            rows = contacts_table.select('tr')
            for row in rows:
                label_cell = row.select_one('td.ads_contacts_name')
                value_cell = row.select_one('td.ads_contacts')
                
                if label_cell and value_cell:
                    label_text = label_cell.get_text(strip=True)
                    if label_text == 'Vieta:':
                        details['region'] = value_cell.get_text(strip=True)
                        break
        
        logger_listing_details.info(f"Details scraped successfully for {listing_url}")
        return jsonify(details)
        
    except requests.exceptions.Timeout:
        logger_listing_details.error(f"Timeout for {listing_url}")
        return jsonify({"error": "SS.LV timeout"}), 504
    except requests.exceptions.RequestException as e:
        logger_listing_details.error(f"Network error for {listing_url}: {str(e)}")
        return jsonify({"error": f"Network error: {type(e).__name__}"}), 502
    except Exception as e:
        logger_listing_details.error(f"Scraping failed for {listing_url}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to parse listing"}), 500


@app.route('/api/debug/counts', methods=['GET'])
def debug_counts():
    """Debug endpoint for car/listing counts"""
    try:
        brand_filter = request.args.get('brand')
        
        # Cars by brand
        query_cars = (
            analyzer.session.query(
                Brand.name, 
                func.count(Car.car_id).label('car_count')
            )
            .join(Model, Brand.brand_id == Model.brand_id)
            .join(Car, Model.model_id == Car.model_id)
            .group_by(Brand.name)
        )
        
        # Active listings by brand
        query_listings = (
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
        
        if brand_filter:
            query_cars = query_cars.filter(func.lower(Brand.name) == func.lower(brand_filter))
            query_listings = query_listings.filter(func.lower(Brand.name) == func.lower(brand_filter))
        
        cars_by_brand = {row[0]: row[1] for row in query_cars.all()}
        listings_by_brand = {row[0]: row[1] for row in query_listings.all()}
        
        # Model counts for specific brand
        models_data = []
        if brand_filter:
            query_models = (
                analyzer.session.query(
                    Model.name,
                    func.count(Listing.listing_id).label('count')
                )
                .join(Brand, Model.brand_id == Brand.brand_id)
                .join(Car, Model.model_id == Car.model_id)
                .join(Listing, Car.car_id == Listing.car_id)
                .filter(func.lower(Brand.name) == func.lower(brand_filter))
                .filter(Listing.is_active == True)
                .group_by(Model.name)
            )
            models_data = [{"model": row[0], "count": row[1]} for row in query_models.all()]
        
        return jsonify({
            "cars_by_brand": cars_by_brand,
            "active_listings_by_brand": listings_by_brand,
            "models_for_brand": models_data if brand_filter else "Provide 'brand' parameter"
        })
        
    except Exception as e:
        logger.error(f"Debug counts failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Debug counts failed"}), 500
    
@app.route('/api/estimate', methods=['POST'])
def estimate_value():
    """Estimate car value based on similar cars"""
    try:
        data = request.json
        
        brand = data.get('brand')
        model = data.get('model')
        year = data.get('year')
        mileage = data.get('mileage')
        fuel_type = data.get('fuelType')
        transmission = data.get('transmission')
        
        if not all([brand, model, year, mileage]):
            return jsonify({"error": "Missing required fields"}), 400
        
        logger.info(f"Estimating: {brand} {model} ({year}), {mileage}km")
        
        # Get estimate from analyzer
        estimation = analyzer.estimate_car_value(
            brand=brand,
            model=model,
            year=int(year),
            mileage=int(mileage),
            engine_type=fuel_type,
            transmission=transmission
        )
        
        if not estimation:
            logger.warning(f"No estimation possible for {brand} {model}")
            return jsonify({"error": "Not enough data for estimation"}), 404
        
        # Get similar cars too
        similar_cars = analyzer.get_similar_listings(
            brand=brand,
            model=model,
            year=int(year),
            mileage=int(mileage),
            engine_type=fuel_type,
            limit=10
        )
        
        return jsonify({
            "estimation": estimation,
            "similar_listings": similar_cars
        })
        
    except ValueError:
        logger.error("Invalid year/mileage format")
        return jsonify({"error": "Year and mileage must be numbers"}), 400
    except Exception as e:
        logger.error(f"Estimation failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Estimation failed"}), 500


@app.route('/api/price-history', methods=['GET'])
def price_history():
    """Get price history for a car model"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        months = request.args.get('months', default=6, type=int)
        
        if not brand or not model:
            return jsonify({"error": "Brand and model required"}), 400
        
        logger.info(f"Price history: {brand} {model}, {months} months")
        
        history = analyzer.get_price_history(
            brand=brand,
            model=model,
            months=months
        )
        
        if not history or not history.get('labels'):
            logger.warning(f"No price history for {brand} {model}")
            return jsonify({"error": "No price history available"}), 404
        
        return jsonify(history)
        
    except Exception as e:
        logger.error(f"Price history failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Price history failed"}), 500


@app.route('/api/charts/price-distribution', methods=['GET'])
def price_distribution_chart():
    """Generate price distribution histogram"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        year_from = request.args.get('yearFrom', type=int)
        year_to = request.args.get('yearTo', type=int)
        
        logger.info(f"Price distribution chart: {brand} {model}")
        
        chart = analyzer.create_price_distribution_chart(
            brand=brand,
            model=model,
            year_from=year_from,
            year_to=year_to
        )
        
        # Try brand-only if model-specific fails
        if not chart and model and brand:
            logger.info(f"Trying brand-only chart for {brand}")
            chart = analyzer.create_price_distribution_chart(
                brand=brand,
                model=None,
                year_from=year_from,
                year_to=year_to
            )
        
        if not chart:
            logger.warning(f"No chart data for {brand} {model}")
            return jsonify({"error": "Not enough data for chart"}), 404
        
        return jsonify({"chart": chart})
        
    except Exception as e:
        logger.error(f"Chart creation failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Chart creation failed"}), 500


@app.route('/api/charts/price-trend', methods=['GET'])
def price_trend_chart():
    """Generate price trend chart over time"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        months = request.args.get('months', default=12, type=int)
        
        if not brand:
            return jsonify({"error": "Brand required for trend chart"}), 400
        
        logger.info(f"Price trend chart: {brand} {model}, {months} months")
        
        chart = analyzer.create_price_trend_chart(
            brand=brand,
            model=model,
            months=months
        )
        
        # Try brand-only if model fails
        if not chart and model:
            logger.info(f"Trying brand-only trend for {brand}")
            chart = analyzer.create_price_trend_chart(
                brand=brand,
                model=None,
                months=months
            )

        if not chart:
            logger.warning(f"No trend data for {brand} {model}")
            return jsonify({"error": "Not enough data for trend chart"}), 404
        
        return jsonify({"chart": chart})
        
    except Exception as e:
        logger.error(f"Trend chart failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Trend chart failed"}), 500


# Authentication middleware
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({"error": "Token missing"}), 401
        
        try:
            # Decode token
            secret_key = "car_prices_app_secret_key"
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            user_id = payload['user_id']
            
            # Get user
            current_user = auth_db.get_user_by_id(user_id)
            if 'error' in current_user:
                return jsonify({"error": "Invalid token"}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        # Add user to request
        kwargs['current_user'] = current_user
        return f(*args, **kwargs)
    
    return decorated

# Authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.json
        
        # Basic validation
        required_fields = ['email', 'username', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing field: {field}"}), 400
        
        # Email validation
        email = data['email']
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"error": "Invalid email"}), 400
        
        # Password strength
        password = data['password']
        if len(password) < 8:
            return jsonify({"error": "Password too short (min 8 chars)"}), 400
        
        # Create user
        result = auth_db.create_user(email, data['username'], password)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Auto-login with token
        user_id = result['user_id']
        token = auth_db._generate_token(user_id)
        result['token'] = token
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Registration failed"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.json
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"error": "Email and password required"}), 400
        
        # Authenticate
        result = auth_db.authenticate_user(data['email'], data['password'])
        
        if 'error' in result:
            return jsonify(result), 401
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Login failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Login failed"}), 500
    
@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get user profile"""
    return jsonify(current_user)

@app.route('/api/user/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile"""
    try:
        data = request.json
        user_id = current_user['user_id']
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get fields to update
        username = data.get('username')
        email = data.get('email')
        
        # Validation
        if username and not username.strip():
            return jsonify({"error": "Username cannot be empty"}), 400
        
        if email and not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"error": "Invalid email"}), 400
        
        # Update database
        try:
            conn = sqlite3.connect(auth_db.db_path)
            cursor = conn.cursor()
            
            # Build update query
            update_fields = []
            update_values = []
            
            if username:
                update_fields.append("username = ?")
                update_values.append(username.strip())
            
            if email:
                # Check if email exists
                cursor.execute("SELECT user_id FROM users WHERE email = ? AND user_id != ?", 
                             (email.lower(), user_id))
                if cursor.fetchone():
                    return jsonify({"error": "Email already exists"}), 400
                
                update_fields.append("email = ?")
                update_values.append(email.lower())
            
            if update_fields:
                update_values.append(user_id)
                query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = ?"
                cursor.execute(query, update_values)
                conn.commit()
            
            conn.close()
            
            # Return updated profile
            updated_user = auth_db.get_user_by_id(user_id)
            return jsonify(updated_user)
            
        except sqlite3.IntegrityError:
            return jsonify({"error": "Email already exists"}), 400
        except Exception as e:
            logger.error(f"Profile update DB error: {str(e)}")
            return jsonify({"error": "Profile update failed"}), 500
        
    except Exception as e:
        logger.error(f"Profile update failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Profile update failed"}), 500


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
        
        # Return updated profile
        updated_user = auth_db.get_user_by_id(user_id)
        return jsonify(updated_user)
        
    except Exception as e:
        logger.error(f"Preferences update failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Preferences update failed"}), 500

@app.route('/api/user/favorites', methods=['GET'])
@token_required
def get_favorites(current_user):
    """Get user favorites"""
    user_id = current_user['user_id']
    favorites = auth_db.get_user_favorites(user_id)
    
    if isinstance(favorites, dict) and 'error' in favorites:
        return jsonify(favorites), 400
    
    return jsonify({"favorites": favorites})

@app.route('/api/user/favorites', methods=['POST'])
@token_required
def add_favorite(current_user):
    """Add car to favorites"""
    try:
        data = request.json
        user_id = current_user['user_id']
        
        if not data or not data.get('car'):
            return jsonify({"error": "Car data required"}), 400
        
        result = auth_db.add_favorite(user_id, data['car'])
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Added to favorites"})
        
    except Exception as e:
        logger.error(f"Add favorite failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Add favorite failed"}), 500

@app.route('/api/user/favorites/<car_id>', methods=['DELETE'])
@token_required
def remove_favorite(current_user, car_id):
    """Remove car from favorites"""
    try:
        user_id = current_user['user_id']
        
        result = auth_db.remove_favorite(user_id, car_id)
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Removed from favorites"})
        
    except Exception as e:
        logger.error(f"Remove favorite failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Remove favorite failed"}), 500

@app.route('/api/user/search-history', methods=['GET'])
@token_required
def get_search_history(current_user):
    """Get user search history"""
    try:
        user_id = current_user['user_id']
        limit = request.args.get('limit', 10, type=int)
        
        history = auth_db.get_search_history(user_id, limit)
        
        if isinstance(history, dict) and 'error' in history:
            return jsonify(history), 400
        
        return jsonify({"history": history})
        
    except Exception as e:
        logger.error(f"Get search history failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Get search history failed"}), 500

@app.route('/api/user/search-history', methods=['POST'])
@token_required
def add_search_history(current_user):
    """Add search to history"""
    try:
        data = request.json
        user_id = current_user['user_id']
        
        if not data or not data.get('params'):
            return jsonify({"error": "Search params required"}), 400
        
        result = auth_db.add_search_history(user_id, data['params'])
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Search saved to history"})
        
    except Exception as e:
        logger.error(f"Add search history failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Add search history failed"}), 500

@app.route('/api/popular/brands', methods=['GET'])
def popular_brands():
    """Get popular car brands"""
    try:
        limit = request.args.get('limit', default=10, type=int)
        
        brands = analyzer.get_popular_brands(limit=limit)
        formatted_brands = [{"name": name, "count": count} for name, count in brands]
        
        return jsonify({"brands": formatted_brands})
        
    except Exception as e:
        logger.error(f"Get popular brands failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get popular brands"}), 500


@app.route('/api/popular/models', methods=['GET'])
def popular_models():
    """Get popular car models"""
    try:
        brand = request.args.get('brand')
        limit = request.args.get('limit', default=10, type=int)
        
        models = analyzer.get_popular_models(brand=brand, limit=limit)
        formatted_models = [{"brand": b, "model": m, "count": c} for b, m, c in models]
        
        return jsonify({"models": formatted_models})
        
    except Exception as e:
        logger.error(f"Get popular models failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get popular models"}), 500


@app.route('/api/scrape', methods=['POST'])
def scrape_data():
    """Trigger scraping (admin only in real app)"""
    try:
        logger.info("Scraping triggered via API")
        
        # Get scraping parameters
        data = request.json or {}
        max_brands = data.get('max_brands', 5)
        models_per_brand = data.get('models_per_brand', 3)
        pages_per_model = data.get('pages_per_model', 2)
        
        # Run scraper
        scrape_results = run_ss_scraper(
            pages_per_model=pages_per_model
        )
        
        logger.info(f"Scraping completed: {scrape_results}")
        return jsonify({"status": "Scraping finished", "results": scrape_results})
        
    except Exception as e:
        logger.error(f"Scraping failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Scraping failed"}), 500


@app.route('/api/status', methods=['GET'])
def system_status():
    """System status and database info"""
    try:
        # Get counts
        brand_count = session.query(Brand).count()
        model_count = session.query(Model).count()
        car_count = session.query(Car).count()
        listing_count = session.query(Listing).count()
        source_count = session.query(Source).count()
        
        # Last scrape info
        latest_scrape = session.query(Source.name, Source.last_scraped_at)\
            .filter(Source.last_scraped_at != None)\
            .order_by(Source.last_scraped_at.desc()).first()
            
        last_scraped = {
            "source": latest_scrape[0] if latest_scrape else "None",
            "timestamp": latest_scrape[1].isoformat() if latest_scrape and latest_scrape[1] else None
        }
        
        # Newest listing date
        newest_listing = session.query(Listing.listing_date)\
            .order_by(Listing.listing_date.desc()).first()
        newest_date = newest_listing[0].isoformat() if newest_listing and newest_listing[0] else None
        
        status = {
            "database": {
                "brands": brand_count,
                "models": model_count,
                "cars": car_count,
                "listings": listing_count,
                "sources": source_count
            },
            "scraping": {
                "last_scrape": last_scraped,
                "newest_listing": newest_date
            },
            "system": {
                "version": "1.0.0",
                "status": "Operational",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"System status failed: {str(e)}", exc_info=True)
        return jsonify({"error": "System status failed"}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset user password"""
    try:
        data = request.json
        
        if not data or not data.get('email') or not data.get('new_password'):
            return jsonify({"error": "Email and new password required"}), 400
        
        # Validate password
        if len(data['new_password']) < 8:
            return jsonify({"error": "Password too short (min 8 chars)"}), 400
        
        # Reset password
        result = auth_db.reset_password(data['email'], data['new_password'])
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({"message": "Password reset successful"})
        
    except Exception as e:
        logger.error(f"Password reset failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Password reset failed"}), 500
    
if __name__ == "__main__":
    logger.info("Starting Car Price Analysis API...")
    app.run(debug=True, port=5000)