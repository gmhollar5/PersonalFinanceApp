from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date

class ParsedTransaction(BaseModel):
    """A single parsed transaction from CSV"""
    date: date
    description: str = ""
    original_type: str  # Original type from CSV (e.g., "Direct Payment", "Dining")
    amount: float  # Always positive
    type: str  # "income" or "expense"
    suggested_category: Optional[str] = None
    store: Optional[str] = None

    @field_validator("description", mode="before")
    def none_to_empty(cls, v):
        return v or ""
    
class CSVUploadResponse(BaseModel):
    """Response from CSV upload endpoint"""
    success: bool
    message: str
    bank_type: str
    transaction_count: int
    transactions: List[ParsedTransaction]
    
class BulkTransactionCreate(BaseModel):
    """Schema for creating multiple transactions at once"""
    transactions: List[dict]  # Each dict has: type, category, store, amount, description, transaction_date
    user_id: int