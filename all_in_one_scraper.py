import requests
from bs4 import BeautifulSoup
import concurrent.futures
import time
import random
import json
import logging
import re
import os
from datetime import datetime, timedelta
from pathlib import Path
import sqlite3
import pandas as pd
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='ss_scraper.log'
)
logger = logging.getLogger('ss_scraper')

class SSLVScraper:
    """Optimized scraper for SS.LV website with focus on car listings"""
    
    def __init__(self, cache_dir="cache", database_file="car_data.db"):
        """Initialize the scraper with caching and database capabilities"""
        self.base_url = "https://www.ss.lv"
        self.car_url = f"{self.base_url}/lv/transport/cars/"
        
        # User agent rotation to avoid detection
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
        
        # HTTP request parameters
        self.retry_count = 3
        self.retry_delay = 5
        self.concurrent_requests = 5  # Number of concurrent brand/model scraping
        self.concurrent_listings = 10  # Number of concurrent listing details scraping
        
        # Set up cache directory
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Set up database
        self.db_file = database_file
        self.setup_database()
        
        # Tracking variables
        self.listings_processed = 0
        self.new_listings = 0
        self.start_time = None
        self.brand_progress = {}
        
        # Top brands to focus on (based on SS.LV listing counts)
        self.prioritized_brands = [
            "Audi", "BMW", "Volkswagen", "Mercedes", "Toyota",
            "Volvo", "Ford", "Opel", "Peugeot", "Renault", "Skoda"
        ]
        
    def setup_database(self):
        """Set up the SQLite database for storing car data"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS brands (
            brand_id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            url TEXT,
            last_scraped TIMESTAMP
        )
        ''')
        
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
        
        # Create indexes for faster queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_listings_external_id ON listings(external_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_listings_brand_model ON listings(brand_id, model_id)')
        
        conn.commit()
        conn.close()
        
    def _get_random_user_agent(self):
        """Get a random user agent for request headers"""
        return random.choice(self.user_agents)
    
    def _get_headers(self):
        """Generate request headers with random user agent"""
        return {
            'User-Agent': self._get_random_user_agent(),
            'Accept-Language': 'en-US,en;q=0.9,lv;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Referer': self.base_url
        }
    
    def _make_request(self, url, retry=True):
        """Make an HTTP request with retries and error handling"""
        headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept-Language': 'en-US,en;q=0.9,lv;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Referer': self.base_url
        }
        retries = self.retry_count if retry else 0
        
        for attempt in range(retries + 1):
            try:
                response = requests.get(url, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    return response
                elif response.status_code in [403, 429]:
                    # Rate limiting - wait longer
                    wait_time = self.retry_delay * (attempt + 1) * 2
                    logger.warning(f"Rate limited ({response.status_code}). Waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                else:
                    logger.warning(f"Request failed with status code {response.status_code}")
                    if attempt < retries:
                        wait_time = self.retry_delay * (attempt + 1)
                        logger.info(f"Retrying in {wait_time}s (attempt {attempt+1}/{retries})")
                        time.sleep(wait_time)
                    else:
                        return response
            except (requests.exceptions.RequestException, requests.exceptions.Timeout) as e:
                logger.warning(f"Request error for {url}: {str(e)}")
                if attempt < retries:
                    wait_time = self.retry_delay * (attempt + 1)
                    logger.info(f"Retrying in {wait_time}s (attempt {attempt+1}/{retries})")
                    time.sleep(wait_time)
                else:
                    raise
        
        return None
    
    def _random_delay(self, min_seconds=1, max_seconds=3):
        """Add a random delay to avoid being blocked"""
        delay = random.uniform(min_seconds, max_seconds)
        time.sleep(delay)
    
    def _get_cache_path(self, cache_type, identifier):
        """Get the path for a cached file"""
        return self.cache_dir / f"{cache_type}_{identifier}.json"
    
    def _save_to_cache(self, cache_type, identifier, data):
        """Save data to cache file"""
        cache_path = self._get_cache_path(cache_type, identifier)
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _load_from_cache(self, cache_type, identifier, max_age_hours=24):
        """Load data from cache if it exists and is not too old"""
        cache_path = self._get_cache_path(cache_type, identifier)
        if cache_path.exists():
            # Check if cache is still valid
            file_age = time.time() - cache_path.stat().st_mtime
            max_age_seconds = max_age_hours * 3600
            
            if file_age < max_age_seconds:
                try:
                    with open(cache_path, 'r', encoding='utf-8') as f:
                        return json.load(f)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid cache file: {cache_path}")
        
        return None
    
    def get_brands(self, force_refresh=False):
        """Get list of car brands from SS.LV with caching"""
        logger.info("Getting car brands from SS.LV")
        
        brands = []
        try:
            response = self._make_request(self.car_url)
            if not response or response.status_code != 200:
                logger.error(f"Failed to fetch brands page. Status code: {response.status_code if response else 'No response'}")
                return []
                
            # Save for debugging
            with open("brands_page.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Use the selector that worked in our test
            brand_links = soup.find_all('a', href=lambda href: href and "/transport/cars/" in href)
            
            logger.info(f"Found {len(brand_links)} potential brand links")
            
            # Filter for actual car brands
            for link in brand_links:
                href = link.get('href', '')
                brand_name = link.text.strip()
                
                # Skip non-brand links
                if not href or not brand_name:
                    continue
                    
                # Skip search, new, language links
                if ("search" in href or "new" in href or 
                    brand_name in ["RU", "EN", "LV"] or
                    "search" in brand_name.lower()):
                    continue
                    
                # Check if it's a brand link
                if (href.startswith('/lv/transport/cars/') and 
                    href.count('/') >= 4):
                    
                    brand_url = self.base_url + href
                    
                    # Add to list (avoid duplicates)
                    if not any(b['name'].lower() == brand_name.lower() for b in brands):
                        brands.append({
                            'name': brand_name,
                            'url': brand_url
                        })
            
            # Save brands to database
            if brands:
                self._save_brands_to_db(brands)
                logger.info(f"Found {len(brands)} valid car brands")
            
            return brands
            
        except Exception as e:
            logger.error(f"Error getting brands: {str(e)}")
            return []
    
    def _save_brands_to_db(self, brands):
        """Save brand data to database"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        for brand in brands:
            cursor.execute(
                "INSERT OR IGNORE INTO brands (name, country, logo_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (brand['name'], 
                brand.get('country', 'Unknown'), 
                brand.get('logo_url', None),
                current_time,
                current_time)
            )
        
        conn.commit()
        conn.close()
        logger.info(f"Saved {len(brands)} brands to database")
    
    def get_models_for_brand(self, brand, force_refresh=False):
        """Get list of valid car models for a brand"""
        logger.info(f"Getting models for brand: {brand['name']}")
        
        try:
            response = self._make_request(brand['url'])
            if not response or response.status_code != 200:
                logger.error(f"Failed to fetch models page for {brand['name']}. Status code: {response.status_code if response else 'No response'}")
                return []
                
            # Save HTML for debugging
            debug_file = f"models_{brand['name'].lower().replace(' ', '_')}.html"
            with open(debug_file, "w", encoding="utf-8") as f:
                f.write(response.text)
            
            soup = BeautifulSoup(response.content, 'html.parser')
            models = []
            
            # Get all links on the page
            all_links = soup.find_all('a')
            
            # Extract the brand name from the URL
            brand_path = brand['url'].rstrip('/').split('/')
            brand_name_in_url = brand_path[-1].lower() if brand_path else ""
            
            logger.info(f"Looking for model links containing: {brand_name_in_url}")
            
            for link in all_links:
                href = link.get('href', '')
                model_name = link.text.strip()
                
                # Skip links that don't have href or model name
                if not href or not model_name:
                    continue
                    
                # Check if it's a model link for this brand
                if (f"/transport/cars/{brand_name_in_url}/" in href and 
                    "search" not in href and 
                    "RU" != model_name and "EN" != model_name and "LV" != model_name and
                    model_name != brand['name']):
                    
                    model_url = self.base_url + href if href.startswith('/') else href
                    
                    # Add to list (avoid duplicates)
                    if not any(m['name'].lower() == model_name.lower() for m in models):
                        models.append({
                            'name': model_name,
                            'url': model_url
                        })
            
            # Save to database
            if models:
                self._save_models_to_db(brand, models)
                logger.info(f"Found {len(models)} models for {brand['name']}")
            
            return models
            
        except Exception as e:
            logger.error(f"Error getting models for {brand['name']}: {str(e)}")
            return []
        
    def _save_models_to_db(self, brand, models):
        """Save models to database"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Get brand_id
        cursor.execute("SELECT brand_id FROM brands WHERE name = ?", (brand['name'],))
        result = cursor.fetchone()
        
        if result:
            brand_id = result[0]
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            for model in models:
                cursor.execute(
                    "INSERT OR IGNORE INTO models (brand_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (brand_id, model['name'], current_time, current_time)
                )
        
        conn.commit()
        conn.close()
    
    def get_listings_for_model(self, brand, model, max_pages=3):
        """Get car listings for a specific model with pagination"""
        listings = []
        try:
            page_counter = 0
            current_url = model['url']
            
            while page_counter < max_pages:
                logger.info(f"Fetching page {page_counter+1} for {brand['name']} {model['name']} from: {current_url}")
                
                response = self._make_request(current_url)
                if not response or response.status_code != 200:
                    logger.error(f"Failed to fetch listings page for {brand['name']} {model['name']}. Status code: {response.status_code if response else 'No response'}")
                    break
                    
                # Save page for debugging
                debug_file = f"listings_{brand['name']}_{model['name']}_{page_counter}.html"
                debug_file = debug_file.replace(' ', '_').lower()
                with open(debug_file, "w", encoding="utf-8") as f:
                    f.write(response.text)
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Try different selectors for listing rows
                listing_rows = []
                selectors = [
                    'tr.msga2, tr.msg2', 
                    'form[name="ffrm"] tr[id]',
                    'table.d1 tr',
                    'tr[onclick*="go_to"]'
                ]
                
                for selector in selectors:
                    rows = soup.select(selector)
                    if rows:
                        logger.info(f"Found {len(rows)} rows with selector {selector}")
                        listing_rows.extend(rows)
                
                # Filter out duplicates and header rows
                unique_rows = []
                ids_seen = set()
                
                for row in listing_rows:
                    row_id = row.get('id', '')
                    if not row_id:
                        onclick = row.get('onclick', '')
                        if onclick:
                            id_match = re.search(r'go_to\(\'(\d+)\'\)', onclick)
                            if id_match:
                                row_id = id_match.group(1)
                    
                    if row_id and row_id not in ids_seen:
                        ids_seen.add(row_id)
                        unique_rows.append(row)
                
                listing_rows = unique_rows
                
                if not listing_rows:
                    logger.warning(f"No listing rows found for {brand['name']} {model['name']} on page {page_counter+1}")
                    break
                
                # Extract basic listing data
                page_listings = []
                
                for row in listing_rows:
                    try:
                        # Extract listing ID
                        listing_id = row.get('id', '')
                        if not listing_id:
                            onclick = row.get('onclick', '')
                            if onclick:
                                id_match = re.search(r'go_to\(\'(\d+)\'\)', onclick)
                                if id_match:
                                    listing_id = id_match.group(1)
                            else:
                                continue
                        
                        # Find a link in the row
                        link = row.find('a')
                        if not link or 'href' not in link.attrs:
                            continue
                        
                        listing_url = self.base_url + link['href'] if link['href'].startswith('/') else link['href']
                        
                        # Extract price and year
                        price = None
                        year = None
                        
                        # Try to get price
                        cells = row.find_all('td')
                        for cell in cells:
                            cell_text = cell.text.strip()
                            
                            # Look for price (usually has € symbol or contains digits)
                            if ('€' in cell_text or '.' in cell_text) and any(c.isdigit() for c in cell_text):
                                price_text = ''.join(filter(str.isdigit, cell_text))
                                if price_text:
                                    price = int(price_text)
                            
                            # Look for year (4 digits between 1900-2025)
                            if cell_text.isdigit() and len(cell_text) == 4 and 1900 <= int(cell_text) <= 2025:
                                year = int(cell_text)
                        
                        # Create listing data
                        listing_data = {
                            'external_id': listing_id,
                            'listing_url': listing_url,
                            'price': price,
                            'year': year,
                            'brand': brand['name'],
                            'model': model['name']
                        }
                        
                        page_listings.append(listing_data)
                        
                    except Exception as e:
                        logger.error(f"Error extracting listing data: {str(e)}")
                        continue
                
                # Add to total
                listings.extend(page_listings)
                logger.info(f"Found {len(page_listings)} listings on page {page_counter+1}")
                
                # Find next page link
                next_page = None
                for link in soup.find_all('a', class_='navi'):
                    if link.text.strip() in ["Nākamā", "Next", ">>", "Следующая"]:
                        next_page = link
                        break
                
                if next_page and 'href' in next_page.attrs:
                    current_url = self.base_url + next_page['href'] if next_page['href'].startswith('/') else next_page['href']
                    page_counter += 1
                    # Add a small delay to avoid overloading the server
                    self._random_delay(1, 2)
                else:
                    break
            
            logger.info(f"Found {len(listings)} listings for {brand['name']} {model['name']}")
            return listings
            
        except Exception as e:
            logger.error(f"Error getting listings for {brand['name']} {model['name']}: {str(e)}")
            return listings  # Return whatever we managed to get
    
    def get_listing_details(self, listing_basic):
        """Extract detailed information from a listing page with caching"""
        external_id = listing_basic['external_id']
        
        # Check if we have this listing in the database with recent data
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM listings WHERE external_id = ? AND last_seen > datetime('now', '-24 hours')",
            (external_id,)
        )
        
        existing = cursor.fetchone()
        conn.close()
        
        if existing:
            logger.info(f"Using existing recent listing data for {external_id}")
            return None  # Skip this listing as we have recent data
        
        # Check cache
        cache_identifier = f"listing_{external_id}"
        cached_data = self._load_from_cache("listing_details", cache_identifier, max_age_hours=12)
        
        if cached_data:
            logger.info(f"Using cached listing data for {external_id}")
            return cached_data
        
        # Fetch from website
        try:
            url = listing_basic['listing_url']
            response = self._make_request(url)
            
            if not response or response.status_code != 200:
                logger.error(f"Failed to fetch listing details. Status code: {response.status_code if response else 'No response'}")
                return listing_basic  # Return basic data we already have
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Start with the basic data we already have
            details = dict(listing_basic)
            
            # Extract additional price data if needed
            if 'price' not in details or not details['price']:
                price_elem = soup.select_one('span.ads_price, span.l_price, td.msga2-o, td.msg2-o')
                if price_elem:
                    price_text = price_elem.text.strip()
                    price_digits = ''.join(filter(str.isdigit, price_text))
                    if price_digits:
                        details['price'] = int(price_digits)
            
            # Extract listing date
            date_elems = soup.select('td.msg2')
            for elem in date_elems:
                if 'Datums' in elem.text or 'Date' in elem.text:
                    date_value = elem.find_next('td')
                    if date_value:
                        date_text = date_value.text.strip()
                        try:
                            # Try to parse various date formats
                            if '.' in date_text:
                                # Format: DD.MM.YYYY
                                parts = date_text.split('.')
                                if len(parts) == 3:
                                    day, month, year = map(int, parts)
                                    details['listing_date'] = f"{year:04d}-{month:02d}-{day:02d}"
                            elif '-' in date_text:
                                # Format: YYYY-MM-DD
                                details['listing_date'] = date_text
                            elif '/' in date_text:
                                # Format: MM/DD/YYYY
                                month, day, year = map(int, date_text.split('/'))
                                details['listing_date'] = f"{year:04d}-{month:02d}-{day:02d}"
                        except Exception as e:
                            logger.warning(f"Error parsing date: {date_text}, {str(e)}")
                            details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
            
            # If no date found, use current date
            if 'listing_date' not in details:
                details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
            
            # Extract region/location
            location_elems = soup.select('td.msg2')
            for elem in location_elems:
                if any(loc_text in elem.text.lower() for loc_text in ['region', 'reģions', 'city', 'pilsēta', 'location', 'atrašanās vieta']):
                    location_value = elem.find_next('td')
                    if location_value:
                        details['region'] = location_value.text.strip()
            
            # If no region found, use default
            if 'region' not in details:
                details['region'] = 'Unknown'
            
            # Extract details from the table
            # SS.LV typically has a table with car specifications
            details_table = soup.select('table.options_list tr, table.ads_opt_list tr, table.d1 tr')
            
            for row in details_table:
                cells = row.select('td')
                if len(cells) >= 2:
                    label = cells[0].text.strip().lower()
                    value = cells[1].text.strip()
                    
                    # Extract year
                    if any(year_text in label for year_text in ['gads', 'year', 'год', 'изготовления']):
                        try:
                            # Find a 4-digit year
                            year_match = re.search(r'\d{4}', value)
                            if year_match:
                                year = int(year_match.group())
                                if 1900 <= year <= datetime.now().year:
                                    details['year'] = year
                        except:
                            pass
                    
                    # Extract engine info
                    if any(engine_text in label for engine_text in ['dzinējs', 'engine', 'двигатель', 'мотор']):
                        details['engine'] = value
                        # Try to extract engine volume and type
                        try:
                            # Look for a decimal number followed by L or l
                            volume_match = re.search(r'(\d+[\.,]\d+)', value)
                            if volume_match:
                                # Convert comma to dot if needed
                                volume_str = volume_match.group(1).replace(',', '.')
                                details['engine_volume'] = float(volume_str)
                            
                            # Determine engine type
                            engine_type = None
                            lower_value = value.lower()
                            if any(fuel in lower_value for fuel in ['benzīn', 'petrol', 'бензин', 'gasoline']):
                                engine_type = 'Petrol'
                            elif any(fuel in lower_value for fuel in ['dīzel', 'diesel', 'дизель']):
                                engine_type = 'Diesel'
                            elif any(fuel in lower_value for fuel in ['hibrīd', 'hybrid', 'гибрид']):
                                engine_type = 'Hybrid'
                            elif any(fuel in lower_value for fuel in ['elektr', 'electric', 'электр']):
                                engine_type = 'Electric'
                            elif any(fuel in lower_value for fuel in ['gas', 'gāze', 'газ']):
                                engine_type = 'Gas'
                            
                            if engine_type:
                                details['engine_type'] = engine_type
                        except Exception as e:
                            logger.warning(f"Error parsing engine info: {value}, {str(e)}")
                            # Extract transmission
                    if any(trans_text in label for trans_text in ['ātrumkārba', 'transmission', 'коробка', 'кпп']):
                        details['transmission'] = value
                        # Determine transmission type
                        lower_value = value.lower()
                        if any(t in lower_value for t in ['manuāl', 'manual', 'ручная', 'механика']):
                            details['transmission'] = 'Manual'
                        elif any(t in lower_value for t in ['automāt', 'automatic', 'автомат']):
                            details['transmission'] = 'Automatic'
                    
                    # Extract mileage
                    if any(mile_text in label for mile_text in ['nobraukums', 'mileage', 'пробег', 'odometer']):
                        try:
                            # Extract digits only
                            mileage_digits = ''.join(filter(str.isdigit, value))
                            if mileage_digits:
                                details['mileage'] = int(mileage_digits)
                        except Exception as e:
                            logger.warning(f"Error parsing mileage: {value}, {str(e)}")
                    
                    # Extract body type
                    if any(body_text in label for body_text in ['virsbūve', 'body', 'кузов', 'type']):
                        details['body_type'] = value
                    
                    # Extract color
                    if any(color_text in label for color_text in ['krāsa', 'color', 'цвет']):
                        details['color'] = value
            
            # Save to cache
            self._save_to_cache("listing_details", cache_identifier, details)
            logger.info(f"Extracted details for listing {external_id}")
            
            return details
                
        except Exception as e:
            logger.error(f"Error getting listing details from {listing_basic['listing_url']}: {str(e)}")
            return listing_basic  # Return basic data we already have
    
    def save_listing_to_db(self, listing_data):
        """Save listing data to the database with proper error handling"""
        try:
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            
            # Get brand_id
            cursor.execute("SELECT brand_id FROM brands WHERE name = ?", (listing_data['brand'],))
            brand_result = cursor.fetchone()
            
            if not brand_result:
                # Insert brand if not exists
                cursor.execute(
                    "INSERT INTO brands (name) VALUES (?)",
                    (listing_data['brand'],)
                )
                brand_id = cursor.lastrowid
            else:
                brand_id = brand_result[0]
            
            # Get model_id
            cursor.execute(
                "SELECT model_id FROM models WHERE brand_id = ? AND name = ?", 
                (brand_id, listing_data['model'])
            )
            model_result = cursor.fetchone()
            
            if not model_result:
                # Insert model if not exists
                cursor.execute(
                    "INSERT INTO models (brand_id, name) VALUES (?, ?)",
                    (brand_id, listing_data['model'])
                )
                model_id = cursor.lastrowid
            else:
                model_id = model_result[0]
            
            # Check if listing exists
            cursor.execute(
                "SELECT listing_id, last_seen FROM listings WHERE external_id = ?",
                (listing_data['external_id'],)
            )
            existing = cursor.fetchone()
            
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            if existing:
                # Update existing listing
                listing_id = existing[0]
                cursor.execute(
                    """
                    UPDATE listings SET 
                        price = ?,
                        year = ?,
                        engine_volume = ?,
                        engine_type = ?,
                        transmission = ?,
                        mileage = ?,
                        color = ?,
                        body_type = ?,
                        region = ?,
                        last_seen = ?
                    WHERE listing_id = ?
                    """,
                    (
                        listing_data.get('price'),
                        listing_data.get('year'),
                        listing_data.get('engine_volume'),
                        listing_data.get('engine_type'),
                        listing_data.get('transmission'),
                        listing_data.get('mileage'),
                        listing_data.get('color'),
                        listing_data.get('body_type'),
                        listing_data.get('region'),
                        now,
                        listing_id
                    )
                )
                return False  # Not a new listing
            else:
                # Insert new listing
                cursor.execute(
                    """
                    INSERT INTO listings (
                        external_id, model_id, brand_id, price, year, engine_volume, engine_type,
                        transmission, mileage, color, body_type, region, listing_url, listing_date,
                        last_seen, first_seen
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        listing_data['external_id'],
                        model_id,
                        brand_id,
                        listing_data.get('price'),
                        listing_data.get('year'),
                        listing_data.get('engine_volume'),
                        listing_data.get('engine_type'),
                        listing_data.get('transmission'),
                        listing_data.get('mileage'),
                        listing_data.get('color'),
                        listing_data.get('body_type'),
                        listing_data.get('region'),
                        listing_data['listing_url'],
                        listing_data.get('listing_date', now.split()[0]),
                        now,
                        now
                    )
                )
                return True  # New listing
        except Exception as e:
            logger.error(f"Error saving listing to database: {str(e)}")
            conn.rollback()
            return False
        finally:
            conn.commit()
            conn.close()
    
    def process_listing(self, listing_basic):
        """Process a single listing: get details and save to database"""
        try:
            # Get detailed info if available
            listing_details = self.get_listing_details(listing_basic)
            if listing_details:
                # Use the most detailed info available
                listing_data = listing_details
            else:
                listing_data = listing_basic
            
            # Save to database
            is_new = self.save_listing_to_db(listing_data)
            self.listings_processed += 1
            if is_new:
                self.new_listings += 1
                
            return True
        except Exception as e:
            logger.error(f"Error processing listing {listing_basic.get('external_id', 'unknown')}: {str(e)}")
            return False
    
    def scrape_brand_models(self, brand, models_to_scrape=5, max_pages=2):
        """Scrape models for a specific brand"""
        try:
            brand_name = brand['name']
            logger.info(f"Starting to scrape brand: {brand_name}")
            self.brand_progress[brand_name] = {"total_models": 0, "completed_models": 0, "listings": 0}
            
            # Get models for this brand
            all_models = self.get_models_for_brand(brand)
            
            if not all_models:
                logger.warning(f"No models found for brand: {brand_name}")
                return 0
                
            logger.info(f"Found {len(all_models)} models for {brand_name}")
            self.brand_progress[brand_name]["total_models"] = min(models_to_scrape, len(all_models))
            
            # Only scrape a subset of models to save time
            models = all_models[:models_to_scrape]
            brand_listings = 0
            
            for i, model in enumerate(models):
                model_name = model['name']
                logger.info(f"Scraping model {i+1}/{len(models)}: {brand_name} {model_name}")
                
                # Get listings for this model
                listings = self.get_listings_for_model(brand, model, max_pages=max_pages)
                
                if not listings:
                    logger.warning(f"No listings found for {brand_name} {model_name}")
                    self.brand_progress[brand_name]["completed_models"] += 1
                    continue
                
                logger.info(f"Found {len(listings)} listings for {brand_name} {model_name}")
                
                # Process listings
                for listing in listings:
                    self.process_listing(listing)
                
                brand_listings += len(listings)
                self.brand_progress[brand_name]["listings"] = brand_listings
                self.brand_progress[brand_name]["completed_models"] += 1
                
                # Add small delay between models
                self._random_delay(1, 2)
            
            logger.info(f"Completed scraping brand {brand_name}. Processed {brand_listings} listings.")
            return brand_listings
            
        except Exception as e:
            logger.error(f"Error scraping brand {brand.get('name', 'unknown')}: {str(e)}")
            return 0
    
    def run(self, max_brands=None, models_per_brand=5, max_pages=2):
        """Run the scraper with prioritized brands and models"""
        self.start_time = datetime.now()
        self.listings_processed = 0
        self.new_listings = 0
        
        logger.info(f"Starting scraper at {self.start_time}")
        logger.info(f"Settings: max_brands={max_brands}, models_per_brand={models_per_brand}, max_pages={max_pages}")
        
        try:
            # Get all brands
            all_brands = self.get_brands()
            
            if not all_brands:
                logger.error("No brands found. Exiting.")
                return {
                    "success": False,
                    "error": "No brands found",
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
            
            # Prioritize popular brands
            prioritized = []
            other = []
            
            for brand in all_brands:
                if brand['name'] in self.prioritized_brands:
                    prioritized.append(brand)
                else:
                    other.append(brand)
            
            # Combine prioritized first, then others
            brands = prioritized + other
            
            # Limit the number of brands if requested
            if max_brands:
                brands = brands[:max_brands]
            
            # Create a thread pool for parallel processing
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.concurrent_requests) as executor:
                # Submit scraping tasks for each brand
                futures = {executor.submit(self.scrape_brand_models, brand, models_per_brand, max_pages): brand for brand in brands}
                
                # Process results as they complete
                for future in concurrent.futures.as_completed(futures):
                    brand = futures[future]
                    try:
                        brand_listings = future.result()
                        logger.info(f"Completed brand {brand['name']}: {brand_listings} listings")
                    except Exception as e:
                        logger.error(f"Error processing brand {brand['name']}: {str(e)}")
            
            end_time = datetime.now()
            elapsed = (end_time - self.start_time).total_seconds()
            
            logger.info(f"Scraping completed at {end_time}")
            logger.info(f"Total time: {elapsed:.2f} seconds")
            logger.info(f"Total listings processed: {self.listings_processed}")
            logger.info(f"New listings: {self.new_listings}")
            
            return {
                "success": True,
                "total_listings": self.listings_processed,
                "new_listings": self.new_listings,
                "elapsed_time": f"{elapsed:.2f} seconds",
                "timestamp": end_time.strftime('%Y-%m-%d %H:%M:%S')
            }
            
        except Exception as e:
            logger.error(f"Error running scraper: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
    
    def get_statistics(self):
        """Get statistics about the scraped data"""
        try:
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            
            # Total counts
            cursor.execute("SELECT COUNT(*) FROM brands")
            brand_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM models")
            model_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM listings")
            listing_count = cursor.fetchone()[0]
            
            # Listings by brand
            cursor.execute("""
                SELECT b.name, COUNT(l.listing_id) 
                FROM listings l
                JOIN brands b ON l.brand_id = b.brand_id
                GROUP BY b.name
                ORDER BY COUNT(l.listing_id) DESC
            """)
            brand_listings = cursor.fetchall()
            
            # Recent listings
            cursor.execute("""
                SELECT COUNT(*) FROM listings 
                WHERE first_seen > datetime('now', '-24 hours')
            """)
            recent_listings = cursor.fetchone()[0]
            
            # Price statistics
            cursor.execute("SELECT AVG(price), MIN(price), MAX(price) FROM listings WHERE price > 0")
            price_stats = cursor.fetchone()
            
            conn.close()
            
            return {
                "brand_count": brand_count,
                "model_count": model_count,
                "listing_count": listing_count,
                "brand_listings": brand_listings,
                "recent_listings": recent_listings,
                "price_stats": {
                    "avg": round(price_stats[0]) if price_stats[0] else 0,
                    "min": price_stats[1] if price_stats[1] else 0,
                    "max": price_stats[2] if price_stats[2] else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {str(e)}")
            return {
                "error": str(e)
            }
    
    def export_data(self, output_file="car_data.csv"):
        """Export the scraped data to CSV file"""
        try:
            conn = sqlite3.connect(self.db_file)
            
            # Create SQL query that joins all relevant tables
            query = """
                SELECT 
                    b.name as brand, 
                    m.name as model, 
                    l.year, 
                    l.engine_volume, 
                    l.engine_type, 
                    l.transmission, 
                    l.mileage, 
                    l.body_type, 
                    l.color, 
                    l.region, 
                    l.price, 
                    l.listing_date, 
                    l.listing_url, 
                    l.first_seen, 
                    l.last_seen
                FROM listings l
                JOIN brands b ON l.brand_id = b.brand_id
                JOIN models m ON l.model_id = m.model_id
                ORDER BY l.last_seen DESC
            """
            
            # Use pandas to read the query directly into a DataFrame
            df = pd.read_sql_query(query, conn)
            
            # Save to CSV
            df.to_csv(output_file, index=False)
            conn.close()
            
            logger.info(f"Data exported to {output_file}: {len(df)} rows")
            return {
                "success": True,
                "file": output_file,
                "rows": len(df)
            }
            
        except Exception as e:
            logger.error(f"Error exporting data: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

def setup_logging(verbose=False):
    """Set up logging configuration"""
    log_level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("scraper_run.log"),
            logging.StreamHandler()  # Also log to console
        ]
    )

def init_default_sources(session):
    """Initialize default data sources in the database"""
    logger = logging.getLogger('ss_scraper')
    logger.info("Initializing default sources")
    
    return True

def scrape_all_sources(session, max_listings=1000):
    """Run scraping for all sources"""
    logger = logging.getLogger('ss_scraper')
    logger.info(f"Starting scraping with max_listings={max_listings}")
    
    # Create a scraper instance
    scraper = SSLVScraper(database_file="car_price_analysis.db")
    
    # Run the scraper
    result = scraper.run(max_brands=5, models_per_brand=3, max_pages=2)
    
    return result

def main():
    """Main function to run the scraper"""
    parser = argparse.ArgumentParser(description='Run the Optimized SS.LV Car Scraper')
    
    parser.add_argument('--brands', type=int, default=5, 
                       help='Maximum number of brands to scrape (default: 5)')
    parser.add_argument('--models', type=int, default=3, 
                       help='Maximum number of models per brand to scrape (default: 3)')
    parser.add_argument('--pages', type=int, default=2, 
                       help='Maximum number of pages per model to scrape (default: 2)')
    parser.add_argument('--cache-dir', default='cache', 
                       help='Directory for caching data (default: cache)')
    parser.add_argument('--db-file', default='car_data.db', 
                       help='SQLite database file (default: car_data.db)')
    parser.add_argument('--export', action='store_true', 
                       help='Export data to CSV after scraping')
    parser.add_argument('--stats-only', action='store_true', 
                       help='Only show statistics without scraping')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Set up logging
    setup_logging(args.verbose)
    logger = logging.getLogger('scraper_runner')
    
    # Initialize scraper
    scraper = SSLVScraper(
        cache_dir=args.cache_dir,
        database_file=args.db_file
    )
    
    # Show statistics if requested
    if args.stats_only:
        print("\nScraper Statistics:")
        stats = scraper.get_statistics()
        
        if "error" in stats:
            print(f"Error retrieving statistics: {stats['error']}")
            return
        
        print(f"Total brands: {stats['brand_count']}")
        print(f"Total models: {stats['model_count']}")
        print(f"Total listings: {stats['listing_count']}")
        print(f"Listings added in last 24 hours: {stats['recent_listings']}")
        
        if stats['price_stats']:
            print("\nPrice Statistics:")
            print(f"Average price: €{stats['price_stats']['avg']}")
            print(f"Minimum price: €{stats['price_stats']['min']}")
            print(f"Maximum price: €{stats['price_stats']['max']}")
        
        print("\nTop Brands by Listings:")
        for i, (brand, count) in enumerate(stats['brand_listings'][:10], 1):
            print(f"{i}. {brand}: {count} listings")
            
        return
    
    # Run scraper
    print("\nStarting SS.LV Car Scraper")
    print(f"Configuration: {args.brands} brands, {args.models} models per brand, {args.pages} pages per model")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Scraping in progress...")
    
    start_time = time.time()
    result = scraper.run(
        max_brands=args.brands,
        models_per_brand=args.models,
        max_pages=args.pages
    )
    
    elapsed = time.time() - start_time
    
    print("\nScraping Completed")
    print(f"Elapsed time: {elapsed:.2f} seconds")
    
    if result["success"]:
        print(f"Total listings processed: {result['total_listings']}")
        print(f"New listings added: {result['new_listings']}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")
    
    # Show statistics
    print("\nCurrent Statistics:")
    stats = scraper.get_statistics()
    
    if "error" not in stats:
        print(f"Total brands: {stats['brand_count']}")
        print(f"Total models: {stats['model_count']}")
        print(f"Total listings: {stats['listing_count']}")
        print(f"Listings added in last 24 hours: {stats['recent_listings']}")
        
        if stats['price_stats']:
            print("\nPrice Statistics:")
            print(f"Average price: €{stats['price_stats']['avg']}")
    
    # Export data if requested
    if args.export:
        print("\nExporting data to CSV...")
        export_result = scraper.export_data(output_file="car_data.csv")
        
        if export_result["success"]:
            print(f"Data exported to {export_result['file']}: {export_result['rows']} rows")
        else:
            print(f"Error exporting data: {export_result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    main()