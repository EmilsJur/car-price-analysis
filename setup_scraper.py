import subprocess
import sys
import os
import platform

def check_python_version():
    """Check if Python version is 3.7 or higher"""
    required_version = (3, 7)
    current_version = sys.version_info
    
    if current_version < required_version:
        print(f"Error: Python {required_version[0]}.{required_version[1]} or higher is required.")
        print(f"Current version: {current_version[0]}.{current_version[1]}")
        return False
    
    return True

def install_requirements():
    """Install required packages"""
    required_packages = [
        "requests",
        "aiohttp",
        "beautifulsoup4",
        "sqlalchemy",
        "schedule",
        "aiofiles"
    ]
    
    print("Installing required packages...")
    for package in required_packages:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"✓ {package} installed successfully")
        except subprocess.CalledProcessError:
            print(f"✗ Failed to install {package}")
            return False
    
    return True

def setup_database():
    """Set up the database by importing models and running init_db"""
    try:
        print("Setting up database...")
        from models import init_db
        
        session, engine = init_db()
        session.close()
        
        print("✓ Database initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Database setup failed: {str(e)}")
        return False

def setup_scheduler():
    """Set up the scheduler based on the operating system"""
    system = platform.system()
    
    if system == "Windows":
        print("\nTo schedule the scraper on Windows:")
        print("1. Open Task Scheduler")
        print("2. Create a new Basic Task")
        print("3. Set it to run daily at your preferred time")
        print("4. Set the action to 'Start a program'")
        print(f"5. Program/script: {sys.executable}")
        print(f"6. Add arguments: {os.path.join(os.getcwd(), 'schedule_scraper.py')}")
        print(f"7. Start in: {os.getcwd()}")
        
    elif system in ["Linux", "Darwin"]:  # Linux or macOS
        print("\nTo schedule the scraper on Linux/macOS:")
        print("1. Open terminal and run 'crontab -e'")
        print("2. Add the following line to run daily at 3 AM:")
        print(f"   0 3 * * * cd {os.getcwd()} && {sys.executable} {os.path.join(os.getcwd(), 'schedule_scraper.py')}")
        
    else:
        print(f"\nScheduling on {system} is not directly supported.")
        print("You can run the scraper manually or set up a custom scheduler.")
    
    # Create a simple shell/batch script for manual running
    if system == "Windows":
        script_name = "run_scraper.bat"
        script_content = f'@echo off\n"{sys.executable}" "{os.path.join(os.getcwd(), "schedule_scraper.py")}" --now\npause'
    else:
        script_name = "run_scraper.sh"
        script_content = f'#!/bin/bash\n{sys.executable} {os.path.join(os.getcwd(), "schedule_scraper.py")} --now'
    
    with open(script_name, 'w') as f:
        f.write(script_content)
    
    if system != "Windows":
        os.chmod(script_name, 0o755)  # Make executable
    
    print(f"\nCreated {script_name} for manual execution")
    
    return True

def main():
    """Main setup function"""
    print("=== SS.LV Car Scraper Setup ===\n")
    
    if not check_python_version():
        return
    
    if not install_requirements():
        print("\nSome required packages could not be installed.")
        print("You may need to install them manually.")
    
    if not setup_database():
        print("\nDatabase setup failed. Please check the error message.")
        return
    
    setup_scheduler()
    
    print("\nSetup completed. You can now run the scraper with:")
    print(f"python ss_scraper.py")
    print("\nOr schedule it to run automatically using the instructions above.")

if __name__ == "__main__":
    main()