# 🎨 Personalization & Customization Guide

## Overview
This guide shows you exactly where and how to customize the transaction categorization, store name normalization, and tagging system in your Personal Finance App.

**Main file to edit:** `app/constants.py`

All customization happens in ONE file - `constants.py` - which makes it easy to manage your personal rules!

---

## 📦 Part 1: Store Name Normalization

### Where: Lines 75-230 in `constants.py`

Store names are automatically cleaned up and standardized. For example:
- `"Target.Com  *"` → `"Target"`
- `"Amazon Mktpl*6Z7Xf0Y53"` → `"Amazon"`
- `"STARBUCKS 00002204"` → `"Starbucks"`

### How to Add Your Own Store Rules:

#### Method 1: Pattern Matching (Recommended for chains)
Add to the `STORE_PATTERNS` dictionary (lines 77-165):

```python
STORE_PATTERNS = {
    "target": "Target",
    "amazon": "Amazon",
    # ... existing entries ...
    
    # ADD YOUR OWN HERE:
    "your_store": "Your Store Name",
    "local_restaurant": "Local Restaurant",
}
```

**How it works:** If the pattern appears ANYWHERE in the store name, it matches.
- `"your_store"` will match: `"Your_Store 123"`, `"YOUR_STORE*ABC"`, etc.

#### Method 2: Exact Matching
Add to the `STORE_EXACT_MATCH` dictionary (lines 168-175):

```python
STORE_EXACT_MATCH = {
    "tsq": "Times Square",
    # ADD YOUR OWN HERE:
    "abbrev": "Full Name",
}
```

**How it works:** Must match exactly (case-insensitive).

#### Automatic Cleanup (No configuration needed!)

The system automatically removes:
- ✅ Merchant codes: `*ABC123`, `#12345`
- ✅ "Mktpl", "Mktplace", "Pmts" suffixes
- ✅ Numbers at the end (4+ digits)
- ✅ Business suffixes: "Inc", "LLC", "Corp"
- ✅ Extra spaces

**Examples:**
```
Input: "Target.Com        00002204"
Output: "Target"

Input: "Amazon Mktplace Pmts"
Output: "Amazon"

Input: "Chipotle Mexican Grill Inc"
Output: "Chipotle Mexican Grill"
```

---

## 🏷️ Part 2: Category Auto-Assignment

### Where: Lines 285-375 in `constants.py`

Categories are automatically suggested when importing transactions based on store names and keywords.

### How to Add Your Own Category Rules:

#### Method 1: Store-Based Rules (lines 297-345)

Edit the `categorize_by_store()` function:

```python
def categorize_by_store(store_name: str) -> str:
    store_lower = store_name.lower()
    
    # Groceries
    if any(s in store_lower for s in ['target', 'walmart', 'costco']):
        return "Groceries"
    
    # ADD YOUR OWN HERE:
    if 'your_local_market' in store_lower:
        return "Groceries"
    
    if 'your_favorite_restaurant' in store_lower:
        return "Dining Out"
    
    return None
```

#### Method 2: Keyword-Based Rules (lines 348-375)

Edit the `categorize_by_keywords()` function:

```python
def categorize_by_keywords(description: str, transaction_type: str = "") -> str:
    desc_lower = description.lower()
    
    # Interest
    if 'interest' in desc_lower:
        return "Interest"
    
    # ADD YOUR OWN HERE:
    if 'your_keyword' in desc_lower:
        return "Your Category"
    
    if any(word in desc_lower for word in ['word1', 'word2', 'word3']):
        return "Your Category"
    
    return None
```

### Priority System:
1. **Store-based rules** are checked first
2. **Keyword-based rules** are checked second
3. **Fallback** is "Other Expense"

---

## 🔖 Part 3: Automatic Tags

### Where: Lines 420-470 in `constants.py`

Tags that are AUTOMATICALLY added to transactions (no user input needed).

### How to Add Automatic Tag Rules:

Edit the `get_automatic_tags()` function (lines 430-465):

```python
def get_automatic_tags(store: str, category: str, amount: float, description: str = "") -> list:
    tags = []
    
    store_lower = store.lower()
    desc_lower = description.lower()
    
    # Recurring subscriptions
    if category == "Subscriptions":
        tags.append("recurring")
    
    # Golf tag
    if 'golf' in store_lower or 'golf' in desc_lower:
        tags.append("golf")
    
    # Large purchases
    if amount > 500:
        tags.append("large")
    
    # ADD YOUR OWN RULES HERE:
    
    # Example: Tag all transactions over $1000
    if amount > 1000:
        tags.append("high-value")
    
    # Example: Tag specific stores
    if 'your_gym' in store_lower:
        tags.append("gym")
        tags.append("fitness")
    
    # Example: Tag by day of week (requires datetime logic)
    # if is_weekend(date):
    #     tags.append("weekend")
    
    # Example: Tag vacation expenses
    if any(word in store_lower for word in ['hotel', 'airline', 'airbnb']):
        tags.append("vacation")
    
    return tags
```

### Examples of What You Can Do:

**By Amount:**
```python
if amount > 1000:
    tags.append("expensive")
if amount < 5:
    tags.append("small-purchase")
```

**By Store:**
```python
if 'costco' in store_lower:
    tags.append("bulk")
if 'whole foods' in store_lower:
    tags.append("organic")
```

**By Category:**
```python
if category == "Recreation":
    tags.append("hobby")
if category == "Health & Fitness":
    tags.append("wellness")
```

**By Description Keywords:**
```python
if 'birthday' in desc_lower:
    tags.append("birthday")
if 'anniversary' in desc_lower:
    tags.append("anniversary")
```

---

## 💡 Part 4: Smart Tag Suggestions

### Where: Lines 500-550 in `constants.py`

Tags that are SUGGESTED to the user (they can click to add them).

### How to Add Tag Suggestions:

Edit the `CATEGORY_TAGS` dictionary (lines 520-545):

```python
CATEGORY_TAGS = {
    "Dining Out": ["restaurant", "food", "lunch", "dinner", "breakfast"],
    "Entertainment": ["movie", "concert", "show", "game", "fun"],
    "Groceries": ["food", "household", "weekly", "shopping"],
    
    # ADD YOUR OWN HERE:
    "Your Category": ["tag1", "tag2", "tag3"],
    "Recreation": ["golf", "tennis", "sports", "hobby"],  # Customize existing
}
```

### Best Practices:

1. **Keep it short** - 3-5 suggestions per category
2. **Most common first** - List most frequently used tags first
3. **Be specific** - Tags should be actionable for filtering later

**Example Customization for Your Golf Hobby:**
```python
CATEGORY_TAGS = {
    "Recreation": ["golf", "driving-range", "tournament", "practice"],
    "Dining Out": ["golf-club", "19th-hole", "lunch", "dinner"],
}
```

---

## 🎯 Real-World Examples

### Example 1: You Frequently Shop at Local Stores

**Problem:** Your local market "Joe's Market" isn't recognized.

**Solution:** Add to `STORE_PATTERNS`:
```python
STORE_PATTERNS = {
    # ... existing entries ...
    "joe's market": "Joe's Market",
    "joes market": "Joe's Market",
}
```

Then add categorization rule in `categorize_by_store()`:
```python
if "joe's market" in store_lower or "joes market" in store_lower:
    return "Groceries"
```

### Example 2: Track Golf Expenses

**Store Normalization:**
```python
STORE_PATTERNS = {
    # ... existing entries ...
    "country club": "Country Club",
    "golf course": "Local Golf Course",
}
```

**Auto-Categorization:**
```python
def categorize_by_store(store_name: str) -> str:
    # ... existing code ...
    if 'golf' in store_lower or 'country club' in store_lower:
        return "Recreation"
```

**Automatic Tags:**
```python
def get_automatic_tags(store, category, amount, description=""):
    # ... existing code ...
    if 'golf' in store_lower or 'golf' in desc_lower:
        tags.append("golf")
    if 'tournament' in desc_lower:
        tags.append("tournament")
```

**Smart Suggestions:**
```python
CATEGORY_TAGS = {
    "Recreation": ["golf", "practice", "tournament", "equipment"],
}
```

### Example 3: Track Grad School Expenses

**Auto-Categorization:**
```python
def categorize_by_keywords(description, transaction_type=""):
    # ... existing code ...
    if any(word in desc_lower for word in ['tuition', 'university', 'college', 'books']):
        return "Education"
```

**Automatic Tags:**
```python
def get_automatic_tags(store, category, amount, description=""):
    # ... existing code ...
    if category == "Education":
        tags.append("grad-school")
    if 'textbook' in desc_lower or 'book' in desc_lower:
        tags.append("books")
```

**Smart Suggestions:**
```python
CATEGORY_TAGS = {
    "Education": ["grad-school", "tuition", "books", "supplies"],
}
```

---

## 🧪 Testing Your Changes

After making changes to `constants.py`:

1. **Restart your backend server**
   ```bash
   # Kill the current server (Ctrl+C)
   # Start it again
   uvicorn app.main:app --reload
   ```

2. **Test with a CSV import**
   - Import a test CSV file
   - Check if stores are normalized correctly
   - Check if categories are suggested correctly
   - Check if tags are applied correctly

3. **Test manual entry**
   - Add a transaction manually
   - Check if smart tag suggestions appear
   - Verify store name formatting

---

## 📝 Quick Reference

| What You Want | Where to Edit | Function/Dictionary |
|---------------|---------------|---------------------|
| Clean up store names | Lines 77-165 | `STORE_PATTERNS` |
| Add exact store abbreviations | Lines 168-175 | `STORE_EXACT_MATCH` |
| Auto-categorize by store | Lines 297-340 | `categorize_by_store()` |
| Auto-categorize by keywords | Lines 348-375 | `categorize_by_keywords()` |
| Add automatic tags | Lines 430-465 | `get_automatic_tags()` |
| Add smart tag suggestions | Lines 520-545 | `CATEGORY_TAGS` |

---

## 🆘 Common Issues

### Issue: Store names not normalizing
**Solution:** Check that your pattern is lowercase in `STORE_PATTERNS`
```python
# ✅ Correct
"target": "Target"

# ❌ Wrong
"Target": "Target"
```

### Issue: Categories not auto-assigning
**Solution:** Make sure your store/keyword is lowercase in the condition:
```python
# ✅ Correct
if 'mystore' in store_lower:

# ❌ Wrong
if 'MyStore' in store_lower:
```

### Issue: Tags not appearing
**Solution:** 
- For automatic tags: Check `get_automatic_tags()` function
- For smart suggestions: Check `CATEGORY_TAGS` dictionary
- Restart backend server after changes

---

## 💪 Pro Tips

1. **Start Simple** - Add a few rules, test them, then add more
2. **Use Patterns** - Pattern matching is more flexible than exact matching
3. **Be Consistent** - Use similar tag names across categories (e.g., "recurring" not "monthly" sometimes)
4. **Test Frequently** - Import a test CSV after each change to verify
5. **Document Your Rules** - Add comments in `constants.py` to remember why you added specific rules

---

## 🎓 Advanced: Regular Expressions

The store normalization uses regex patterns. You can add more complex patterns:

```python
import re

# Remove transaction IDs: "Store #TX12345"
cleaned = re.sub(r'#TX\d+', '', store_name)

# Remove dates: "Store 01/15/24"
cleaned = re.sub(r'\d{1,2}/\d{1,2}/\d{2,4}', '', cleaned)

# Remove location codes: "Store LOC:123"
cleaned = re.sub(r'LOC:\d+', '', cleaned)
```

Add these to the `normalize_store()` function if needed!

---

**Remember:** All changes to `constants.py` require restarting your backend server to take effect!

Happy customizing! 🎉