import requests
import asyncio
import aiohttp
import logging
import random
import time
import re
import json
import os
import sys
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from sqlalchemy import func
from models import init_db, Brand, Model, Car, Listing, Region, Source

logger = logging.getLogger('ss_scraper')
logger.setLevel(logging.DEBUG)  # Set the logger itself to DEBUG to ensure it processes debug messages

# Create file handler and set its level and formatter
file_handler = logging.FileHandler('ss_scraper.log')
file_handler.setLevel(logging.INFO) # File can stay at INFO
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)

# Create console handler and set its level and formatter
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG) # Explicitly DEBUG for console
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(console_handler)

# Prevent messages from being passed to the root logger's handlers if basicConfig was also used
# logger.propagate = False # Try with and without this if issues persist

class Scraper:
    """Scraper for SS.LV for now :p"""
    
    def __init__(self, target_brands=None, db_url="sqlite:///car_price_analysis.db", debug_mode=False):
        """Set up the scraper with our settings"""
        self.base_url = "https://www.ss.lv"
        self.car_url = f"{self.base_url}/lv/transport/cars/"
        self.debug_mode = debug_mode
        
        # Create debug folder if needed
        if self.debug_mode:
            os.makedirs("debug_html", exist_ok=True)
        
        # Define which brands we want - default to our four chosen ones
        self.target_brands = target_brands or ["tesla", "infiniti", "smart", "suzuki"]
        
        # Random user agents to look like different browsers
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
        ]
        
        # Connect to the database
        self.session, self.engine = init_db(db_url)
        
        # Make sure we have SS.LV as a source in our database
        self.ensure_source_exists()
        
        # Track progress with these counters
        self.total_listings = 0
        self.new_listings = 0
        self.updated_listings = 0
        self.error_count = 0
        
        # This helps us limit how many concurrent requests we make
        self.semaphore = asyncio.Semaphore(3)  # Only 3 concurrent requests
    
    def ensure_source_exists(self):
        """Add SS.LV as a data source if it's not already in our database"""
        source = self.session.query(Source).filter(Source.name == "SS.LV").first()
        
        if not source:
            logger.info("Adding SS.LV as a data source")
            source = Source(
                name="SS.LV",
                url="https://www.ss.lv/lv/transport/cars/",
                country="Latvia",
                scraping_config=json.dumps({"target_brands": self.target_brands}),
                last_scraped_at=None
            )
            self.session.add(source)
            self.session.commit()
        
        self.source_id = source.source_id
        logger.info(f"Using source_id {self.source_id} for SS.LV")
    
    def _get_random_user_agent(self):
        """Pick a random browser user agent to avoid looking like a bot"""
        return random.choice(self.user_agents)
    
    def _make_request(self, url, retries=3, delay=1):
        """Get a webpage, with retry logic if something goes wrong"""
        headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept-Language': 'en-US,en;q=0.9,lv;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Connection': 'keep-alive',
            'Referer': self.base_url
        }
        
        for attempt in range(retries + 1):
            try:
                response = requests.get(url, headers=headers, timeout=10)
                
                # Save HTML for debugging if that option is enabled
                if self.debug_mode:
                    debug_file = f"debug_html/{url.replace('/', '_').replace(':', '')}.html"
                    with open(debug_file, "w", encoding="utf-8") as f:
                        f.write(response.text)
                
                if response.status_code == 200:
                    return response
                
                if response.status_code in [403, 429]:
                    # We're being rate limited, wait longer
                    wait_time = delay * (attempt + 1) * 2
                    logger.warning(f"Rate limited ({response.status_code}). Waiting {wait_time}s")
                    time.sleep(wait_time)
                else:
                    logger.warning(f"Request failed: {response.status_code}")
                    time.sleep(delay)
            except Exception as e:
                logger.warning(f"Request error for {url}: {str(e)}")
                if attempt < retries:
                    time.sleep(delay)
                else:
                    raise
        
        return None
    
    async def _async_make_request(self, url, session, retries=3, delay=1):
        """Get a webpage asynchronously - allows multiple requests at once"""
        async with self.semaphore:  # Limit how many requests we make at once
            headers = {
                'User-Agent': self._get_random_user_agent(),
                'Accept-Language': 'en-US,en;q=0.9,lv;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Connection': 'keep-alive',
                'Referer': self.base_url
            }
            
            for attempt in range(retries + 1):
                try:
                    async with session.get(url, headers=headers, timeout=10) as response:
                        if response.status == 200:
                            text = await response.text()
                            
                            # Save HTML for debugging if that option is enabled
                            if self.debug_mode:
                                debug_file = f"debug_html/{url.replace('/', '_').replace(':', '')}.html"
                                with open(debug_file, "w", encoding="utf-8") as f:
                                    f.write(text)
                            
                            # Return an object with the response text
                            return type('obj', (object,), {
                                'status': response.status,
                                'text': text
                            })
                        
                        if response.status in [403, 429]:
                            # We're being rate limited, wait longer
                            wait_time = delay * (attempt + 1) * 2
                            logger.warning(f"Rate limited ({response.status}). Waiting {wait_time}s")
                            await asyncio.sleep(wait_time)
                        else:
                            logger.warning(f"Request failed: {response.status}")
                            await asyncio.sleep(delay)
                except Exception as e:
                    logger.warning(f"Async request error for {url}: {str(e)}")
                    if attempt < retries:
                        await asyncio.sleep(delay)
                    else:
                        raise
            
            return None
    
    def _random_delay(self, min_delay=0.5, max_delay=2):
        """Wait a random amount of time to be nice to the server"""
        time.sleep(random.uniform(min_delay, max_delay))
    
    async def _async_random_delay(self, min_delay=0.5, max_delay=2):
        """Wait a random amount of time asynchronously"""
        await asyncio.sleep(random.uniform(min_delay, max_delay))
    
    def get_brands(self):
        """Get our target car brands from the main SS.LV car page"""
        logger.info("Getting car brands from SS.LV")
        
        response = self._make_request(self.car_url)
        if not response:
            logger.error("Couldn't get the brands page")
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        brands = []
        
        # Find all brand links that match our targets
        for brand_element in soup.select("h4.category > a.a_category"):
            brand_name = brand_element.text.strip()
            href = brand_element['href']
            
            # Get the brand slug (tesla, infiniti, etc.) from the URL
            brand_slug = href.split('/')[-2]  
            
            # Get the listing count from the span
            count_span = brand_element.find_next("span", class_="category_cnt")
            count = int(count_span.text.strip("()")) if count_span else 0
            
            # If this is one of our target brands, add it to the list
            if brand_slug.lower() in self.target_brands:
                brand_url = self.base_url + href
                brands.append({
                    'name': brand_name,
                    'slug': brand_slug,
                    'url': brand_url,
                    'count': count
                })
        
        logger.info(f"Found {len(brands)} target car brands")
        return brands
    
    def save_brand(self, brand_name):
        """Add a brand to our database if it's not already there"""
        brand = self.session.query(Brand).filter(func.lower(Brand.name) == func.lower(brand_name)).first()
        
        if not brand:
            logger.info(f"Adding new brand: {brand_name}")
            brand = Brand(
                name=brand_name,
                country="Unknown",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.session.add(brand)
            self.session.commit()
        
        return brand
    
    def get_models_for_brand(self, brand_data):
        """Get all models for a specific car brand"""
        brand_name = brand_data['name']
        brand_url = brand_data['url']
        logger.info(f"Getting models for {brand_name}")
        
        response = self._make_request(brand_url)
        if not response:
            logger.error(f"Couldn't get models for {brand_name}")
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        models = []
        
        # Look for model links with a specific pattern
        model_links = soup.select("h4.category > a.a_category, a.a_category")
        
        # We need the brand slug to find model URLs
        brand_slug = brand_data['slug'].lower()
        brand_base_url = f"/lv/transport/cars/{brand_slug}/"
        
        for link in model_links:
            href = link.get('href', '')
            model_name = link.text.strip()
            
            # Skip if not a valid model link
            if not href or not model_name or href == brand_base_url:
                continue
            
            # Only include links that are models of this brand
            if brand_base_url in href:
                model_slug = href.rstrip('/').split('/')[-1]
                
                # Skip search links or other non-model pages
                if model_slug == brand_slug or "page" in model_slug or "search" in model_slug:
                    continue
                
                # Get model listing count if available
                count_span = link.find_next("span", class_="category_cnt")
                count = int(count_span.text.strip("()")) if count_span else 0
                
                model_url = self.base_url + href
                models.append({
                    'name': model_name,
                    'slug': model_slug,
                    'url': model_url,
                    'count': count,
                    'brand': brand_name
                })
        
        logger.info(f"Found {len(models)} models for {brand_name}")
        return models
    
    def save_model(self, brand, model_name):
        """Add a model to our database if it's not already there"""
        model = self.session.query(Model).filter(
            Model.brand_id == brand.brand_id,
            func.lower(Model.name) == func.lower(model_name)
        ).first()
        
        if not model:
            logger.info(f"Adding new model: {brand.name} {model_name}")
            model = Model(
                brand_id=brand.brand_id,
                name=model_name,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.session.add(model)
            self.session.commit()
        
        return model
    
    def get_listings_for_model(self, brand_data, model_data, max_pages=3):
        brand_name = brand_data['name']
        model_name = model_data['name']
        model_url = model_data['url']
        
        logger.info(f"Getting listings for {brand_name} {model_name}")
        listings = []
        page_num = 0 
        current_url = model_url
        
        while page_num < max_pages:
            logger.info(f"Checking page {page_num+1} at {current_url}")
            response = self._make_request(current_url)
            if not response:
                logger.error(f"Couldn't get listings page for {brand_name} {model_name} at {current_url}")
                break
            
            soup = BeautifulSoup(response.content, 'html.parser')
            listing_rows = soup.select("tr[id^='tr_']")
            
            logger.critical(f"TESTING DEBUG OUTPUT: About to loop through {len(listing_rows)} rows. Console level should be DEBUG.")
            logger.debug(f"DIRECT LOGGER.DEBUG TEST: Number of listing_rows: {len(listing_rows)}")
            logger.info(f"Found {len(listing_rows)} potential listing rows on this page")

            if not listing_rows:
                logger.debug("No rows matching tr[id^='tr_'] found on this page.")

            for i, row in enumerate(listing_rows):
                # Reset for each row
                year, engine_volume, mileage, price = None, None, None, None
                listing_id, listing_url, title_text = None, None, None

                try:
                    listing_id = row.get('id', '').replace('tr_', '')
                    if not listing_id or "bnr" in listing_id.lower():
                        logger.debug(f"Row {i}: Skipping, no valid listing_id or is banner (ID: {listing_id}).")
                        continue
                    
                    logger.debug(f"Row {i}: Processing row with ID: {listing_id}")

                    # Get title and URL from the main text cell
                    title_cell = row.select_one("td.msg2")
                    if title_cell:
                        title_link = title_cell.select_one("a.am")
                        if title_link and title_link.has_attr('href'):
                            listing_url = self.base_url + title_link['href']
                            title_text = title_link.text.strip()
                    
                    if not title_text or not listing_url:
                        logger.debug(f"Row {i}, ID {listing_id}: Skipping, no title_link or href.")
                        continue

                    # Get all data cells
                    data_cells = row.select("td.msga2-o.pp6, td.msga2-r.pp6")
                    
                    logger.debug(f"Row {i}, ID {listing_id}: Found {len(data_cells)} data cells")
                    
                    # Check if this is Tesla based on the number of data cells
                    is_tesla = len(data_cells) == 3
                    
                    if is_tesla:
                        # Tesla layout: Year | Mileage | Price (3 cells)
                        if len(data_cells) >= 3:
                            # Year is in cell 0
                            year_cell = data_cells[0]
                            year_text = year_cell.get_text(strip=True)
                            if year_text.isdigit() and len(year_text) == 4:
                                year = int(year_text)
                            
                            # Mileage is in cell 1
                            mileage_cell = data_cells[1]
                            mileage_text = mileage_cell.get_text(strip=True).lower()
                            
                            if "tūkst." in mileage_text:
                                mileage_digits = ''.join(filter(str.isdigit, mileage_text.split("tūkst.")[0]))
                                if mileage_digits:
                                    mileage = int(mileage_digits) * 1000
                            elif mileage_text.replace(' ', '').isdigit():
                                mileage = int(mileage_text.replace(' ', ''))
                            
                            # Price is in cell 2
                            price_cell = data_cells[2]
                            price_text = price_cell.get_text(strip=True).lower()
                            
                            if "€" in price_text:
                                # Check if it's an exchange listing
                                if 'maiņai' in price_text or 'pērku' in price_text or 'maina' in price_text:
                                    logger.info(f"Row {i}, ID {listing_id}: Skipping exchange/buying listing.")
                                    continue
                                    
                                # Remove spaces, commas, and non-digit characters
                                price_digits = ''.join(filter(str.isdigit, price_text.replace(' ', '').replace(',', '')))
                                if price_digits:
                                    price = int(price_digits)
                            
                            # For Tesla, set engine type to Electric
                            engine_type = "Electric"
                            
                            logger.debug(f"Row {i}, ID {listing_id}: Tesla layout (3 cells) - Year:{year}, Mileage:{mileage}, Price:{price}")
                        else:
                            logger.warning(f"Row {i}, ID {listing_id}: Tesla format but only {len(data_cells)} cells")
                            continue
                    else:
                        # Standard layout: Year | Engine | Mileage | Price (4 cells)
                        if len(data_cells) >= 4:
                            # Find the year cell (it's always a 4-digit number starting with "20")
                            year_cell_index = None
                            for idx, cell in enumerate(data_cells):
                                cell_text = cell.get_text(strip=True)
                                if cell_text.isdigit() and len(cell_text) == 4:
                                    year_val = int(cell_text)
                                    # Accept years from 1900 to current year + 1 (for future models)
                                    if 1900 <= year_val <= datetime.now().year + 1:
                                        year_cell_index = idx
                                        year = year_val
                                        break
                            
                            if year_cell_index is None:
                                logger.debug(f"Row {i}, ID {listing_id}: No year found in data cells")
                                continue
                            
                            # Engine is at year_index + 1
                            if year_cell_index + 1 < len(data_cells):
                                engine_cell = data_cells[year_cell_index + 1]
                                engine_text = engine_cell.get_text(strip=True)
                                
                                # Extract numeric volume
                                volume_match = re.search(r'(\d+\.?\d*)', engine_text)
                                if volume_match:
                                    try:
                                        engine_volume = float(volume_match.group(1))
                                    except ValueError:
                                        pass
                            
                            # Mileage is at year_index + 2
                            if year_cell_index + 2 < len(data_cells):
                                mileage_cell = data_cells[year_cell_index + 2]
                                mileage_text = mileage_cell.get_text(strip=True).lower()
                                
                                if "tūkst." in mileage_text:
                                    mileage_digits = ''.join(filter(str.isdigit, mileage_text.split("tūkst.")[0]))
                                    if mileage_digits:
                                        mileage = int(mileage_digits) * 1000
                                elif mileage_text.replace(' ', '').isdigit():
                                    mileage = int(mileage_text.replace(' ', ''))
                            
                            # Price is at year_index + 3
                            if year_cell_index + 3 < len(data_cells):
                                price_cell = data_cells[year_cell_index + 3]
                                price_text = price_cell.get_text(strip=True).lower()
                                
                                if "€" in price_text:
                                    # Check if it's an exchange listing
                                    if 'maiņai' in price_text or 'pērku' in price_text or 'maina' in price_text:
                                        logger.info(f"Row {i}, ID {listing_id}: Skipping exchange/buying listing.")
                                        continue
                                        
                                    # Remove spaces, commas, and non-digit characters
                                    price_digits = ''.join(filter(str.isdigit, price_text.replace(' ', '').replace(',', '')))
                                    if price_digits:
                                        price = int(price_digits)
                            
                            logger.debug(f"Row {i}, ID {listing_id}: Standard layout (4 cells) - Year:{year}, Engine:{engine_volume}, Mileage:{mileage}, Price:{price}")
                        else:
                            logger.warning(f"Row {i}, ID {listing_id}: Standard format but only {len(data_cells)} cells")
                            continue
                    
                    # Only add if we have essential data
                    if price and title_text and listing_url:
                        listing_data = {
                            'external_id': listing_id,
                            'title': title_text,
                            'url': listing_url,
                            'price': price,
                            'year': year,
                            'engine_volume': engine_volume,
                            'mileage': mileage,
                            'brand': brand_name,
                            'model': model_name,
                            # These will be filled in by get_listing_details_async:
                            'engine_type': engine_type if is_tesla else None,
                            'transmission': None,
                            'region': None,
                            'body_type': None,
                            'color': None
                        }
                        listings.append(listing_data)
                        logger.debug(f"Row {i}, ID {listing_id}: Success - P:{price} Y:{year} E:{engine_volume}L M:{mileage}")
                    else:
                        logger.warning(f"Row {i}, ID {listing_id}: Missing essential data - price:{price}, title:{bool(title_text)}, url:{bool(listing_url)}")
                
                except Exception as e:
                    current_id_in_loop = listing_id if listing_id else "UNKNOWN_ID_IN_LOOP_EXC"
                    logger.error(f"Row {i}, ID {current_id_in_loop}: Exception: {str(e)}", exc_info=True)
                    continue
            
            # Next page logic
            next_page_link_tag = None
            for link_tag_in_soup in soup.select("a.navi"):
                # Make comparison case-insensitive and strip whitespace
                link_text_cleaned = link_tag_in_soup.text.strip().lower()
                if link_text_cleaned in ["nākamā", "next", ">>", "следующая"]:
                    next_page_link_tag = link_tag_in_soup
                    break
            
            if next_page_link_tag and next_page_link_tag.has_attr('href'):
                current_url = self.base_url + next_page_link_tag['href']
                page_num += 1
                logger.debug(f"Moving to next page: {current_url}")
                self._random_delay()
            else:
                logger.debug("No next page link found or href missing.")
                break # No more pages
        
        logger.info(f"Found {len(listings)} total listings for {brand_name} {model_name} after processing all pages.")
        return listings
        
    async def get_listing_details_async(self, listing_basic, session):
        """Get all the detailed info from a car's individual listing page"""
        # Skip if no URL
        if not listing_basic.get('url'):
            return listing_basic
                
        listing_url = listing_basic['url']
        logger.debug(f"Getting details for listing {listing_basic['external_id']}")
        
        try:
            response = await self._async_make_request(listing_url, session)
            if not response:
                logger.error(f"Couldn't get listing details")
                return listing_basic  # Return what we already have
            
            soup = BeautifulSoup(response.text, 'html.parser')
            details = dict(listing_basic)  # Start with the basic info we already have
            
            # Check if this is an exchange listing
            if 'maiņai' in soup.text.lower() or 'maina' in soup.text.lower() or 'pērku' in soup.text.lower():
                logger.info(f"Skipping exchange/buying listing from details page: {listing_basic['external_id']}")
                details['skip_listing'] = True
                return details
        
            # Get listing date
            date_cells = soup.select('td.msg2, td.msga2')
            for cell in date_cells:
                if 'Datums' in cell.text or 'Date' in cell.text:
                    date_value = cell.find_next('td')
                    if date_value:
                        date_text = date_value.text.strip()
                        try:
                            # Handle different date formats
                            if '.' in date_text:  # DD.MM.YYYY
                                parts = date_text.split('.')
                                if len(parts) == 3:
                                    day, month, year = map(int, parts)
                                    details['listing_date'] = f"{year:04d}-{month:02d}-{day:02d}"
                            elif '-' in date_text:  # YYYY-MM-DD
                                details['listing_date'] = date_text
                            else:
                                details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
                        except:
                            details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
            
            # Default listing date if not found
            if 'listing_date' not in details:
                details['listing_date'] = datetime.now().strftime('%Y-%m-%d')
            
            # Get region/location
            for cell in date_cells:
                if any(loc_text in cell.text.lower() for loc_text in ['region', 'reģions', 'pilsēta']):
                    location_value = cell.find_next('td')
                    if location_value:
                        details['region'] = location_value.text.strip()
            
            # Default region if not found
            if 'region' not in details:
                details['region'] = 'Nav norādīts'
            
            # Get specs from the options table
            options_table = soup.select_one('table.options_list')
            if options_table:
                rows = options_table.select('tr')
                for row in rows:
                    cells = row.select('td')
                    if len(cells) >= 2:
                        label = cells[0].text.strip().lower()
                        value = cells[1].text.strip()
                        
                        # Extract engine info
                        if any(eng_text in label for eng_text in ['dzinējs', 'engine', 'двигатель']):
                            details['engine'] = value
                            
                            # Get engine volume (e.g., 2.0)
                            volume_match = re.search(r'(\d+[\.,]\d+)', value)
                            if volume_match:
                                volume_str = volume_match.group(1).replace(',', '.')
                                details['engine_volume'] = float(volume_str)
                            
                            # Figure out engine type
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
                        
                        # Extract transmission type
                        if any(trans_text in label for trans_text in ['ātrumkārba', 'transmission', 'коробка']):
                            lower_value = value.lower()
                            if any(t in lower_value for t in ['manuāl', 'manual', 'механика']):
                                details['transmission'] = 'Manual'
                            elif any(t in lower_value for t in ['automāt', 'automatic', 'автомат']):
                                details['transmission'] = 'Automatic'
                            else:
                                details['transmission'] = value
                        
                        # Extract body type
                        if any(body_text in label for body_text in ['virsbūve', 'body', 'кузов']):
                            details['body_type'] = value
                        
                        # Extract color
                        if any(color_text in label for color_text in ['krāsa', 'color', 'цвет']):
                            details['color'] = value
            
            # Also check by specific IDs as mentioned in the guide
            for field_name, field_id in [
                ("year", "tdo_18"),
                ("body_type", "tdo_32"),
                ("color", "tdo_17"),
                ("tech_inspection", "tdo_223"),
            ]:
                field_elem = soup.select_one(f"td.ads_opt#{field_id}")
                if field_elem:
                    if field_name == "year":
                        # Extract only the numeric year part from strings like "2019 decembris"
                        year_text = field_elem.text.strip()
                        try:
                            details[field_name] = int(year_text.split()[0])  # Take just the first part
                        except (ValueError, IndexError):
                            # Fall back to the original text if conversion fails
                            details[field_name] = year_text
                    else:
                        details[field_name] = field_elem.text.strip()
            
            # Price from specific ID
            price_elem = soup.select_one("span.ads_price#tdo_8")
            if price_elem and not details.get('price'):
                price_text = price_elem.text.strip().lower()
                # Skip listings that are for exchange or buying
                if 'maiņai' in price_text or 'pērku' in price_text or 'maina' in price_text:
                    logger.info(f"Skipping exchange/buying listing from price: {listing_basic['external_id']}")
                    details['skip_listing'] = True
                    return details
                    
                price_digits = ''.join(filter(str.isdigit, price_text))
                if price_digits:
                    details['price'] = int(price_digits)
            
            # Check if we have a price
            if 'price' not in details or details['price'] is None:
                logger.info(f"Skipping listing without price: {listing_basic['external_id']}")
                details['skip_listing'] = True
                return details
                
            # Also check by specific IDs as mentioned in the guide
            for field_name, field_id in [
                ("year", "tdo_18"),
                ("body_type", "tdo_32"),
                ("color", "tdo_17"),
                ("tech_inspection", "tdo_223"),
            ]:
                field_elem = soup.select_one(f"td.ads_opt#{field_id}")
                if field_elem:
                    if field_name == "year":
                        # Extract only the numeric year part from strings like "2019 decembris"
                        year_text = field_elem.text.strip()
                        try:
                            details[field_name] = int(year_text.split()[0])  # Take just the first part
                        except (ValueError, IndexError):
                            # Fall back to the original text if conversion fails
                            details[field_name] = year_text
                    else:
                        details[field_name] = field_elem.text.strip()
            
            # Check if we have a year
            if 'year' not in details or details['year'] is None:
                logger.info(f"Skipping listing without year: {listing_basic['external_id']}")
                details['skip_listing'] = True
                return details
            
            logger.debug(f"Got details for listing {listing_basic['external_id']}")
            return details
            
        except Exception as e:
            logger.error(f"Error getting listing details: {str(e)}")
            return listing_basic
    
    def ensure_region_exists(self, region_name):
        """Add a region to our database if it's not already there"""
        if not region_name:
            region_name = "Nav norādīts"
            
        region = self.session.query(Region).filter(func.lower(Region.name) == func.lower(region_name)).first()
        
        if not region:
            logger.info(f"Adding new region: {region_name}")
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
        """Save a car and its listing to our database"""
        try:
            # 1. Make sure the brand exists
            brand = self.save_brand(listing_data['brand'])
            
            # 2. Make sure the model exists
            model = self.save_model(brand, listing_data['model'])
            
            # 3. Make sure the region exists
            region = self.ensure_region_exists(listing_data.get('region', 'Nav norādīts'))
            
            # 4. Check if this listing already exists
            existing_listing = self.session.query(Listing).filter(
                Listing.external_id == listing_data['external_id']
            ).first()
            
            if existing_listing:
                # Update existing listing
                logger.debug(f"Updating existing listing {listing_data['external_id']}")
                
                # Get the car
                car = existing_listing.car
                
                # Update car attributes if we have new info
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
                
                # Mark as active
                if not existing_listing.is_active:
                    existing_listing.is_active = True
                    updated = True
                
                # Always update timestamps
                existing_listing.updated_at = datetime.now()
                car.updated_at = datetime.now()
                
                self.session.commit()
                
                # Return appropriate status
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
                
                logger.info(f"Added new listing: {listing_data['external_id']}")
                self.new_listings += 1
                return "new"
                
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error saving listing {listing_data.get('external_id', 'unknown')}: {str(e)}")
            return "error"
    
    async def process_listing_async(self, listing_basic, session):
        """Process a single car listing"""
        try:
            # Get all the details from the listing page
            listing_details = await self.get_listing_details_async(listing_basic, session)
            
            # Skip listings marked for skipping
            if listing_details.get('skip_listing'):
                logger.info(f"Skipping listing as marked: {listing_details.get('external_id', 'unknown')}")
                return "skipped"
            
            # Save to database
            result = self.save_car_and_listing(listing_details)
            
            self.total_listings += 1
            
            # Add a small delay to be nice to the server
            await self._async_random_delay()
            
            return result
        except Exception as e:
            logger.error(f"Error processing listing: {str(e)}")
            self.error_count += 1
            return "error"
   
    async def process_listings_batch_async(self, listings):
       """Process a bunch of listings at the same time"""
       async with aiohttp.ClientSession() as session:
           tasks = []
           for listing in listings:
               tasks.append(self.process_listing_async(listing, session))
           
           results = await asyncio.gather(*tasks, return_exceptions=True)
           
           # Count what happened with each listing
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
   
    async def scrape_model_async(self, brand_data, model_data, pages_per_model=2):
       """Scrape all listings for a single car model"""
       logger.info(f"Starting to scrape model: {brand_data['name']} {model_data['name']}")
       
       # Get listings for this model
       listings = self.get_listings_for_model(brand_data, model_data, max_pages=pages_per_model)
       
       if not listings:
           logger.warning(f"No listings found for {brand_data['name']} {model_data['name']}")
           return 0
       
       # Process all the listings at once
       results = await self.process_listings_batch_async(listings)
       
       logger.info(f"Processed {len(listings)} listings for {brand_data['name']} {model_data['name']}")
       logger.info(f"Results: {results}")
       
       return len(listings)
   
    async def scrape_brand_async(self, brand, pages_per_model=2):
       """Scrape all models for a single car brand"""
       logger.info(f"Starting to scrape brand: {brand['name']}")
       
       # Get all models for this brand
       models = self.get_models_for_brand(brand)
       
       if not models:
           logger.warning(f"No models found for brand: {brand['name']}")
           return 0
       
       brand_listings_count = 0
       
       for model in models:
           model_count = await self.scrape_model_async(brand, model, pages_per_model)
           brand_listings_count += model_count
           
           # Small delay between models
           await asyncio.sleep(random.uniform(1, 3))
       
       logger.info(f"Finished scraping brand {brand['name']}. Processed {brand_listings_count} listings.")
       return brand_listings_count
   
    def mark_inactive_listings(self, days=14):
       """Mark listings as inactive if they haven't been updated recently"""
       from datetime import timedelta
       
       cutoff_date = datetime.now() - timedelta(days=days)
       
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
               return len(listings_to_deactivate)
           else:
               logger.info("No listings to mark as inactive")
               return 0
       except Exception as e:
           self.session.rollback()
           logger.error(f"Error marking inactive listings: {str(e)}")
           return 0
   
    async def run_async(self, pages_per_model=2):
       """Run the whole scraping process"""
       start_time = datetime.now()
       logger.info(f"Starting the scraper at {start_time}")
       
       # Reset our counters
       self.total_listings = 0
       self.new_listings = 0
       self.updated_listings = 0
       self.error_count = 0
       
       try:
           # Get our target brands
           brands = self.get_brands()
           
           if not brands:
               logger.error("No target brands found. Exiting.")
               return {
                   "success": False,
                   "error": "No target brands found",
                   "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
               }
           
           # Scrape each brand
           for brand in brands:
               await self.scrape_brand_async(brand, pages_per_model)
               
               # Small delay between brands
               await asyncio.sleep(random.uniform(2, 5))
           
           # Mark old listings as inactive
           deactivated_count = self.mark_inactive_listings()
           
           # Update when we last scraped
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
           logger.info(f"Errors: {self.error_count}")
           
           return {
               "success": True,
               "total_listings": self.total_listings,
               "new_listings": self.new_listings,
               "updated_listings": self.updated_listings,
               "errors": self.error_count,
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
           # Make sure to clean up
           self.session.close()
   
    def run(self, pages_per_model=2):
       """Start the scraper"""
       # Handle Windows event loop if needed
       if 'win' in sys.platform:
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
           self.run_async(pages_per_model)
       )


# Helper function to run the scraper from another file
def run_ss_scraper(target_brands=None, pages_per_model=2, db_url=None, debug_mode=False):
    if target_brands is None:
        target_brands = ["tesla", "infiniti", "smart", "suzuki"]
    
    scraper = Scraper(
        target_brands=target_brands,
        db_url=db_url if db_url else "sqlite:///car_price_analysis.db",
        debug_mode=debug_mode
    )
    return scraper.run(pages_per_model)


# When running this file directly from command line
if __name__ == "__main__":
   import sys
   import argparse
   
   # Handle command line arguments
   parser = argparse.ArgumentParser(description="SS.LV Car Scraper")
   parser.add_argument('--brands', nargs='+', help='Brands to scrape (space-separated list)')
   parser.add_argument('--pages', type=int, default=2, help='Maximum pages per model')
   parser.add_argument('--db', type=str, help='Database URL (optional)')
   parser.add_argument('--debug', action='store_true', help='Save HTML for debugging')
   
   args = parser.parse_args()
   
   # Run the scraper
   result = run_ss_scraper(
       target_brands=args.brands,
       pages_per_model=args.pages,
       db_url=args.db,
       debug_mode=args.debug
   )
   
   # Print results
   if result["success"]:
       print(f"Scraping completed successfully:")
       print(f"Total listings: {result['total_listings']}")
       print(f"New listings: {result['new_listings']}")
       print(f"Updated listings: {result['updated_listings']}")
       print(f"Errors: {result['errors']}")
       print(f"Time taken: {result['elapsed_time']}")
   else:
       print(f"Scraping failed: {result['error']}")