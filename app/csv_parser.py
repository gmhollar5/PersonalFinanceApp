"""
CSV Parser for different bank transaction formats
Updated to normalize categories and stores to consistent format
"""

from io import StringIO
import csv
from datetime import datetime
from typing import List, Tuple

# Import normalization functions from constants
try:
    from .constants import (
        normalize_store,
        normalize_category, 
        suggest_category,
        get_automatic_tags
    )
    CONSTANTS_AVAILABLE = True
except ImportError:
    # Fallback if constants not available
    CONSTANTS_AVAILABLE = False
    print("Warning: constants.py not found, using basic normalization")

# =============================================================================
# FALLBACK FUNCTIONS (if constants.py not available)
# =============================================================================

if not CONSTANTS_AVAILABLE:
    def normalize_store(store: str) -> str:
        """Basic fallback store normalization"""
        if not store:
            return ""
        return store.strip().title()
    
    def suggest_category(store: str, description: str, transaction_type: str = "") -> str:
        """Basic fallback category suggestion"""
        return "Other Expense"
    
    def get_automatic_tags(store: str, category: str, amount: float, description: str = "") -> list:
        """Basic fallback tag generation"""
        return []

def categorize_sofi_transaction(trans_type: str, description: str) -> tuple:
    """
    Categorize SoFi transactions based on type and description.
    Returns (category, income_expense_type)
    """
    # Normalize store/description first
    store = normalize_store(description)
    
    # Use the smart categorization from constants
    suggested_category = suggest_category(store, description, trans_type)
    
    # Determine income vs expense
    trans_type_lower = trans_type.lower().strip()
    desc_lower = description.lower().strip()
    
    # Income indicators
    if any(word in trans_type_lower for word in ['deposit', 'credit', 'interest', 'payroll']):
        income_expense_type = "income"
    elif any(word in desc_lower for word in ['salary', 'payroll', 'interest']):
        income_expense_type = "income"
    # Expense indicators
    elif any(word in trans_type_lower for word in ['payment', 'purchase', 'debit', 'withdrawal']):
        income_expense_type = "expense"
    else:
        # Default based on category
        if suggested_category in ["Salary", "Interest", "Refund", "Gift", "Other Income"]:
            income_expense_type = "income"
        else:
            income_expense_type = "expense"
    
    return (suggested_category, income_expense_type)


def categorize_capital_one_transaction(description: str) -> tuple:
    """
    Categorize Capital One transactions based on description.
    Returns (category, income_expense_type)
    """
    # Normalize store/description first
    store = normalize_store(description)
    
    # Use the smart categorization from constants
    suggested_category = suggest_category(store, description, "")
    
    # Capital One transactions are typically expenses
    income_expense_type = "expense"
    
    return (suggested_category, income_expense_type)



def parse_date(date_str: str) -> str:
    """Parse and normalize date strings to YYYY-MM-DD format"""
    formats = [
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%Y/%m/%d"
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    raise ValueError(f"Unable to parse date: {date_str}")


# =============================================================================
# PARSER FUNCTIONS
# =============================================================================

def parse_sofi_csv(content: str) -> List[dict]:
    """
    Parse SoFi CSV format.
    Format: Date, Description, Type, Amount, Current balance, Status
    
    Returns transactions with normalized categories and stores
    """
    transactions = []
    reader = csv.DictReader(StringIO(content))
    
    for row in reader:
        try:
            date_str = row.get("Date", "").strip()
            original_description = row.get("Description", "").strip()
            trans_type = row.get("Type", "").strip()
            amount_str = row.get("Amount", "0").strip()
            status = row.get("Status", "").strip()
            
            # Skip pending transactions
            if status.lower() != "posted":
                continue
            
            # Parse amount
            amount = float(amount_str.replace(",", "").replace("$", ""))
            
            # Get category and type
            suggested_category, income_expense_type = categorize_sofi_transaction(trans_type, original_description)
            
            # Handle sign: positive = income, negative = expense
            if amount < 0:
                income_expense_type = "expense"
                amount = abs(amount)
            elif amount > 0 and income_expense_type == "expense":
                income_expense_type = "income"
            
            # Determine and normalize store
            store = normalize_store(original_description)
            if suggested_category == "Interest":
                store = "SoFi"
            
            transactions.append({
                "date": parse_date(date_str),
                "store": store,
                "description": "",
                "original_type": trans_type,
                "amount": amount,
                "type": income_expense_type,
                "suggested_category": suggested_category,
            })
        except Exception as e:
            print(f"Error parsing row: {row}, Error: {e}")
            continue
    
    return transactions


def parse_capital_one_csv(content: str) -> List[dict]:
    """
    Parse Capital One CSV format.
    Format: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
    
    Returns transactions with normalized categories and stores
    """
    transactions = []
    reader = csv.DictReader(StringIO(content))
    
    for row in reader:
        try:
            trans_date_str = row.get("Transaction Date", "").strip()
            description = row.get("Description", "").strip()
            debit_str = row.get("Debit", "").strip()
            credit_str = row.get("Credit", "").strip()
            original_category = row.get("Category", "").strip()  # Get original category from Capital One
            
            # Parse amounts
            debit = float(debit_str.replace(",", "").replace("$", "")) if debit_str else 0
            credit = float(credit_str.replace(",", "").replace("$", "")) if credit_str else 0
            
            # Determine type and amount
            if debit > 0:
                amount = debit
                income_expense_type = "expense"
                original_type = original_category or "Purchase"
            elif credit > 0:
                amount = credit
                income_expense_type = "income"
                original_type = original_category or "Payment"
            else:
                continue
            
            # Categorize
            suggested_category, _ = categorize_capital_one_transaction(description)
            
            # Normalize store
            store = normalize_store(description)
            
            transactions.append({
                "date": parse_date(trans_date_str),
                "store": store,
                "description": "",
                "original_type": original_type,  # ADDED: Include original type
                "amount": amount,
                "type": income_expense_type,
                "suggested_category": suggested_category,
            })
        except Exception as e:
            print(f"Error parsing row: {row}, Error: {e}")
            continue
    
    return transactions


def detect_csv_format(content: str) -> str:
    """
    Detect the CSV format based on headers.
    Returns 'sofi', 'capital_one', or 'unknown'
    """
    reader = csv.DictReader(StringIO(content))
    try:
        headers = [h.lower().strip() for h in reader.fieldnames]
    except:
        return "unknown"
    
    # Check for SoFi format
    if "date" in headers and "description" in headers and "type" in headers and "amount" in headers and "status" in headers:
        return "sofi"
    
    # Check for Capital One format
    if "transaction date" in headers and "description" in headers and "debit" in headers and "credit" in headers:
        return "capital_one"
    
    return "unknown"


def parse_csv(content: str, bank_type: str = "auto") -> Tuple[str, List[dict]]:
    """
    Main parser function that detects format and parses accordingly.
    
    Args:
        content: CSV file content as string
        bank_type: "auto", "sofi", or "capital_one"
    
    Returns: (detected_bank_type, list of parsed transactions)
    """
    # If bank type is specified, use it; otherwise auto-detect
    if bank_type == "auto":
        csv_format = detect_csv_format(content)
    elif bank_type == "sofi":
        csv_format = "sofi"
    elif bank_type == "capital_one":
        csv_format = "capital_one"
    else:
        csv_format = detect_csv_format(content)
    
    if csv_format == "unknown":
        raise ValueError("Unrecognized CSV format. Please use SoFi or Capital One format.")
    
    try:
        if csv_format == "sofi":
            transactions = parse_sofi_csv(content)
        elif csv_format == "capital_one":
            transactions = parse_capital_one_csv(content)
        else:
            transactions = []
        
        return csv_format, transactions
        
    except Exception as e:
        raise ValueError(f"Error parsing CSV: {str(e)}")