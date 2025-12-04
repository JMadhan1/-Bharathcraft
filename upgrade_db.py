import sqlite3
import os

DB_FILE = 'bharatcraft.db'

def upgrade_database():
    if not os.path.exists(DB_FILE):
        print(f"Database file {DB_FILE} not found. It will be created on first run.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Add columns to products table
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN certificate_id TEXT")
        print("Added certificate_id to products")
    except sqlite3.OperationalError:
        print("certificate_id already exists in products")

    try:
        cursor.execute("ALTER TABLE products ADD COLUMN digital_passport_hash TEXT")
        print("Added digital_passport_hash to products")
    except sqlite3.OperationalError:
        print("digital_passport_hash already exists in products")

    # Add columns to orders table
    try:
        cursor.execute("ALTER TABLE orders ADD COLUMN smart_contract_hash TEXT")
        print("Added smart_contract_hash to orders")
    except sqlite3.OperationalError:
        print("smart_contract_hash already exists in orders")

    try:
        cursor.execute("ALTER TABLE orders ADD COLUMN escrow_status TEXT DEFAULT 'inactive'")
        print("Added escrow_status to orders")
    except sqlite3.OperationalError:
        print("escrow_status already exists in orders")

    try:
        cursor.execute("ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0.0")
        print("Added shipping_cost to orders")
    except sqlite3.OperationalError:
        print("shipping_cost already exists in orders")
        
    try:
        cursor.execute("ALTER TABLE orders ADD COLUMN artisan_id INTEGER REFERENCES users(id)")
        print("Added artisan_id to orders")
    except sqlite3.OperationalError:
        print("artisan_id already exists in orders")

    conn.commit()
    conn.close()
    print("Database upgrade complete.")

if __name__ == "__main__":
    upgrade_database()
