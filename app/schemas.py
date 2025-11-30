from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# User schemas
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str

    class Config:
        from_attributes = True

# Transaction schemas
class TransactionCreate(BaseModel):
    type: str  # "income" or "expense"
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None

class Transaction(BaseModel):
    id: int
    type: str
    category: str
    store: Optional[str]
    amount: float
    description: Optional[str]
    date: datetime
    user_id: int

    class Config:
        from_attributes = True