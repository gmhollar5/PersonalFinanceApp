"""
Constants and utilities for transaction categories, types, and formatting

=============================================================================
CUSTOMIZATION GUIDE - READ THIS FIRST!
=============================================================================

This file contains all the rules and logic for:
1. 📦 Store Name Normalization (lines 50-200)
2. 🏷️ Category Auto-Assignment (lines 250-350)
3. 🔖 Automatic Tags (lines 400-450)
4. 💡 Smart Tag Suggestions (lines 500-550)

Each section has clear instructions on how to add your own rules!

=============================================================================
"""

CATEGORY_MAPPING = {
    # Income variations
    "other income": "Other Income",
    "side hustle": "Other Income",
    "tax refund": "Other Income",
    "paycheck": "Salary",
    "wage": "Salary",
    "payment/credit": "Other Income",  # Credit card payments treated as income
    
    # Expense variations
    "dining out": "Dining",  # ← FIX for your issue!
    "restaurants": "Dining",
    "food": "Groceries",
    "grocery": "Groceries",
    "gas & auto": "Gas & Auto",
    "automotive": "Gas & Auto",
    "fuel": "Gas & Auto",
    "online shopping": "Shopping",
    "retail": "Shopping",
    "streaming": "Subscriptions",
    "internet": "Subscriptions",
    "cable": "Subscriptions",
    "utility": "Utilities",
    "utilities": "Utilities",
    "electric": "Utilities",
    "water": "Utilities",
    "mortgage": "Rent",
    "lease": "Rent",
    "health": "Health & Fitness",
    "fitness": "Health & Fitness",
    "gym": "Health & Fitness",
    "medical": "Health & Fitness",
    "movies": "Entertainment",
    "concert": "Entertainment",
    "flight": "Travel",
    "hotel": "Travel",
    "school": "Education",
    "tuition": "Education",
    "credit card": "Credit Card Payment",
    "cc payment": "Credit Card Payment",
    "loan": "Loan Payment",
    "student loan": "Student Loan",
    "car": "Car Payment",
    "auto loan": "Car Payment",
    "mobile": "Phone",
    "cell phone": "Phone",
    "home": "Household",
    "furniture": "Household",
    "gift": "Gifts",
    "present": "Gifts",
    "other expense": "Other",
    "miscellaneous": "Other",
    "misc": "Other",
    "fun money": "Entertainment",
    "golf": "Entertainment",
    "grad school": "Education",
    "home & hygiene": "Household",
    "netflix": "Subscriptions",
    "spotify": "Subscriptions",
    "phone storage": "Subscriptions",
    "other expense": "Other Expense",
    "other income": "Other Income"
}


# =============================================================================
# EXPENSE CATEGORIES (in Title Case for consistency)
# =============================================================================
EXPENSE_CATEGORIES = [
    "Dining",
    "Entertainment",    # Includes bars, alcohol, golf, hobbies, etc
    "Gas & Auto",
    "Gifts",
    "Education",   # Includes grad school, courses, books
    "Groceries",
    "Health & Fitness", # medical, gym, etc
    "Household",   # Home supplies, hygiene, cleaning
    "Subscriptions",  # Netflix, Spotify, apps, etc.
    "Phone",
    "Rent",
    "Shopping",
    "Student Loan",
    "Travel",
    "Car Payment",
    "Utilities",
    "Other Expense"
]

# =============================================================================
# INCOME CATEGORIES (in Title Case for consistency)
# =============================================================================
INCOME_CATEGORIES = [
    "Salary",
    "Interest",
    "Refund",
    "Gift",
    "Other Income"
]

# =============================================================================
# ALL CATEGORIES COMBINED
# =============================================================================
ALL_CATEGORIES = sorted(EXPENSE_CATEGORIES + INCOME_CATEGORIES)


# =============================================================================
# 📦 STORE NAME NORMALIZATION RULES
# =============================================================================
# HOW TO ADD YOUR OWN STORE RULES:
# 
# 1. Add patterns to STORE_PATTERNS (lines 75-150)
#    - Use lowercase for matching
#    - The key is what you're looking for in the store name
#    - The value is the clean name you want to see
#
# 2. Add exact mappings to STORE_EXACT_MATCH (lines 155-180)
#    - For exact matches only (case-insensitive)
#
# 3. Store names will automatically remove:
#    - Numbers at the end (e.g., "Target 00002204" → "Target")
#    - Common suffixes like "Inc", "LLC", "Corp"
#    - Extra spaces and special characters
# =============================================================================

# Pattern-based matching (checks if pattern is IN the store name)
STORE_PATTERNS = {
    # Groceries & Retail
    "target": "Target",
    "walmart": "Walmart",
    "wlmt": "Walmart",
    "wmt": "Walmart",
    "costco": "Costco",
    "sam's club": "Sam's Club",
    "sams club": "Sam's Club",
    "whole foods": "Whole Foods",
    "trader joe": "Trader Joe's",
    "aldi": "Aldi",
    "kroger": "Kroger",
    "publix": "Publix",
    "safeway": "Safeway",
    
    # Online Shopping
    "amazon": "Amazon",
    "amzn": "Amazon",
    "ebay": "eBay",
    "etsy": "Etsy",
    
    # Dining - Fast Food
    "mcdonald": "McDonald's",
    "mcdonalds": "McDonald's",
    "burger king": "Burger King",
    "wendy": "Wendy's",
    "taco bell": "Taco Bell",
    "chipotle": "Chipotle",
    "subway": "Subway",
    "panera": "Panera Bread",
    "chick-fil-a": "Chick-fil-A",
    "chick fil a": "Chick-fil-A",
    "kfc": "KFC",
    "popeyes": "Popeyes",
    
    # Dining - Fast Casual & Restaurants
    "starbucks": "Starbucks",
    "dunkin": "Dunkin'",
    "panda express": "Panda Express",
    "olive garden": "Olive Garden",
    "applebee": "Applebee's",
    "red lobster": "Red Lobster",
    "buffalo wild": "Buffalo Wild Wings",
    
    # Gas Stations
    "shell": "Shell",
    "chevron": "Chevron",
    "exxon": "Exxon",
    "mobil": "Mobil",
    "bp": "BP",
    "texaco": "Texaco",
    "circle k": "Circle K",
    "7-eleven": "7-Eleven",
    "7 eleven": "7-Eleven",
    "costco gas": "Costco Gas",
    
    # Subscriptions & Services
    "netflix": "Netflix",
    "spotify": "Spotify",
    "hulu": "Hulu",
    "disney": "Disney+",
    "apple.com/bill": "Apple",
    "apple music": "Apple Music",
    "icloud": "iCloud",
    "dropbox": "Dropbox",
    "google storage": "Google One",
    
    # Transportation
    "uber": "Uber",
    "lyft": "Lyft",
    "uber eats": "Uber Eats",
    "doordash": "DoorDash",
    "grubhub": "GrubHub",
    
    # Phone/Internet/Utilities
    "verizon": "Verizon",
    "at&t": "AT&T",
    "t-mobile": "T-Mobile",
    "sprint": "Sprint",
    "xfinity": "Xfinity",
    "comcast": "Comcast",
    
    # Pharmacies & Health
    "cvs": "CVS",
    "walgreens": "Walgreens",
    "rite aid": "Rite Aid",
    "pharmacy": "Pharmacy",
    
    # Fitness
    "planet fitness": "Planet Fitness",
    "la fitness": "LA Fitness",
    "24 hour": "24 Hour Fitness",
    
    # Add your own patterns here:
    "cowboy jacks": "Cowboy Jacks",
    "byerlys": "Lunds & Byerlys",
    "wm supercenter": "Walmart",
    "wal-mart": "Walmart",
    "wholefds": "Whole Foods",
    "wholefoods": "Whole Foods",
    "kohls": "Kohls"
}

# Exact match mapping (must match exactly, case-insensitive)
STORE_EXACT_MATCH = {
    "tsq": "Times Square",
    "sq": "Square",
    "pypl": "PayPal",
    "amzn": "Amazon",
    
    # Add your own exact matches here:
    # "abbreviation": "Full Name",
}


def normalize_store(store: str) -> str:
    """
    Normalize a store name to standard format.
    
    Process:
    1. Check exact matches first
    2. Check pattern matches
    3. Remove common suffixes and numbers
    4. Title case the result
    
    Returns the standardized store name.
    """
    if not store:
        return ""
    
    original = store.strip()
    store_lower = original.lower()
    
    # Step 1: Check exact matches (case-insensitive)
    if store_lower in STORE_EXACT_MATCH:
        return STORE_EXACT_MATCH[store_lower]
    
    # Step 2: Check pattern matches
    for pattern, clean_name in STORE_PATTERNS.items():
        if pattern in store_lower:
            return clean_name
    
    # Step 3: Clean up the store name
    cleaned = original
    
    # Remove common credit card merchant codes and numbers at the end
    # Examples: "Target 00002204", "Amazon Mktpl*6Z7Xf0Y53"
    import re
    
    # Remove patterns like: *XXXXXX, #XXXXX, store code numbers
    cleaned = re.sub(r'\*[A-Z0-9]+', '', cleaned)  # Remove *ABC123
    cleaned = re.sub(r'#\d+', '', cleaned)  # Remove #12345
    cleaned = re.sub(r'\s+\d{4,}', '', cleaned)  # Remove 4+ digit numbers at end
    cleaned = re.sub(r'Mktpl[ace]*\s*', '', cleaned)  # Remove "Mktpl", "Mktplace"
    cleaned = re.sub(r'Pmts?\s*', '', cleaned)  # Remove "Pmt", "Pmts"
    cleaned = re.sub(r'.com', '', cleaned)
    cleaned = re.sub(r'.Com', '', cleaned) 

    
    # Remove common business suffixes
    suffixes = ['Inc', 'LLC', 'Corp', 'Ltd', 'Co', 'Company', 'US']
    for suffix in suffixes:
        # Remove suffix if at end with optional period
        cleaned = re.sub(rf'\s+{suffix}\.?$', '', cleaned, flags=re.IGNORECASE)
    
    # Clean up extra spaces and special characters
    cleaned = re.sub(r'\s+', ' ', cleaned)  # Multiple spaces to single space
    cleaned = cleaned.strip()
    
    # Title case the result
    return cleaned.title() if cleaned else original.title()


# =============================================================================
# CATEGORY MAPPING (for normalizing old/variant category names)
# =============================================================================


# =============================================================================
# 🏷️ CATEGORY AUTO-ASSIGNMENT RULES
# =============================================================================
# HOW TO ADD YOUR OWN CATEGORY RULES:
#
# Edit the functions below (categorize_by_store, categorize_by_keywords)
# 
# categorize_by_store() - For specific stores you always categorize the same
# categorize_by_keywords() - For keyword matching in descriptions
#
# These functions are called by the CSV parser to suggest categories.
# =============================================================================

def categorize_by_store(store_name: str) -> str:
    """
    Categorize based on known store names.
    Add your own store → category mappings here!
    
    Returns category name or None if no match
    """
    store_lower = store_name.lower()
    
    # Groceries
    if any(s in store_lower for s in ['hyvee', 'hy-vee', 'target', 'walmart', 'costco', 'whole foods', 'trader joe', 'kroger', 'safeway', 'aldi', 'publix', 'lunds', 'byerlys']):
        return "Groceries"
    
    # Dining - Fast Food
    if any(s in store_lower for s in ['jimmy john', 'scoreboard', 'jersey mike', 'culvers', "culver's", 'cuisine', 'mcdonald', 'burger king', 'taco bell', 'chipotle', 'subway', 'kfc', 'wendys', 'chick-fil-a', 'popeyes', 'canes', "cane's"]):
        return "Dining"
    
    # Dining - Restaurants
    if any(s in store_lower for s in ['piada', 'kitchen', 'mexican', 'burger', 'pub', 'tavern', 'taqueria', 'starbucks', 'poke', 'restaurant', 'cafe', 'coffee', 'pizza', 'panera', 'spitz', 'bistro', 'taphouse', 'tap house', 'tap room', 'taco', 'tacos']):
        return "Dining"
    
    # Gas & Auto
    if any(s in store_lower for s in ['kwik trip', 'marathon', 'speedway', 'holliday', 'holiday', 'shell', 'chevron', 'exxon', 'mobil', 'bp', 'gas', 'fuel', 'costco gas', 'tires']):
        return "Gas & Auto"
    
    # Subscriptions
    if any(s in store_lower for s in ['netflix', 'spotify', 'hulu', 'disney', 'apple music', 'icloud', 'dropbox', 'apple']):
        return "Subscriptions"
    
    # Online Shopping
    if any(s in store_lower for s in ['records', 'antiques', 'amazon', 'ebay', 'etsy', 'patina', 'sierra', 'kohls', 'hollister', 'american eagle', 'lulu lemon']):
        return "Shopping"
    
    # Health & Fitness
    if any(s in store_lower for s in ['cvs', 'walgreens', 'pharmacy', 'gym', 'fitness', 'planet', 'planet fit', 'planet fitness']):
        return "Health & Fitness"
    
    # Phone/Internet
    if any(s in store_lower for s in ['xcel', 'energy', 'centerpoint', 'center point', 'quantum fiber', 'verizon', 'at&t', 't-mobile', 'sprint', 'xfinity', 'comcast']):
        # Could be Phone or Utilities depending on service
        return "Utilities"  # Default to Phone, user can adjust
    
    # Transportation
    if any(s in store_lower for s in ['uber', 'lyft', "plane", "delta", "airline", "sun country"]):
        return "Travel"
    
    # Entertainment
    if any(s in store_lower for s in ['liquor', 'bar', 'golf', 'course', 'club', 'cider', 'cowboy jacks', 'wine', 'total wine', 'beer', 'alcohol', 'winery', 'cidery']):
        return "Entertainment"
    
    # Add your own store categorization rules here:
    # if 'your_store' in store_lower:
    #     return "Your Category"
    
    return None


def categorize_by_keywords(description: str, transaction_type: str = "") -> str:
    """
    Categorize based on keywords in the description or transaction type.
    Add your own keyword → category rules here!
    
    Returns category name or None if no match
    """
    desc_lower = description.lower()
    type_lower = transaction_type.lower()
    
    # Interest
    if 'interest' in desc_lower or 'interest' in type_lower:
        return "Interest"
    
    # Salary/Payroll
    if any(word in desc_lower for word in ['payroll', 'salary', 'direct deposit', "best buy", "bby", "northern", "nte", "pcb", "post consumer brand"]):
        return "Salary"
    
    # Rent
    if any(word in desc_lower for word in ['rent', 'apartment', 'housing', "alcott", "whitecap", "nolo"]):
        return "Rent"
    
    # Utilities
    if any(word in desc_lower for word in ['electric', 'water', 'utility', 'gas bill', 'internet', "xcel", "centerpoint", "quantum"]):
        return "Utilities"
    
    # Student Loan
    if any(word in desc_lower for word in ['student loan', 'navient', 'great lakes', 'fedloan']):
        return "Student Loan"
    
    # Car Payment
    if any(word in desc_lower for word in ['auto loan', 'car payment', 'vehicle loan', "truck loan" , "southpoint"]):
        return "Car Payment"
    
    # Add your own keyword categorization rules here:
    # if 'your_keyword' in desc_lower:
    #     return "Your Category"
    
    return None


def suggest_category(store: str, description: str, transaction_type: str = "") -> str:
    """
    Main function to suggest a category for a transaction.
    Tries store-based rules first, then keyword-based rules.
    
    Returns a suggested category or "Other Expense" as fallback.
    """
    # Try store-based categorization first
    category = categorize_by_store(store)
    if category:
        return category
    
    # Try keyword-based categorization
    category = categorize_by_keywords(description, transaction_type)
    if category:
        return category
    
    # Default fallback
    return "Other Expense"


# =============================================================================
# 🔖 AUTOMATIC TAGS RULES
# =============================================================================
# HOW TO ADD AUTOMATIC TAGS:
#
# Edit the get_automatic_tags() function below.
# Tags are automatically added based on store name or transaction details.
# These tags are added WITHOUT user input.
# =============================================================================

def get_automatic_tags(store: str, category: str, amount: float, description: str = "") -> list:
    """
    Generate automatic tags based on transaction details.
    Add your own auto-tagging rules here!
    
    Returns a list of tags to automatically apply.
    """
    tags = []
    
    store_lower = store.lower()
    desc_lower = description.lower()
    
    # Recurring/Subscription tag
    if category == "Subscriptions":
        tags.append("recurring")
    
    # Golf tag (if you play golf)
    if any(word in store_lower for word in ['golf', 'pga', 'course', "club"]) or any(word in desc_lower for word in ['golf', 'tee time', "club", "course"]):
        tags.append("golf")
    
    # Vacation/Travel tag
    if any(word in store_lower for word in ['airline', 'hotel', 'airbnb', 'booking.com', 'expedia']):
        tags.append("vacation")
    
    # Weekly groceries tag
    if category == "Groceries" | category == "Dining":
        tags.append("food")
    
    # Add your own automatic tagging rules here:
    # if 'condition' in store_lower:
    #     tags.append("your_tag")'
    
    return tags


# =============================================================================
# 💡 SMART TAG SUGGESTIONS (shown to user, not automatic)
# =============================================================================
# HOW TO ADD SMART TAG SUGGESTIONS:
#
# Edit the CATEGORY_TAGS dictionary below.
# These are tag suggestions shown to the user based on the category they select.
# Users click to add them, but they're not automatic.
# =============================================================================

CATEGORY_TAGS = {
    "Entertainment": ["movie", "concert", "golf", "game", "fun"],
    "Gas & Auto": ["gas", "oil", "maintenance"],
    "Gifts": ["birthday", "holiday", "anniversary"],
    "Shopping": ["retail", "online",  "amazon"],
    "Travel": ["vacation"],
    "Utilities": ["electric", "water", "gas", "internet"],
    "Refund": ["return", "reimbursement"],
    
    # Add your own category → suggested tags here:
    # "Your Category": ["tag1", "tag2", "tag3"],
}


def suggest_tags(category: str, store: str = "") -> list:
    """
    Suggest tags based on category and store name.
    Returns a list of suggested tag strings shown to the user.
    """
    suggestions = []
    
    # Add category-based tags
    if category in CATEGORY_TAGS:
        suggestions.extend(CATEGORY_TAGS[category][:4])  # Top 4 suggestions
    
    # Add store-specific tags if applicable
    if store:
        store_lower = store.lower()
        if "restaurant" in store_lower or "cafe" in store_lower:
            suggestions.append("dining")
        if "gym" in store_lower or "fitness" in store_lower:
            suggestions.append("fitness")
    
    return list(set(suggestions))  # Remove duplicates


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def normalize_category(category: str) -> str:
    """
    Normalize a category name to the standard format.
    Returns the standardized category or the original if not found.
    """
    if not category:
        return "Other Expense"
    
    # Convert to lowercase for comparison
    category_lower = category.lower().strip()
    
    # Check if it's in the mapping
    if category_lower in CATEGORY_MAPPING:
        return CATEGORY_MAPPING[category_lower]
    
    # Check if it matches any standard category (case-insensitive)
    for std_category in ALL_CATEGORIES:
        if category_lower == std_category.lower():
            return std_category
    
    # If not found, return Title Case version
    return category.title()


def is_valid_category(category: str) -> bool:
    """Check if a category is valid"""
    if not category:
        return False
    return normalize_category(category) in ALL_CATEGORIES


def get_transaction_type(category: str) -> str:
    """
    Determine if a category is 'income' or 'expense'
    """
    normalized = normalize_category(category)
    if normalized in INCOME_CATEGORIES:
        return "income"
    return "expense"