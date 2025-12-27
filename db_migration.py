"""
Database Migration Script
This script adds the new columns to existing tables:
- Users: created_at, updated_at
- Transactions: tag, is_bulk_upload, upload_session_id, created_at, updated_at (and makes store mandatory)
- Accounts: created_at, updated_at
- Creates new UploadSessions table
"""

import sqlite3
from datetime import datetime

def migrate_database(db_path):
    """
    Migrate the database to the new schema
    
    Args:
        db_path: Path to your SQLite database file
    """
    print(f"🔄 Starting database migration for: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Step 1: Add new columns to users table
        print("\n📝 Updating users table...")
        try:
            # SQLite doesn't allow CURRENT_TIMESTAMP as default in ALTER TABLE
            # So we add the column without default, then update existing rows
            cursor.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP")
            print("  ✅ Added created_at column to users")
            
            # Update existing rows with current timestamp
            current_time = datetime.utcnow().isoformat()
            cursor.execute("UPDATE users SET created_at = ? WHERE created_at IS NULL", (current_time,))
            print("  ✅ Set created_at for existing users")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  created_at already exists in users")
            else:
                raise
        
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP")
            print("  ✅ Added updated_at to users")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  updated_at already exists in users")
            else:
                raise
        
        # Step 2: Create upload_sessions table
        print("\n📝 Creating upload_sessions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS upload_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                upload_type VARCHAR NOT NULL,
                transaction_count INTEGER DEFAULT 0 NOT NULL,
                upload_date TIMESTAMP NOT NULL,
                most_recent_transaction_date DATE,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        print("  ✅ Created upload_sessions table")
        
        # Step 3: Add new columns to transactions table
        print("\n📝 Updating transactions table...")
        
        # Add tag column
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN tag VARCHAR")
            print("  ✅ Added tag to transactions")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  tag already exists in transactions")
            else:
                raise
        
        # Add is_bulk_upload column with default 0 (SQLite allows constant defaults)
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN is_bulk_upload BOOLEAN DEFAULT 0")
            print("  ✅ Added is_bulk_upload to transactions")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  is_bulk_upload already exists in transactions")
            else:
                raise
        
        # Add upload_session_id column
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN upload_session_id INTEGER")
            print("  ✅ Added upload_session_id to transactions")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  upload_session_id already exists in transactions")
            else:
                raise
        
        # Add created_at column
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN created_at TIMESTAMP")
            print("  ✅ Added created_at column to transactions")
            
            # Update existing rows with current timestamp
            current_time = datetime.utcnow().isoformat()
            cursor.execute("UPDATE transactions SET created_at = ? WHERE created_at IS NULL", (current_time,))
            print("  ✅ Set created_at for existing transactions")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  created_at already exists in transactions")
            else:
                raise
        
        # Add updated_at column
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMP")
            print("  ✅ Added updated_at to transactions")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  updated_at already exists in transactions")
            else:
                raise
        
        # Step 4: Handle store column (check if nullable, if so update existing NULL values)
        print("\n📝 Checking transactions store column...")
        cursor.execute("SELECT COUNT(*) FROM transactions WHERE store IS NULL")
        null_stores = cursor.fetchone()[0]
        
        if null_stores > 0:
            print(f"  ⚠️  Found {null_stores} transactions with NULL store values")
            print("  📝 Updating NULL stores to 'Unknown'...")
            cursor.execute("UPDATE transactions SET store = 'Unknown' WHERE store IS NULL")
            print("  ✅ Updated NULL stores")
        else:
            print("  ✅ All transactions have store values")
        
        # Step 5: Add new columns to accounts table
        print("\n📝 Updating accounts table...")
        try:
            cursor.execute("ALTER TABLE accounts ADD COLUMN created_at TIMESTAMP")
            print("  ✅ Added created_at column to accounts")
            
            # Update existing rows with current timestamp
            current_time = datetime.utcnow().isoformat()
            cursor.execute("UPDATE accounts SET created_at = ? WHERE created_at IS NULL", (current_time,))
            print("  ✅ Set created_at for existing accounts")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  created_at already exists in accounts")
            else:
                raise
        
        try:
            cursor.execute("ALTER TABLE accounts ADD COLUMN updated_at TIMESTAMP")
            print("  ✅ Added updated_at to accounts")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ⚠️  updated_at already exists in accounts")
            else:
                raise
        
        # Step 6: Create a default upload session for existing transactions
        print("\n📝 Creating default upload session for existing transactions...")
        cursor.execute("SELECT COUNT(*) FROM transactions WHERE upload_session_id IS NULL")
        orphan_transactions = cursor.fetchone()[0]
        
        if orphan_transactions > 0:
            print(f"  📝 Found {orphan_transactions} transactions without upload sessions")
            
            # Get all users who have transactions
            cursor.execute("SELECT DISTINCT user_id FROM transactions WHERE upload_session_id IS NULL")
            user_ids = cursor.fetchall()
            
            for (user_id,) in user_ids:
                # Get the earliest transaction date for this user
                cursor.execute("""
                    SELECT MIN(transaction_date) 
                    FROM transactions 
                    WHERE user_id = ? AND upload_session_id IS NULL
                """, (user_id,))
                earliest_date = cursor.fetchone()[0]
                
                current_time = datetime.utcnow().isoformat()
                
                # Create a bulk upload session for historical data
                cursor.execute("""
                    INSERT INTO upload_sessions 
                    (user_id, upload_type, transaction_count, most_recent_transaction_date, upload_date, created_at)
                    VALUES (?, 'bulk', 0, ?, ?, ?)
                """, (user_id, earliest_date, current_time, current_time))
                
                session_id = cursor.lastrowid
                
                # Link all existing transactions to this session
                cursor.execute("""
                    UPDATE transactions 
                    SET upload_session_id = ?, is_bulk_upload = 1 
                    WHERE user_id = ? AND upload_session_id IS NULL
                """, (session_id, user_id))
                
                # Update transaction count
                cursor.execute("SELECT COUNT(*) FROM transactions WHERE upload_session_id = ?", (session_id,))
                count = cursor.fetchone()[0]
                cursor.execute("UPDATE upload_sessions SET transaction_count = ? WHERE id = ?", (count, session_id))
                
                print(f"  ✅ Created session {session_id} for user {user_id} with {count} transactions")
        else:
            print("  ✅ All transactions already have upload sessions")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Print summary
        print("\n" + "="*50)
        print("MIGRATION SUMMARY")
        print("="*50)
        cursor.execute("SELECT COUNT(*) FROM users")
        print(f"Total Users: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM transactions")
        print(f"Total Transactions: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM upload_sessions")
        print(f"Total Upload Sessions: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM accounts")
        print(f"Total Accounts: {cursor.fetchone()[0]}")
        print("="*50)
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    # Update this path to your database file
    DB_PATH = "C:/Users/Grant Hollar/OneDrive/Personal Desktop/Pet Projects/Finance App/finance.db"
    
    print("="*50)
    print("DATABASE MIGRATION SCRIPT")
    print("="*50)
    print(f"\nThis script will update your database at:")
    print(f"  {DB_PATH}")
    print("\nThe following changes will be made:")
    print("  1. Add created_at, updated_at to users table")
    print("  2. Create upload_sessions table")
    print("  3. Add tag, is_bulk_upload, upload_session_id, created_at, updated_at to transactions")
    print("  4. Update NULL store values to 'Unknown'")
    print("  5. Add created_at, updated_at to accounts table")
    print("  6. Create default upload sessions for existing transactions")
    
    response = input("\n⚠️  Do you want to proceed? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        migrate_database(DB_PATH)
    else:
        print("❌ Migration cancelled")