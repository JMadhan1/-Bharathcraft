import sqlite3

def upgrade_db_transactions():
    conn = sqlite3.connect('bharatcraft.db')
    cursor = conn.cursor()
    
    # Create transactions table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY,
                order_id INTEGER NOT NULL,
                buyer_id INTEGER NOT NULL,
                artisan_id INTEGER NOT NULL,
                buyer_amount FLOAT NOT NULL,
                buyer_currency VARCHAR(10) NOT NULL,
                artisan_amount FLOAT NOT NULL,
                artisan_currency VARCHAR(10) DEFAULT 'INR',
                platform_fee FLOAT NOT NULL,
                exchange_rate FLOAT NOT NULL,
                shipping_cost FLOAT DEFAULT 0.0,
                shipping_option VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                payment_method VARCHAR(50),
                payment_id VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(order_id) REFERENCES orders(id),
                FOREIGN KEY(buyer_id) REFERENCES buyer_profiles(id),
                FOREIGN KEY(artisan_id) REFERENCES artisan_profiles(id)
            )
        """)
        print("Created transactions table")
    except sqlite3.OperationalError as e:
        print(f"Error creating transactions table: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db_transactions()
