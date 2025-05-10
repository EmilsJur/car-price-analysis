class Cache {
  constructor() {
    this.cache = new Map();
    this.expiryTimes = new Map();
  }
  
  set(key, value, expiryMinutes = 5) {
    this.cache.set(key, value);
    this.expiryTimes.set(key, Date.now() + expiryMinutes * 60 * 1000);
  }
  
  get(key) {
    const expiry = this.expiryTimes.get(key);
    
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }
  
  delete(key) {
    this.cache.delete(key);
    this.expiryTimes.delete(key);
  }
  
  clear() {
    this.cache.clear();
    this.expiryTimes.clear();
  }
}

export const dataCache = new Cache();