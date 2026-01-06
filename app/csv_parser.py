"""
CSV Parser utility for different bank formats.
Supports: SoFi Savings, SoFi Checking, Capital One
"""

import csv
from io import StringIO
from datetime import datetime
from typing import List, Tuple


def parse_date(date_str: str) -> datetime:
    """Parse date string in YYYY-MM-DD format"""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def categorize_sofi_transaction(transaction_type: str, description: str) -> Tuple[str, str]:
    """
    Categorize SoFi transaction and determine income/expense type.
    Returns: (suggested_category, type)
    """
    transaction_type_lower = transaction_type.lower()
    description_lower = description.lower()
    
    # Income types
    if "deposit" in transaction_type_lower or "direct deposit" in transaction_type_lower:
        if "northern tool" in description_lower:
            return "Salary", "income"
        elif "venmo" in description_lower:
            return "Transfer", "income"
        elif "square" in description_lower:
            return "Side Income", "income"
        elif "interest" in transaction_type_lower:
            return "Interest", "income"
        elif "check deposit" in transaction_type_lower:
            return "Other Income", "income"
        elif "tpg products" in description_lower or "mn dept" in description_lower:
            return "Tax Refund", "income"
        return "Other Income", "income"
    
    if "interest earned" in transaction_type_lower:
        return "Interest", "income"
    
    # Expense types - Direct Payment
    if "direct payment" in transaction_type_lower or "withdrawal" in transaction_type_lower:
        if "capital one" in description_lower:
            return "Credit Card Payment", "expense"
        elif "discover" in description_lower:
            return "Credit Card Payment", "expense"
        elif "xcel" in description_lower:
            return "Utilities", "expense"
        elif "cpenergy" in description_lower:
            return "Utilities", "expense"
        elif "whitecap" in description_lower or "apts" in description_lower:
            return "Rent", "expense"
        elif "southpoint" in description_lower:
            return "Loan Payment", "expense"
        elif "planet fit" in description_lower:
            return "Health & Fitness", "expense"
        elif "ndsu" in description_lower or "und" in description_lower:
            return "Education", "expense"
        elif "venmo" in description_lower:
            return "Transfer", "expense"
        elif "kohl" in description_lower:
            return "Shopping", "expense"
        elif "driver services" in description_lower:
            return "Fees", "expense"
        elif "savings" in description_lower or "checking" in description_lower:
            return "Internal Transfer", "expense"
        return "Other", "expense"
    
    # Debit card transactions
    if "debit card" in transaction_type_lower:
        if "costco gas" in description_lower or "gas" in description_lower:
            return "Gas", "expense"
        elif "walgreens" in description_lower:
            return "ATM/Cash", "expense"
        return "Shopping", "expense"
    
    # ATM
    if "atm" in transaction_type_lower:
        return "ATM/Cash", "expense"
    
    return "Other", "expense"


def categorize_capital_one_transaction(description: str) -> Tuple[str, str]:
    """
    Categorize Capital One transaction based on description.
    Returns: (suggested_category, type)
    
    Note: We ignore the built-in Category column and categorize based on description
    to maintain consistency with SoFi categorization.
    """
    description_lower = description.lower() if description else ""
    
    # Payment/Credit - these are income (payments made to the card)
    if "autopay" in description_lower or "payment" in description_lower:
        return "Payment/Credit", "income"
    
    # Dining
    dining_keywords = ["restaurant", "dining", "grill", "cafe", "coffee", "starbucks", 
                       "mcdonald", "burger", "pizza", "taco", "chipotle", "chick-fil-a",
                       "culver", "wendy", "subway", "panera", "buffalo wild", "applebee",
                       "olive garden", "red lobster", "outback", "texas roadhouse",
                       "bar", "pub", "taphouse", "tavern", "brewery", "winery",
                       "doordash", "grubhub", "uber eats", "postmates",
                       "parian", "india palace", "quarry", "block", "bunny", "nico",
                       "o'donovan", "wild boar", "el nuevo", "canes", "spitz", "poke"]
    if any(kw in description_lower for kw in dining_keywords):
        return "Dining", "expense"
    
    # Groceries
    grocery_keywords = ["grocery", "groceries", "hy-vee", "hyvee", "trader joe", 
                        "whole foods", "aldi", "kroger", "safeway", "publix", 
                        "target", "costco", "walmart", "wal-mart"]
    if any(kw in description_lower for kw in grocery_keywords):
        return "Groceries", "expense"
    
    # Gas/Automotive
    gas_keywords = ["gas", "fuel", "shell", "exxon", "mobil", "chevron", "bp", 
                    "marathon", "speedway", "kwik trip", "holiday station", "costco gas",
                    "arco", "valero", "phillips 66", "circle k"]
    if any(kw in description_lower for kw in gas_keywords):
        return "Gas", "expense"
    
    # Subscriptions/Streaming
    subscription_keywords = ["netflix", "spotify", "hulu", "disney+", "hbo", "apple.com/bill",
                            "amazon prime", "youtube", "paramount", "peacock", 
                            "audible", "kindle", "adobe", "microsoft", "google storage",
                            "quantum fiber", "comcast", "xfinity", "at&t", "verizon", "t-mobile"]
    if any(kw in description_lower for kw in subscription_keywords):
        return "Subscriptions", "expense"
    
    # Shopping - Online
    online_shopping_keywords = ["amazon", "ebay", "etsy", "wayfair", "overstock",
                                "zappos", "6pm", "asos", "shein", "wish.com",
                                "gymshark", "hey dude", "buckle", "sierra", "atolea",
                                "freefly", "beard club", "patina"]
    if any(kw in description_lower for kw in online_shopping_keywords):
        return "Shopping", "expense"
    
    # Entertainment
    entertainment_keywords = ["movie", "cinema", "amc", "regal", "theater", "theatre",
                             "concert", "ticketmaster", "livenation", "stubhub",
                             "apple music", "pandora", "game", "steam",
                             "playstation", "xbox", "nintendo", "arcade", "bowling",
                             "golf", "ski", "museum", "zoo", "aquarium", "park"]
    if any(kw in description_lower for kw in entertainment_keywords):
        return "Entertainment", "expense"
    
    # Health & Fitness
    health_keywords = ["pharmacy", "doctor", "medical", "hospital", "clinic", 
                       "dental", "dentist", "vision", "eye", "gym", "fitness", 
                       "planet fit", "la fitness", "anytime fitness", "orangetheory", 
                       "crossfit", "yoga", "peloton", "jello", "gnc"]
    if any(kw in description_lower for kw in health_keywords):
        return "Health & Fitness", "expense"
    
    # Travel
    travel_keywords = ["airline", "delta", "united", "american air", "southwest",
                       "frontier", "spirit", "jetblue", "hotel", "marriott", "hilton",
                       "hyatt", "airbnb", "vrbo", "expedia", "booking.com", "kayak",
                       "uber", "lyft", "taxi", "rental car", "hertz", "enterprise", "avis"]
    if any(kw in description_lower for kw in travel_keywords):
        return "Travel", "expense"
    
    # Services
    service_keywords = ["service", "repair", "maintenance", "cleaning", "laundry",
                        "dry clean", "salon", "barber", "spa", "nail", "haircut",
                        "csc servicework"]
    if any(kw in description_lower for kw in service_keywords):
        return "Services", "expense"
    
    # Default to Other for unknown expenses
    return "Other", "expense"


def parse_sofi_csv(content: str, account_type: str = "savings") -> List[dict]:
    """
    Parse SoFi CSV format (both Savings and Checking).
    Format: Date, Description, Type, Amount, Current balance, Status
    
    Returns transactions with:
    - store: from Description column
    - description: empty (user can fill in later)
    - category: auto-categorized
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
                # Override if we miscategorized
                income_expense_type = "income"
            
            # Determine store - use description for most, None for certain categories
            store = original_description
            if suggested_category in ["Interest"]:
                store = "SoFi"
            
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
    
    Note: We ignore the built-in Category column and auto-categorize based on description.
    
    Returns transactions with:
    - store: from Description column
    - description: empty (user can fill in later)
    - category: auto-categorized based on description
    """
    transactions = []
    reader = csv.DictReader(StringIO(content))
    
    for row in reader:
        try:
            date_str = row.get("Transaction Date", "").strip()
            original_description = row.get("Description", "").strip()
            debit_str = row.get("Debit", "").strip()
            credit_str = row.get("Credit", "").strip()
            
            # Determine amount and type based on debit/credit columns
            if debit_str and debit_str != "":
                amount = float(debit_str.replace(",", "").replace("$", ""))
                # Auto-categorize based on description
                suggested_category, _ = categorize_capital_one_transaction(original_description)
                income_expense_type = "expense"  # Debits are always expenses
            elif credit_str and credit_str != "":
                amount = float(credit_str.replace(",", "").replace("$", ""))
                suggested_category, _ = categorize_capital_one_transaction(original_description)
                income_expense_type = "income"  # Credits are always income (payments, refunds)
            else:
                continue  # Skip rows with no amount
            
            # Determine store - use description, skip autopay payments
            store = original_description
            if suggested_category == "Payment/Credit" and "CAPITAL ONE AUTOPAY PYMT" in original_description:
                continue
            
            transactions.append({
                "date": parse_date(date_str),
                "store": store,
                "description": "",  # Leave blank by default
                "original_type": row.get("Category", "").strip(),  # Keep original for reference
                "amount": amount,
                "type": income_expense_type,
                "suggested_category": suggested_category,
            })
        except Exception as e:
            print(f"Error parsing row: {row}, Error: {e}")
            continue
    
    return transactions


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


def parse_csv(content: str, bank_type: str = None) -> Tuple[str, List[dict]]:
    """
    Main entry point for parsing CSV.
    Auto-detects bank type if not specified.
    Returns: (detected_bank_type, list of parsed transactions)
    """
    if bank_type is None or bank_type == "auto":
        bank_type = detect_bank_type(content)
    
    if bank_type == "capital_one":
        transactions = parse_capital_one_csv(content)
    elif bank_type == "sofi" or bank_type == "sofi_savings" or bank_type == "sofi_checking":
        transactions = parse_sofi_csv(content, bank_type)
    else:
        raise ValueError(f"Unknown or unsupported bank type: {bank_type}")
    
    return bank_type, transactions