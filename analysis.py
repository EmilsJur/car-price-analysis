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

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='analysis.log'
)
logger = logging.getLogger('car_analysis')


class CarDataAnalyzer:
    """Class for analyzing car price data"""

    def __init__(self, session):
        """
        Initialize the analyzer
        
        Args:
            session: SQLAlchemy session for database operations
        """
        self.session = session
        self._register_sqlite_functions()  # Call the function to register SQLite functions
    
    def _register_sqlite_functions(self):
        """Register custom SQLite functions if using SQLite"""
        if 'sqlite' in self.session.bind.dialect.name:
            # Check if we're using SQLite
            conn = self.session.bind.raw_connection()
            
            # Define a date_trunc function for SQLite
            def date_trunc(interval, date_str):
                if date_str is None:
                    return None
                
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                
                if interval.lower() == 'month':
                    return date_obj.replace(day=1).strftime('%Y-%m-%d')
                elif interval.lower() == 'year':
                    return date_obj.replace(month=1, day=1).strftime('%Y-%m-%d')
                elif interval.lower() == 'day':
                    return date_str
                elif interval.lower() == 'week':
                    # Get the first day of the week (Monday)
                    days_to_subtract = date_obj.weekday()
                    return (date_obj - timedelta(days=days_to_subtract)).strftime('%Y-%m-%d')
                else:
                    return date_str
            
            # Register the function with SQLite
            conn.create_function("date_trunc", 2, date_trunc)
    def __init__(self, session):
        """
        Initialize the analyzer
        
        Args:
            session: SQLAlchemy session for database operations
        """
        self.session = session
    
    def get_price_statistics(self, brand=None, model=None, year_from=None, 
                             year_to=None, region=None, fuel_type=None):
        """
        Get price statistics for cars matching the specified criteria
        
        Args:
            brand: Car brand name (optional)
            model: Car model name (optional)
            year_from: Minimum year (optional)
            year_to: Maximum year (optional)
            region: Region name (optional)
            fuel_type: Engine fuel type (optional)
            
        Returns:
            Dictionary with statistics or None if no data found
        """
        from models import Brand, Model, Car, Listing, Region
        
        try:
            # Build query with joins
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
            
            # Apply filters
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
            
            # Execute query and get prices
            prices = [item[0] for item in query.all()]
            
            if not prices:
                logger.info(f"No data found for the specified criteria")
                return None
            
            # Calculate statistics
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
            
            logger.info(f"Statistics calculated for {len(prices)} listings")
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating price statistics: {str(e)}")
            return None
    
    def get_similar_listings(self, brand, model, year, mileage=None, 
                              engine_type=None, limit=10):
        """
        Get similar car listings
        
        Args:
            brand: Car brand name
            model: Car model name
            year: Car year
            mileage: Car mileage (optional)
            engine_type: Engine fuel type (optional)
            limit: Maximum number of listings to return
            
        Returns:
            List of similar listings or empty list if no data found
        """
        from models import Brand, Model, Car, Listing
        
        try:
            # Build query with joins
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
            
            # Apply filters
            query = query.filter(func.lower(Brand.name) == func.lower(brand))
            query = query.filter(func.lower(Model.name) == func.lower(model))
            
            # Year range (±2 years)
            query = query.filter(Car.year.between(year - 2, year + 2))
            
            # Mileage range if provided (±30%)
            if mileage is not None:
                mileage_min = max(0, int(mileage * 0.7))
                mileage_max = int(mileage * 1.3)
                query = query.filter(Car.mileage.between(mileage_min, mileage_max))
            
            # Engine type if provided
            if engine_type:
                query = query.filter(func.lower(Car.engine_type) == func.lower(engine_type))
            
            # Order by similarity to the specified year
            query = query.order_by(func.abs(Car.year - year))
            
            # Limit results
            query = query.limit(limit)
            
            # Execute query
            results = query.all()
            
            # Convert to list of dictionaries
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
            
            logger.info(f"Found {len(listings)} similar listings")
            return listings
            
        except Exception as e:
            logger.error(f"Error finding similar listings: {str(e)}")
            return []
    
    def get_price_history(self, brand, model, months=6):
        """
        Get price history data for a specific car model
        
        Args:
            brand: Car brand name
            model: Car model name
            months: Number of months to look back
            
        Returns:
            Dictionary with dates and average prices or None if no data found
        """
        from models import Brand, Model, Car, Listing
        from sqlalchemy import func, and_, extract
        
        try:
            # Calculate start date
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30 * months)
            
            # Build query with joins and grouping by month
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
            
            # Execute query
            results = query.all()
            
            if not results:
                logger.info(f"No price history data found for {brand} {model}")
                return None
            
            # Prepare data for plotting
            dates = [row.month.strftime('%Y-%m') for row in results]
            prices = [int(row.avg_price) for row in results]
            counts = [row.count for row in results]
            
            history_data = {
                'dates': dates,
                'prices': prices,
                'counts': counts
            }
            
            logger.info(f"Retrieved price history for {brand} {model} with {len(dates)} data points")
            return history_data
            
        except Exception as e:
            logger.error(f"Error getting price history: {str(e)}")
            return None
    
    def estimate_car_value(self, brand, model, year, mileage, engine_type=None, transmission=None):
        """
        Estimate the market value of a car based on similar listings
        
        Args:
            brand: Car brand name
            model: Car model name
            year: Car year
            mileage: Car mileage
            engine_type: Engine fuel type (optional)
            transmission: Transmission type (optional)
            
        Returns:
            Dictionary with estimated value and range or None if estimation not possible
        """
        from models import Brand, Model, Car, Listing
        
        try:
            # Get similar listings
            query = self.session.query(
                Listing.price,
                Car.year,
                Car.mileage
            ).join(
                Car, Listing.car_id == Car.car_id
            ).join(
                Model, Car.model_id == Model.model_id
            ).join(
                Brand, Model.brand_id == Brand.brand_id
            )
            
            # Apply filters
            query = query.filter(func.lower(Brand.name) == func.lower(brand))
            query = query.filter(func.lower(Model.name) == func.lower(model))
            query = query.filter(Car.year.between(year - 3, year + 3))
            
            if engine_type:
                query = query.filter(func.lower(Car.engine_type) == func.lower(engine_type))
            
            if transmission:
                query = query.filter(func.lower(Car.transmission) == func.lower(transmission))
            
            # Execute query
            results = query.all()
            
            if not results or len(results) < 5:
                logger.info(f"Insufficient data for estimation: {len(results) if results else 0} listings found")
                return None
            
            # Extract prices and features
            prices = np.array([row.price for row in results])
            years = np.array([row.year for row in results])
            mileages = np.array([row.mileage if row.mileage else 0 for row in results])
            
            # Calculate similarity scores based on year and mileage
            year_weights = 1.0 - np.abs(years - year) / 10.0  # Penalize by 10% per year difference
            year_weights = np.clip(year_weights, 0.0, 1.0)
            
            mileage_weights = np.ones_like(mileages)
            if mileage > 0:
                mileage_diffs = np.abs(mileages - mileage) / mileage
                mileage_weights = 1.0 - mileage_diffs
                mileage_weights = np.clip(mileage_weights, 0.0, 1.0)
            
            # Combined weights
            weights = (year_weights * 0.7) + (mileage_weights * 0.3)  # 70% year, 30% mileage
            
            # Calculate weighted average
            weighted_sum = np.sum(prices * weights)
            weight_sum = np.sum(weights)
            
            if weight_sum > 0:
                estimated_value = int(weighted_sum / weight_sum)
            else:
                estimated_value = int(np.mean(prices))
            
            # Calculate confidence interval (±15%)
            value_min = int(estimated_value * 0.85)
            value_max = int(estimated_value * 1.15)
            
            # Calculate confidence level based on sample size and similarity
            if len(results) >= 20 and np.mean(weights) > 0.8:
                confidence_level = "high"
            elif len(results) >= 10 and np.mean(weights) > 0.6:
                confidence_level = "medium"
            else:
                confidence_level = "low"
            
            estimation = {
                "estimated_value": estimated_value,
                "value_min": value_min,
                "value_max": value_max,
                "sample_size": len(results),
                "confidence_level": confidence_level
            }
            
            logger.info(f"Estimated value for {brand} {model} ({year}): {estimated_value} EUR")
            return estimation
            
        except Exception as e:
            logger.error(f"Error estimating car value: {str(e)}")
            return None
    
    def create_price_distribution_chart(self, brand=None, model=None, year_from=None, year_to=None):
        """
        Create a price distribution histogram
        
        Args:
            brand: Car brand name (optional)
            model: Car model name (optional)
            year_from: Minimum year (optional)
            year_to: Maximum year (optional)
            
        Returns:
            Base64 encoded image or None if chart creation failed
        """
        from models import Brand, Model, Car, Listing
        
        try:
            # Build query with joins
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
            
            # Execute query and get prices
            prices = [item[0] for item in query.all()]
            
            if not prices or len(prices) < 5:
                logger.info(f"Insufficient data for chart: {len(prices) if prices else 0} listings found")
                return None
            
            # Create figure
            plt.figure(figsize=(10, 6))
            
            # Create histogram
            sns.histplot(prices, bins=20, kde=True)
            
            # Add labels and title
            title = "Price Distribution"
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
            plt.xlabel("Price (EUR)")
            plt.ylabel("Number of Listings")
            
            # Add grid
            plt.grid(True, alpha=0.3)
            
            # Save to buffer
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            
            # Convert to base64
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            plt.close()
            
            logger.info(f"Created price distribution chart with {len(prices)} data points")
            return image_base64
            
        except Exception as e:
            logger.error(f"Error creating price distribution chart: {str(e)}")
            return None
    
    def create_price_trend_chart(self, brand, model, months=12):
        """
        Create a price trend chart
        
        Args:
            brand: Car brand name
            model: Car model name
            months: Number of months to look back
            
        Returns:
            Base64 encoded image or None if chart creation failed
        """
        try:
            # Get price history data
            history_data = self.get_price_history(brand, model, months)
            
            if not history_data or len(history_data['dates']) < 2:
                logger.info(f"Insufficient price history data for chart")
                return None
            
            # Create figure
            plt.figure(figsize=(10, 6))
            
            # Create line plot
            plt.plot(history_data['dates'], history_data['prices'], 'o-', linewidth=2, markersize=8)
            
            # Add labels and title
            plt.title(f"Price Trend - {brand} {model}")
            plt.xlabel("Month")
            plt.ylabel("Average Price (EUR)")
            
            # Rotate x-axis labels
            plt.xticks(rotation=45)
            
            # Add grid
            plt.grid(True, alpha=0.3)
            
            # Tight layout to ensure all elements are visible
            plt.tight_layout()
            
            # Save to buffer
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            
            # Convert to base64
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            plt.close()
            
            logger.info(f"Created price trend chart for {brand} {model} with {len(history_data['dates'])} data points")
            return image_base64
            
        except Exception as e:
            logger.error(f"Error creating price trend chart: {str(e)}")
            return None
    
    def save_analysis(self, title, description, params, results, car_id=None, model_id=None):
        """
        Save analysis results to the database
        
        Args:
            title: Analysis title
            description: Analysis description
            params: Dictionary with analysis parameters
            results: Dictionary with analysis results
            car_id: Car ID (optional - for specific car analysis)
            model_id: Model ID (optional - for model-wide analysis)
            
        Returns:
            Analysis ID or None if saving failed
        """
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
            
            logger.info(f"Saved analysis: {title} (ID: {analysis.analysis_id})")
            return analysis.analysis_id
            
        except Exception as e:
            logger.error(f"Error saving analysis: {str(e)}")
            self.session.rollback()
            return None
    
    def get_popular_brands(self, limit=10):
        """
        Get the most popular car brands based on listing count
        
        Args:
            limit: Maximum number of brands to return
            
        Returns:
            List of tuples with brand name and count
        """
        from models import Brand, Model, Car, Listing
        from sqlalchemy import func
        
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
            
            logger.info(f"Retrieved {len(results)} popular brands")
            return [(row[0], row[1]) for row in results]
            
        except Exception as e:
            logger.error(f"Error getting popular brands: {str(e)}")
            return []
    
    def get_popular_models(self, brand=None, limit=10):
        """
        Get the most popular car models based on listing count
        
        Args:
            brand: Brand name to filter by (optional)
            limit: Maximum number of models to return
            
        Returns:
            List of tuples with brand name, model name and count
        """
        from models import Brand, Model, Car, Listing
        from sqlalchemy import func
        
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
            
            logger.info(f"Retrieved {len(results)} popular models")
            return [(row.brand, row.model, row.count) for row in results]
            
        except Exception as e:
            logger.error(f"Error getting popular models: {str(e)}")
            return []