import sys
import os

# Calculate the directory of the current file
current_dir = os.path.dirname(os.path.abspath(__file__))

# Assuming 'utils' resides in a sibling or parent directory that needs to be added to the path
# We attempt to add the root directory containing both temp_verification.py and utils
# This adjusts the Python Path to resolve local modules correctly during standalone execution
root_dir = os.path.join(current_dir, '..') 
sys.path.append(os.path.abspath(root_dir))

# Now the import should successfully find 'utils' relative to the package root
from utils.logger import setup_logging

# Remaining code logic from temp_verification.py continues here
