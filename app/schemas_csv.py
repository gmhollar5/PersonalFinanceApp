from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict
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


class CSVPreviewResponse(BaseModel):
    """Response for CSV preview - returns column headers and sample rows"""
    success: bool
    message: str
    columns: List[str]
    sample_rows: List[Dict[str, str]]  # First 5 rows as dicts


class ColumnMapping(BaseModel):
    """Column mapping configuration"""
    date_column: str
    amount_column: Optional[str] = None  # For single amount column
    debit_column: Optional[str] = None   # For two-column format
    credit_column: Optional[str] = None  # For two-column format
    store_column: Optional[str] = None
    category_column: Optional[str] = None
    description_column: Optional[str] = None
    use_two_columns: bool = False  # True if debit/credit columns, False if single amount


class CSVParseWithMappingRequest(BaseModel):
    """Request to parse CSV with custom column mapping"""
    column_mapping: ColumnMapping


class CSVUploadResponse(BaseModel):
    """Response from CSV upload endpoint"""
    success: bool
    message: str
    bank_type: str
    transaction_count: int
    transactions: List[ParsedTransaction]


class BulkTransactionCreate(BaseModel):
    """Schema for creating multiple transactions at once"""
    transactions: List[dict]  # Each dict has: type, category, store, amount, description, transaction_date, tag
    user_id: int