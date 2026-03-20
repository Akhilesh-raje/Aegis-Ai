import sqlite3
import os

DB_PATH = r"c:\Users\rajea\Documents\AegisAI\backend\aegis.db"

if os.path.exists(DB_PATH):
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DROP TABLE IF EXISTS threats")
        cursor.execute("DROP TABLE IF EXISTS risk_history")
        cursor.execute("DROP TABLE IF EXISTS events")
        conn.commit()
        print("Tables dropped successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print("Database file not found.")
