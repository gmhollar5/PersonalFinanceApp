from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, date

# --- Users ---
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str  # NEW: Plain text password (will be hashed before storing)
    
    @field_validator('password')
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    # Note: password is NOT included in output for security

    model_config = {"from_attributes": True}

class LoginCredentials(BaseModel):
    email: str
    password: str  # NEW: Password for login

# --- Transactions ---
class TransactionCreate(BaseModel):
    type: str
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None
    transaction_date: date  # Date of the actual transaction
    user_id: int

class TransactionOut(BaseModel):
    id: int
    type: str
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None
    transaction_date: date
    date_added: datetime

    model_config = {"from_attributes": True}

# --- Accounts ---
class AccountCreate(BaseModel):
    name: str
    account_type: str  # "liquid", "investment", "debt"
    balance: float
    user_id: int

class AccountOut(BaseModel):
    id: int
    name: str
    account_type: str
    balance: float
    date_recorded: datetime

    model_config = {"from_attributes": True}