from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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

    model_config = {"from_attributes": True}  # Pydantic v2 replacement for orm_mode

# --- Transactions ---
class TransactionCreate(BaseModel):
    type: str
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None
    user_id: int

class TransactionOut(BaseModel):
    id: int
    type: str
    category: str
    store: Optional[str] = None
    amount: float
    description: Optional[str] = None
    date: datetime

    model_config = {"from_attributes": True}