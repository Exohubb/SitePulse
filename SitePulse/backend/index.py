import sys
import os

# Make sure Python can find main.py, models.py, checker.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
