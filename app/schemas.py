from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, date

# --- Users ---
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    
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
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class LoginCredentials(BaseModel):
    email: str
    password: str

# --- Upload Sessions ---
class UploadSessionCreate(BaseModel):
    user_id: int
    upload_type: str  # "bulk" or "manual"
    transaction_count: int = 0
    most_recent_transaction_date: Optional[date] = None

class UploadSessionOut(BaseModel):
    id: int
    user_id: int
    upload_type: str
    transaction_count: int
    upload_date: datetime
    most_recent_transaction_date: Optional[date] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class UploadSessionUpdate(BaseModel):
    transaction_count: Optional[int] = None
    most_recent_transaction_date: Optional[date] = None

# --- Transactions ---
class TransactionCreate(BaseModel):
    type: str
    category: str
    store: str  # NOW MANDATORY
    amount: float
    description: Optional[str] = None
    transaction_date: date
    tag: Optional[str] = None  # NEW: Optional tag for grouping
    is_bulk_upload: bool = False
    upload_session_id: Optional[int] = None
    user_id: int

class TransactionOut(BaseModel):
    id: int
    type: str
    category: str
    store: str
    amount: float
    description: Optional[str] = None
    transaction_date: date
    tag: Optional[str] = None
    is_bulk_upload: bool
    upload_session_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_id: int

    model_config = {"from_attributes": True}

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    store: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None
    tag: Optional[str] = None

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
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}