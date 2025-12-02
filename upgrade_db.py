import sqlite3

def upgrade_db():
    conn = sqlite3.connect('bharatcraft.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE buyer_profiles ADD COLUMN country VARCHAR(100)")
        print("Added country column")
    except sqlite3.OperationalError as e:
        print(f"Country column might already exist: {e}")
        
    try:
        cursor.execute("ALTER TABLE buyer_profiles ADD COLUMN currency VARCHAR(10) DEFAULT 'USD'")
        print("Added currency column")
    except sqlite3.OperationalError as e:
        print(f"Currency column might already exist: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db()
