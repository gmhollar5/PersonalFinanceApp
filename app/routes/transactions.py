# import libraries
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

# Create a router for all transaction-related endpoints
router = APIRouter(prefix="/transactions", tags=["Transactions"])

# Endpoint to add a transaction
@router.post("/", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, user_id: int, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create a new transaction and link to user
    db_transaction = models.Transaction(**transaction.dict(), user_id=user_id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)  # get updated transaction with id
    return db_transaction

# Endpoint to get summary of a user's transactions
@router.get("/summary/{user_id}")
def get_summary(user_id: int, db: Session = Depends(get_db)):
    # Query all transactions for this user
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()

    # Calculate total income, expenses, and balance
    income = sum(t.amount for t in transactions if t.type == "income")
    expense = sum(t.amount for t in transactions if t.type == "expense")
    balance = income - expense

    return {"income": income, "expense": expense, "balance": balance}

# Get all transactions for a user
@router.get("/user/{user_id}", response_model=list[schemas.Transaction])
def list_transactions(user_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.date.desc()).all()
    return rows