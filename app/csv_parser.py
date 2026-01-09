"""
CSV Parser utility for different bank formats.
Supports: SoFi Savings, SoFi Checking, Capital One, and Generic CSV with column mapping

All categorization logic is in constants.py - this file only handles parsing.

IMPORTANT: Even when store and category columns are mapped from the CSV, 
they ALWAYS go through cleanup and business rules from constants.py.
"""

import csv
from io import StringIO
from datetime import datetime
from typing import List, Tuple, Dict, Optional
from .constants import normalize_store, suggest_category, normalize_category


def backup_categorize(store: str, description: str, transaction_type: str) -> str:
    """
    Backup categorization when constants.py doesn't return a category.
    Uses keyword matching to provide intelligent defaults.
    
    Args:
        store: Store name
        description: Transaction description
        transaction_type: Income or expense type
    
    Returns: Category name
    """
    text = f"{store} {description}".lower()
    
    # Income categories
    if "salary" in text or "payroll" in text or "direct deposit" in text:
        return "Salary"
    if "interest" in text:
        return "Interest"
    if "refund" in text or "reimbursement" in text:
        return "Refund"
    if "transfer" in text and transaction_type == "income":
        return "Transfer"
    
    # Expense categories - Dining
    dining_keywords = ["restaurant", "cafe", "coffee", "starbucks", "mcdonald", "burger", 
                      "pizza", "taco", "chipotle", "chick-fil", "culver", "wendy", 
                      "subway", "panera", "buffalo wild", "applebee", "olive garden",
                      "bar", "pub", "grill", "tavern", "brewery", "doordash", "grubhub", 
                      "uber eats", "dining"]
    if any(kw in text for kw in dining_keywords):
        return "Dining"
    
    # Groceries
    grocery_keywords = ["grocery", "hy-vee", "trader joe", "whole foods", "aldi", 
                       "kroger", "target", "costco", "walmart", "supermarket", "food"]
    if any(kw in text for kw in grocery_keywords):
        return "Groceries"
    
    # Gas & Auto
    gas_keywords = ["gas", "fuel", "shell", "exxon", "mobil", "chevron", "bp",
                   "marathon", "speedway", "kwik trip", "holiday"]
    if any(kw in text for kw in gas_keywords):
        return "Gas"
    
    # Shopping
    shopping_keywords = ["amazon", "ebay", "etsy", "store", "shop", "retail",
                        "mall", "clothing", "apparel"]
    if any(kw in text for kw in shopping_keywords):
        return "Shopping"
    
    # Subscriptions
    subscription_keywords = ["netflix", "spotify", "hulu", "disney", "hbo",
                           "subscription", "prime", "youtube", "internet", "phone bill"]
    if any(kw in text for kw in subscription_keywords):
        return "Subscriptions"
    
    # Utilities
    utility_keywords = ["electric", "water", "gas bill", "utility", "power", "energy"]
    if any(kw in text for kw in utility_keywords):
        return "Utilities"
    
    # Rent/Mortgage
    if "rent" in text or "lease" in text or "mortgage" in text:
        return "Rent"
    
    # Health & Fitness
    health_keywords = ["gym", "fitness", "doctor", "hospital", "pharmacy", "medical",
                      "dental", "health", "clinic"]
    if any(kw in text for kw in health_keywords):
        return "Health & Fitness"
    
    # Entertainment
    entertainment_keywords = ["movie", "cinema", "theater", "concert", "ticket",
                             "game", "entertainment"]
    if any(kw in text for kw in entertainment_keywords):
        return "Entertainment"
    
    # Travel
    travel_keywords = ["airline", "hotel", "airbnb", "uber", "lyft", "taxi",
                      "rental car", "flight", "travel"]
    if any(kw in text for kw in travel_keywords):
        return "Travel"
    
    # Education
    if "school" in text or "education" in text or "tuition" in text or "university" in text:
        return "Education"
    
    # Credit Card Payment
    if "credit card" in text or "payment" in text:
        return "Credit Card Payment"
    
    # Loan Payment
    if "loan" in text:
        return "Loan Payment"
    
    # ATM/Cash
    if "atm" in text or "cash" in text or "withdrawal" in text:
        return "ATM/Cash"
    
    # Default to "Other" or "Other Income"
    return "Other"


def parse_date(date_str: str) -> datetime:
    """Parse date string in multiple formats"""
    # Try common date formats
    for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y", "%d/%m/%y"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unable to parse date: {date_str}")


def parse_sofi_csv(content: str, account_type: str = "savings") -> List[dict]:
    """
    Parse SoFi CSV format (both Savings and Checking).
    Format: Date, Description, Type, Amount, Current balance, Status
    
    Returns transactions with:
    - store: normalized from Description column
    - description: empty (user can fill in later)
    - category: auto-categorized using constants.py
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
            
            # Handle sign: positive = income, negative = expense
            if amount < 0:
                income_expense_type = "expense"
                amount = abs(amount)
            else:
                income_expense_type = "income"
            
            # Normalize store name using constants.py
            store = normalize_store(original_description)
            
            # Auto-categorize using constants.py
            suggested_category = suggest_category(store, original_description, trans_type)
            
            # Normalize the suggested category
            suggested_category = normalize_category(suggested_category)
            
            # FAILSAFE: If still no category, use backup categorization
            if not suggested_category or suggested_category == "":
                suggested_category = backup_categorize(store, original_description, income_expense_type)
            
            # Final fallback to Other/Other Income
            if not suggested_category or suggested_category == "":
                suggested_category = "Other Income" if income_expense_type == "income" else "Other"
            
            transactions.append({
                "date": parse_date(date_str),
                "store": store,
                "description": "",  # Leave blank by default
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
    
    Returns transactions with:
    - store: normalized from Description column
    - description: empty (user can fill in later)
    - category: auto-categorized using constants.py
    """
    transactions = []
    reader = csv.DictReader(StringIO(content))
    
    for row in reader:
        try:
            date_str = row.get("Transaction Date", "").strip()
            original_description = row.get("Description", "").strip()
            debit_str = row.get("Debit", "").strip()
            credit_str = row.get("Credit", "").strip()
            original_category = row.get("Category", "").strip()
            
            # Determine amount and type based on debit/credit columns
            if debit_str and debit_str != "":
                amount = float(debit_str.replace(",", "").replace("$", ""))
                income_expense_type = "expense"  # Debits are always expenses
            elif credit_str and credit_str != "":
                amount = float(credit_str.replace(",", "").replace("$", ""))
                income_expense_type = "income"  # Credits are always income (payments, refunds)
            else:
                continue  # Skip rows with no amount
            
            # Normalize store name using constants.py
            store = normalize_store(original_description)
            
            # Skip autopay payments
            if "autopay" in original_description.lower() or "capital one autopay pymt" in original_description.lower():
                continue
            
            # Auto-categorize using constants.py (ignore Capital One's category)
            suggested_category = suggest_category(store, original_description, original_category)
            
            # Normalize the suggested category
            suggested_category = normalize_category(suggested_category)
            
            # FAILSAFE: If still no category, use backup categorization
            if not suggested_category or suggested_category == "":
                suggested_category = backup_categorize(store, original_description, income_expense_type)
            
            # Final fallback to Other/Other Income
            if not suggested_category or suggested_category == "":
                suggested_category = "Other Income" if income_expense_type == "income" else "Other"
            
            transactions.append({
                "date": parse_date(date_str),
                "store": store,
                "description": "",  # Leave blank by default
                "original_type": original_category,
                "amount": amount,
                "type": income_expense_type,
                "suggested_category": suggested_category,
            })
        except Exception as e:
            print(f"Error parsing row: {row}, Error: {e}")
            continue
    
    return transactions


def parse_generic_csv(content: str, column_mapping: Dict[str, Optional[str]]) -> List[dict]:
    """
    Parse a generic CSV with custom column mappings.
    
    IMPORTANT: Even when store/category columns are mapped, they ALWAYS go through
    cleanup and auto-categorization from constants.py business rules.
    
    Args:
        content: CSV file content as string
        column_mapping: Dict with keys:
            - date_column: Required
            - amount_column: Optional (for single amount column)
            - debit_column: Optional (for two-column format)
            - credit_column: Optional (for two-column format)
            - store_column: Optional (used as input for normalization)
            - category_column: Optional (IGNORED - always auto-categorized)
            - description_column: Optional
            - use_two_columns: Boolean
    
    Returns: List of transaction dicts
    """
    transactions = []
    reader = csv.DictReader(StringIO(content))
    
    date_col = column_mapping.get("date_column")
    amount_col = column_mapping.get("amount_column")
    debit_col = column_mapping.get("debit_column")
    credit_col = column_mapping.get("credit_column")
    store_col = column_mapping.get("store_column")
    category_col = column_mapping.get("category_column")  # NOTE: This is ignored, we always auto-categorize
    description_col = column_mapping.get("description_column")
    use_two_cols = column_mapping.get("use_two_columns", False)
    
    if not date_col:
        raise ValueError("Date column is required")
    
    for row in reader:
        try:
            # Parse date
            date_str = row.get(date_col, "").strip()
            if not date_str:
                continue
            trans_date = parse_date(date_str)
            
            # Parse amount and determine type
            if use_two_cols:
                # Two column format (debit/credit)
                debit_str = row.get(debit_col, "").strip() if debit_col else ""
                credit_str = row.get(credit_col, "").strip() if credit_col else ""
                
                if debit_str and debit_str != "":
                    amount = float(debit_str.replace(",", "").replace("$", ""))
                    income_expense_type = "expense"
                elif credit_str and credit_str != "":
                    amount = float(credit_str.replace(",", "").replace("$", ""))
                    income_expense_type = "income"
                else:
                    continue  # Skip rows with no amount
            else:
                # Single column format
                if not amount_col:
                    raise ValueError("Amount column is required for single-column format")
                amount_str = row.get(amount_col, "").strip()
                if not amount_str:
                    continue
                
                # Parse amount and handle negative values
                amount = float(amount_str.replace(",", "").replace("$", ""))
                if amount < 0:
                    income_expense_type = "expense"
                    amount = abs(amount)
                else:
                    income_expense_type = "income"
            
            # Get raw store value from mapped column (or use description as fallback)
            raw_store = ""
            if store_col and store_col in row:
                raw_store = row.get(store_col, "").strip()
            
            # Get description (optional)
            raw_description = ""
            if description_col and description_col in row:
                raw_description = row.get(description_col, "").strip()
            
            # Use description for store if store not mapped
            if not raw_store and raw_description:
                raw_store = raw_description
            elif not raw_store:
                raw_store = "Unknown Store"
            
            # CRITICAL: ALWAYS normalize store through constants.py
            # This applies cleanup rules even if store was mapped from CSV
            store = normalize_store(raw_store)
            
            # CRITICAL: ALWAYS auto-categorize through constants.py business rules
            # We IGNORE any category column mapping - business rules always apply
            suggested_category = suggest_category(store, raw_description, "")
            
            # Normalize the category
            suggested_category = normalize_category(suggested_category)
            
            # FAILSAFE: If still no category, use backup categorization
            if not suggested_category or suggested_category == "":
                suggested_category = backup_categorize(store, raw_description, income_expense_type)
            
            # Final fallback to Other/Other Income
            if not suggested_category or suggested_category == "":
                suggested_category = "Other Income" if income_expense_type == "income" else "Other"
            
            transactions.append({
                "date": trans_date,
                "store": store,
                "description": raw_description if description_col else "",
                "original_type": "",  # No original type for generic CSVs
                "amount": amount,
                "type": income_expense_type,
                "suggested_category": suggested_category,
            })
        except Exception as e:
            print(f"Error parsing row: {row}, Error: {e}")
            continue
    
    return transactions


def get_csv_preview(content: str, max_rows: int = 5) -> Tuple[List[str], List[Dict[str, str]]]:
    """
    Preview CSV file - return column headers and first few rows.
    
    Args:
        content: CSV file content as string
        max_rows: Maximum number of sample rows to return
    
    Returns: (column_headers, sample_rows)
    """
    reader = csv.DictReader(StringIO(content))
    columns = reader.fieldnames or []
    
    sample_rows = []
    for i, row in enumerate(reader):
        if i >= max_rows:
            break
        sample_rows.append(row)
    
    return columns, sample_rows


def detect_bank_type(content: str) -> str:
    """
    Auto-detect the bank type based on CSV headers.
    """
    first_line = content.split("\n")[0].lower()
    
    if "card no." in first_line or ("debit" in first_line and "credit" in first_line):
        return "capital_one"
    elif "current balance" in first_line and "status" in first_line:
        return "sofi"
    else:
        return "unknown"


def parse_csv(content: str, bank_type: str = None, column_mapping: Optional[Dict] = None) -> Tuple[str, List[dict]]:
    """
    Main entry point for parsing CSV.
    Auto-detects bank type if not specified, or uses custom column mapping.
    
    Args:
        content: CSV file content
        bank_type: 'auto', 'sofi', 'capital_one', or 'generic'
        column_mapping: Optional dict with column mappings for generic parsing
    
    Returns: (detected_bank_type, list of parsed transactions)
    """
    # If column mapping provided, use generic parser
    if column_mapping:
        transactions = parse_generic_csv(content, column_mapping)
        return "generic", transactions
    
    # Otherwise use bank-specific parsers
    if bank_type is None or bank_type == "auto":
        bank_type = detect_bank_type(content)
    
    if bank_type == "capital_one":
        transactions = parse_capital_one_csv(content)
    elif bank_type == "sofi" or bank_type == "sofi_savings" or bank_type == "sofi_checking":
        transactions = parse_sofi_csv(content, bank_type)
    elif bank_type == "unknown":
        raise ValueError("Unable to auto-detect bank type. Please use column mapping.")
    else:
        raise ValueError(f"Unknown or unsupported bank type: {bank_type}")
    
    return bank_type, transactions