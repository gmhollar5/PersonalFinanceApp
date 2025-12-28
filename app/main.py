from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, date
from . import models, schemas
from .database import engine, get_db
from .csv_parser import parse_csv
from .schemas_csv import CSVUploadResponse, BulkTransactionCreate, ParsedTransaction
from passlib.context import CryptContext
from typing import Optional

# Create all tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Finance App API is running!"}

# ------------------- Users -------------------
@app.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user account"""
    try:
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pw = hash_password(user.password)
        
        db_user = models.User(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            hashed_password=hashed_pw
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
def update_upload_session(
    session_id: int, 
    session_update: schemas.UploadSessionUpdate, 
    db: Session = Depends(get_db)
):
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
        
        return db_session
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating upload session: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/upload-sessions/{session_id}")
def delete_upload_session(session_id: int, db: Session = Depends(get_db)):
    """Delete an upload session and all associated transactions"""
    try:
        db_session = db.query(models.UploadSession).filter(
            models.UploadSession.id == session_id
        ).first()
        
        if not db_session:
            raise HTTPException(status_code=404, detail="Upload session not found")
        
        # Delete all transactions associated with this session
        db.query(models.Transaction).filter(
            models.Transaction.upload_session_id == session_id
        ).delete()
        
        # Delete the session
        db.delete(db_session)
        db.commit()
        
        print(f"✅ Upload session {session_id} and associated transactions deleted")
        return {"message": "Upload session deleted successfully"}
        
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

@app.get("/transactions/summary/{user_id}")
def get_transaction_summary(user_id: int, db: Session = Depends(get_db)):
    """Get summary of user's transactions"""
    try:
        transactions = db.query(models.Transaction).filter(
            models.Transaction.user_id == user_id
        ).all()
        
        income = sum(t.amount for t in transactions if t.type == "income")
        expense = sum(t.amount for t in transactions if t.type == "expense")
        balance = income - expense
        
        return {"income": income, "expense": expense, "balance": balance}
        
    except Exception as e:
        print(f"❌ Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.patch("/transactions/{transaction_id}", response_model=schemas.TransactionOut)
def update_transaction(
    transaction_id: int, 
    transaction_update: schemas.TransactionUpdate, 
    db: Session = Depends(get_db)
):
    """Update a transaction"""
    try:
        db_transaction = db.query(models.Transaction).filter(
            models.Transaction.id == transaction_id
        ).first()
        
        if not db_transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        update_data = transaction_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_transaction, key, value)
        
        # Set updated_at timestamp
        db_transaction.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_transaction)
        
        print(f"✅ Transaction {transaction_id} updated")
        return db_transaction
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Delete a transaction"""
    try:
        db_transaction = db.query(models.Transaction).filter(
            models.Transaction.id == transaction_id
        ).first()
        
        if not db_transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Update the upload session's transaction count if applicable
        if db_transaction.upload_session_id:
            session = db.query(models.UploadSession).filter(
                models.UploadSession.id == db_transaction.upload_session_id
            ).first()
            if session:
                session.transaction_count = max(0, session.transaction_count - 1)
        
        db.delete(db_transaction)
        db.commit()
        
        print(f"✅ Transaction {transaction_id} deleted")
        return {"message": "Transaction deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ------------------- CSV Import -------------------
@app.post("/transactions/parse-csv", response_model=CSVUploadResponse)
async def parse_csv_file(
    file: UploadFile = File(...),
    bank_type: Optional[str] = Form(default="auto")
):
    """
    Parse a CSV file and return transactions for review.
    bank_type options: 'auto', 'sofi', 'capital_one'
    """
    try:
        # Read file content
        content = await file.read()
        content_str = content.decode("utf-8-sig")  # Handle BOM if present
        
        # Parse CSV using csv_parser module
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
        
        print(f"✅ Parsed {len(transactions)} transactions from CSV ({detected_type})")
        
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
        # Verify user exists
        user = db.query(models.User).filter(models.User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create bulk upload session
        upload_session = models.UploadSession(
            user_id=data.user_id,
            upload_type="bulk",
            transaction_count=len(data.transactions),
            upload_date=datetime.utcnow()
        )
        db.add(upload_session)
        db.flush()  # Get the session ID
        
        # All transactions will have the same created_at timestamp
        bulk_timestamp = datetime.utcnow()
        
        # Track date range
        transaction_dates = []
        created_transactions = []
        errors = []
        
        for idx, trans_dict in enumerate(data.transactions):
            try:
                # Parse transaction_date if it's a string
                trans_date = trans_dict["transaction_date"]
                if isinstance(trans_date, str):
                    trans_date = datetime.strptime(trans_date, "%Y-%m-%d").date()
                    print(f"Converted date from '{trans_dict['transaction_date']}' to {trans_date} (type: {type(trans_date)})")
                
                # Create transaction with bulk upload flag
                db_transaction = models.Transaction(
                    type=trans_dict["type"],
                    category=trans_dict["category"],
                    store=trans_dict["store"],
                    amount=trans_dict["amount"],
                    description=trans_dict.get("description"),
                    tag=trans_dict.get("tag"),
                    transaction_date=trans_date,  # Use parsed date object
                    is_bulk_upload=True,
                    upload_session_id=upload_session.id,
                    created_at=bulk_timestamp,  # Same timestamp for all
                    user_id=data.user_id
                )
                db.add(db_transaction)
                created_transactions.append(db_transaction)
                transaction_dates.append(trans_date)
                
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        
        # Update session with date range
        if transaction_dates:
            upload_session.max_transaction_date = max(transaction_dates)
            upload_session.min_transaction_date = min(transaction_dates)
        
        db.commit()
        
        print(f"✅ Bulk import: {len(created_transactions)} transactions created")
        
        return {
            "created_count": len(created_transactions),
            "errors": errors,
            "session_id": upload_session.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error in bulk create: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ------------------- Accounts -------------------
@app.post("/accounts/", response_model=schemas.AccountOut)
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db)):
    """Create or update account balance"""
    try:
        user = db.query(models.User).filter(models.User.id == account.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db_account = models.Account(**account.model_dump())
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        
        print(f"✅ Account created: {db_account.name} - ${db_account.balance}")
        return db_account
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating account: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/accounts/user/{user_id}", response_model=list[schemas.AccountOut])
def get_user_accounts(user_id: int, db: Session = Depends(get_db)):
    """Get all accounts for a user"""
    try:
        accounts = db.query(models.Account).filter(
            models.Account.user_id == user_id
        ).order_by(models.Account.date_recorded.desc()).all()
        
        return accounts
        
    except Exception as e:
        print(f"❌ Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")