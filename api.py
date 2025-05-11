from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime
from models import init_db
from ss_scraper import run_ss_scraper
from analysis import CarDataAnalyzer

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='api.log'
)
logger = logging.getLogger('car_api')

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize database session
session, engine = init_db()

# Initialize data analyzer
analyzer = CarDataAnalyzer(session)


@app.route('/api/search', methods=['POST'])
def search_cars():
    """API endpoint for car search"""
    try:
        data = request.json
        
        # Extract search parameters
        brand = data.get('brand')
        model = data.get('model')
        year_from = data.get('yearFrom')
        year_to = data.get('yearTo')
        fuel_type = data.get('fuelType')
        transmission = data.get('transmission')
        price_from = data.get('priceFrom')
        price_to = data.get('priceTo')
        
        logger.info(f"Search request: brand={brand}, model={model}, year={year_from}-{year_to}")
        
        # Get price statistics
        statistics = analyzer.get_price_statistics(
            brand=brand,
            model=model,
            year_from=year_from,
            year_to=year_to,
            fuel_type=fuel_type
        )
        
        # Get matching listings
        listings = []
        if brand:  # Only require brand, not model
            # Create query dynamically based on available parameters
            from models import Brand, Model, Car, Listing, Region
            from sqlalchemy import func
            
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
                    Car.tech_inspection,  # Added tech_inspection
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
            
            if model:
                query = query.filter(func.lower(Model.name) == func.lower(model))
            
            # Standard numeric year comparisons now that data is normalized
            if year_from:
                query = query.filter(Car.year >= year_from)
                
            if year_to:
                query = query.filter(Car.year <= year_to)
                
            if fuel_type:
                query = query.filter(func.lower(Car.engine_type) == func.lower(fuel_type))
                
            if transmission:
                query = query.filter(func.lower(Car.transmission) == func.lower(transmission))
                
            if price_from:
                query = query.filter(Listing.price >= price_from)
                
            if price_to:
                query = query.filter(Listing.price <= price_to)
            
            # Filter for active listings only
            query = query.filter(Listing.is_active == True)
            
            # Order by latest listings first
            query = query.order_by(Listing.listing_date.desc())
            
            # Limit results
            query = query.limit(200)
            
            # Execute query
            results = query.all()
            
            # Convert to list of dictionaries
            for row in results:
                engine_display = ""
                if row.engine_volume and row.engine_type:
                    engine_display = f"{row.engine_volume}L {row.engine_type}"
                elif row.engine_type:
                    engine_display = row.engine_type
                else:
                    engine_display = "Nav norādīts"
                listings.append({
                    'brand': row.brand,
                    'model': row.model,
                    'year': row.year,  # Numeric year for sorting
                    'year_display': str(row.year),  # Just use the year as is
                    'engine': engine_display,
                    'engine_type': row.engine_type or "Nav norādīts",
                    'engine_volume': row.engine_volume,
                    'transmission': row.transmission or "Nav norādīts",
                    'mileage': row.mileage or 0,
                    'body_type': row.body_type or "Nav norādīts",
                    'color': row.color or "Nav norādīts",
                    'tech_inspection': row.tech_inspection or "Nav norādīts",  # Added tech_inspection
                    'price': row.price,
                    'listing_date': row.listing_date.strftime('%Y-%m-%d') if row.listing_date else "",
                    'listing_url': row.listing_url,
                    'url': row.listing_url,  # Add both for compatibility
                    'region': row.region or "Nav norādīts",
                    'id': row.external_id or f"listing-{hash(str(row.listing_url))}"
                })
        
        # Prepare response
        response = {
            "statistics": statistics if statistics else {},
            "listings": listings
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in search endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/counts', methods=['GET'])
def debug_counts():
    """Debug endpoint to get counts of cars by brand"""
    try:
        from models import Brand, Model, Car, Listing
        from sqlalchemy import func
        
        # Get brand parameter
        brand = request.args.get('brand')
        
        # Base query for all cars of this brand
        query = (
            analyzer.session.query(
                Brand.name, 
                func.count(Car.car_id).label('car_count')
            )
            .join(Model, Brand.brand_id == Model.brand_id)
            .join(Car, Model.model_id == Car.model_id)
            .group_by(Brand.name)
        )
        
        # Query for active listings
        active_query = (
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
        
        # If brand is specified, filter by brand
        if brand:
            query = query.filter(func.lower(Brand.name) == func.lower(brand))
            active_query = active_query.filter(func.lower(Brand.name) == func.lower(brand))
        
        # Execute queries
        cars_by_brand = {row[0]: row[1] for row in query.all()}
        active_listings_by_brand = {row[0]: row[1] for row in active_query.all()}
        
        # Get specific models for the brand if specified
        models_data = []
        if brand:
            models_query = (
                analyzer.session.query(
                    Model.name,
                    func.count(Listing.listing_id).label('count')
                )
                .join(Brand, Model.brand_id == Brand.brand_id)
                .join(Car, Model.model_id == Car.model_id)
                .join(Listing, Car.car_id == Listing.car_id)
                .filter(func.lower(Brand.name) == func.lower(brand))
                .filter(Listing.is_active == True)
                .group_by(Model.name)
            )
            
            models_data = [{"model": row[0], "count": row[1]} for row in models_query.all()]
        
        return jsonify({
            "cars_by_brand": cars_by_brand,
            "active_listings_by_brand": active_listings_by_brand,
            "models": models_data
        })
        
    except Exception as e:
        logger.error(f"Error in debug counts endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/listing-details', methods=['GET'])
def listing_details():
    """API endpoint to get full listing details including description"""
    try:
        listing_url = request.args.get('url')
        if not listing_url:
            return jsonify({"error": "URL is required"}), 400
        
        # You can use BeautifulSoup to scrape additional details
        import requests
        from bs4 import BeautifulSoup
        
        response = requests.get(listing_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract description
        description_elem = soup.select_one('.msg_div_msg')
        description = description_elem.text.strip() if description_elem else None
        
        # Extract equipment/features
        equipment = []
        equipment_section = soup.select('.options_list tr')
        for row in equipment_section:
            cells = row.select('td')
            if len(cells) >= 2 and cells[1].text.strip() == '+':
                equipment.append(cells[0].text.strip())
        
        # Extract image URL
        image_elem = soup.select_one('#bigimage img')
        image_url = image_elem['src'] if image_elem else None
        
        return jsonify({
            "description": description,
            "equipment": equipment,
            "image_url": image_url
        })
        
    except Exception as e:
        logger.error(f"Error in listing-details endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/estimate', methods=['POST'])
def estimate_value():
    """API endpoint for car value estimation"""
    try:
        data = request.json
        
        # Extract parameters
        brand = data.get('brand')
        model = data.get('model')
        year = data.get('year')
        mileage = data.get('mileage')
        fuel_type = data.get('fuelType')
        transmission = data.get('transmission')
        
        if not all([brand, model, year, mileage]):
            return jsonify({"error": "Missing required parameters"}), 400
        
        logger.info(f"Estimate request: {brand} {model} ({year}), {mileage} km")
        
        # Get value estimation
        estimation = analyzer.estimate_car_value(
            brand=brand,
            model=model,
            year=int(year),
            mileage=int(mileage),
            engine_type=fuel_type,
            transmission=transmission
        )
        
        if not estimation:
            return jsonify({"error": "Insufficient data for estimation"}), 404
        
        # Get similar listings
        listings = analyzer.get_similar_listings(
            brand=brand,
            model=model,
            year=int(year),
            mileage=int(mileage),
            engine_type=fuel_type,
            limit=10
        )
        
        # Prepare response
        response = {
            "estimation": estimation,
            "similar_listings": listings
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in estimate endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/price-history', methods=['GET'])
def price_history():
    """API endpoint for price history data"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        months = request.args.get('months', default=6, type=int)
        
        if not brand or not model:
            return jsonify({"error": "Brand and model are required"}), 400
        
        logger.info(f"Price history request: {brand} {model}, {months} months")
        
        # Get price history data
        history_data = analyzer.get_price_history(
            brand=brand,
            model=model,
            months=months
        )
        
        if not history_data:
            return jsonify({"error": "No price history data available"}), 404
        
        return jsonify(history_data)
        
    except Exception as e:
        logger.error(f"Error in price-history endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/charts/price-distribution', methods=['GET'])
def price_distribution_chart():
    """API endpoint for price distribution chart"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        year_from = request.args.get('yearFrom', type=int)
        year_to = request.args.get('yearTo', type=int)
        
        logger.info(f"Price distribution chart request: {brand} {model}, {year_from}-{year_to}")
        
        # Generate chart
        chart_data = analyzer.create_price_distribution_chart(
            brand=brand,
            model=model,
            year_from=year_from,
            year_to=year_to
        )
        
        if not chart_data and model:
            # If no data for the specific model, try getting data for the brand
            logger.info(f"No chart data for {brand} {model}, trying brand-level data")
            chart_data = analyzer.create_price_distribution_chart(
                brand=brand,
                model=None,  # Remove model constraint
                year_from=year_from,
                year_to=year_to
            )
        
        if not chart_data:
            return jsonify({"error": "Insufficient data for chart generation"}), 404
        
        return jsonify({"chart": chart_data})
        
    except Exception as e:
        logger.error(f"Error in price-distribution endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/charts/price-trend', methods=['GET'])
def price_trend_chart():
    """API endpoint for price trend chart"""
    try:
        brand = request.args.get('brand')
        model = request.args.get('model')
        months = request.args.get('months', default=12, type=int)
        
        if not brand:
            return jsonify({"error": "Brand is required"}), 400
        
        logger.info(f"Price trend chart request: {brand} {model}, {months} months")
        
        # Generate chart
        chart_data = analyzer.create_price_trend_chart(
            brand=brand,
            model=model,
            months=months
        )
        
        if not chart_data and model:
            # If no data for the specific model, try getting data for the brand
            logger.info(f"No price trend chart data for {brand} {model}, trying brand-level data")
            chart_data = analyzer.create_price_trend_chart(
                brand=brand,
                model=None,  # Remove model constraint
                months=months
            )
        
        if not chart_data:
            return jsonify({"error": "Insufficient data for chart generation"}), 404
        
        return jsonify({"chart": chart_data})
        
    except Exception as e:
        logger.error(f"Error in price-trend endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/popular/brands', methods=['GET'])
def popular_brands():
    """API endpoint for popular brands"""
    try:
        limit = request.args.get('limit', default=10, type=int)
        
        # Get popular brands
        brands = analyzer.get_popular_brands(limit=limit)
        
        return jsonify({
            "brands": [{"name": name, "count": count} for name, count in brands]
        })
        
    except Exception as e:
        logger.error(f"Error in popular-brands endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/popular/models', methods=['GET'])
def popular_models():
    """API endpoint for popular models"""
    try:
        brand = request.args.get('brand')
        limit = request.args.get('limit', default=10, type=int)
        
        # Get popular models
        models = analyzer.get_popular_models(brand=brand, limit=limit)
        
        return jsonify({
            "models": [{"brand": brand, "model": model, "count": count} for brand, model, count in models]
        })
        
    except Exception as e:
        logger.error(f"Error in popular-models endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/scrape', methods=['POST'])
def scrape_data():
    """API endpoint to trigger data scraping process (admin only)"""
    try:
        # TODO: Add authentication to restrict access to admin users
        
        logger.info("Data scraping request received")
        
        # Get parameters from request if provided
        data = request.json or {}
        max_brands = data.get('max_brands', 5)
        models_per_brand = data.get('models_per_brand', 3)
        pages_per_model = data.get('pages_per_model', 2)
        
        # Run scraping using the new scraper
        results = run_ss_scraper(
            max_brands=max_brands,
            models_per_brand=models_per_brand,
            pages_per_model=pages_per_model
        )
        
        return jsonify({"status": "success", "results": results})
        
    except Exception as e:
        logger.error(f"Error in scrape endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/status', methods=['GET'])
def system_status():
    """API endpoint for system status"""
    from models import Brand, Model, Car, Listing, Source
    
    try:
        # Get counts
        brand_count = session.query(Brand).count()
        model_count = session.query(Model).count()
        car_count = session.query(Car).count()
        listing_count = session.query(Listing).count()
        source_count = session.query(Source).count()
        
        # Get last scraping timestamp
        latest_scrape = session.query(Source.name, Source.last_scraped_at).filter(Source.last_scraped_at != None).order_by(Source.last_scraped_at.desc()).first()
        last_scraped = {
            "source": latest_scrape[0],
            "timestamp": latest_scrape[1].isoformat() if latest_scrape and latest_scrape[1] else None
        } if latest_scrape else None
        
        # Get latest listings
        latest_listings = session.query(Listing.listing_date).order_by(Listing.listing_date.desc()).first()
        latest_date = latest_listings[0] if latest_listings else None
        
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
                "latest_listing_date": latest_date.isoformat() if latest_date else None
            },
            "system": {
                "version": "1.0.0",
                "status": "operational",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Error in status endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Run the Flask app
    app.run(debug=True, port=5000)