import requests
import aiohttp
import asyncio
import time
import random
import logging
import re
from datetime import datetime, timedelta
import os
import json
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from models import Brand, Model, Car, Listing, Region, Source, init_db
from bs4 import BeautifulSoup
import platform

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='ss_scraper.log'
)
logger = logging.getLogger('ss_scraper')

# Add console handler for immediate feedback
console = logging.StreamHandler()
console.setLevel(logging.INFO)
console.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(console)

class SSScraper:
    """High-performance asynchronous scraper for SS.LV car listings"""
    
    def __init__(self, db_url="sqlite:///car_price_analysis.db", debug_mode=False, 
                 max_concurrent_requests=10, mark_inactive_after_days=30):
        """Initialize the scraper with database connection and settings"""
        self.base_url = "https://www.ss.lv"
        self.car_url = f"{self.base_url}/lv/transport/cars/"
        self.debug_mode = debug_mode
        self.max_concurrent_requests = max_concurrent_requests
        self.mark_inactive_after_days = mark_inactive_after_days
        
        # Create debug directory
        if self.debug_mode:
            os.makedirs("debug_html", exist_ok=True)
        
        # Cache directory for saving HTML responses
        self.cache_dir = "html_cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # User agents for rotation
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.66',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Mobile/15E148 Safari/604.1'
        ]
        
        # Database connection
        if db_url != "sqlite:///car_price_analysis.db":
            self.session, self.engine = init_db(db_url)
        else:
            # Use default path
            self.session, self.engine = init_db()
        
        # Create a source for SS.LV
        self.ensure_source_exists()
        
        # Counters for statistics
        self.total_listings = 0
        self.new_listings = 0
        self.updated_listings = 0
        self.deactivated_listings = 0
        
        # Semaphore for limiting concurrent requests
        self.semaphore = asyncio.Semaphore(self.max_concurrent_requests)
        
        # Prioritized brands to focus on
        self.prioritized_brands = [
            "Audi", "BMW", "Volkswagen", "Mercedes", "Toyota",
            "Volvo", "Ford", "Opel", "Peugeot", "Renault", "Skoda"
        ]
    
    def ensure_source_exists(self):
        """Make sure the SS.LV source exists in the database"""
        from models import Source
        
        # Check if source exists
        source = self.session.query(Source).filter(Source.name == "SS.LV").first()
        
        if not source:
            logger.info("Creating SS.LV source in database")
            source = Source(
                name="SS.LV",
                url="https://www.ss.lv/lv/transport/cars/",
                country="Latvia",
                scraping_config="{}",
                last_scraped_at=None
            )
            self.session.add(source)
            self.session.commit()
        
        self.source_id = source.source_id
        logger.info(f"Using source_id {self.source_id} for SS.LV")
    
    def _get_random_user_agent(self):
        """Get a random user agent"""
        return random.choice(self.user_agents)
    
    def _make_request(self, url, retry=True):
        """Make a synchronous HTTP request with retries and error handling"""
        headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept-Language': 'en-US,en;q=0.9,lv;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Connection': 'keep-alive',
            'Referer': self.base_url
        }
        
        # Check cache first
        cache_key = url.replace('/', '_').replace(':', '').replace('.', '_')
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.html")
        
        # Check if we have a cached version that's less than 1 hour old
        if os.path.exists(cache_file):
            file_age = time.time() - os.path.getmtime(cache_file)
            if file_age < 3600:  # 1 hour in seconds
                try:
                    with open(cache_file, 'r', encoding='utf-8') as f:
                        logger.debug(f"Using cached version of {url}")
                        return type('obj', (object,), {
                            'status_code': 200,
                            'text': f.read(),
                            'content': f.read().encode('utf-8') if hasattr(f, 'read') else b'',
                            'from_cache': True
                        })
                except Exception as e:
                    logger.debug(f"Error reading cache: {e}")
        
        # Not in cache or cache expired, make the request
        retry_count = 3
        retry_delay = 2
        
        for attempt in range(retry_count + 1):
            try:
                response = requests.get(url, headers=headers, timeout=20)
                
                # Save to cache if successful
                if response.status_code == 200:
                    try:
                        with open(cache_file, 'w', encoding='utf-8') as f:
                            f.write(response.text)
                    except Exception as e:
                        logger.debug(f"Error saving to cache: {e}")
                
                # If requested, save the HTML for debugging
                if self.debug_mode:
                    debug_file = f"debug_html/{url.replace('/', '_').replace(':', '')}.html"
                    with open(debug_file, "w", encoding="utf-8") as f:
                        f.write(response.text)
                
                if response.status_code == 200:
                    return response
                
                if response.status_code in [403, 429]:
                    # Rate limiting - wait longer
                    wait_time = retry_delay * (attempt + 1) * 2
                    logger.warning(f"Rate limited ({response.status_code}). Waiting {wait_time}s")
                    time.sleep(wait_time)
                else:
                    logger.warning(f"Request failed: {response.status_code}")
                    time.sleep(retry_delay)
            except Exception as e:
                logger.warning(f"Request error for {url}: {str(e)}")
                if attempt < retry_count and retry:
                    time.sleep(retry_delay)
                else:
                    raise
        
        return None
    
    async def _async_make_request(self, url, session):
        """Make an asynchronous HTTP request with error handling"""
        async with self.semaphore:  # Limit concurrent requests
            headers = {
                'User-Agent': self._get_random_user_agent(),
                'Accept-Language': 'en-US,en;q=0.9,lv;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Connection': 'keep-alive',
                'Referer': self.base_url
            }
            
            # Check cache first
            cache_key = url.replace('/', '_').replace(':', '').replace('.', '_')
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.html")
            
            try:
                import aiofiles
                AIOFILES_AVAILABLE = True
            except ImportError:
                AIOFILES_AVAILABLE = False
                print("Warning: aiofiles module not installed. Using fallback for caching.")

            # Check if we have a cached version that's less than 1 hour old
            if os.path.exists(cache_file):
                file_age = time.time() - os.path.getmtime(cache_file)
                if file_age < 3600:  # 1 hour in seconds
                    try:
                        async with aiofiles.open(cache_file, 'r', encoding='utf-8') as f:
                            content = await f.read()
                            logger.debug(f"Using cached version of {url}")
                            return type('obj', (object,), {
                                'status': 200,
                                'text': content,
                                'from_cache': True
                            })
                    except Exception as e:
                        logger.debug(f"Error reading cache: {e}")
            
            # Not in cache or cache expired, make the request
            retry_count = 3
            retry_delay = 2
            
            for attempt in range(retry_count + 1):
                try:
                    async with session.get(url, headers=headers, timeout=20) as response:
                        if response.status == 200:
                            # Save to cache
                            text = await response.text()
                            try:
                                with open(cache_file, 'w', encoding='utf-8') as f:
                                    f.write(text)
                            except Exception as e:
                                logger.debug(f"Error saving to cache: {e}")
                            
                            # If requested, save the HTML for debugging
                            if self.debug_mode:
                                debug_file = f"debug_html/{url.replace('/', '_').replace(':', '')}.html"
                                with open(debug_file, "w", encoding="utf-8") as f:
                                    f.write(text)
                            
                            # Return custom object with text property
                            return type('obj', (object,), {
                                'status': response.status,
                                'text': text,
                                'from_cache': False
                            })
                        
                        if response.status in [403, 429]:
                            # Rate limiting - wait longer
                            wait_time = retry_delay * (attempt + 1) * 2
                            logger.warning(f"Rate limited ({response.status}). Waiting {wait_time}s")
                            await asyncio.sleep(wait_time)
                        else:
                            logger.warning(f"Request failed: {response.status}")
                            await asyncio.sleep(retry_delay)
                except Exception as e:
                    logger.warning(f"Async request error for {url}: {str(e)}")
                    if attempt < retry_count:
                        await asyncio.sleep(retry_delay)
                    else:
                        raise
            
            return None
    
    def _random_delay(self):
        """Add a small random delay between requests"""
        time.sleep(random.uniform(0.5, 2))
    
    async def _async_random_delay(self):
        """Add a small random delay between async requests"""
        await asyncio.sleep(random.uniform(0.5, 2))
    
    def get_brands(self):
        """Get the list of car brands from SS.LV"""
        logger.info("Fetching car brands from SS.LV")
        
        response = self._make_request(self.car_url)
        if not response:
            logger.error("Failed to fetch brands page")
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        brands = []
        
        # Find brand links in the main category page
        links = soup.find_all('a', href=lambda href: href and '/transport/cars/' in href)
        
        for link in links:
            brand_name = link.text.strip()
            href = link.get('href', '')
            
            # Skip non-brand links
            if not brand_name or not href:
                continue
                
            # Skip search, language links, etc.
            if ("search" in href or 
                brand_name in ["RU", "EN", "LV"] or
                "mekl" in brand_name.lower()):
                continue
                
            # Basic validation that it's a brand link
            if (href.startswith('/lv/transport/cars/') and 
                href.count('/') >= 4 and
                len(brand_name) > 1):
                
                brand_url = self.base_url + href
                brands.append({
                    'name': brand_name,
                    'url': brand_url
                })
        
        logger.info(f"Found {len(brands)} car brands")
        return brands
    
    def save_brand(self, brand_name):
        """Save a brand to the database if it doesn't exist yet"""
        brand = self.session.query(Brand).filter(Brand.name == brand_name).first()
        
        if not brand:
            logger.info(f"Creating new brand: {brand_name}")
            brand = Brand(
                name=brand_name,
                country="Unknown",  # We don't have this info from SS.LV
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.session.add(brand)
            self.session.commit()
        
        return brand
    
    def get_models_for_brand(self, brand_data):
        """Get models for a specific brand"""
        brand_name = brand_data['name']
        brand_url = brand_data['url']
        logger.info(f"Fetching models for {brand_name}")
        
        response = self._make_request(brand_url)
        if not response:
            logger.error(f"Failed to fetch models for {brand_name}")
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        models = []
        
        # Get all links on the page
        links = soup.find_all('a')
        
        # Extract brand name from URL to help filter model links
        brand_path = brand_url.rstrip('/').split('/')
        brand_url_name = brand_path[-1].lower() if brand_path else ""
        
        for link in links:
            model_name = link.text.strip()
            href = link.get('href', '')
            
            # Skip non-model links
            if not model_name or not href:
                continue
                
            # Skip language links etc.
            if model_name in ["RU", "EN", "LV"] or model_name == brand_name:
                continue
                
            # Check if it's likely a model link
            if (f"/transport/cars/{brand_url_name}/" in href and 
                "search" not in href and
                len(model_name) > 1):
                
                model_url = self.base_url + href if href.startswith('/') else href
                models.append({
                    'name': model_name,
                    'url': model_url
                })
        
        logger.info(f"Found {len(models)} models for {brand_name}")
        return models
    
    def save_model(self, brand, model_name):
        """Save a model to the database if it doesn't exist yet"""
        model = self.session.query(Model).filter(
            Model.brand_id == brand.brand_id,
            Model.name == model_name
        ).first()
        
        if not model:
            logger.info(f"Creating new model: {brand.name} {model_name}")
            model = Model(
                brand_id=brand.brand_id,
                name=model_name,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.session.add(model)
            self.session.commit()
        
        return model
    
    def get_listings_for_model(self, brand_data, model_data, max_pages=2):
        """Get car listings for a specific model using the table structure"""
        brand_name = brand_data['name']
        model_name = model_data['name']
        model_url = model_data['url']
        
        logger.info(f"Fetching listings for {brand_name} {model_name}")
        
        listings = []
        page = 0
        current_url = model_url
        
        while page < max_pages:
            logger.info(f"Fetching page {page+1} from {current_url}")
            
            response = self._make_request(current_url)
            if not response:
                logger.error(f"Failed to fetch listings for {brand_name} {model_name}")
                break
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find all table rows with an ID that start with "tr_"
            listing_rows = soup.find_all('tr', id=lambda x: x and x.startswith('tr_'))
            
            logger.info(f"Found {len(listing_rows)} potential listing rows")
            
            for row in listing_rows:
                try:
                    # Get listing ID directly from the row's ID attribute
                    listing_id = row.get('id', '')
                    if not listing_id:
                        continue
                    
                    # Find the link to the detail page
                    link = None
                    for cell in row.find_all('td'):
                        links = cell.find_all('a')
                        if links:
                            link = links[0].get('href')
                            if link:
                                break
                    
                    if link:
                        listing_url = self.base_url + link if link.startswith('/') else link
                    else:
                        continue  # Skip if no link found
                    
                    # Extract data from cells
                    cells = row.find_all('td')
                    
                    # Get title - could be in any of the cells
                    title = None
                    for cell in cells:
                        if cell.text.strip() and len(cell.text.strip()) > 3:
                            title = cell.text.strip()
                            break
                    
                    # Extract key data based on cell position
                    # Adjust these indices based on the actual structure observed
                    year = price = engine = mileage = None
                    
                    # Try to find data in expected positions
                    if len(cells) >= 7:  # Full row
                        year_cell = cells[3]
                        engine_cell = cells[4]
                        mileage_cell = cells[5]
                        price_cell = cells[6]
                        
                        # Extract values
                        year_text = year_cell.text.strip()
                        if year_text.isdigit() and 1900 <= int(year_text) <= datetime.now().year:
                            year = int(year_text)
                        
                        engine = engine_cell.text.strip()
                        
                        mileage_text = mileage_cell.text.strip()
                        mileage_digits = ''.join(filter(str.isdigit, mileage_text))
                        if mileage_digits:
                            mileage = int(mileage_digits)
                        
                        price_text = price_cell.text.strip()
                        price_digits = ''.join(filter(str.isdigit, price_text))
                        if price_digits:
                            price = int(price_digits)
                    
                    # Add to listings if we have the minimal required info
                    if listing_id and listing_url:
                        listing_data = {
                            'external_id': listing_id,
                            'title': title,
                            'url': listing_url,
                            'price': price,
                            'year': year,
                            'engine': engine,
                            'mileage': mileage,
                            'brand': brand_name,
                            'model': model_name
                        }
                        listings.append(listing_data)
                
                except Exception as e:
                    logger.error(f"Error extracting listing: {str(e)}")
                    continue
            
            # Check for next page
            next_page = None
            for link in soup.find_all('a', class_='navi'):
                if link.text.strip() in ["Nākamā", "Next", ">>", "Следующая"]:
                    next_page = link
                    break
            
            if next_page and 'href' in next_page.attrs:
                current_url = self.base_url + next_page['href'] if next_page['href'].startswith('/') else next_page['href']
                page += 1
                self._random_delay()
            else:
                break
        
        logger.info(f"Found total {len(listings)} listings for {brand_name} {model_name}")
        return listings
    
    async def get_listing_details_async(self, listing_basic, session):
        """Get detailed information for a listing asynchronously"""
        # Skip if no URL
        if not listing_basic.get('url'):
            return listing_basic
            
        listing_url = listing_basic['url']
        logger.debug(f"Fetching details for listing {listing_basic['external_id']}")
        
        try:
            response = await self._async_make_request(listing_url, session)
            if not response:
                logger.error(f"Failed to fetch listing details")
                return listing_basic  # Return what we already have
            
            soup = BeautifulSoup(response.text, 'html.parser')
            details = dict(listing_basic)  # Start with basic info
            
            # Extract listing date
            date_cells = soup.select('td.msg2, td.msga2')
            for cell in date_cells:
                if 'Datums' in cell.text or 'Date' in cell.text:
                    date_value = cell.find_next('td')
                    if date_value:
                        date_text = date_value.text.strip()
                        try:
                            # Parse different date formats
                            if '.' in date_text:
                                # Format: DD.MM.YYYY
                                parts = date_text.split('.')
                                if len(parts) == 3:
                                    day, month, year = map(int, parts)
                                    details['listing_date'] = f"{year:04d}-{month:02d}-{day:02d}"
                            elif '-' in date_text:
                                # Format: YYYY-MM-DD
                                details['listing_date'] = date_text
                            else:
                                # Default to today
                                details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
                        except:
                            details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
            
            # Set default listing date if not found
            if 'listing_date' not in details:
                details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
            
            # Extract region/location
            for cell in date_cells:
                if any(loc_text in cell.text.lower() for loc_text in ['region', 'reģions', 'pilsēta']):
                    location_value = cell.find_next('td')
                    if location_value:
                        details['region'] = location_value.text.strip()
            
            # If no region found, use default
            if 'region' not in details:
                details['region'] = 'Nav norādīts'
            
            # Extract other specifications from the details table
            details_rows = soup.select('table.options_list tr, table.d1 tr')
            
            for row in details_rows:
                cells = row.select('td')
                if len(cells) >= 2:
                    label = cells[0].text.strip().lower()
                    value = cells[1].text.strip()
                    
                    # Engine
                    if any(eng_text in label for eng_text in ['dzinējs', 'engine', 'двигатель']):
                        details['engine'] = value
                        
                        # Parse engine volume and type
                        volume_match = re.search(r'(\d+[\.,]\d+)', value)
                        if volume_match:
                            volume_str = volume_match.group(1).replace(',', '.')
                            details['engine_volume'] = float(volume_str)
                        
                        # Determine engine type
                        lower_value = value.lower()
                        if any(fuel in lower_value for fuel in ['benzīn', 'petrol', 'gasoline']):
                            details['engine_type'] = 'Petrol'
                        elif any(fuel in lower_value for fuel in ['dīzel', 'diesel']):
                            details['engine_type'] = 'Diesel'
                        elif any(fuel in lower_value for fuel in ['hibrīd', 'hybrid']):
                            details['engine_type'] = 'Hybrid'
                        elif any(fuel in lower_value for fuel in ['elektr', 'electric']):
                            details['engine_type'] = 'Electric'
                        elif any(fuel in lower_value for fuel in ['gas', 'gāze']):
                            details['engine_type'] = 'Gas'
                    
                    # Transmission
                    if any(trans_text in label for trans_text in ['ātrumkārba', 'transmission', 'коробка']):
                        lower_value = value.lower()
                        if any(t in lower_value for t in ['manuāl', 'manual', 'механика']):
                            details['transmission'] = 'Manual'
                        elif any(t in lower_value for t in ['automāt', 'automatic', 'автомат']):
                            details['transmission'] = 'Automatic'
                        else:
                            details['transmission'] = value
                    
                    # Mileage
                    if any(mile_text in label for mile_text in ['nobraukums', 'mileage', 'пробег']):
                        mileage_digits = ''.join(filter(str.isdigit, value))
                        if mileage_digits:
                            details['mileage'] = int(mileage_digits)
                    
                    # Body type
                    if any(body_text in label for body_text in ['virsbūve', 'body', 'кузов']):
                        details['body_type'] = value
                    
                    # Color
                    if any(color_text in label for color_text in ['krāsa', 'color', 'цвет']):
                        details['color'] = value
            
            logger.debug(f"Extracted details for listing {listing_basic['external_id']}")
            return details
            
        except Exception as e:
            logger.error(f"Error getting listing details: {str(e)}")
            return listing_basic
    
    def ensure_region_exists(self, region_name):
        """Make sure the region exists in database"""
        if not region_name:
            region_name = "Nav norādīts"
            
        region = self.session.query(Region).filter(Region.name == region_name).first()
        
        if not region:
            logger.info(f"Creating new region: {region_name}")
            region = Region(
                name=region_name,
                country="Latvia",  # Default for SS.LV
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.session.add(region)
            self.session.commit()
        
        return region
    
    def save_car_and_listing(self, listing_data):
        """Save car and listing to database"""
        try:
            # 1. Make sure brand exists
            brand = self.save_brand(listing_data['brand'])
            
            # 2. Make sure model exists
            model = self.save_model(brand, listing_data['model'])
            
            # 3. Make sure region exists
            region = self.ensure_region_exists(listing_data.get('region', 'Nav norādīts'))
            
            # 4. Check if listing already exists by external_id
            existing_listing = self.session.query(Listing).filter(
                Listing.external_id == listing_data['external_id']
            ).first()
            
            if existing_listing:
                # Update existing listing
                logger.debug(f"Updating existing listing {listing_data['external_id']}")
                
                # Get the car
                car = existing_listing.car
                
                # Update car attributes if needed
                updated = False
                if listing_data.get('year') and car.year != listing_data['year']:
                    car.year = listing_data['year']
                    updated = True
                if listing_data.get('engine_volume') and car.engine_volume != listing_data['engine_volume']:
                    car.engine_volume = listing_data['engine_volume']
                    updated = True
                if listing_data.get('engine_type') and car.engine_type != listing_data['engine_type']:
                    car.engine_type = listing_data['engine_type']
                    updated = True
                if listing_data.get('transmission') and car.transmission != listing_data['transmission']:
                    car.transmission = listing_data['transmission']
                    updated = True
                if listing_data.get('mileage') and car.mileage != listing_data['mileage']:
                    car.mileage = listing_data['mileage']
                    updated = True
                if listing_data.get('body_type') and car.body_type != listing_data['body_type']:
                    car.body_type = listing_data['body_type']
                    updated = True
                if listing_data.get('color') and car.color != listing_data['color']:
                    car.color = listing_data['color']
                    updated = True
                
                # Update listing attributes
                if listing_data.get('price') and existing_listing.price != listing_data['price']:
                    existing_listing.price = listing_data['price']
                    updated = True
                if listing_data.get('listing_date'):
                    try:
                        new_date = datetime.strptime(listing_data['listing_date'], '%Y-%m-%d').date()
                        if existing_listing.listing_date != new_date:
                            existing_listing.listing_date = new_date
                            updated = True
                    except ValueError:
                        pass
                
                # Set to active (in case it was inactive before)
                if not existing_listing.is_active:
                    existing_listing.is_active = True
                    updated = True
                
                # Always update the 'updated_at' timestamp
                existing_listing.updated_at = datetime.now()
                car.updated_at = datetime.now()
                
                self.session.commit()
                
                # Return True if we made updates, false otherwise
                if updated:
                    self.updated_listings += 1
                return "updated" if updated else "unchanged"
            else:
                # Create new car
                car = Car(
                    model_id=model.model_id,
                    region_id=region.region_id,
                    year=listing_data.get('year'),
                    engine_volume=listing_data.get('engine_volume'),
                    engine_type=listing_data.get('engine_type'),
                    transmission=listing_data.get('transmission'),
                    mileage=listing_data.get('mileage'),
                    body_type=listing_data.get('body_type'),
                    color=listing_data.get('color'),
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.session.add(car)
                self.session.flush()  # Get car_id without committing
                
                # Create new listing
                listing_date = datetime.now().date()
                if listing_data.get('listing_date'):
                    try:
                        listing_date = datetime.strptime(
                            listing_data['listing_date'], '%Y-%m-%d'
                        ).date()
                    except ValueError:
                        pass
                
                listing = Listing(
                    car_id=car.car_id,
                    source_id=self.source_id,
                    external_id=listing_data['external_id'],
                    price=listing_data.get('price', 0),
                    listing_date=listing_date,
                    listing_url=listing_data['url'],
                    is_active=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.session.add(listing)
                self.session.commit()
                
                logger.info(f"Created new listing: {listing_data['external_id']}")
                self.new_listings += 1
                return "new"
                
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error saving listing {listing_data.get('external_id', 'unknown')}: {str(e)}")
            return "error"
    
    async def process_listing_async(self, listing_basic, session):
        """Process a single listing asynchronously"""
        try:
            # Get detailed listing info
            listing_details = await self.get_listing_details_async(listing_basic, session)
            
            # Save to database - this is synchronous but relatively fast
            result = self.save_car_and_listing(listing_details)
            
            self.total_listings += 1
            
            # Small delay to avoid overloading the server
            await self._async_random_delay()
            
            return result
        except Exception as e:
            logger.error(f"Error processing listing: {str(e)}")
            return "error"
    
    async def process_listings_batch_async(self, listings):
        """Process a batch of listings concurrently"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for listing in listings:
                tasks.append(self.process_listing_async(listing, session))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Count the results
            result_counts = {
                "new": 0,
                "updated": 0,
                "unchanged": 0,
                "error": 0
            }
            
            for result in results:
                if isinstance(result, Exception):
                    result_counts["error"] += 1
                else:
                    result_counts[result] = result_counts.get(result, 0) + 1
            
            return result_counts
    
    async def scrape_brand_async(self, brand, models_limit=3, pages_per_model=2):
        """Scrape a single brand asynchronously"""
        logger.info(f"Starting to scrape brand: {brand['name']}")
        
        # Get models for this brand
        models = self.get_models_for_brand(brand)
        
        if not models:
            logger.warning(f"No models found for brand: {brand['name']}")
            return 0
        
        # Limit number of models to scrape
        models = models[:models_limit]
        brand_listings_count = 0
        
        for model in models:
            logger.info(f"Scraping model: {brand['name']} {model['name']}")
            
            # Get listings for this model
            listings = self.get_listings_for_model(brand, model, max_pages=pages_per_model)
            
            if not listings:
                logger.warning(f"No listings found for {brand['name']} {model['name']}")
                continue
            
            # Process listings concurrently
            results = await self.process_listings_batch_async(listings)
            
            brand_listings_count += len(listings)
            logger.info(f"Processed {len(listings)} listings for {brand['name']} {model['name']}")
            logger.info(f"Results: {results}")
            
            # Small delay between models
            await asyncio.sleep(random.uniform(1, 3))
        
        logger.info(f"Completed scraping brand {brand['name']}. Processed {brand_listings_count} listings.")
        return brand_listings_count
    
    def mark_inactive_listings(self):
        """Mark listings as inactive if they haven't been updated recently"""
        cutoff_date = datetime.now() - timedelta(days=self.mark_inactive_after_days)
        
        try:
            # Find active listings that haven't been updated since the cutoff date
            listings_to_deactivate = self.session.query(Listing).filter(
                Listing.is_active == True,
                Listing.updated_at < cutoff_date
            ).all()
            
            if listings_to_deactivate:
                logger.info(f"Marking {len(listings_to_deactivate)} listings as inactive")
                
                for listing in listings_to_deactivate:
                    listing.is_active = False
                    listing.updated_at = datetime.now()
                
                self.session.commit()
                self.deactivated_listings = len(listings_to_deactivate)
                return len(listings_to_deactivate)
            else:
                logger.info("No listings to mark as inactive")
                return 0
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error marking inactive listings: {str(e)}")
            return 0
    
    async def run_async(self, max_brands=5, models_per_brand=3, pages_per_model=2):
        """Run the scraper asynchronously for better performance"""
        start_time = datetime.now()
        logger.info(f"Starting SS.LV scraper at {start_time}")
        
        # Reset counters
        self.total_listings = 0
        self.new_listings = 0
        self.updated_listings = 0
        self.deactivated_listings = 0
        
        try:
            # Get all brands
            brands = self.get_brands()
            
            if not brands:
                logger.error("No brands found. Exiting.")
                return {
                    "success": False,
                    "error": "No brands found",
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
            
            # Prioritize popular brands
            prioritized = []
            other = []
            
            for brand in brands:
                if brand['name'] in self.prioritized_brands:
                    prioritized.append(brand)
                else:
                    other.append(brand)
            
            # Combine lists with prioritized brands first
            brands = prioritized + other
            
            # Limit number of brands
            if max_brands:
                brands = brands[:max_brands]
            
            # Scrape each brand (sequentially to avoid too much load)
            for brand in brands:
                await self.scrape_brand_async(brand, models_per_brand, pages_per_model)
                
                # Small delay between brands
                await asyncio.sleep(random.uniform(2, 5))
            
            # Mark old listings as inactive
            deactivated_count = self.mark_inactive_listings()
            
            # Update source last scraped timestamp
            from models import Source
            source = self.session.query(Source).filter(Source.source_id == self.source_id).first()
            if source:
                source.last_scraped_at = datetime.now()
                self.session.commit()
            
            end_time = datetime.now()
            elapsed = (end_time - start_time).total_seconds()
            
            logger.info(f"Scraping completed at {end_time}")
            logger.info(f"Total time: {elapsed:.2f} seconds")
            logger.info(f"Total listings processed: {self.total_listings}")
            logger.info(f"New listings: {self.new_listings}")
            logger.info(f"Updated listings: {self.updated_listings}")
            logger.info(f"Deactivated listings: {self.deactivated_listings}")
            
            return {
                "success": True,
                "total_listings": self.total_listings,
                "new_listings": self.new_listings,
                "updated_listings": self.updated_listings,
                "deactivated_listings": self.deactivated_listings,
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
        finally:
            # Make sure to close the session properly
            self.session.close()
            
    def run(self, max_brands=5, models_per_brand=3, pages_per_model=2):
        """Run the scraper in async mode properly handling the event loop"""
        # In Windows, we need to use a different event loop policy
        if platform.system() == 'Windows':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        # Get or create an event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # If no event loop exists in this thread, create one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Run the async method and return the result
        return loop.run_until_complete(
            self.run_async(max_brands, models_per_brand, pages_per_model)
        )


# Entry point function for external calling
def run_ss_scraper(max_brands=5, models_per_brand=3, pages_per_model=2, db_url=None, debug_mode=False,
                   max_concurrent_requests=10, mark_inactive_after_days=30):
    """Run the SS.LV scraper with specified parameters"""
    scraper = SSScraper(
        db_url=db_url if db_url else "sqlite:///car_price_analysis.db",
        debug_mode=debug_mode,
        max_concurrent_requests=max_concurrent_requests,
        mark_inactive_after_days=mark_inactive_after_days
    )
    return scraper.run(max_brands, models_per_brand, pages_per_model)


# Scheduled job entry point
def run_scheduled_scrape():
    """Run a scheduled scrape job with optimal parameters"""
    logger.info("Starting scheduled scrape job")
    
    result = run_ss_scraper(
        max_brands=10,  # Scrape more brands in scheduled job
        models_per_brand=5,  # More models per brand
        pages_per_model=3,  # More pages per model
        max_concurrent_requests=5,  # Be gentle with the server
        mark_inactive_after_days=30  # Mark as inactive after 30 days
    )
    
    logger.info(f"Scheduled scrape completed: {result}")
    return result


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SS.LV Car Scraper")
    parser.add_argument('--brands', type=int, default=5, help='Maximum number of brands to scrape')
    parser.add_argument('--models', type=int, default=3, help='Maximum number of models per brand')
    parser.add_argument('--pages', type=int, default=2, help='Maximum number of pages per model')
    parser.add_argument('--db', type=str, help='Database URL (optional)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode (saves HTML)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    parser.add_argument('--concurrent', type=int, default=10, help='Maximum concurrent requests')
    parser.add_argument('--inactive-days', type=int, default=30, help='Days after which to mark listings as inactive')
    parser.add_argument('--schedule', action='store_true', help='Set up scheduled scraping')
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
        for handler in logger.handlers:
            handler.setLevel(logging.DEBUG)
    
    if args.schedule:
        try:
            import schedule
            import time
            
            # Set up schedule - run daily at 3 AM
            schedule.every().day.at("03:00").do(run_scheduled_scrape)
            
            print("Scheduled scraping set up to run daily at 3 AM.")
            print("Press Ctrl+C to exit.")
            
            # Keep the script running
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
                
        except ModuleNotFoundError:
            print("Schedule module not found. Install it with: pip install schedule")
            print("Running a single scrape instead...")
            result = run_ss_scraper(
                args.brands, args.models, args.pages, args.db, args.debug,
                args.concurrent, args.inactive_days
            )
    else:
        # Run a single scrape
        result = run_ss_scraper(
            args.brands, args.models, args.pages, args.db, args.debug,
            args.concurrent, args.inactive_days
        )
        
        # Print results
        if result["success"]:
            print(f"Scraping completed successfully:")
            print(f"Total listings: {result['total_listings']}")
            print(f"New listings: {result['new_listings']}")
            print(f"Updated listings: {result['updated_listings']}")
            print(f"Deactivated listings: {result['deactivated_listings']}")
            print(f"Time taken: {result['elapsed_time']}")
        else:
            print(f"Scraping failed: {result['error']}")