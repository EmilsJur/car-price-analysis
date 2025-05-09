from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime

# Create base class for declarative models
Base = declarative_base()

class Brand(Base):
    """Model representing car brands"""
    __tablename__ = 'brands'
    
    brand_id = Column(Integer, primary_key=True)
    name = Column(String(30), nullable=False)
    country = Column(String(30))
    logo_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    models = relationship("Model", back_populates="brand")
    
    def __repr__(self):
        return f"<Brand(name='{self.name}', country='{self.country}')>"

class Model(Base):
    """Model representing car models"""
    __tablename__ = 'models'
    
    model_id = Column(Integer, primary_key=True)
    brand_id = Column(Integer, ForeignKey('brands.brand_id'), nullable=False)
    name = Column(String(30), nullable=False)
    class_type = Column(String(20))
    production_start = Column(Integer)
    production_end = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    brand = relationship("Brand", back_populates="models")
    cars = relationship("Car", back_populates="model")
    market_values = relationship("MarketValue", back_populates="model")
    analyses = relationship("Analysis", back_populates="model")
    
    def __repr__(self):
        return f"<Model(name='{self.name}', brand_id={self.brand_id})>"

class Region(Base):
    """Model representing geographical regions"""
    __tablename__ = 'regions'
    
    region_id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    country = Column(String(30), nullable=False)
    lat = Column(Float)
    lng = Column(Float)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    cars = relationship("Car", back_populates="region")
    market_values = relationship("MarketValue", back_populates="region")
    
    def __repr__(self):
        return f"<Region(name='{self.name}', country='{self.country}')>"

class Car(Base):
    """Model representing individual cars"""
    __tablename__ = 'cars'
    
    car_id = Column(Integer, primary_key=True)
    model_id = Column(Integer, ForeignKey('models.model_id'), nullable=False)
    region_id = Column(Integer, ForeignKey('regions.region_id'), nullable=False)
    year = Column(Integer, nullable=False)
    engine_volume = Column(Float)
    engine_type = Column(String(20))
    transmission = Column(String(20))
    mileage = Column(Integer)
    body_type = Column(String(20))
    color = Column(String(20))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    model = relationship("Model", back_populates="cars")
    region = relationship("Region", back_populates="cars")
    listings = relationship("Listing", back_populates="car")
    analyses = relationship("Analysis", back_populates="car")
    
    def __repr__(self):
        return f"<Car(model_id={self.model_id}, year={self.year})>"

class Source(Base):
    """Model representing data sources (websites)"""
    __tablename__ = 'sources'
    
    source_id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    url = Column(String(255), nullable=False)
    country = Column(String(30))
    scraping_config = Column(Text)
    last_scraped_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    listings = relationship("Listing", back_populates="source")
    
    def __repr__(self):
        return f"<Source(name='{self.name}', url='{self.url}')>"

class Listing(Base):
    """Model representing car listings/advertisements"""
    __tablename__ = 'listings'
    
    listing_id = Column(Integer, primary_key=True)
    car_id = Column(Integer, ForeignKey('cars.car_id'), nullable=False)
    source_id = Column(Integer, ForeignKey('sources.source_id'), nullable=False)
    external_id = Column(String(50))
    price = Column(Integer, nullable=False)
    listing_date = Column(Date, nullable=False)
    listing_url = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    car = relationship("Car", back_populates="listings")
    source = relationship("Source", back_populates="listings")
    
    def __repr__(self):
        return f"<Listing(car_id={self.car_id}, price={self.price})>"

class Analysis(Base):
    """Model representing analyses performed"""
    __tablename__ = 'analyses'
    
    analysis_id = Column(Integer, primary_key=True)
    car_id = Column(Integer, ForeignKey('cars.car_id'))
    model_id = Column(Integer, ForeignKey('models.model_id'))
    title = Column(String(100), nullable=False)
    description = Column(Text)
    params = Column(Text)  # JSON format
    results = Column(Text)  # JSON format
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    car = relationship("Car", back_populates="analyses")
    model = relationship("Model", back_populates="analyses")
    report_analyses = relationship("ReportAnalysis", back_populates="analysis")
    
    def __repr__(self):
        return f"<Analysis(title='{self.title}')>"

class MarketValue(Base):
    """Model representing calculated market values"""
    __tablename__ = 'market_values'
    
    value_id = Column(Integer, primary_key=True)
    model_id = Column(Integer, ForeignKey('models.model_id'), nullable=False)
    region_id = Column(Integer, ForeignKey('regions.region_id'), nullable=False)
    year = Column(Integer, nullable=False)
    engine_type = Column(String(20))
    avg_price = Column(Integer)
    median_price = Column(Integer)
    min_price = Column(Integer)
    max_price = Column(Integer)
    std_deviation = Column(Float)
    sample_size = Column(Integer)
    calculation_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    model = relationship("Model", back_populates="market_values")
    region = relationship("Region", back_populates="market_values")
    
    def __repr__(self):
        return f"<MarketValue(model_id={self.model_id}, year={self.year}, avg_price={self.avg_price})>"

class Report(Base):
    """Model representing generated reports"""
    __tablename__ = 'reports'
    
    report_id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    params = Column(Text)  # JSON format
    file_path = Column(String(255))
    file_type = Column(String(10))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    report_analyses = relationship("ReportAnalysis", back_populates="report")
    
    def __repr__(self):
        return f"<Report(title='{self.title}', file_type='{self.file_type}')>"

class ReportAnalysis(Base):
    """Junction table between reports and analyses"""
    __tablename__ = 'report_analyses'
    
    report_analysis_id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey('reports.report_id'), nullable=False)
    analysis_id = Column(Integer, ForeignKey('analyses.analysis_id'), nullable=False)
    order = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    report = relationship("Report", back_populates="report_analyses")
    analysis = relationship("Analysis", back_populates="report_analyses")
    
    def __repr__(self):
        return f"<ReportAnalysis(report_id={self.report_id}, analysis_id={self.analysis_id})>"


# Database initialization function
def init_db(db_url="sqlite:///car_price_analysis.db"):
    """Initialize the database with all tables"""
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session(), engine