from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
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
        # Check if email already exists
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash the password before storing
        hashed_pwd = hash_password(user.password)
        
        # Create user with hashed password
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
        # Find user by email
        user = db.query(models.User).filter(models.User.email == credentials.email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
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

# ------------------- CSV Upload -------------------
@app.post("/transactions/parse-csv", response_model=CSVUploadResponse)
async def parse_csv_file(
    file: UploadFile = File(...),
    bank_type: Optional[str] = Form(default="auto")
):
    """
    Parse a CSV file and return transactions for review.
    
    bank_type options: 'auto', 'sofi_savings', 'sofi_checking', 'capital_one'
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
    from datetime import datetime, date
    
    try:
        # Verify user exists
        user = db.query(models.User).filter(models.User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        created_count = 0
        errors = []
        
        for idx, t in enumerate(data.transactions):
            try:
                # Convert date string to date object if needed
                trans_date = t["transaction_date"]
                if isinstance(trans_date, str):
                    trans_date = datetime.strptime(trans_date, "%Y-%m-%d").date()
                elif isinstance(trans_date, datetime):
                    trans_date = trans_date.date()
                
                # Create transaction
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
        
        print(f"✅ Account recorded: {db_account.name} - ${db_account.balance}")
        return db_account
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating account: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/accounts/user/{user_id}", response_model=list[schemas.AccountOut])
def get_user_accounts(user_id: int, db: Session = Depends(get_db)):
    """Get all account records for a specific user"""
    try:
        accounts = db.query(models.Account).filter(
            models.Account.user_id == user_id
        ).order_by(models.Account.date_recorded.desc()).all()
        
        return accounts
        
    except Exception as e:
        print(f"❌ Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/accounts/user/{user_id}/latest")
def get_latest_accounts(user_id: int, db: Session = Depends(get_db)):
    """Get the most recent balance for each account"""
    try:
        accounts = db.query(models.Account).filter(
            models.Account.user_id == user_id
        ).order_by(models.Account.date_recorded.desc()).all()
        
        latest_accounts = {}
        for account in accounts:
            key = f"{account.name}_{account.account_type}"
            if key not in latest_accounts:
                latest_accounts[key] = account
        
        return list(latest_accounts.values())
        
    except Exception as e:
        print(f"❌ Error fetching latest accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Health check
@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Personal Finance API is running",
        "version": "2.2"  # Updated version for CSV upload feature
    }