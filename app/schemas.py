from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

# --- Users ---
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str

class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}

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