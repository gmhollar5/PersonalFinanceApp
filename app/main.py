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

# ------------------- Upload Sessions -------------------
@app.post("/upload-sessions/", response_model=schemas.UploadSessionOut)
def create_upload_session(session: schemas.UploadSessionCreate, db: Session = Depends(get_db)):
    """Create a new upload session"""
    try:
        user = db.query(models.User).filter(models.User.id == session.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db_session = models.UploadSession(**session.model_dump())
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        print(f"✅ Upload session created: ID {db_session.id} ({db_session.upload_type})")
        return db_session
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating upload session: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/upload-sessions/user/{user_id}", response_model=list[schemas.UploadSessionOut])
def get_user_upload_sessions(user_id: int, db: Session = Depends(get_db)):
    """Get all upload sessions for a user"""
    try:
        sessions = db.query(models.UploadSession).filter(
            models.UploadSession.user_id == user_id
        ).order_by(models.UploadSession.upload_date.desc()).all()
        
        return sessions
        
    except Exception as e:
        print(f"❌ Error fetching upload sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.patch("/upload-sessions/{session_id}", response_model=schemas.UploadSessionOut)
def update_upload_session(session_id: int, session_update: schemas.UploadSessionUpdate, db: Session = Depends(get_db)):
    """Update an upload session"""
    try:
        db_session = db.query(models.UploadSession).filter(
            models.UploadSession.id == session_id
        ).first()
        
        if not db_session:
            raise HTTPException(status_code=404, detail="Upload session not found")
        
        update_data = session_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_session, key, value)
        
        db.commit()
        db.refresh(db_session)
        
        print(f"✅ Upload session updated: ID {db_session.id}")
        return db_session
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating upload session: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/upload-sessions/{session_id}")
def delete_upload_session(session_id: int, db: Session = Depends(get_db)):
    """Delete an upload session and all its transactions"""
    try:
        db_session = db.query(models.UploadSession).filter(
            models.UploadSession.id == session_id
        ).first()
        
        if not db_session:
            raise HTTPException(status_code=404, detail="Upload session not found")
        
        # Delete all transactions in this session
        db.query(models.Transaction).filter(
            models.Transaction.upload_session_id == session_id
        ).delete()
        
        # Delete the session
        db.delete(db_session)
        db.commit()
        
        print(f"✅ Upload session deleted: ID {session_id}")
        return {"success": True, "message": "Upload session deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting upload session: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

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

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Delete a specific transaction and update its upload session"""
    try:
        transaction = db.query(models.Transaction).filter(
            models.Transaction.id == transaction_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        upload_session_id = transaction.upload_session_id
        
        # Delete the transaction
        db.delete(transaction)
        db.commit()
        
        # Update the upload session if it exists
        if upload_session_id:
            session = db.query(models.UploadSession).filter(
                models.UploadSession.id == upload_session_id
            ).first()
            
            if session:
                # Get remaining transactions in this session
                remaining_transactions = db.query(models.Transaction).filter(
                    models.Transaction.upload_session_id == upload_session_id
                ).all()
                
                if len(remaining_transactions) == 0:
                    # No more transactions, delete the session
                    db.delete(session)
                else:
                    # Update session count and date range
                    session.transaction_count = len(remaining_transactions)
                    
                    # Recalculate date range
                    dates = [t.transaction_date for t in remaining_transactions]
                    session.min_transaction_date = min(dates)
                    session.max_transaction_date = max(dates)
                
                db.commit()
        
        print(f"✅ Transaction deleted: ID {transaction_id}")
        return {"success": True, "message": "Transaction deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting transaction: {e}")
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
                    tag=t.get("tag") or None,
                    transaction_date=trans_date,
                    is_bulk_upload=t.get("is_bulk_upload", False),
                    upload_session_id=t.get("upload_session_id"),
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
                    tag=t.get("tag") or None,
                    transaction_date=trans_date,
                    is_bulk_upload=t.get("is_bulk_upload", False),
                    upload_session_id=t.get("upload_session_id"),
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
def get_user_account_definitions(user_id: int, include_closed: bool = False, db: Session = Depends(get_db)):
    """Get all account definitions for a user
    
    Args:
        user_id: The user's ID
        include_closed: If True, includes closed accounts. Default is False (active only)
    """
    try:
        query = db.query(models.AccountDefinition).filter(
            models.AccountDefinition.user_id == user_id
        )
        
        # Filter by active status unless include_closed is True
        if not include_closed:
            query = query.filter(models.AccountDefinition.is_active == True)
        
        account_defs = query.order_by(
            models.AccountDefinition.category, 
            models.AccountDefinition.name
        ).all()
        
        return account_defs
        
    except Exception as e:
        print(f"❌ Error fetching account definitions: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.patch("/account-definitions/{account_def_id}", response_model=schemas.AccountDefinitionOut)
def update_account_definition(
    account_def_id: int, 
    account_update: schemas.AccountDefinitionUpdate, 
    db: Session = Depends(get_db)
):
    """Update an account definition (e.g., close/reactivate account)"""
    try:
        account_def = db.query(models.AccountDefinition).filter(
            models.AccountDefinition.id == account_def_id
        ).first()
        
        if not account_def:
            raise HTTPException(status_code=404, detail="Account definition not found")
        
        # Update fields that are provided
        update_data = account_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(account_def, key, value)
        
        db.commit()
        db.refresh(account_def)
        
        status = "closed" if not account_def.is_active else "reactivated"
        print(f"✅ Account definition {status}: {account_def.name}")
        return account_def
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating account definition: {e}")
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
        
        return [{"date": d[0]} for d in dates]
        
    except Exception as e:
        print(f"❌ Error fetching record dates: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/account-records/analytics/{user_id}")
def get_account_analytics(user_id: int, db: Session = Depends(get_db)):
    """Get account analytics including net worth history and trends"""
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
            
            by_date[date_key]["accounts"][name] = record.balance
        
        # Calculate net worth for each date
        net_worth_history = []
        for date_key in sorted(by_date.keys()):
            data = by_date[date_key]
            net_worth = data["liquid"] + data["investments"] - data["debt"]
            net_worth_history.append({
                "date": date_key,
                "net_worth": net_worth
            })
        
        # Get current net worth
        current_net_worth = net_worth_history[-1]["net_worth"] if net_worth_history else 0
        
        # Calculate month-over-month change
        mom_change = 0
        mom_percent = 0
        if len(net_worth_history) >= 2:
            prev_month = net_worth_history[-2]["net_worth"]
            mom_change = current_net_worth - prev_month
            if prev_month != 0:
                mom_percent = (mom_change / abs(prev_month)) * 100
        
        # Calculate year-over-year change (if we have enough data)
        yoy_change = 0
        yoy_percent = 0
        if len(net_worth_history) >= 12:
            prev_year = net_worth_history[-12]["net_worth"]
            yoy_change = current_net_worth - prev_year
            if prev_year != 0:
                yoy_percent = (yoy_change / abs(prev_year)) * 100
        
        # Calculate all-time change
        all_time_change = 0
        if net_worth_history:
            first_net_worth = net_worth_history[0]["net_worth"]
            all_time_change = current_net_worth - first_net_worth
        
        # Build category history
        category_history = {
            "liquid": [{"date": d["date"], "value": by_date[d["date"]]["liquid"]} for d in net_worth_history],
            "investments": [{"date": d["date"], "value": by_date[d["date"]]["investments"]} for d in net_worth_history],
            "debt": [{"date": d["date"], "value": by_date[d["date"]]["debt"]} for d in net_worth_history]
        }
        
        # Build account history (all unique accounts)
        all_accounts = set()
        for data in by_date.values():
            all_accounts.update(data["accounts"].keys())
        
        account_history = {}
        for account in all_accounts:
            account_history[account] = [
                {"date": d["date"], "value": by_date[d["date"]]["accounts"].get(account, 0)}
                for d in net_worth_history
            ]
        
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
        "version": "3.1"  # Updated for upload sessions support
    }