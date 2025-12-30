from pydantic import BaseModel, field_validator
from typing import Optional, List
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

    model_config = {"from_attributes": True}

class LoginCredentials(BaseModel):
    email: str
    password: str

# --- Transactions ---
class TransactionCreate(BaseModel):
    type: str
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None
    transaction_date: date
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

# --- Account Definitions ---
class AccountDefinitionCreate(BaseModel):
    name: str
    category: str  # "liquid", "investments", "debt"
    user_id: int

class AccountDefinitionOut(BaseModel):
    id: int
    name: str
    category: str
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