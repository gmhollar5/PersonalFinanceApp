from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas
from .database import Base, engine, get_db

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

# ------------------- Users -------------------
@app.post("/users/", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user account"""
    try:
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        db_user = models.User(**user.model_dump())
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
        # Get all accounts for user
        accounts = db.query(models.Account).filter(
            models.Account.user_id == user_id
        ).order_by(models.Account.date_recorded.desc()).all()
        
        # Group by account name, keep only most recent
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
        "version": "2.0"
    }