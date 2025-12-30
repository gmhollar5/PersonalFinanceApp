from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime, timedelta
from . import models, schemas
from .database import Base, engine, get_db
from .auth import hash_password, verify_password
from .csv_parser import parse_csv
from .schemas_csv import ParsedTransaction, CSVUploadResponse, BulkTransactionCreate

# Create tables if not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Finance API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Auth/Users -------------------
@app.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user account with hashed password"""
    try:
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pwd = hash_password(user.password)
        db_user = models.User(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            hashed_password=hashed_pwd
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        print(f"✅ User created: {db_user.email} (ID: {db_user.id})")
        return db_user
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/login", response_model=schemas.UserOut)
def login(credentials: schemas.LoginCredentials, db: Session = Depends(get_db)):
    """Login with email and password"""
    try:
        user = db.query(models.User).filter(models.User.email == credentials.email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        print(f"✅ User logged in: {user.email} (ID: {user.id})")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error during login: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/users/", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user account (legacy endpoint)"""
    return signup(user, db)

@app.get("/users/", response_model=list[schemas.UserOut])
def get_all_users(db: Session = Depends(get_db)):
    """Get all users (DEBUG ONLY)"""
    users = db.query(models.User).all()
    return users

# ------------------- Transactions -------------------
@app.post("/transactions/", response_model=schemas.TransactionOut)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    """Create a new transaction"""
    try:
        user = db.query(models.User).filter(models.User.id == transaction.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db_transaction = models.Transaction(**transaction.model_dump())
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        
        print(f"✅ Transaction created: ${db_transaction.amount} ({db_transaction.type}) on {db_transaction.transaction_date}")
        return db_transaction
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/transactions/user/{user_id}", response_model=list[schemas.TransactionOut])
def get_user_transactions(user_id: int, db: Session = Depends(get_db)):
    """Get all transactions for a specific user"""
    try:
        transactions = db.query(models.Transaction).filter(
            models.Transaction.user_id == user_id
        ).order_by(models.Transaction.transaction_date.desc()).all()
        
        return transactions
        
    except Exception as e:
        print(f"❌ Error fetching transactions: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/transactions/parse-csv", response_model=CSVUploadResponse)
async def parse_csv_file(
    file: UploadFile = File(...),
    bank_type: Optional[str] = Form(default="auto")
):
    """
    Parse a CSV file and return transactions for review.
    Bank type options: 'auto', 'sofi', 'capital_one'
    """
    try:
        # Read file content
        content = await file.read()
        content_str = content.decode("utf-8")
        
        # Parse CSV
        detected_type, transactions = parse_csv(content_str, bank_type)
        
        # Convert to response format
        parsed_transactions = [
            ParsedTransaction(
                date=t["date"],
                description=t["description"],
                original_type=t["original_type"],
                amount=t["amount"],
                type=t["type"],
                suggested_category=t.get("suggested_category"),
                store=t.get("store")
            )
            for t in transactions
        ]
        
        return CSVUploadResponse(
            success=True,
            message=f"Successfully parsed {len(transactions)} transactions",
            bank_type=detected_type,
            transaction_count=len(transactions),
            transactions=parsed_transactions
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Error parsing CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Error parsing CSV: {str(e)}")

@app.post("/transactions/bulk-create")
async def bulk_create_transactions(
    data: BulkTransactionCreate,
    db: Session = Depends(get_db)
):
    """
    Create multiple transactions at once.
    Used after reviewing parsed CSV transactions.
    """
    try:
        user = db.query(models.User).filter(models.User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        created_count = 0
        errors = []
        
        for idx, t in enumerate(data.transactions):
            try:
                trans_date = t["transaction_date"]
                if isinstance(trans_date, str):
                    trans_date = datetime.strptime(trans_date, "%Y-%m-%d").date()
                elif isinstance(trans_date, datetime):
                    trans_date = trans_date.date()
                
                db_transaction = models.Transaction(
                    type=t["type"],
                    category=t["category"],
                    store=t.get("store") or None,
                    amount=float(t["amount"]),
                    description=t.get("description") or None,
                    transaction_date=trans_date,
                    user_id=data.user_id
                )
                db.add(db_transaction)
                created_count += 1
            except Exception as e:
                errors.append(f"Transaction {idx + 1}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "created_count": created_count,
            "errors": errors if errors else None,
            "message": f"Successfully created {created_count} transactions"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating bulk transactions: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/transactions/bulk")
def create_bulk_transactions_alt(data: BulkTransactionCreate, db: Session = Depends(get_db)):
    """Create multiple transactions at once"""
    try:
        user = db.query(models.User).filter(models.User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        created_count = 0
        errors = []
        
        for idx, t in enumerate(data.transactions):
            try:
                trans_date = t["transaction_date"]
                if isinstance(trans_date, str):
                    trans_date = datetime.strptime(trans_date, "%Y-%m-%d").date()
                elif isinstance(trans_date, datetime):
                    trans_date = trans_date.date()
                
                db_transaction = models.Transaction(
                    type=t["type"],
                    category=t["category"],
                    store=t.get("store") or None,
                    amount=float(t["amount"]),
                    description=t.get("description") or None,
                    transaction_date=trans_date,
                    user_id=data.user_id
                )
                db.add(db_transaction)
                created_count += 1
            except Exception as e:
                errors.append(f"Transaction {idx + 1}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "created_count": created_count,
            "errors": errors if errors else None,
            "message": f"Successfully created {created_count} transactions"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating bulk transactions: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ------------------- Account Definitions -------------------
@app.post("/account-definitions/", response_model=schemas.AccountDefinitionOut)
def create_account_definition(account_def: schemas.AccountDefinitionCreate, db: Session = Depends(get_db)):
    """Create a new account definition"""
    try:
        user = db.query(models.User).filter(models.User.id == account_def.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if account with same name already exists for this user
        existing = db.query(models.AccountDefinition).filter(
            models.AccountDefinition.user_id == account_def.user_id,
            models.AccountDefinition.name == account_def.name
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Account with this name already exists")
        
        db_account_def = models.AccountDefinition(**account_def.model_dump())
        db.add(db_account_def)
        db.commit()
        db.refresh(db_account_def)
        
        print(f"✅ Account definition created: {db_account_def.name} ({db_account_def.category})")
        return db_account_def
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating account definition: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/account-definitions/user/{user_id}", response_model=List[schemas.AccountDefinitionOut])
def get_user_account_definitions(user_id: int, db: Session = Depends(get_db)):
    """Get all account definitions for a user"""
    try:
        account_defs = db.query(models.AccountDefinition).filter(
            models.AccountDefinition.user_id == user_id
        ).order_by(models.AccountDefinition.category, models.AccountDefinition.name).all()
        
        return account_defs
        
    except Exception as e:
        print(f"❌ Error fetching account definitions: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/account-definitions/{account_def_id}")
def delete_account_definition(account_def_id: int, db: Session = Depends(get_db)):
    """Delete an account definition (and all its records)"""
    try:
        account_def = db.query(models.AccountDefinition).filter(
            models.AccountDefinition.id == account_def_id
        ).first()
        
        if not account_def:
            raise HTTPException(status_code=404, detail="Account definition not found")
        
        # Delete all records for this account
        db.query(models.AccountRecord).filter(
            models.AccountRecord.account_definition_id == account_def_id
        ).delete()
        
        db.delete(account_def)
        db.commit()
        
        print(f"✅ Account definition deleted: {account_def.name}")
        return {"success": True, "message": "Account deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting account definition: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ------------------- Account Records -------------------
@app.post("/account-records/", response_model=schemas.AccountRecordOut)
def create_account_record(record: schemas.AccountRecordCreate, db: Session = Depends(get_db)):
    """Create a single account record"""
    try:
        user = db.query(models.User).filter(models.User.id == record.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        account_def = db.query(models.AccountDefinition).filter(
            models.AccountDefinition.id == record.account_definition_id
        ).first()
        if not account_def:
            raise HTTPException(status_code=404, detail="Account definition not found")
        
        db_record = models.AccountRecord(**record.model_dump())
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        
        print(f"✅ Account record created: {account_def.name} - ${db_record.balance} on {db_record.record_date}")
        return db_record
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating account record: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/account-records/bulk")
def create_bulk_account_records(data: schemas.BulkAccountRecordCreate, db: Session = Depends(get_db)):
    """Create records for all accounts on a specific date"""
    try:
        user = db.query(models.User).filter(models.User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        created_count = 0
        errors = []
        
        for record_item in data.records:
            try:
                account_def = db.query(models.AccountDefinition).filter(
                    models.AccountDefinition.id == record_item.account_definition_id
                ).first()
                
                if not account_def:
                    errors.append(f"Account definition {record_item.account_definition_id} not found")
                    continue
                
                db_record = models.AccountRecord(
                    account_definition_id=record_item.account_definition_id,
                    balance=record_item.balance,
                    record_date=data.record_date,
                    user_id=data.user_id
                )
                db.add(db_record)
                created_count += 1
            except Exception as e:
                errors.append(f"Error creating record for account {record_item.account_definition_id}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "created_count": created_count,
            "errors": errors if errors else None,
            "message": f"Successfully created {created_count} account records for {data.record_date}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating bulk account records: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/account-records/user/{user_id}")
def get_user_account_records(user_id: int, db: Session = Depends(get_db)):
    """Get all account records for a user with account names"""
    try:
        records = db.query(
            models.AccountRecord,
            models.AccountDefinition.name,
            models.AccountDefinition.category
        ).join(
            models.AccountDefinition,
            models.AccountRecord.account_definition_id == models.AccountDefinition.id
        ).filter(
            models.AccountRecord.user_id == user_id
        ).order_by(
            models.AccountRecord.record_date.desc(),
            models.AccountDefinition.category,
            models.AccountDefinition.name
        ).all()
        
        result = []
        for record, name, category in records:
            result.append({
                "id": record.id,
                "account_definition_id": record.account_definition_id,
                "account_name": name,
                "category": category,
                "balance": record.balance,
                "record_date": record.record_date,
                "created_at": record.created_at
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching account records: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/account-records/user/{user_id}/dates")
def get_record_dates(user_id: int, db: Session = Depends(get_db)):
    """Get all unique record dates for a user"""
    try:
        dates = db.query(
            models.AccountRecord.record_date
        ).filter(
            models.AccountRecord.user_id == user_id
        ).distinct().order_by(
            models.AccountRecord.record_date.desc()
        ).all()
        
        return [d[0] for d in dates]
        
    except Exception as e:
        print(f"❌ Error fetching record dates: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/account-records/user/{user_id}/latest")
def get_latest_account_records(user_id: int, db: Session = Depends(get_db)):
    """Get the most recent record for each account"""
    try:
        # Get the latest date
        latest_date_query = db.query(
            func.max(models.AccountRecord.record_date)
        ).filter(
            models.AccountRecord.user_id == user_id
        ).scalar()
        
        if not latest_date_query:
            return []
        
        # Get all records for the latest date
        records = db.query(
            models.AccountRecord,
            models.AccountDefinition.name,
            models.AccountDefinition.category
        ).join(
            models.AccountDefinition,
            models.AccountRecord.account_definition_id == models.AccountDefinition.id
        ).filter(
            models.AccountRecord.user_id == user_id,
            models.AccountRecord.record_date == latest_date_query
        ).order_by(
            models.AccountDefinition.category,
            models.AccountDefinition.name
        ).all()
        
        result = []
        for record, name, category in records:
            result.append({
                "id": record.id,
                "account_definition_id": record.account_definition_id,
                "account_name": name,
                "category": category,
                "balance": record.balance,
                "record_date": record.record_date,
                "created_at": record.created_at
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching latest account records: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/account-records/analytics/{user_id}")
def get_account_analytics(user_id: int, db: Session = Depends(get_db)):
    """Get analytics data for account tracker (net worth trends, category trends, etc.)"""
    try:
        # Get all records with account info
        records = db.query(
            models.AccountRecord,
            models.AccountDefinition.name,
            models.AccountDefinition.category
        ).join(
            models.AccountDefinition,
            models.AccountRecord.account_definition_id == models.AccountDefinition.id
        ).filter(
            models.AccountRecord.user_id == user_id
        ).order_by(
            models.AccountRecord.record_date
        ).all()
        
        if not records:
            return {
                "current_net_worth": 0,
                "month_over_month_change": 0,
                "month_over_month_percent": 0,
                "year_over_year_change": 0,
                "year_over_year_percent": 0,
                "all_time_change": 0,
                "net_worth_history": [],
                "category_history": {},
                "account_history": {}
            }
        
        # Group by date
        by_date = {}
        for record, name, category in records:
            date_key = str(record.record_date)
            if date_key not in by_date:
                by_date[date_key] = {
                    "date": date_key,
                    "liquid": 0,
                    "investments": 0,
                    "debt": 0,
                    "accounts": {}
                }
            
            if category == "liquid":
                by_date[date_key]["liquid"] += record.balance
            elif category == "investments":
                by_date[date_key]["investments"] += record.balance
            elif category == "debt":
                by_date[date_key]["debt"] += record.balance
            
            account_key = f"{name}_{category}"
            by_date[date_key]["accounts"][account_key] = record.balance
        
        # Calculate net worth for each date
        net_worth_history = []
        for date_key in sorted(by_date.keys()):
            data = by_date[date_key]
            net_worth = data["liquid"] + data["investments"] - data["debt"]
            net_worth_history.append({
                "date": date_key,
                "liquid": data["liquid"],
                "investments": data["investments"],
                "debt": data["debt"],
                "net_worth": net_worth
            })
        
        # Calculate changes
        current_net_worth = net_worth_history[-1]["net_worth"] if net_worth_history else 0
        
        # Month over month
        today = date.today()
        month_ago = today - timedelta(days=30)
        month_ago_records = [r for r in net_worth_history if datetime.strptime(r["date"], "%Y-%m-%d").date() <= month_ago]
        month_ago_net_worth = month_ago_records[-1]["net_worth"] if month_ago_records else 0
        mom_change = current_net_worth - month_ago_net_worth
        mom_percent = (mom_change / month_ago_net_worth * 100) if month_ago_net_worth != 0 else 0
        
        # Year over year
        year_ago = today - timedelta(days=365)
        year_ago_records = [r for r in net_worth_history if datetime.strptime(r["date"], "%Y-%m-%d").date() <= year_ago]
        year_ago_net_worth = year_ago_records[-1]["net_worth"] if year_ago_records else 0
        yoy_change = current_net_worth - year_ago_net_worth
        yoy_percent = (yoy_change / year_ago_net_worth * 100) if year_ago_net_worth != 0 else 0
        
        # All time
        first_net_worth = net_worth_history[0]["net_worth"] if net_worth_history else 0
        all_time_change = current_net_worth - first_net_worth
        
        # Build category history
        category_history = {
            "liquid": [{"date": r["date"], "value": r["liquid"]} for r in net_worth_history],
            "investments": [{"date": r["date"], "value": r["investments"]} for r in net_worth_history],
            "debt": [{"date": r["date"], "value": r["debt"]} for r in net_worth_history]
        }
        
        # Build account history
        account_history = {}
        for date_key in sorted(by_date.keys()):
            for account_key, balance in by_date[date_key]["accounts"].items():
                if account_key not in account_history:
                    account_history[account_key] = []
                account_history[account_key].append({
                    "date": date_key,
                    "value": balance
                })
        
        return {
            "current_net_worth": current_net_worth,
            "month_over_month_change": mom_change,
            "month_over_month_percent": mom_percent,
            "year_over_year_change": yoy_change,
            "year_over_year_percent": yoy_percent,
            "all_time_change": all_time_change,
            "net_worth_history": [{"date": r["date"], "value": r["net_worth"]} for r in net_worth_history],
            "category_history": category_history,
            "account_history": account_history
        }
        
    except Exception as e:
        print(f"❌ Error fetching account analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/account-records/{record_id}")
def delete_account_record(record_id: int, db: Session = Depends(get_db)):
    """Delete a specific account record"""
    try:
        record = db.query(models.AccountRecord).filter(
            models.AccountRecord.id == record_id
        ).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Account record not found")
        
        db.delete(record)
        db.commit()
        
        print(f"✅ Account record deleted: ID {record_id}")
        return {"success": True, "message": "Account record deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting account record: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Health check
@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Personal Finance API is running",
        "version": "3.0"  # Updated for new account tracker schema
    }