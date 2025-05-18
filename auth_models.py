import os
import json
import hashlib
import secrets
import sqlite3
from datetime import datetime, timedelta
import jwt
from pathlib import Path

# Create a separate auth database
AUTH_DB_PATH = 'user_auth.db'

class AuthDB:
    def __init__(self, db_path=AUTH_DB_PATH):
        """Initialize the authentication database"""
        self.db_path = db_path
        self._ensure_db_exists()
    # Vispirms pārbaudām vai datubāze eksistē, ja nē - izveidojam
    def _ensure_db_exists(self):
        """Create the database and tables if they don't exist"""
        db_exists = os.path.exists(self.db_path)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
        ''')
        
        # Create user_preferences table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_preferences (
            pref_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            dark_mode BOOLEAN DEFAULT 0,
            language TEXT DEFAULT 'lv',
            notification_enabled BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
        ''')
        
        # Create favorites table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS favorites (
            favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            car_data TEXT NOT NULL,  -- JSON of car object
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
        ''')
        
        # Create search_history table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS search_history (
            history_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            search_query TEXT NOT NULL,  -- JSON of search parameters
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_user(self, email, username, password):
        """Create a new user with hashed password"""
        try:
            # Generate a random salt
            salt = secrets.token_hex(16)
            
            # Hash the password with the salt
            password_hash = self._hash_password(password, salt)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Insert the new user
            cursor.execute(
                "INSERT INTO users (email, username, password_hash, salt) VALUES (?, ?, ?, ?)",
                (email.lower(), username, password_hash, salt)
            )
            
            # Get the new user_id
            user_id = cursor.lastrowid
            
            # Create default preferences
            cursor.execute(
                "INSERT INTO user_preferences (user_id) VALUES (?)",
                (user_id,)
            )
            
            conn.commit()
            
            # Return user info (without sensitive data)
            user = self.get_user_by_id(user_id)
            conn.close()
            return user
            
        except sqlite3.IntegrityError:
            # Likely duplicate email
            return {"error": "Email already exists"}
        except Exception as e:
            return {"error": str(e)}
    
    def authenticate_user(self, email, password):
        """Authenticate a user by email and password"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get user by email
            cursor.execute(
                "SELECT user_id, password_hash, salt FROM users WHERE email = ? AND is_active = 1",
                (email.lower(),)
            )
            
            result = cursor.fetchone()
            if not result:
                return {"error": "Invalid email or password"}
            
            user_id, stored_hash, salt = result
            
            # Verify password
            if self._hash_password(password, salt) != stored_hash:
                return {"error": "Invalid email or password"}
            
            # Update last login time
            cursor.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
                (user_id,)
            )
            conn.commit()
            
            # Get user with preferences
            user = self.get_user_by_id(user_id)
            
            # Generate JWT token
            token = self._generate_token(user_id)
            user['token'] = token
            
            conn.close()
            return user
            
        except Exception as e:
            return {"error": str(e)}
    
    def get_user_by_id(self, user_id):
        """Get user data by ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # This enables column access by name
            cursor = conn.cursor()
            
            # Get user and preferences
            cursor.execute("""
                SELECT u.user_id, u.email, u.username, u.created_at, u.last_login,
                       p.dark_mode, p.language, p.notification_enabled
                FROM users u
                LEFT JOIN user_preferences p ON u.user_id = p.user_id
                WHERE u.user_id = ? AND u.is_active = 1
            """, (user_id,))
            
            row = cursor.fetchone()
            if not row:
                return {"error": "User not found"}
            
            # Convert to dict
            user = dict(row)
            
            # Add formatted dates
            user['created_at'] = user['created_at']
            user['last_login'] = user['last_login']
            
            # Format preferences
            user['preferences'] = {
                'darkMode': bool(user.pop('dark_mode')),
                'language': user.pop('language'),
                'notificationsEnabled': bool(user.pop('notification_enabled'))
            }
            
            conn.close()
            return user
            
        except Exception as e:
            return {"error": str(e)}
    
    def get_user_favorites(self, user_id):
        """Get user's favorite cars"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT car_data, added_at FROM favorites WHERE user_id = ? ORDER BY added_at DESC",
                (user_id,)
            )
            
            results = cursor.fetchall()
            favorites = []
            
            for car_json, added_at in results:
                car = json.loads(car_json)
                car['added_at'] = added_at
                favorites.append(car)
            
            conn.close()
            return favorites
            
        except Exception as e:
            return {"error": str(e)}
    
    def add_favorite(self, user_id, car_data):
        """Add a car to user's favorites"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Serialize car data to JSON
            car_json = json.dumps(car_data)
            
            cursor.execute(
                "INSERT INTO favorites (user_id, car_data) VALUES (?, ?)",
                (user_id, car_json)
            )
            
            conn.commit()
            conn.close()
            return {"success": True}
            
        except Exception as e:
            return {"error": str(e)}
    
    def remove_favorite(self, user_id, car_id):
        """Remove a car from user's favorites"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Find favorites matching this car ID
            cursor.execute(
                "SELECT favorite_id, car_data FROM favorites WHERE user_id = ?",
                (user_id,)
            )
            
            results = cursor.fetchall()
            found = False
            
            for favorite_id, car_json in results:
                car = json.loads(car_json)
                if str(car.get('id', '')) == str(car_id):
                    # Delete this favorite
                    cursor.execute(
                        "DELETE FROM favorites WHERE favorite_id = ?",
                        (favorite_id,)
                    )
                    found = True
                    break
            
            conn.commit()
            conn.close()
            
            if found:
                return {"success": True}
            else:
                return {"error": "Favorite not found"}
            
        except Exception as e:
            return {"error": str(e)}
    

    def add_search_history(self, user_id, search_params):
        """Add a search to user's history"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Serialize search parameters to JSON
            search_json = json.dumps(search_params)
            
            cursor.execute(
                "INSERT INTO search_history (user_id, search_query) VALUES (?, ?)",
                (user_id, search_json)
            )
            
            conn.commit()
            conn.close()
            return {"success": True}
            
        except Exception as e:
            return {"error": str(e)}
    
    def reset_password(self, email, new_password):
        """Reset user password directly"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute("SELECT user_id FROM users WHERE email = ? AND is_active = 1", (email.lower(),))
            result = cursor.fetchone()
            
            if not result:
                return {"error": "E-pasts nav atrasts"}
            
            # Generate new salt and hash the new password
            salt = secrets.token_hex(16)
            password_hash = self._hash_password(new_password, salt)
            
            # Update password in database
            cursor.execute(
                "UPDATE users SET password_hash = ?, salt = ? WHERE email = ?",
                (password_hash, salt, email.lower())
            )
            
            conn.commit()
            conn.close()
            return {"success": True}
            
        except Exception as e:
            return {"error": str(e)}
    
    def get_search_history(self, user_id, limit=10):
        """Get user's search history"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                """
                SELECT search_query, executed_at 
                FROM search_history 
                WHERE user_id = ? 
                ORDER BY executed_at DESC
                LIMIT ?
                """,
                (user_id, limit)
            )
            
            results = cursor.fetchall()
            history = []
            
            for search_json, executed_at in results:
                search = json.loads(search_json)
                history.append({
                    'params': search,
                    'executed_at': executed_at,
                    'query_text': self._format_search_query(search)
                })
            
            conn.close()
            return history
            
        except Exception as e:
            return {"error": str(e)}
    
    def update_preferences(self, user_id, preferences):
        """Update user preferences"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Extract preference values
            dark_mode = 1 if preferences.get('darkMode') else 0
            language = preferences.get('language', 'lv')
            notifications = 1 if preferences.get('notificationsEnabled') else 0
            
            cursor.execute(
                """
                UPDATE user_preferences 
                SET dark_mode = ?, language = ?, notification_enabled = ?
                WHERE user_id = ?
                """,
                (dark_mode, language, notifications, user_id)
            )
            
            if cursor.rowcount == 0:
                # If no rows updated, preferences might not exist yet
                cursor.execute(
                    """
                    INSERT INTO user_preferences (user_id, dark_mode, language, notification_enabled)
                    VALUES (?, ?, ?, ?)
                    """,
                    (user_id, dark_mode, language, notifications)
                )
            
            conn.commit()
            conn.close()
            return {"success": True}
            
        except Exception as e:
            return {"error": str(e)}
    
    def _hash_password(self, password, salt):
        """Hash a password with the given salt"""
        # Kombinējam paroli ar salt un hash - drošības līdzsvarošana
        password_salt = password + salt
        hash_obj = hashlib.sha256(password_salt.encode())
        return hash_obj.hexdigest()
    
    def _generate_token(self, user_id):
        """Generate a JWT token for authentication"""
        # Gribēju izmantot cookie, bet JWT ir vienkāršāks prototipam
        secret_key = "car_prices_app_secret_key"  # Reālā vidē izmantotu vides mainīgo
        expiry = datetime.utcnow() + timedelta(days=1)  # 1 dienas derīguma termiņš
        
        payload = {
            'user_id': user_id,
            'exp': expiry
        }
        
        token = jwt.encode(payload, secret_key, algorithm='HS256')
        return token
    
    def _format_search_query(self, search_params):
        """Format search parameters as readable text"""
        parts = []
        
        if search_params.get('brand'):
            parts.append(search_params['brand'])
        
        if search_params.get('model'):
            parts.append(search_params['model'])
        
        if search_params.get('yearFrom') or search_params.get('yearTo'):
            year_text = ""
            if search_params.get('yearFrom'):
                year_text += str(search_params['yearFrom'])
            if search_params.get('yearTo'):
                if year_text:
                    year_text += "-"
                year_text += str(search_params['yearTo'])
            parts.append(year_text)
        
        if search_params.get('priceFrom') or search_params.get('priceTo'):
            price_text = ""
            if search_params.get('priceFrom'):
                price_text += f"{search_params['priceFrom']}€"
            if search_params.get('priceTo'):
                if price_text:
                    price_text += "-"
                price_text += f"{search_params['priceTo']}€"
            parts.append(price_text)
        
        # Izveido lasāmu tekstu no visiem parametriem
        return " ".join(parts)

# For testing
if __name__ == "__main__":
    auth_db = AuthDB()
    # Test creating a user
    user = auth_db.create_user("test@example.com", "TestUser", "password123")
    print(user)