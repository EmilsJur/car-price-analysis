import sqlite3
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('setup_db')

# Database file name - make sure this matches what's in models.py
DB_FILE = "car_price_analysis.db"

def setup_database():
    """Create a fresh database structure"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS brands (
            brand_id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            country TEXT,
            logo_url TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )
        ''')
        
        # Create models table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS models (
            model_id INTEGER PRIMARY KEY,
            brand_id INTEGER,
            name TEXT,
            url TEXT,
            last_scraped TIMESTAMP,
            UNIQUE(brand_id, name),
            FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
        )
        ''')
        
        # Create listings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS listings (
            listing_id INTEGER PRIMARY KEY,
            external_id TEXT UNIQUE,
            model_id INTEGER,
            brand_id INTEGER,
            price INTEGER,
            year INTEGER,
            engine_volume REAL,
            engine_type TEXT,
            transmission TEXT,
            mileage INTEGER,
            color TEXT,
            body_type TEXT,
            region TEXT,
            listing_url TEXT,
            listing_date DATE,
            last_seen TIMESTAMP,
            first_seen TIMESTAMP,
            FOREIGN KEY (model_id) REFERENCES models(model_id),
            FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
        )
        ''')
        
        # Create sources table (needed by API)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sources (
            source_id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            url TEXT,
            country TEXT,
            scraping_config TEXT,
            last_scraped_at TIMESTAMP
        )
        ''')
        
        conn.commit()
        conn.close()
        
        logger.info(f"Database structure created successfully: {DB_FILE}")
        return True
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        return False

if __name__ == "__main__":
    setup_database()