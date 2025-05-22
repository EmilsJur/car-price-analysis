import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json
import logging
from sqlalchemy import func, and_, or_, desc, asc
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64
import sqlite3
from dateutil.relativedelta import relativedelta
import matplotlib
matplotlib.use('Agg')  # Set backend to non-interactive for server use

# Basic logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='analysis.log'
)
logger = logging.getLogger('car_analysis')


class CarDataAnalyzer:
    """Main class for car price analysis stuff"""

    def __init__(self, session):
        self.session = session
        self._setup_sqlite_functions()  # Setup custom SQL functions if needed
    
    def _setup_sqlite_functions(self):
        """Register some custom functions for SQLite since it's missing some features"""
        if 'sqlite' in self.session.bind.dialect.name:
            conn = self.session.bind.raw_connection()
            
            # Custom date truncation function - SQLite doesn't have this built-in
            def date_trunc(interval, date_str):
                if date_str is None:
                    return None
                
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                
                if interval.lower() == 'month':
                    return date_obj.replace(day=1).strftime('%Y-%m-%d')
                elif interval.lower() == 'year':
                    return date_obj.replace(month=1, day=1).strftime('%Y-%m-%d')
                elif interval.lower() == 'week':
                    # Get Monday of that week
                    days_to_subtract = date_obj.weekday()
                    return (date_obj - timedelta(days=days_to_subtract)).strftime('%Y-%m-%d')
                else:
                    return date_str
            
            conn.create_function("date_trunc", 2, date_trunc)
    
    def get_price_statistics(self, brand=None, model=None, year_from=None, 
                             year_to=None, region=None, fuel_type=None):
        """Calculate basic price stats - average, min, max, etc."""
        from models import Brand, Model, Car, Listing, Region
        
        try:
            # Build the query step by step
            query = self.session.query(
                Listing.price
            ).join(
                Car, Listing.car_id == Car.car_id
            ).join(
                Model, Car.model_id == Model.model_id
            ).join(
                Brand, Model.brand_id == Brand.brand_id
            ).join(
                Region, Car.region_id == Region.region_id
            )
            
            # Add filters one by one
            if brand:
                query = query.filter(func.lower(Brand.name) == func.lower(brand))
            
            if model:
                query = query.filter(func.lower(Model.name) == func.lower(model))
            
            if year_from:
                query = query.filter(Car.year >= year_from)
            
            if year_to:
                query = query.filter(Car.year <= year_to)
            
            if region:
                query = query.filter(func.lower(Region.name) == func.lower(region))
            
            if fuel_type:
                query = query.filter(func.lower(Car.engine_type) == func.lower(fuel_type))
            
            # Get all the prices
            prices = [item[0] for item in query.all()]
            
            if not prices:
                logger.info(f"No data found for the given criteria")
                return None
            
            # Do the math
            prices_array = np.array(prices)
            stats = {
                "count": len(prices),
                "min_price": int(np.min(prices_array)),
                "max_price": int(np.max(prices_array)),
                "average_price": int(np.mean(prices_array)),
                "median_price": int(np.median(prices_array)),
                "std_deviation": int(np.std(prices_array)),
                "price_25_percentile": int(np.percentile(prices_array, 25)),
                "price_75_percentile": int(np.percentile(prices_array, 75))
            }
            
            logger.info(f"Stats calculated for {len(prices)} cars")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get price stats: {str(e)}")
            return None
    
    def get_similar_listings(self, brand, model, year, mileage=None, 
                              engine_type=None, limit=10):
        """Find cars similar to what user is looking for"""
        from models import Brand, Model, Car, Listing
        
        try:
            query = self.session.query(
                Brand.name.label('brand'),
                Model.name.label('model'),
                Car.year,
                Car.engine_volume,
                Car.engine_type,
                Car.transmission,
                Car.mileage,
                Listing.price,
                Listing.listing_date,
                Listing.listing_url
            ).join(
                Car, Listing.car_id == Car.car_id
            ).join(
                Model, Car.model_id == Model.model_id
            ).join(
                Brand, Model.brand_id == Brand.brand_id
            )
            
            # Filter by brand and model
            query = query.filter(func.lower(Brand.name) == func.lower(brand))
            query = query.filter(func.lower(Model.name) == func.lower(model))
            
            # Year range - give or take 2 years
            query = query.filter(Car.year.between(year - 2, year + 2))
            
            # Mileage range if provided - within 30% of target
            if mileage is not None:
                mileage_min = max(0, int(mileage * 0.7))
                mileage_max = int(mileage * 1.3)
                query = query.filter(Car.mileage.between(mileage_min, mileage_max))
            
            # Engine type if specified
            if engine_type:
                query = query.filter(func.lower(Car.engine_type) == func.lower(engine_type))
            
            # Sort by how close the year is
            query = query.order_by(func.abs(Car.year - year))
            query = query.limit(limit)
            
            results = query.all()
            
            # Format results
            listings = []
            for row in results:
                listings.append({
                    'brand': row.brand,
                    'model': row.model,
                    'year': row.year,
                    'engine': f"{row.engine_volume} {row.engine_type}" if row.engine_volume and row.engine_type else "",
                    'transmission': row.transmission,
                    'mileage': row.mileage,
                    'price': row.price,
                    'listing_date': row.listing_date.strftime('%Y-%m-%d') if row.listing_date else "",
                    'url': row.listing_url
                })
            
            logger.info(f"Found {len(listings)} similar cars")
            return listings
            
        except Exception as e:
            logger.error(f"Error finding similar cars: {str(e)}")
            return []
    
    def get_price_history(self, brand, model, months=6):
        """Get price trends over time for a car model"""
        from models import Brand, Model, Car, Listing
        
        try:
            # Look back X months
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30 * months)
            
            # Query with monthly grouping
            query = self.session.query(
                func.date_trunc('month', Listing.listing_date).label('month'),
                func.avg(Listing.price).label('avg_price'),
                func.count(Listing.listing_id).label('count')
            ).join(
                Car, Listing.car_id == Car.car_id
            ).join(
                Model, Car.model_id == Model.model_id
            ).join(
                Brand, Model.brand_id == Brand.brand_id
            ).filter(
                func.lower(Brand.name) == func.lower(brand),
                func.lower(Model.name) == func.lower(model),
                Listing.listing_date.between(start_date, end_date)
            ).group_by(
                func.date_trunc('month', Listing.listing_date)
            ).order_by(
                func.date_trunc('month', Listing.listing_date)
            )
            
            results = query.all()
            
            if not results:
                logger.info(f"No price history for {brand} {model}")
                return None
            
            # Prepare chart data
            dates = [row.month.strftime('%Y-%m') for row in results]
            prices = [int(row.avg_price) for row in results]
            counts = [row.count for row in results]
            
            history_data = {
                'dates': dates,
                'prices': prices,
                'counts': counts
            }
            
            logger.info(f"Got price history for {brand} {model} - {len(dates)} months")
            return history_data
            
        except Exception as e:
            logger.error(f"Price history failed: {str(e)}")
            return None
    
    
    def create_price_distribution_chart(self, brand=None, model=None, year_from=None, year_to=None):
        """Make a histogram showing price distribution"""
        from models import Brand, Model, Car, Listing
        
        try:
            query = self.session.query(
                Listing.price
            ).join(
                Car, Listing.car_id == Car.car_id
            ).join(
                Model, Car.model_id == Model.model_id
            ).join(
                Brand, Model.brand_id == Brand.brand_id
            )
            
            # Apply filters
            if brand:
                query = query.filter(func.lower(Brand.name) == func.lower(brand))
            
            if model:
                query = query.filter(func.lower(Model.name) == func.lower(model))
            
            if year_from:
                query = query.filter(Car.year >= year_from)
            
            if year_to:
                query = query.filter(Car.year <= year_to)
            
            prices = [item[0] for item in query.all()]
            
            if not prices or len(prices) < 5:
                logger.info(f"Not enough data for chart - only {len(prices) if prices else 0} cars")
                return None
            
            # Create the chart
            plt.figure(figsize=(10, 6))
            sns.histplot(prices, bins=20, kde=True)
            
            # Chart title
            title = "Cenu sadalījums"
            if brand:
                title += f" - {brand}"
                if model:
                    title += f" {model}"
            
            if year_from or year_to:
                years = ""
                if year_from:
                    years += f"{year_from}"
                if year_to:
                    years += f"-{year_to}"
                title += f" ({years})"
            
            plt.title(title)
            plt.xlabel("Cena (EUR)")
            plt.ylabel("Sludinājumu skaits")
            plt.grid(True, alpha=0.3)
            
            # Convert to base64 for API response
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            plt.close()
            
            logger.info(f"Created price distribution chart with {len(prices)} cars")
            return image_base64
            
        except Exception as e:
            logger.error(f"Chart creation failed: {str(e)}")
            return None
    
    def create_price_trend_chart(self, brand, model, months=12):
        """Create a line chart showing price changes over time"""
        try:
            # Get historical data
            history_data = self.get_price_history(brand, model, months)
            
            if not history_data or len(history_data['dates']) < 2:
                logger.info(f"Not enough historical data for trend chart")
                return None
            
            # Create the chart
            plt.figure(figsize=(10, 6))
            plt.plot(history_data['dates'], history_data['prices'], 'o-', linewidth=2, markersize=8)
            
            plt.title(f"Cenu tendences - {brand} {model}")
            plt.xlabel("Mēnesis")
            plt.ylabel("Vidējā cena (EUR)")
            plt.xticks(rotation=45)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            # Convert to base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            plt.close()
            
            logger.info(f"Created trend chart for {brand} {model}")
            return image_base64
            
        except Exception as e:
            logger.error(f"Trend chart failed: {str(e)}")
            return None
    
    def save_analysis(self, title, description, params, results, car_id=None, model_id=None):
        """Save analysis results to database for later"""
        from models import Analysis
        
        try:
            analysis = Analysis(
                title=title,
                description=description,
                params=json.dumps(params),
                results=json.dumps(results),
                car_id=car_id,
                model_id=model_id
            )
            
            self.session.add(analysis)
            self.session.commit()
            
            logger.info(f"Saved analysis: {title}")
            return analysis.analysis_id
            
        except Exception as e:
            logger.error(f"Failed to save analysis: {str(e)}")
            self.session.rollback()
            return None
    
    def get_popular_brands(self, limit=10):
        """Get most popular brands by number of listings"""
        from models import Brand, Model, Car, Listing
        
        try:
            query = self.session.query(
                Brand.name,
                func.count(Listing.listing_id).label('count')
            ).join(
                Model, Brand.brand_id == Model.brand_id
            ).join(
                Car, Model.model_id == Car.model_id
            ).join(
                Listing, Car.car_id == Listing.car_id
            ).group_by(
                Brand.name
            ).order_by(
                desc('count')
            ).limit(limit)
            
            results = query.all()
            logger.info(f"Got {len(results)} popular brands")
            return [(row[0], row[1]) for row in results]
            
        except Exception as e:
            logger.error(f"Error getting popular brands: {str(e)}")
            return []
    
    def get_popular_models(self, brand=None, limit=10):
        """Get popular models, optionally filtered by brand"""
        from models import Brand, Model, Car, Listing
        
        try:
            query = self.session.query(
                Brand.name.label('brand'),
                Model.name.label('model'),
                func.count(Listing.listing_id).label('count')
            ).join(
                Model, Brand.brand_id == Model.brand_id
            ).join(
                Car, Model.model_id == Car.model_id
            ).join(
                Listing, Car.car_id == Listing.car_id
            )
            
            if brand:
                query = query.filter(func.lower(Brand.name) == func.lower(brand))
            
            query = query.group_by(
                Brand.name,
                Model.name
            ).order_by(
                desc('count')
            ).limit(limit)
            
            results = query.all()
            logger.info(f"Got {len(results)} popular models")
            return [(row.brand, row.model, row.count) for row in results]
            
        except Exception as e:
            logger.error(f"Error getting popular models: {str(e)}")
            return []