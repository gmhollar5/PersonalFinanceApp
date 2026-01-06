from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, date
from typing import List, Optional

# --- User Schemas ---
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    
    @field_validator('password')
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class LoginCredentials(BaseModel):
    """Schema for user login"""
    email: str
    password: str

class UserLogin(BaseModel):
    """Alternative login schema (if needed)"""
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}

# --- Upload Session Schemas ---
class UploadSessionCreate(BaseModel):
    user_id: int
    upload_type: str
    transaction_count: int = 0
    min_transaction_date: Optional[date] = None
    max_transaction_date: Optional[date] = None

class UploadSessionUpdate(BaseModel):
    transaction_count: Optional[int] = None
    min_transaction_date: Optional[date] = None
    max_transaction_date: Optional[date] = None

class UploadSessionOut(BaseModel):
    id: int
    user_id: int
    upload_type: str
    upload_date: datetime
    transaction_count: int
    min_transaction_date: Optional[date]
    max_transaction_date: Optional[date]

    model_config = {"from_attributes": True}

# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    type: str
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None
    tag: Optional[str] = None
    transaction_date: date
    is_bulk_upload: bool = False
    upload_session_id: Optional[int] = None
    user_id: int

class TransactionOut(BaseModel):
    id: int
    type: str
    category: str
    store: Optional[str]
    amount: float
    description: Optional[str]
    tag: Optional[str]
    transaction_date: date
    created_at: datetime
    is_bulk_upload: bool
    upload_session_id: Optional[int]
    user_id: int

    model_config = {"from_attributes": True}

class TransactionBulkItem(BaseModel):
    type: str
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None
    tag: Optional[str] = None
    transaction_date: str
    is_bulk_upload: bool = True
    upload_session_id: Optional[int] = None

class TransactionBulkCreate(BaseModel):
    user_id: int
    transactions: List[TransactionBulkItem]

# --- Account Definitions ---
class AccountDefinitionCreate(BaseModel):
    name: str
    category: str
    user_id: int

class AccountDefinitionUpdate(BaseModel):
    """Schema for updating account definition (e.g., closing account)"""
    is_active: Optional[bool] = None

class AccountDefinitionOut(BaseModel):
    id: int
    name: str
    category: str
    is_active: bool
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Account Records ---
class AccountRecordCreate(BaseModel):
    account_definition_id: int
    balance: float
    record_date: date
    user_id: int

class AccountRecordOut(BaseModel):
    id: int
    account_definition_id: int
    balance: float
    record_date: date
    created_at: datetime

    model_config = {"from_attributes": True}

class AccountRecordWithName(BaseModel):
    """Account record with account name included"""
    id: int
    account_definition_id: int
    account_name: str
    category: str
    balance: float
    record_date: date
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Bulk Account Record Creation ---
class BulkAccountRecordItem(BaseModel):
    account_definition_id: int
    balance: float

class BulkAccountRecordCreate(BaseModel):
    """Create records for all accounts on a specific date"""
    record_date: date
    user_id: int
    records: List[BulkAccountRecordItem]