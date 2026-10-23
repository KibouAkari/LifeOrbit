# Database Configuration and Connection Module.
# 
# This module establishes a connection to the MongoDB Atlas cluster using PyMongo.
# It loads environment variables (like the MongoDB URI) and initializes the 
# database client. The specific database and collections (users, events) are 
# exported here so they can be easily imported and queried by the API routes.
# ===================================================================================

import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Retrieve the connection string from .env or Vercel environment variables
MONGO_URI = os.getenv("MONGODB_URI")

try:
    # Initialize the MongoDB client
    # The client manages the connection pool to MongoDB Atlas
    client = MongoClient(MONGO_URI)
    
    # Select the specific database for the hackathon (it will be created automatically if it doesn't exist)
    db = client.hackathon_db
    
    # Define collections (like tables in a relational database)
    # We export these so our routes can easily import and query them
    users_collection = db.users
    events_collection = db.events
    
    print("Successfully connected to MongoDB Atlas.")
    
except ConnectionFailure as e:
    print(f"Could not connect to MongoDB: {e}")