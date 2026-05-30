"""
Comprehensive Test Suite for fallback_parse()
Tests ALL code paths: Income, Expense, Udhar Given/Taken, Staff (Payment/Add/Attendance/Absent/HalfDay),
Questions, Reminders, Inventory, Number Words, Edge Cases, Multi-language support.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from server import fallback_parse

PASS = 0
FAIL = 0
FAILURES = []

def check(test_name, text, expected_intent, checks=None):
    """Run a single test case and validate."""
    global PASS, FAIL, FAILURES
    result = fallback_parse(text)
    
    errors = []
    
    # Check intent
    if result["intent"] != expected_intent:
        errors.append(f"  Intent: got '{result['intent']}', expected '{expected_intent}'")
    
    # Run additional checks
    if checks:
        for desc, validator in checks.items():
            try:
                if not validator(result):
                    errors.append(f"  {desc}: FAILED")
            except Exception as e:
                errors.append(f"  {desc}: EXCEPTION - {e}")
    
    if errors:
        FAIL += 1
        FAILURES.append((test_name, text, errors, result))
        print(f"  FAIL: {test_name}")
        for e in errors:
            print(f"       {e}")
    else:
        PASS += 1
        print(f"  PASS: {test_name}")

def has_amount(amt):
    """Helper: check if transaction/udhar has specific amount."""
    def validator(r):
        for tx in r.get("transactions", []):
            if abs(float(tx.get("amount", 0)) - amt) < 0.01:
                return True
        for u in r.get("udhar", []):
            if abs(float(u.get("amount", 0)) - amt) < 0.01:
                return True
        for sa in r.get("staff_actions", []):
            if abs(float(sa.get("amount", 0)) - amt) < 0.01:
                return True
            if abs(float(sa.get("salary", 0)) - amt) < 0.01:
                return True
        return False
    return validator

def tx_type(t):
    """Helper: check transaction type."""
    def validator(r):
        return any(tx.get("type") == t for tx in r.get("transactions", []))
    return validator

def udhar_type(t):
    """Helper: check udhar type."""
    def validator(r):
        return any(u.get("type") == t for u in r.get("udhar", []))
    return validator

def udhar_party(name):
    """Helper: check udhar party name (case-insensitive)."""
    def validator(r):
        return any(name.lower() in u.get("party_name", "").lower() for u in r.get("udhar", []))
    return validator

def staff_action(action):
    """Helper: check staff action type."""
    def validator(r):
        return any(sa.get("action") == action for sa in r.get("staff_actions", []))
    return validator

def staff_name(name):
    """Helper: check staff name (case-insensitive)."""
    def validator(r):
        return any(name.lower() in sa.get("name", "").lower() for sa in r.get("staff_actions", []))
    return validator

def staff_status(status):
    """Helper: check staff attendance status."""
    def validator(r):
        return any(sa.get("status") == status for sa in r.get("staff_actions", []))
    return validator

def has_inventory(name_contains=None, delta_sign=None):
    """Helper: check inventory entry."""
    def validator(r):
        for inv in r.get("inventory", []):
            name_ok = (name_contains is None) or (name_contains.lower() in inv.get("name", "").lower())
            delta_ok = True
            if delta_sign == "negative":
                delta_ok = inv.get("quantity_delta", 0) < 0
            elif delta_sign == "positive":
                delta_ok = inv.get("quantity_delta", 0) > 0
            if name_ok and delta_ok:
                return True
        return False
    return validator

def has_party(name):
    """Helper: check party name in transactions."""
    def validator(r):
        for tx in r.get("transactions", []):
            if name.lower() in tx.get("party_name", "").lower():
                return True
        return False
    return validator

def has_reply_containing(text_fragment):
    """Helper: check reply contains text."""
    def validator(r):
        return text_fragment.lower() in r.get("reply", "").lower()
    return validator


# =====================================================================
# TEST SUITE
# =====================================================================

print("\n" + "="*80)
print("  COMPREHENSIVE PARSER TEST SUITE - ALL CODE PATHS")
print("="*80)

# -------------------------------------------------------------------
print("\n--- 1. INCOME / SALES (English) ---")
# -------------------------------------------------------------------
check("Income - sold basic", "sold goods for 500", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Income - received payment", "received 2000 from Ramesh", "transaction",
      {"Amount=2000": has_amount(2000), "Type=income": tx_type("income")})

check("Income - sale keyword", "sale of rice 1500", "transaction",
      {"Amount=1500": has_amount(1500), "Type=income": tx_type("income")})

check("Income - earned", "earned 750 today", "transaction",
      {"Amount=750": has_amount(750), "Type=income": tx_type("income")})

check("Income - got paid", "got paid 3000 from Suresh", "transaction",
      {"Amount=3000": has_amount(3000), "Type=income": tx_type("income")})

check("Income - collected", "collected 1200 from Amit", "transaction",
      {"Amount=1200": has_amount(1200), "Type=income": tx_type("income")})

# -------------------------------------------------------------------
print("\n--- 2. INCOME / SALES (Hindi/Hinglish) ---")
# -------------------------------------------------------------------
check("Income Hindi - becha", "chawal becha 500 rs", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Income Hindi - bikri", "aaj ki bikri 5000 rupees", "transaction",
      {"Amount=5000": has_amount(5000), "Type=income": tx_type("income")})

check("Income Hindi - mila", "mila 800 Ramesh se", "transaction",
      {"Amount=800": has_amount(800), "Type=income": tx_type("income")})

check("Income Hindi - paisa aaya", "paisa aaya 1500", "transaction",
      {"Amount=1500": has_amount(1500), "Type=income": tx_type("income")})

check("Income Devanagari - बेचा", "चावल बेचा ₹500", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Income Devanagari - बिक्री", "आज की बिक्री ₹3000", "transaction",
      {"Amount=3000": has_amount(3000), "Type=income": tx_type("income")})

# -------------------------------------------------------------------
print("\n--- 3. EXPENSE / PURCHASE (English) ---")
# -------------------------------------------------------------------
check("Expense - bought", "bought vegetables for 300", "transaction",
      {"Amount=300": has_amount(300), "Type=expense": tx_type("expense")})

check("Expense - paid", "paid 1500 for rent", "transaction",
      {"Amount=1500": has_amount(1500), "Type=expense": tx_type("expense")})

check("Expense - spent", "spent 200 on lunch", "transaction",
      {"Amount=200": has_amount(200), "Type=expense": tx_type("expense")})

check("Expense - purchased", "purchased 10kg rice for 800", "transaction",
      {"Amount=800": has_amount(800), "Type=expense": tx_type("expense")})

check("Expense - bill", "electricity bill 2000", "transaction",
      {"Amount=2000": has_amount(2000), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 4. EXPENSE / PURCHASE (Hindi/Hinglish) ---")
# -------------------------------------------------------------------
check("Expense Hindi - kharida", "chawal kharida 10kg 800 rs", "transaction",
      {"Amount=800": has_amount(800), "Type=expense": tx_type("expense")})

check("Expense Hindi - kharch", "aaj ka kharch 500", "transaction",
      {"Amount=500": has_amount(500), "Type=expense": tx_type("expense")})

check("Expense Hindi - liya", "sabzi liya 200 rs", "transaction",
      {"Amount=200": has_amount(200), "Type=expense": tx_type("expense")})

check("Expense Hindi - bhara", "bijli ka bill bhara 1800", "transaction",
      {"Amount=1800": has_amount(1800), "Type=expense": tx_type("expense")})

check("Expense Devanagari - खरीदा", "दाल खरीदा ₹200", "transaction",
      {"Amount=200": has_amount(200), "Type=expense": tx_type("expense")})

check("Expense Devanagari - खर्च", "आज का खर्च ₹1500", "transaction",
      {"Amount=1500": has_amount(1500), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 5. UDHAR GIVEN (all variants) ---")
# -------------------------------------------------------------------
check("Udhar Given - basic", "Harsh ko 500 udhar diya", "udhar",
      {"Amount=500": has_amount(500), "Type=given": udhar_type("given"), "Party=Harsh": udhar_party("Harsh")})

check("Udhar Given - udhaar", "Ravi ko 1000 udhaar diya", "udhar",
      {"Amount=1000": has_amount(1000), "Type=given": udhar_type("given"), "Party=Ravi": udhar_party("Ravi")})

check("Udhar Given - uddhar", "Suresh ko 2000 uddhar diya", "udhar",
      {"Amount=2000": has_amount(2000), "Type=given": udhar_type("given"), "Party=Suresh": udhar_party("Suresh")})

check("Udhar Given - diye", "Rahul ko 300 udhar diye", "udhar",
      {"Amount=300": has_amount(300), "Type=given": udhar_type("given"), "Party=Rahul": udhar_party("Rahul")})

check("Udhar Given - udhaar diye", "Amit ko 700 udhaar diye", "udhar",
      {"Amount=700": has_amount(700), "Type=given": udhar_type("given"), "Party=Amit": udhar_party("Amit")})

check("Udhar Given - credit diya", "Mohan ko 1500 credit diya", "udhar",
      {"Amount=1500": has_amount(1500), "Type=given": udhar_type("given"), "Party=Mohan": udhar_party("Mohan")})

check("Udhar Given - ne udhar liya", "Harsh ne 500 udhar liya", "udhar",
      {"Amount=500": has_amount(500), "Type=given": udhar_type("given"), "Party=Harsh": udhar_party("Harsh")})

check("Udhar Given - ne udhaar liye", "Raj ne 800 udhaar liye", "udhar",
      {"Amount=800": has_amount(800), "Type=given": udhar_type("given"), "Party=Raj": udhar_party("Raj")})

check("Udhar Given Devanagari", "हर्ष को ₹500 उधार दिया", "udhar",
      {"Amount=500": has_amount(500), "Type=given": udhar_type("given")})

check("Udhar Given - ko udhar", "Vikas ko udhar 1000 diya", "udhar",
      {"Amount=1000": has_amount(1000), "Type=given": udhar_type("given"), "Party=Vikas": udhar_party("Vikas")})

check("Udhar Given - khata likha", "Ramesh ka khata likha 2000", "udhar",
      {"Amount=2000": has_amount(2000), "Type=given": udhar_type("given")})

# -------------------------------------------------------------------
print("\n--- 6. UDHAR TAKEN (all variants) ---")
# -------------------------------------------------------------------
check("Udhar Taken - basic", "maine 500 udhar liya Sharma se", "udhar",
      {"Amount=500": has_amount(500), "Type=taken": udhar_type("taken")})

check("Udhar Taken - se udhar", "Patel se 3000 udhar liya", "udhar",
      {"Amount=3000": has_amount(3000), "Type=taken": udhar_type("taken")})

check("Udhar Taken - baaki hai", "Sharma ka 5000 baaki hai", "udhar",
      {"Amount=5000": has_amount(5000), "Type=taken": udhar_type("taken")})

check("Udhar Taken - humne udhar", "humne udhar liya 2000", "udhar",
      {"Amount=2000": has_amount(2000), "Type=taken": udhar_type("taken")})

check("Udhar Taken Devanagari", "मैंने ₹1000 उधार लिया", "udhar",
      {"Amount=1000": has_amount(1000), "Type=taken": udhar_type("taken")})

check("Udhar Taken - se udhaar", "Gupta se 4000 udhaar liya", "udhar",
      {"Amount=4000": has_amount(4000), "Type=taken": udhar_type("taken")})

# -------------------------------------------------------------------
print("\n--- 7. STAFF - SALARY PAYMENT ---")
# -------------------------------------------------------------------
check("Staff Salary - basic", "Raju ki salary 15000 diya", "staff",
      {"Action=payment": staff_action("payment"), "Amount=15000": has_amount(15000), "Name=Raju": staff_name("Raju")})

check("Staff Salary - ko salary", "Mohan ko salary 12000 diya", "staff",
      {"Action=payment": staff_action("payment"), "Amount=12000": has_amount(12000), "Name=Mohan": staff_name("Mohan")})

check("Staff Salary - tankhah", "Suresh ki tankhah 10000", "staff",
      {"Action=payment": staff_action("payment"), "Amount=10000": has_amount(10000), "Name=Suresh": staff_name("Suresh")})

check("Staff Salary - pagaar", "Ramesh ka pagaar 8000 diya", "staff",
      {"Action=payment": staff_action("payment"), "Amount=8000": has_amount(8000), "Name=Ramesh": staff_name("Ramesh")})

check("Staff Salary Devanagari", "राजू की तनख्वाह ₹15000", "staff",
      {"Action=payment": staff_action("payment"), "Amount=15000": has_amount(15000)})

check("Staff Salary - vetan", "Amit ka vetan 20000", "staff",
      {"Action=payment": staff_action("payment"), "Amount=20000": has_amount(20000), "Name=Amit": staff_name("Amit")})

# -------------------------------------------------------------------
print("\n--- 8. STAFF - ADD NEW ---")
# -------------------------------------------------------------------
check("Staff Add - naya staff", "naya staff Vikram join hua", "staff",
      {"Action=add": staff_action("add"), "Name=Vikram": staff_name("Vikram")})

check("Staff Add - new staff", "new staff Rahul 15000 salary", "staff",
      {"Action=add": staff_action("add"), "Name=Rahul": staff_name("Rahul"), "Amount=15000": has_amount(15000)})

check("Staff Add - join kiya", "Anil ne join kiya salary 12000", "staff",
      {"Action=add": staff_action("add")})

# -------------------------------------------------------------------
print("\n--- 9. STAFF - ATTENDANCE (Present) ---")
# -------------------------------------------------------------------
check("Staff Present - hajri", "Raju ki hajri laga do", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=present": staff_status("present")})

check("Staff Present - attendance", "Mohan attendance present", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=present": staff_status("present")})

check("Staff Present - aaya", "Suresh aaj aaya", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=present": staff_status("present")})

# -------------------------------------------------------------------
print("\n--- 10. STAFF - ABSENT ---")
# -------------------------------------------------------------------
check("Staff Absent - nahi aaya", "Raju aaj nahi aaya", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=absent": staff_status("absent"), "Name=Raju": staff_name("Raju")})

check("Staff Absent - chutti", "Mohan chutti pe hai", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=absent": staff_status("absent"), "Name=Mohan": staff_name("Mohan")})

check("Staff Absent - nhi aaya", "Suresh nhi aaya aaj", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=absent": staff_status("absent"), "Name=Suresh": staff_name("Suresh")})

check("Staff Absent Devanagari", "राजू आज नहीं आया", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=absent": staff_status("absent")})

check("Staff Absent - छुट्टी", "मोहन की छुट्टी है", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=absent": staff_status("absent")})

# -------------------------------------------------------------------
print("\n--- 11. STAFF - HALF DAY ---")
# -------------------------------------------------------------------
check("Staff HalfDay - half day", "Raju half day aaj", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=half_day": staff_status("half_day")})

check("Staff HalfDay - aadha din", "Mohan aadha din aaya", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=half_day": staff_status("half_day")})

check("Staff HalfDay Devanagari", "राजू आधा दिन आया", "staff",
      {"Action=attendance": staff_action("attendance"), "Status=half_day": staff_status("half_day")})

# -------------------------------------------------------------------
print("\n--- 12. INVENTORY WITH QUANTITIES ---")
# -------------------------------------------------------------------
check("Inventory - sold kg", "sold 5kg rice for 500", "transaction",
      {"Amount=500": has_amount(500), "Inventory exists": has_inventory(None, "negative")})

check("Inventory - bought kg", "bought 10kg sugar 400 rs", "transaction",
      {"Amount=400": has_amount(400), "Inventory exists": has_inventory("sugar", "positive")})

check("Inventory - sold litre", "sold 2ltr milk 100 rs", "transaction",
      {"Amount=100": has_amount(100), "Inventory exists": has_inventory("milk", "negative")})

check("Inventory - bought packets", "bought 5 packets biscuit 250", "transaction",
      {"Amount=250": has_amount(250), "Inventory exists": has_inventory(None, "positive")})

check("Inventory - dozen", "sold 2 dozen eggs 300", "transaction",
      {"Amount=300": has_amount(300), "Inventory exists": has_inventory(None, "negative")})

check("Inventory Hindi - किलो", "5 किलो चावल बेचा ₹500", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Inventory - sold pieces", "sold 3 pieces cake 450", "transaction",
      {"Amount=450": has_amount(450), "Inventory exists": has_inventory(None, "negative")})

# -------------------------------------------------------------------
print("\n--- 13. QUESTIONS ---")
# -------------------------------------------------------------------
check("Question - how much", "how much did I sell today?", "question", {})
check("Question - kitna", "kitna mila aaj?", "question", {})
check("Question - kya hai", "stock kya hai?", "question", {})
check("Question Devanagari", "कितना कमाया आज?", "question", {})
check("Question - tell me", "tell me my balance", "question", {})
check("Question - show me", "show me today sales", "question", {})
check("Question - ? mark", "profit today?", "question", {})

# -------------------------------------------------------------------
print("\n--- 14. REMINDERS ---")
# -------------------------------------------------------------------
check("Reminder - remind", "remind me to collect payment from Sharma", "reminder", {})
check("Reminder - yaad", "yaad dilana kal payment lena", "reminder", {})
check("Reminder - alert", "alert me about stock", "reminder", {})

# -------------------------------------------------------------------
print("\n--- 15. NUMBER WORD CONVERSION ---")
# -------------------------------------------------------------------
check("NumWord - five hundred", "sold rice five hundred rupees", "transaction",
      {"Amount=500": has_amount(500)})

check("NumWord - sau (100)", "becha sau rupaye ka samaan", "transaction",
      {"Amount=100": has_amount(100)})

check("NumWord - do (2)", "2kg rice becha 500 rs", "transaction",
      {"Amount=500": has_amount(500)})

check("NumWord - pachaas (50)", "pachaas rupaye kharch", "transaction",
      {"Amount=50": has_amount(50)})

# -------------------------------------------------------------------
print("\n--- 16. PARTY NAME EXTRACTION ---")
# -------------------------------------------------------------------
check("Party - to Ramesh", "sold 500 rs to Ramesh", "transaction",
      {"Party=Ramesh": has_party("Ramesh")})

check("Party - from Suresh", "received 1000 from Suresh", "transaction",
      {"Party=Suresh": has_party("Suresh")})

check("Party - ko (Hinglish)", "becha 500 ko Mohan", "transaction",
      {"Party=Mohan": has_party("Mohan")})

# -------------------------------------------------------------------
print("\n--- 17. EDGE CASES ---")
# -------------------------------------------------------------------
check("Edge - amount only no context", "500", "transaction",
      {"Amount=500": has_amount(500), "Reply mentions noted": has_reply_containing("Noted")})

check("Edge - no amount no intent", "hello good morning", "greeting",
      {"Reply has greeting": has_reply_containing("business")})

check("Edge - Rs prefix", "Rs 2000 sale", "transaction",
      {"Amount=2000": has_amount(2000)})

check("Edge - ₹ symbol", "₹1500 income from shop", "transaction",
      {"Amount=1500": has_amount(1500)})

check("Edge - decimal amount", "sold for 99.50", "transaction",
      {"Amount=99.5": has_amount(99.5)})

check("Edge - large amount", "received 150000 from builder", "transaction",
      {"Amount=150000": has_amount(150000)})

check("Edge - multiple amounts (picks largest)", "bought 5kg rice at 60 per kg total 300", "transaction",
      {"Amount=300": has_amount(300)})

# -------------------------------------------------------------------
print("\n--- 18. MULTI-LANGUAGE: Marathi ---")
# -------------------------------------------------------------------
check("Marathi - विकले", "तांदूळ विकले ₹500", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Marathi - घेतले", "साखर घेतले ₹300", "transaction",
      {"Amount=300": has_amount(300), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 19. MULTI-LANGUAGE: Telugu ---")
# -------------------------------------------------------------------
check("Telugu - అమ్మాను", "బియ్యం అమ్మాను ₹500", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Telugu - కొన్నాను", "పంచదార కొన్నాను ₹200", "transaction",
      {"Amount=200": has_amount(200), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 20. MULTI-LANGUAGE: Tamil ---")
# -------------------------------------------------------------------
check("Tamil - விற்றேன்", "அரிசி விற்றேன் ₹600", "transaction",
      {"Amount=600": has_amount(600), "Type=income": tx_type("income")})

check("Tamil - வாங்கினேன்", "சர்க்கரை வாங்கினேன் ₹250", "transaction",
      {"Amount=250": has_amount(250), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 21. MULTI-LANGUAGE: Gujarati ---")
# -------------------------------------------------------------------
check("Gujarati - વેચ્યું", "ચોખા વેચ્યું ₹400", "transaction",
      {"Amount=400": has_amount(400), "Type=income": tx_type("income")})

check("Gujarati - ખરીદ્યું", "ખાંડ ખરીદ્યું ₹300", "transaction",
      {"Amount=300": has_amount(300), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 22. MULTI-LANGUAGE: Kannada ---")
# -------------------------------------------------------------------
check("Kannada - ಮಾರಿದೆ", "ಅಕ್ಕಿ ಮಾರಿದೆ ₹500", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Kannada - ಕೊಂಡೆ", "ಸಕ್ಕರೆ ಕೊಂಡೆ ₹200", "transaction",
      {"Amount=200": has_amount(200), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 23. MULTI-LANGUAGE: Bengali ---")
# -------------------------------------------------------------------
check("Bengali - বিক্রি", "চাল বিক্রি ₹500", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Bengali - কিনলাম", "চিনি কিনলাম ₹300", "transaction",
      {"Amount=300": has_amount(300), "Type=expense": tx_type("expense")})

# -------------------------------------------------------------------
print("\n--- 24. COMBINED SCENARIOS (Real-world usage) ---")
# -------------------------------------------------------------------
check("Real - Hinglish sale with party", "aaj Sharma ko 10kg atta becha 500 rs", "transaction",
      {"Amount=500": has_amount(500), "Type=income": tx_type("income")})

check("Real - Complex expense", "kharida 20kg cement 400 rs building ke liye", "transaction",
      {"Amount=400": has_amount(400), "Type=expense": tx_type("expense")})

check("Real - Udhar with amount first", "500 udhar diya Harsh ko", "udhar",
      {"Amount=500": has_amount(500), "Type=given": udhar_type("given"), "Party=Harsh": udhar_party("Harsh")})

check("Real - Staff salary Hinglish", "Ramu ki salary de do 10000", "staff",
      {"Action=payment": staff_action("payment"), "Amount=10000": has_amount(10000)})

check("Real - Morning sale", "subah 5kg doodh becha 300 rupees", "transaction",
      {"Amount=300": has_amount(300), "Type=income": tx_type("income")})

check("Real - Multiple items", "sold chai for 20 rs", "transaction",
      {"Amount=20": has_amount(20), "Type=income": tx_type("income")})

check("Real - Udhar with rupaye", "Ravi ko 2000 rupaye udhar diye", "udhar",
      {"Amount=2000": has_amount(2000), "Type=given": udhar_type("given"), "Party=Ravi": udhar_party("Ravi")})

# -------------------------------------------------------------------
print("\n--- 25. INVENTORY STOCK UPDATES ---")
# -------------------------------------------------------------------
check("Stock - sale reduces inventory", "becha 3kg atta 150 rs", "transaction",
      {"Inventory negative": has_inventory(None, "negative")})

check("Stock - purchase increases inventory", "kharida 50kg rice 2000", "transaction",
      {"Inventory positive": has_inventory(None, "positive")})

# -------------------------------------------------------------------
print("\n--- 26. UDHAR SHOULD NOT BE CLASSIFIED AS INCOME/EXPENSE ---")
# -------------------------------------------------------------------
check("Udhar NOT income - diya", "maine Harsh ko 500 udhar diya", "udhar",
      {"NOT transaction": lambda r: r["intent"] == "udhar" and not r.get("transactions")})

check("Udhar NOT expense - liya", "maine 1000 udhar liya Sharma se", "udhar",
      {"NOT transaction": lambda r: r["intent"] == "udhar" and not r.get("transactions")})

# -------------------------------------------------------------------
print("\n--- 27. STAFF SHOULD NOT BE CLASSIFIED AS EXPENSE ---")
# -------------------------------------------------------------------
check("Staff NOT expense - salary", "Raju ki salary 15000", "staff",
      {"NOT transaction": lambda r: r["intent"] == "staff" and not r.get("transactions")})

check("Staff NOT expense - tankhah", "staff ki tankhah 8000 di", "staff",
      {"NOT transaction": lambda r: r["intent"] == "staff" and not r.get("transactions")})

# -------------------------------------------------------------------
print("\n--- 28. REPLY LANGUAGE DETECTION ---")
# -------------------------------------------------------------------
check("Reply Hindi", "चावल बेचा ₹500", "transaction",
      {"Reply in Hindi": has_reply_containing("आमदनी")})

check("Reply English", "sold rice 500", "transaction",
      {"Reply in English": has_reply_containing("recorded")})

check("Reply Telugu", "బియ్యం అమ్మాను ₹500", "transaction",
      {"Reply in Telugu": has_reply_containing("ఆదాయం")})

check("Reply Tamil", "அரிசி விற்றேன் ₹600", "transaction",
      {"Reply in Tamil": has_reply_containing("வருமானம்")})

check("Reply Gujarati", "ચોખા વેચ્યું ₹400", "transaction",
      {"Reply in Gujarati": has_reply_containing("આવક")})

check("Reply Kannada", "ಅಕ್ಕಿ ಮಾರಿದೆ ₹500", "transaction",
      {"Reply in Kannada": has_reply_containing("ಆದಾಯ")})

check("Reply Bengali", "চাল বিক্রি ₹500", "transaction",
      {"Reply in Bengali": has_reply_containing("আয়")})


# =====================================================================
# RESULTS SUMMARY
# =====================================================================
print("\n" + "="*80)
print(f"  RESULTS: {PASS} PASSED | {FAIL} FAILED | {PASS+FAIL} TOTAL")
print("="*80)

if FAILURES:
    print("\n--- DETAILED FAILURES ---")
    for i, (name, text, errors, result) in enumerate(FAILURES, 1):
        print(f"\n  [{i}] {name}")
        print(f"      Input: \"{text}\"")
        print(f"      Got intent: '{result['intent']}'")
        print(f"      Reply: '{result.get('reply', '')[:80]}'")
        if result.get("transactions"):
            print(f"      Transactions: {result['transactions']}")
        if result.get("udhar"):
            print(f"      Udhar: {result['udhar']}")
        if result.get("staff_actions"):
            print(f"      Staff: {result['staff_actions']}")
        if result.get("inventory"):
            print(f"      Inventory: {result['inventory']}")
        for e in errors:
            print(f"     {e}")
    print()

if FAIL == 0:
    print("\n  ★★★ ALL TESTS PASSED - PARSER IS 100% WORKING ★★★\n")
else:
    print(f"\n  ⚠️  {FAIL} tests need attention. See details above.\n")
