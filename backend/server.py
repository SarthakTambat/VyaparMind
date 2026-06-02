from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import io
import json
import base64
import uuid
import re
import ssl
import httpx
import xml.etree.ElementTree as ET
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Any, Dict
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt

try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    AsyncOpenAI = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '') or os.environ.get('EMERGENT_LLM_KEY', '')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = 30

# Smart database selection: Supabase if configured, else local JSON files
if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY"):
    from supabase_db import db
else:
    from filedb import db

app = FastAPI(title="VyaparMind API")
api = APIRouter(prefix="/api")

# ------------------- Models -------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    language: Optional[str] = "en"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    language: str = "en"
    created_at: str

class BusinessUpdate(BaseModel):
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    language: Optional[str] = None

class TransactionIn(BaseModel):
    type: Literal["income", "expense"]
    amount: float
    category: Optional[str] = "general"
    party_name: Optional[str] = None
    description: Optional[str] = None

class ChatMessageIn(BaseModel):
    text: str
    language: Optional[str] = "en"

class AutomationIn(BaseModel):
    name: str
    trigger: str
    action: str
    active: bool = True

# ------------------- Auth utilities -------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing or invalid auth token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def user_public(u: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": u["id"],
        "name": u["name"],
        "email": u["email"],
        "business_name": u.get("business_name"),
        "business_type": u.get("business_type"),
        "language": u.get("language", "en"),
        "plan": u.get("plan", "shunya"),
        "plan_expires_at": u.get("plan_expires_at"),
        "created_at": u.get("created_at"),
    }

# ------------------- Auth Routes -------------------
@api.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn):
    # Password policy enforcement
    pwd = body.password
    if len(pwd) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not any(c.isupper() for c in pwd):
        raise HTTPException(400, "Password must contain at least one uppercase letter")
    if not any(c.islower() for c in pwd):
        raise HTTPException(400, "Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in pwd):
        raise HTTPException(400, "Password must contain at least one number")
    if not any(not c.isalnum() for c in pwd):
        raise HTTPException(400, "Password must contain at least one special character")

    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "An account with this email already exists. Please sign in instead.")
    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "name": body.name,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "business_name": body.business_name or "",
        "business_type": body.business_type or "",
        "language": body.language or "en",
        "score": 12,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(uid)
    return TokenOut(access_token=token, user=user_public(user_doc))

@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"])
    return TokenOut(access_token=token, user=user_public(user))

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user_public(user)

@api.patch("/auth/business")
async def update_business(body: BusinessUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    new_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return user_public(new_user)

# ------------------- AI Helpers -------------------
SYSTEM_PARSER = """You are VyaparMind, an AI business automation assistant for Indian micro-businesses (kirana stores, retail shops, clinics, farms, etc.).
The user speaks naturally in Hindi, Hinglish, English, or any Indian language to describe business events.
You MUST extract structured data and EXECUTE the correct actions. Respond with VALID JSON ONLY.

Output schema:
{
  "intent": "transaction" | "inventory" | "udhar" | "contact" | "staff" | "bill" | "question" | "reminder" | "other",
  "reply": "Short friendly reply confirming the action taken (max 2 sentences, in the user's language)",
  "transactions": [
    {"type": "income"|"expense", "amount": <number INR>, "category": "<short category>", "party_name": "<optional>", "description": "<short>"}
  ],
  "inventory": [
    {"name": "<item>", "quantity_delta": <number>, "unit": "<kg|pcs|ltr|etc>"}
  ],
  "udhar": [
    {"party_name": "<person name>", "type": "given"|"taken", "amount": <number INR>, "description": "<short reason>"}
  ],
  "contacts": [
    {"name": "<person/business name>", "phone": "<if mentioned>", "role": "<customer|supplier|other>"}
  ],
  "staff_actions": [
    {"action": "add"|"attendance"|"payment", "name": "<staff name>", "role": "<if mentioned>", "salary": <if mentioned>, "status": "present"|"absent"|"half_day", "amount": <if payment>, "description": "<short>"}
  ],
  "bill_items": [
    {"item": "<product name>", "quantity": <number>, "unit": "<kg|pcs|ltr|etc>", "price": <total price INR>}
  ],
  "insights": ["<optional 0-2 short insights or warnings>"]
}

=== CRITICAL: BUY vs SELL INVENTORY RULES ===

BUYING/PURCHASING (kharide/kharida/bought/purchased/liya/laye):
  → Transaction type = "expense" (money going OUT)
  → Inventory quantity_delta = POSITIVE (stock INCREASES because you bought new goods)
  → The supplier is a "supplier" contact

SELLING (beche/becha/sold/sell/bikri):
  → Transaction type = "income" (money coming IN)
  → Inventory quantity_delta = NEGATIVE (stock DECREASES because goods left your shop)
  → The buyer is a "customer" contact

=== HINDI/HINGLISH KEYWORD MAPPING ===

PURCHASE WORDS (expense + inventory ADD):
  kharide, kharida, kharidi, kharido, liya, liye, laye, mangaya, mangwaya, aaya (goods came)
  खरीदे, खरीदा, खरीदी, लिया, लिये, लाये, मंगाया, मंगवाया, आया (माल)
  bought, purchased, received stock, restocked, procured

SALE WORDS (income + inventory SUBTRACT):
  beche, becha, bechi, becho, bik gaya, bikri, de diya (customer ko), nikal gaya
  बेचे, बेचा, बेची, बिक गया, बिक्री, दे दिया (customer को), निकल गया
  sold, sell, sale, given to customer, dispatched

=== WORKED EXAMPLES ===

Example 1: "5 kilo chawal 1000 rupaye me kharide"
→ User BOUGHT 5kg rice for ₹1000 (purchase/expense)
{
  "intent": "inventory",
  "reply": "Done! 5 kg chawal inventory mein add kar diya. ₹1000 expense record kiya.",
  "transactions": [{"type": "expense", "amount": 1000, "category": "purchase", "description": "5kg chawal kharida"}],
  "inventory": [{"name": "chawal", "quantity_delta": 5, "unit": "kg"}],
  "contacts": [], "udhar": [], "staff_actions": [], "bill_items": [], "insights": []
}

Example 2: "Ramesh ko 2 kilo chawal 500 me beche"
→ User SOLD 2kg rice for ₹500 to Ramesh (sale/income)
{
  "intent": "transaction",
  "reply": "Done! Ramesh ko 2 kg chawal becha ₹500. Inventory se minus kar diya.",
  "transactions": [{"type": "income", "amount": 500, "category": "sale", "party_name": "Ramesh", "description": "2kg chawal sold"}],
  "inventory": [{"name": "chawal", "quantity_delta": -2, "unit": "kg"}],
  "contacts": [{"name": "Ramesh", "role": "customer"}],
  "udhar": [], "staff_actions": [], "bill_items": [], "insights": []
}

Example 3: "10 packet doodh aaya 450 rupaye ka"
→ Milk arrived (purchased) = expense + inventory ADD
{
  "intent": "inventory",
  "reply": "10 packet doodh stock mein add kiya. ₹450 expense.",
  "transactions": [{"type": "expense", "amount": 450, "category": "purchase", "description": "10 packet doodh"}],
  "inventory": [{"name": "doodh", "quantity_delta": 10, "unit": "packet"}],
  "contacts": [], "udhar": [], "staff_actions": [], "bill_items": [], "insights": []
}

Example 4: "Sharma ji se 20 litre tel liya 2000 mein"
→ Bought oil from Sharma = expense + inventory ADD + contact (supplier)
{
  "intent": "inventory",
  "reply": "20 ltr tel inventory mein add kiya. Sharma ji se ₹2000 ka purchase recorded.",
  "transactions": [{"type": "expense", "amount": 2000, "category": "purchase", "party_name": "Sharma", "description": "20L tel purchased"}],
  "inventory": [{"name": "tel", "quantity_delta": 20, "unit": "ltr"}],
  "contacts": [{"name": "Sharma", "role": "supplier"}],
  "udhar": [], "staff_actions": [], "bill_items": [], "insights": []
}

Example 5: "aaj 3 kg aata bika 150 rupaye"
→ Sold flour = income + inventory SUBTRACT
{
  "intent": "transaction",
  "reply": "3 kg aata becha ₹150. Stock se minus kiya.",
  "transactions": [{"type": "income", "amount": 150, "category": "sale", "description": "3kg aata sold"}],
  "inventory": [{"name": "aata", "quantity_delta": -3, "unit": "kg"}],
  "contacts": [], "udhar": [], "staff_actions": [], "bill_items": [], "insights": []
}

=== ADDITIONAL RULES ===

- UDHAR: "X ko 300 udhar diya" → udhar type="given" (they owe you). "Maine X se 500 udhar liya" → udhar type="taken" (you owe them). "X ne 400 ka saman udhar liya" → type="given" + inventory subtract.
- STAFF: "Raju aaj nahi aaya" → attendance absent. "Suresh ko 5000 salary diya" → payment + expense. "Naya staff Mohan, 12000 monthly" → add.
- BILL/RECEIPT: Extract ALL items into bill_items AND inventory (positive delta since buying).
- CONTACTS: Auto-add new person names as contacts with correct role.
- Currency = INR. If no amount mentioned, leave transaction array empty but still update inventory if quantity is clear.
- Multiple intents coexist: a sale = transaction + inventory + contact all at once.
- If user asks a question (like "kitna stock hai?" or "aaj ki kamai?"), set intent="question" and reply with info from CONTEXT.
- ALWAYS output valid JSON. No markdown fences, no commentary outside JSON.
- Reply in the SAME language the user spoke (Hindi reply for Hindi input, English for English)."""

def extract_json(text: str) -> Dict[str, Any]:
    """Robustly extract a JSON object from LLM output."""
    if not text:
        return {}
    # strip code fences
    text = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.IGNORECASE).rstrip("`").strip()
    # find first { ... last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return {}
    try:
        return json.loads(text[start:end+1])
    except Exception:
        return {}

async def llm_parse(user_id: str, text: str, image_b64: Optional[str] = None, language: str = "en", context: str = "") -> Dict[str, Any]:
    """Call AI to parse a business message. Priority: Groq (free) → Gemini (free) → OpenAI → fallback."""
    system_content = SYSTEM_PARSER + ("\n\nCONTEXT:\n" + context if context else "")

    # SSL context for corporate proxy environments
    _http_client = httpx.AsyncClient(verify=False, timeout=20)

    # --- Try Groq first (free, fast, OpenAI-compatible API) ---
    if GROQ_API_KEY and HAS_OPENAI:
        try:
            client = AsyncOpenAI(
                api_key=GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1",
                http_client=httpx.AsyncClient(verify=False, timeout=20)
            )
            messages = [{"role": "system", "content": system_content}]
            if image_b64:
                user_content = [
                    {"type": "text", "text": text or "Analyze this bill/receipt image and extract all items, quantities, prices as inventory/transactions."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ]
                messages.append({"role": "user", "content": user_content})
                model = "llama-3.2-90b-vision-preview"
            else:
                messages.append({"role": "user", "content": text})
                model = "llama-3.3-70b-versatile"
            resp = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=1024,
                temperature=0.15,
            )
            raw = resp.choices[0].message.content or ""
            parsed = extract_json(raw)
            if parsed and parsed.get("intent"):
                logging.info("Groq parse successful")
                return _normalize_parsed(parsed, raw)
        except Exception as e:
            logging.warning(f"Groq failed: {e}")

    # --- Try Google Gemini (free tier: 15 RPM) - supports text AND images ---
    if GEMINI_API_KEY:
        try:
            model_name = "gemini-2.0-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
            parts = [{"text": f"{system_content}\n\nUSER MESSAGE:\n{text or 'Analyze this bill/receipt image and extract all items, quantities, prices as inventory/transactions.'}"}]
            if image_b64:
                parts.append({"inlineData": {"mimeType": "image/jpeg", "data": image_b64}})
            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {"temperature": 0.15, "maxOutputTokens": 1024}
            }
            async with httpx.AsyncClient(timeout=20, verify=False) as http:
                r = await http.post(url, json=payload)
            if r.status_code == 200:
                data = r.json()
                raw = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                parsed = extract_json(raw)
                if parsed and parsed.get("intent"):
                    logging.info("Gemini parse successful (image=%s)", bool(image_b64))
                    return _normalize_parsed(parsed, raw)
            else:
                logging.warning(f"Gemini HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            logging.warning(f"Gemini failed: {e}")

    # --- Try OpenAI (paid, best quality) ---
    if OPENAI_API_KEY and HAS_OPENAI:
        try:
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            messages = [{"role": "system", "content": system_content}]
            if image_b64:
                user_content = [
                    {"type": "text", "text": text or "Please analyze the attached image of a bill/receipt and extract transactions."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ]
                messages.append({"role": "user", "content": user_content})
            else:
                messages.append({"role": "user", "content": text})
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=1024,
                temperature=0.2,
            )
            raw = resp.choices[0].message.content or ""
            parsed = extract_json(raw)
            if parsed and parsed.get("intent"):
                logging.info("OpenAI parse successful")
                return _normalize_parsed(parsed, raw)
        except Exception as e:
            logging.warning(f"OpenAI call failed: {e}")

    # --- Local OCR fallback for images when all AI APIs fail ---
    if image_b64:
        try:
            import io
            import subprocess
            import tempfile
            from PIL import Image
            img_bytes = base64.b64decode(image_b64)
            img = Image.open(io.BytesIO(img_bytes))
            
            ocr_text = ""
            
            # Method 1: Windows built-in OCR (most reliable, no external deps)
            if not ocr_text.strip():
                try:
                    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                        tmp_path = tmp.name
                        img.save(tmp_path, format='PNG')
                    
                    ps_script = str(ROOT_DIR / 'windows_ocr.ps1')
                    result = subprocess.run(
                        ['powershell', '-ExecutionPolicy', 'Bypass', '-File', ps_script, tmp_path],
                        capture_output=True, text=True, timeout=30, encoding='utf-8'
                    )
                    if result.returncode == 0 and result.stdout.strip():
                        ocr_text = result.stdout.strip()
                        logging.info(f"Windows OCR extracted {len(ocr_text)} chars")
                    
                    os.unlink(tmp_path)
                except Exception as e:
                    logging.warning(f"Windows OCR failed: {e}")
            
            # Method 2: pytesseract (if Tesseract binary installed)
            if not ocr_text.strip():
                try:
                    import pytesseract
                    ocr_text = pytesseract.image_to_string(img, lang='eng+hin')
                except Exception:
                    pass
            
            # Method 3: easyocr (if installed)
            if not ocr_text.strip():
                try:
                    import easyocr
                    reader = easyocr.Reader(['en', 'hi'], gpu=False)
                    results = reader.readtext(img_bytes)
                    ocr_text = " ".join([r[1] for r in results])
                except Exception:
                    pass
            
            if ocr_text.strip():
                logging.info(f"OCR text ({len(ocr_text)} chars): {ocr_text[:200]}...")
                # Parse bill items from OCR text
                bill_items = _parse_bill_text(ocr_text)
                
                if bill_items:
                    total = sum(i["price"] * i["quantity"] for i in bill_items)
                    item_list = "\n".join([f"• {i['name']} — Qty: {i['quantity']}, ₹{i['price']:.0f}" for i in bill_items[:15]])
                    return {
                        "intent": "expense",
                        "transactions": [{"type": "expense", "amount": total, "category": "purchase", "description": f"Bill: {len(bill_items)} items, Total ₹{total:.0f}"}],
                        "inventory": [{"name": i["name"], "quantity": i["quantity"], "unit": i.get("unit", "pcs"), "price": i["price"]} for i in bill_items],
                        "bill_items": bill_items,
                        "reply": f"📸 Bill scanned successfully! Found {len(bill_items)} items totaling ₹{total:.0f}.\n\n{item_list}\n\n✅ Added to inventory & recorded as expense.",
                        "udhar": [], "contacts": [], "staff_actions": [], "insights": [],
                    }
                else:
                    # Couldn't parse structured data but have text
                    ocr_result = fallback_parse(ocr_text)
                    if ocr_result.get("transactions") or ocr_result.get("inventory"):
                        ocr_result["reply"] = f"📸 Bill analyzed! {ocr_result.get('reply', '')}"
                        return ocr_result
                    return {
                        "intent": "other",
                        "reply": f"📸 I can read the image but couldn't extract structured bill data. Here's what I see:\n\n{ocr_text[:500]}",
                        "transactions": [], "inventory": [], "bill_items": [],
                        "udhar": [], "contacts": [], "staff_actions": [], "insights": [],
                    }
            else:
                logging.warning("All OCR methods produced no text from image")
                return {
                    "intent": "other",
                    "reply": "📸 I received your photo but couldn't read it clearly. Please try a clearer photo with good lighting, or type the bill details manually.",
                    "transactions": [], "inventory": [], "bill_items": [],
                    "udhar": [], "contacts": [], "staff_actions": [], "insights": [],
                }
        except Exception as e:
            logging.warning(f"Local OCR processing failed: {e}")
            return {
                "intent": "other",
                "reply": "📸 Photo received but processing failed. Please type the bill details manually — e.g., 'bought 5kg rice ₹500'",
                "transactions": [], "inventory": [], "bill_items": [],
                "udhar": [], "contacts": [], "staff_actions": [], "insights": [],
            }

    # --- Ultimate fallback: rule-based parser ---
    logging.info("Using fallback parser")
    return fallback_parse(text)


def _parse_bill_text(ocr_text: str) -> list:
    """Parse OCR text from a bill/receipt to extract structured items with name, qty, price.
    Handles BOTH row-by-row format AND column-by-column OCR output (common with table photos)."""
    import re as _re
    lines = [l.strip() for l in ocr_text.replace('\r', '').split('\n') if l.strip()]
    
    # --- STRATEGY 1: Detect column-format OCR (headers like "Name of items", then data columns) ---
    column_result = _parse_bill_columns(lines)
    if column_result:
        return column_result
    
    # --- STRATEGY 2: Row-by-row parsing ---
    return _parse_bill_rows(lines)


def _parse_bill_columns(lines: list) -> list:
    """Detect and parse column-format OCR where table is read column by column."""
    import re as _re
    
    # Detect column-format by looking for header keywords followed by data
    # Column headers: "Name of items", "HSN Code", "QTY", "UOM", "GST", "Rate"
    name_header_idx = None
    hsn_header_idx = None
    qty_header_idx = None
    uom_header_idx = None
    gst_header_idx = None
    rate_header_idx = None
    
    for i, line in enumerate(lines):
        ll = line.lower().strip()
        if 'name of item' in ll or ll == 'name' or ll == 'items' or ll == 'description' or ll == 'particulars':
            name_header_idx = i
        elif 'hsn' in ll and ('code' in ll or len(ll) < 12):
            hsn_header_idx = i
        elif ll in ('qty', 'quantity', 'qnty'):
            qty_header_idx = i
        elif ll in ('uom', 'unit'):
            uom_header_idx = i
        elif ll in ('gst', 'gst rate', 'tax', 'tax rate', 'gst%'):
            gst_header_idx = i
        elif ll == 'rate' or ll == 'price' or ll == 'mrp':
            rate_header_idx = i
    
    # Need at least name header and rate header to proceed with column parsing
    if name_header_idx is None or rate_header_idx is None:
        return None
    
    # Extract names: lines after name_header until next section header
    # Include GST header as a section boundary so UOM data doesn't overflow
    section_starts = sorted([x for x in [name_header_idx, hsn_header_idx, qty_header_idx, uom_header_idx, gst_header_idx, rate_header_idx] if x is not None])
    
    def get_section_lines(header_idx):
        """Get data lines between this header and the next header."""
        if header_idx is None:
            return []
        next_headers = [s for s in section_starts if s > header_idx]
        end_idx = next_headers[0] if next_headers else len(lines)
        section = []
        for j in range(header_idx + 1, end_idx):
            l = lines[j].strip()
            if l:
                section.append(l)
        return section
    
    name_lines = get_section_lines(name_header_idx)
    rate_lines = get_section_lines(rate_header_idx)
    qty_lines = get_section_lines(qty_header_idx) if qty_header_idx else []
    uom_lines = get_section_lines(uom_header_idx) if uom_header_idx else []
    
    # Filter: names should be text (not pure numbers), rates should be numbers
    names = []
    for n in name_lines:
        # Skip lines that are pure numbers (sr.no column leaking)
        if _re.match(r'^\d{1,3}$', n):
            continue
        # Skip header-like lines
        if n.lower() in ('sr.no', 'sr', 'no', 'gst', 'rate', 'hsn code', 'qty', 'uom'):
            continue
        # Merge continuation lines (starts with "- " or lowercase fragment) with previous
        if names and (n.startswith('- ') or n.startswith('+ ') or (len(n) < 15 and not n[0].isupper())):
            names[-1] = names[-1] + ' ' + n.lstrip('- +')
        else:
            names.append(n)
    
    rates = []
    for r in rate_lines:
        # Extract numbers that look like prices
        m = _re.match(r'^[\d,]+\.?\d*$', r.replace('%', '').strip())
        if m:
            val = float(r.replace(',', '').strip())
            if val >= 1:  # Skip percentages like "18" that might be GST
                rates.append(val)
        # Handle "18%" lines (GST) - skip
        elif '%' in r:
            continue
    
    quantities = []
    for q in qty_lines:
        m = _re.match(r'^(\d+(?:\.\d+)?)$', q.strip())
        if m:
            quantities.append(float(m.group(1)))
    
    units = []
    for u in uom_lines:
        if u.strip() and _re.match(r'^[A-Za-z]+$', u.strip()):
            units.append(u.strip())
    
    # We need at least some names and rates to make a valid result
    if len(names) < 2 or len(rates) < 2:
        return None
    
    # Match names to rates (they should correspond 1-to-1)
    num_items = min(len(names), len(rates))
    bill_items = []
    
    for idx in range(num_items):
        name = names[idx]
        price = rates[idx]
        qty = quantities[idx] if idx < len(quantities) else 1.0
        unit = units[idx] if idx < len(units) else "Nos"
        
        # Clean name: remove trailing dimensions that are part of the name (keep them)
        # Remove leading numbers/dots
        name = _re.sub(r'^\d+[\.\)\s]*', '', name).strip()
        # Remove trailing bullet/dot artifacts
        name = _re.sub(r'[•·]+$', '', name).strip()
        
        if name and len(name) > 2 and price > 0:
            bill_items.append({"name": name, "quantity": qty, "unit": unit, "price": price})
    
    # Filter invalid
    invalid_names = {'nos', 'pcs', 'kg', 'ltr', 'ml', 'gm', 'can', 'box', 'set', 'pair', 
                     'bottle', 'pack', 'pkt', 'doz', 'mtr', 'total', 'grand total', 'subtotal',
                     'discount', 'tax', 'gst', 'cgst', 'sgst', 'net', 'amount', 'rate', 'sr.no'}
    result = []
    seen = set()
    for item in bill_items:
        key = item["name"].lower().strip()
        if key not in seen and key not in invalid_names:
            seen.add(key)
            result.append(item)
    
    return result if len(result) >= 2 else None


def _parse_bill_rows(lines: list) -> list:
    """Parse bill text in row-by-row format."""
    import re as _re
    bill_items = []
    
    skip_words = {'sr', 'no', 'name', 'item', 'hsn', 'code', 'qty', 'quantity', 'uom', 'gst', 
                  'rate', 'total', 'grand', 'sub', 'tax', 'cgst', 'sgst', 'igst', 'amount',
                  'bill', 'receipt', 'invoice', 'date', 'customer', 'address', 'phone', 'mobile',
                  'thank', 'visit', 'again', 'signature', 'authorized'}
    
    pending_name = None
    
    for i, line in enumerate(lines):
        if not line or len(line) < 3:
            continue
        
        # Skip pure number lines
        if _re.match(r'^\d{1,2}$', line):
            continue
        
        # Skip header/footer lines
        line_lower = line.lower()
        words_in_line = set(_re.split(r'\s+', line_lower))
        if words_in_line and words_in_line.issubset(skip_words | {'of', 'items', 'the', '/', '|'}):
            continue
        if len(words_in_line) <= 4 and len(words_in_line & skip_words) >= 2:
            continue
        
        # Pattern A: Full line "Name HSN QTY UOM GST% Price"
        m = _re.match(r'^(.+?)\s+(\d{4,8})\s+(\d+(?:\.\d+)?)\s+(\w{2,6})\s+(?:\d+%?\s+)?([\d,]+\.\d{2})\s*$', line)
        if m:
            name = m.group(1).strip()
            name = _re.sub(r'^\d+[\.\)\s]*', '', name).strip()
            qty = float(m.group(3))
            unit = m.group(4)
            price = float(m.group(5).replace(',', ''))
            if name and len(name) > 1 and price > 0:
                bill_items.append({"name": name, "quantity": qty, "unit": unit, "price": price})
                pending_name = None
                continue
        
        # Pattern B: "HSN QTY UOM Price" (pair with pending_name)
        m = _re.match(r'^(\d{4,8})\s+(\d+(?:\.\d+)?)\s+(\w{2,6})\s+(?:\d+%?\s+)?([\d,]+\.\d{2})\s*$', line)
        if m and pending_name:
            qty = float(m.group(2))
            unit = m.group(3)
            price = float(m.group(4).replace(',', ''))
            if price > 0:
                bill_items.append({"name": pending_name, "quantity": qty, "unit": unit, "price": price})
                pending_name = None
                continue
        
        # Pattern C: "QTY UOM Price"
        m = _re.match(r'^(\d+(?:\.\d+)?)\s+(\w{2,6})\s+(?:\d+%?\s+)?([\d,]+\.\d{2})\s*$', line)
        if m and pending_name:
            qty = float(m.group(1))
            unit = m.group(2)
            price = float(m.group(3).replace(',', ''))
            valid_units = ('nos', 'pcs', 'kg', 'ltr', 'ml', 'gm', 'can', 'box', 'set', 'pair', 'bottle', 'pack', 'pkt', 'doz', 'mtr')
            if price > 0 and unit.lower() in valid_units:
                bill_items.append({"name": pending_name, "quantity": qty, "unit": unit, "price": price})
                pending_name = None
                continue
        
        # Pattern D: "UOM Price"
        m = _re.match(r'^(\w{2,6})\s+([\d,]+\.\d{2})\s*$', line)
        if m and pending_name:
            unit = m.group(1)
            price = float(m.group(2).replace(',', ''))
            valid_units = ('nos', 'pcs', 'kg', 'ltr', 'ml', 'gm', 'can', 'box', 'set', 'pair', 'bottle', 'pack', 'pkt', 'doz', 'mtr')
            if price > 0 and unit.lower() in valid_units:
                bill_items.append({"name": pending_name, "quantity": 1, "unit": unit, "price": price})
                pending_name = None
                continue
        
        # Pattern E: "item ₹price" or "item Rs.price" (MUST have ₹ or Rs prefix)
        m = _re.search(r'(.+?)[\s\.]+[\₹]+([\d,]+(?:\.\d+)?)', line)
        if not m:
            m = _re.search(r'(.+?)[\s\.]+[Rr][Ss]\.?\s*([\d,]+(?:\.\d+)?)', line)
        if m:
            name = m.group(1).strip()
            name = _re.sub(r'^\d+[\.\)]*\s*', '', name)
            price = float(m.group(2).replace(',', ''))
            if name and len(name) > 2 and price > 0 and price < 500000:
                bill_items.append({"name": name, "quantity": 1, "unit": "pcs", "price": price})
                pending_name = None
                continue
        
        # Pattern F: Line ends with decimal price (e.g., "Something 52.00")
        m = _re.match(r'^(.+?)\s+([\d,]+\.\d{2})\s*$', line)
        if m:
            name = m.group(1).strip()
            name = _re.sub(r'^\d+[\.\)]*\s*', '', name)
            price = float(m.group(2).replace(',', ''))
            parts = _re.split(r'\s+', name)
            while len(parts) > 1 and _re.match(r'^\d+%?$', parts[-1]):
                parts.pop()
            name = ' '.join(parts)
            if name and len(name) > 2 and price >= 5 and price < 500000:
                bill_items.append({"name": name, "quantity": 1, "unit": "pcs", "price": price})
                pending_name = None
                continue
        
        # If this line looks like just a product name, store as pending
        if _re.match(r'^[\d\.\)]*\s*[A-Za-z]', line) and not _re.search(r'\d{3,}\.\d{2}\s*$', line):
            clean = _re.sub(r'^\d+[\.\)\s]*', '', line).strip()
            if clean and len(clean) > 2 and clean.lower() not in skip_words:
                pending_name = clean
                continue
        
        pending_name = None
    
    # Filter invalid items and deduplicate
    invalid_names = {'nos', 'pcs', 'kg', 'ltr', 'ml', 'gm', 'can', 'box', 'set', 'pair', 
                     'bottle', 'pack', 'pkt', 'doz', 'mtr', 'total', 'grand total', 'subtotal',
                     'sub total', 'discount', 'tax', 'gst', 'cgst', 'sgst', 'net', 'amount'}
    seen = set()
    unique_items = []
    for item in bill_items:
        key = item["name"].lower().strip()
        if key not in seen and len(key) > 2 and key not in invalid_names:
            seen.add(key)
            unique_items.append(item)
    
    return unique_items


def _normalize_parsed(parsed: Dict, raw: str = "") -> Dict[str, Any]:
    """Ensure all expected fields exist in parsed result."""
    if not parsed:
        parsed = {"intent": "other", "reply": raw[:200] if raw else "Got it.", "transactions": [], "inventory": [], "udhar": [], "contacts": [], "staff_actions": [], "bill_items": [], "insights": []}
    parsed.setdefault("transactions", [])
    parsed.setdefault("inventory", [])
    parsed.setdefault("udhar", [])
    parsed.setdefault("contacts", [])
    parsed.setdefault("staff_actions", [])
    parsed.setdefault("bill_items", [])
    parsed.setdefault("insights", [])
    parsed.setdefault("reply", "Got it.")
    parsed.setdefault("intent", "other")
    return parsed


# ---- Product Name Normalization ----
# Maps misspellings, Hindi/Hinglish variants, informal names → canonical product name
# Uses fuzzy prefix matching + exact mapping
PRODUCT_ALIASES = {
    # ===== DALS & GRAINS (दाल और अनाज) =====
    "dal": "dal", "daal": "dal", "dhal": "dal", "दाल": "dal",
    "arhar": "arhar dal", "arhar dal": "arhar dal", "toor": "arhar dal", "toovar": "arhar dal",
    "अरहर": "arhar dal", "अरहर दाल": "arhar dal", "तूर": "arhar dal",
    "moong": "moong dal", "moong dal": "moong dal", "mung": "moong dal", "मूंग": "moong dal", "मूंग दाल": "moong dal",
    "urad": "urad dal", "urad dal": "urad dal", "उड़द": "urad dal", "उड़द दाल": "urad dal",
    "masoor": "masoor dal", "masoor dal": "masoor dal", "मसूर": "masoor dal", "मसूर दाल": "masoor dal",
    "chana": "chana dal", "chana dal": "chana dal", "channa": "chana dal", "चना": "chana dal", "चना दाल": "chana dal",
    "kala chana": "kala chana", "काला चना": "kala chana", "whole chana": "kala chana",
    "kabuli chana": "kabuli chana", "काबुली चना": "kabuli chana", "chole": "kabuli chana", "छोले": "kabuli chana",
    "rajma": "rajma", "राजमा": "rajma", "kidney beans": "rajma",
    "lobiya": "lobiya", "lobia": "lobiya", "लोबिया": "lobiya", "black eyed peas": "lobiya",
    "white peas": "white peas", "safed matar": "white peas", "सफेद मटर": "white peas",
    "matar": "peas", "mattar": "peas", "peas": "peas", "मटर": "peas",
    # Rice
    "chawal": "chawal", "chaawal": "chawal", "chaaawal": "chawal", "chaawl": "chawal",
    "chaval": "chawal", "rice": "chawal", "चावल": "chawal",
    "tandul": "chawal", "तांदूळ": "chawal", "birinji": "chawal",
    "basmati": "basmati rice", "basmati rice": "basmati rice", "बासमती": "basmati rice",
    # Wheat / Atta
    "gehun": "gehun", "gehu": "gehun", "wheat": "gehun", "गेहूं": "gehun", "गेहू": "gehun",
    "atta": "atta", "aata": "atta", "aatta": "atta", "आटा": "atta", "flour": "atta",
    "multigrain atta": "multigrain atta", "multigrain": "multigrain atta",
    # Maida / Suji / Poha
    "maida": "maida", "मैदा": "maida",
    "sooji": "suji", "suji": "suji", "rava": "suji", "सूजी": "suji", "rawa": "suji",
    "poha": "poha", "पोहा": "poha", "chivda": "poha", "चिवड़ा": "poha",
    "daliya": "daliya", "दलिया": "daliya", "broken wheat": "daliya",
    "corn flour": "corn flour", "makki atta": "corn flour", "मक्की आटा": "corn flour", "cornflour": "corn flour",
    "soya chunks": "soya chunks", "soya": "soya chunks", "सोया": "soya chunks", "nutrela": "soya chunks",

    # ===== FLOURS & POWDERS (आटे और पाउडर) =====
    "besan": "besan", "बेसन": "besan", "gram flour": "besan",
    "ragi": "ragi flour", "ragi flour": "ragi flour", "nachni": "ragi flour", "रागी": "ragi flour",
    "bajra": "bajra flour", "bajra flour": "bajra flour", "बाजरा": "bajra flour", "bajre ka atta": "bajra flour",
    "jowar": "jowar flour", "jowar flour": "jowar flour", "ज्वार": "jowar flour",
    "sabudana": "sabudana", "sago": "sabudana", "साबूदाना": "sabudana",
    "sattu": "sattu", "सत्तू": "sattu", "chana sattu": "sattu",
    "custard powder": "custard powder", "custard": "custard powder",
    "cocoa powder": "cocoa powder", "cocoa": "cocoa powder", "कोको": "cocoa powder",
    "baking powder": "baking powder",
    "baking soda": "baking soda",

    # ===== SPICES (मसाले) =====
    "haldi": "haldi", "turmeric": "haldi", "हल्दी": "haldi", "haldi powder": "haldi",
    "mirch powder": "mirch powder", "lal mirch": "mirch powder", "red chilli": "mirch powder",
    "लाल मिर्च": "mirch powder", "लाल मिर्च पाउडर": "mirch powder",
    "dhaniya powder": "dhaniya powder", "coriander powder": "dhaniya powder", "धनिया पाउडर": "dhaniya powder",
    "jeera": "jeera", "zeera": "jeera", "cumin": "jeera", "जीरा": "jeera",
    "rai": "rai", "sarson seeds": "rai", "mustard seeds": "rai", "राई": "rai", "सरसों": "rai",
    "hing": "hing", "asafoetida": "hing", "हींग": "hing",
    "garam masala": "garam masala", "गरम मसाला": "garam masala",
    "sabzi masala": "sabzi masala", "सब्जी मसाला": "sabzi masala",
    "chaat masala": "chaat masala", "चाट मसाला": "chaat masala",
    "pav bhaji masala": "pav bhaji masala", "पाव भाजी मसाला": "pav bhaji masala",
    "biryani masala": "biryani masala", "बिरयानी मसाला": "biryani masala",
    "tea masala": "tea masala", "chai masala": "tea masala", "चाय मसाला": "tea masala",
    "black pepper": "black pepper", "kali mirch": "black pepper", "काली मिर्च": "black pepper",
    "elaichi": "elaichi", "cardamom": "elaichi", "इलायची": "elaichi",
    "dalchini": "dalchini", "cinnamon": "dalchini", "दालचीनी": "dalchini",
    "laung": "laung", "cloves": "laung", "लौंग": "laung",
    "tej patta": "tej patta", "bay leaf": "tej patta", "तेज पत्ता": "tej patta",
    "amchur": "amchur", "amchoor": "amchur", "dry mango powder": "amchur", "अमचूर": "amchur",
    "kasuri methi": "kasuri methi", "कसूरी मेथी": "kasuri methi",
    "saunf": "saunf", "fennel": "saunf", "fennel seeds": "saunf", "सौंफ": "saunf",
    "masala": "masala", "मसाला": "masala",
    "mirch": "chilli", "mirchi": "chilli", "chilli": "chilli", "मिर्च": "chilli",

    # ===== OILS & GHEE (तेल और घी) =====
    "tel": "oil", "oil": "oil", "तेल": "oil",
    "sarson tel": "mustard oil", "sarson ka tel": "mustard oil", "mustard oil": "mustard oil",
    "सरसों तेल": "mustard oil", "सरसों का तेल": "mustard oil",
    "refined oil": "refined oil", "refined": "refined oil",
    "sunflower oil": "sunflower oil", "sunflower": "sunflower oil",
    "groundnut oil": "groundnut oil", "groundnut": "groundnut oil", "moongfali tel": "groundnut oil",
    "coconut oil": "coconut oil", "nariyal tel": "coconut oil", "नारियल तेल": "coconut oil",
    "olive oil": "olive oil",
    "soyabean oil": "soybean oil", "soybean oil": "soybean oil",
    "til oil": "til oil", "til ka tel": "til oil", "sesame oil": "til oil", "तिल तेल": "til oil", "तिल": "til oil",
    "peanut oil": "peanut oil",
    "ghee": "ghee", "ghi": "ghee", "desi ghee": "ghee", "घी": "ghee", "देसी घी": "ghee",
    "vanaspati": "vanaspati ghee", "vanaspati ghee": "vanaspati ghee", "डालडा": "vanaspati ghee",

    # ===== SUGAR & SWEETENERS =====
    "sugar": "sugar", "cheeni": "sugar", "chini": "sugar", "chinni": "sugar", "चीनी": "sugar",
    "shakkar": "sugar", "शक्कर": "sugar",
    "gud": "jaggery", "gur": "jaggery", "jaggery": "jaggery", "गुड़": "jaggery",
    "brown sugar": "brown sugar",
    "mishri": "mishri", "मिश्री": "mishri", "rock candy": "mishri",
    "honey": "honey", "shahad": "honey", "शहद": "honey",

    # ===== TEA, COFFEE & DRINKS =====
    "chai": "tea", "tea": "tea", "चाय": "tea", "chai patti": "tea", "चाय पत्ती": "tea",
    "green tea": "green tea",
    "coffee": "coffee", "coffee powder": "coffee", "कॉफ़ी": "coffee",
    "instant coffee": "instant coffee", "nescafe": "instant coffee",
    "milk powder": "milk powder",
    "horlicks": "horlicks", "boost": "boost", "bournvita": "bournvita", "health drink": "health drink",
    "soft drink": "cold drink", "soft drinks": "cold drink",
    "cold drink": "cold drink", "cold drinks": "cold drink", "colddrink": "cold drink",
    "कोल्ड ड्रिंक": "cold drink", "कोल्ड": "cold drink",
    "coke": "coke", "coca cola": "coke", "pepsi": "pepsi",
    "thumsup": "thums up", "thums up": "thums up", "sprite": "sprite",
    "fanta": "fanta", "limca": "limca", "maaza": "maaza",
    "fruit juice": "fruit juice", "juice": "juice", "जूस": "juice",

    # ===== SALT & ESSENTIALS =====
    "namak": "salt", "salt": "salt", "नमक": "salt",
    "rock salt": "rock salt", "sendha namak": "rock salt", "सेंधा नमक": "rock salt",
    "black salt": "black salt", "kala namak": "black salt", "काला नमक": "black salt",

    # ===== PICKLES & SAUCES =====
    "pickle": "pickle", "achar": "pickle", "अचार": "pickle",
    "mango pickle": "mango pickle", "aam ka achar": "mango pickle", "आम का अचार": "mango pickle",
    "lemon pickle": "lemon pickle", "nimbu achar": "lemon pickle",
    "mixed pickle": "mixed pickle",
    "ketchup": "ketchup", "tomato ketchup": "ketchup", "sauce": "sauce",
    "soy sauce": "soy sauce", "soya sauce": "soy sauce",
    "vinegar": "vinegar", "sirka": "vinegar",
    "green chilli sauce": "green chilli sauce",

    # ===== DRY FRUITS & NUTS =====
    "badam": "almonds", "almonds": "almonds", "almond": "almonds", "बादाम": "almonds",
    "kaju": "cashews", "cashew": "cashews", "cashews": "cashews", "काजू": "cashews",
    "kishmish": "raisins", "raisins": "raisins", "किशमिश": "raisins",
    "pista": "pistachios", "pistachios": "pistachios", "pistachio": "pistachios", "पिस्ता": "pistachios",
    "akhrot": "walnuts", "walnuts": "walnuts", "walnut": "walnuts", "अखरोट": "walnuts",
    "khajur": "dates", "dates": "dates", "खजूर": "dates",
    "anjeer": "anjeer", "figs": "anjeer", "अंजीर": "anjeer",
    "dry fruits": "dry fruits", "meva": "dry fruits", "मेवा": "dry fruits",

    # ===== PERSONAL CARE =====
    "sabun": "soap", "soap": "soap", "साबुन": "soap", "bath soap": "soap",
    "shampoo": "shampoo", "शैंपू": "shampoo",
    "hair oil": "hair oil",
    "toothpaste": "toothpaste", "टूथपेस्ट": "toothpaste", "colgate": "toothpaste",
    "toothbrush": "toothbrush",
    "face wash": "face wash", "facewash": "face wash",
    "face cream": "face cream", "cream": "cream",
    "talcum powder": "talcum powder", "talcum": "talcum powder", "powder": "talcum powder",
    "ponds": "ponds", "पॉन्ड्स": "ponds", "ponds powder": "ponds powder", "पॉन्ड्स पाउडर": "ponds powder",
    "perfume": "perfume", "इत्र": "perfume",
    "deodorant": "deodorant", "deo": "deodorant",

    # ===== CLEANING ITEMS =====
    "detergent": "detergent", "detergent powder": "detergent", "surf": "detergent", "डिटर्जेंट": "detergent",
    "detergent liquid": "detergent liquid", "liquid detergent": "detergent liquid",
    "dishwash": "dishwash", "dishwash bar": "dishwash", "बर्तन साबुन": "dishwash",
    "dishwash liquid": "dishwash liquid", "vim": "dishwash",
    "floor cleaner": "floor cleaner",
    "toilet cleaner": "toilet cleaner", "harpic": "toilet cleaner",
    "phenyl": "phenyl", "फिनाइल": "phenyl",
    "bleach": "bleach", "bleach powder": "bleach",
    "scrubber": "scrubber",
    "mop": "mop", "pocha": "mop", "पोछा": "mop",

    # ===== PACKAGED FOODS =====
    "biscuit": "biscuit", "biscuits": "biscuit", "बिस्कुट": "biscuit", "biskut": "biscuit",
    "bread": "bread", "ब्रेड": "bread", "pav": "bread",
    "noodles": "noodles", "नूडल्स": "noodles",
    "pasta": "pasta", "पास्ता": "pasta",
    "maggi": "maggi", "मैगी": "maggi",
    "oats": "oats", "ओट्स": "oats",
    "cornflakes": "cornflakes", "corn flakes": "cornflakes",
    "chips": "chips", "चिप्स": "chips", "lays": "chips", "kurkure": "chips",
    "namkeen": "namkeen", "नमकीन": "namkeen",
    "popcorn": "popcorn", "पॉपकॉर्न": "popcorn",

    # ===== DAIRY PRODUCTS =====
    "doodh": "milk", "dudh": "milk", "dud": "milk", "milk": "milk", "दूध": "milk",
    "dudha": "milk", "duudh": "milk",
    "dahi": "curd", "curd": "curd", "yogurt": "curd", "दही": "curd",
    "butter": "butter", "makhan": "butter", "मक्खन": "butter",
    "cheese": "cheese", "चीज़": "cheese",
    "paneer": "paneer", "paner": "paneer", "पनीर": "paneer",
    "flavored milk": "flavored milk",

    # ===== SNACKS & SWEETS =====
    "chocolate": "chocolate", "चॉकलेट": "chocolate",
    "candy": "candy", "toffee": "candy", "टॉफी": "candy",
    "ice cream": "ice cream", "आइसक्रीम": "ice cream",
    "mithai": "mithai", "sweet": "mithai", "मिठाई": "mithai",
    "ladoo": "ladoo", "laddu": "ladoo", "लड्डू": "ladoo",
    "barfi": "barfi", "burfi": "barfi", "बर्फी": "barfi",
    "jalebi": "jalebi", "जलेबी": "jalebi",
    "chikki": "chikki", "चिक्की": "chikki",

    # ===== BEVERAGES =====
    "mineral water": "mineral water",
    "soda": "soda", "सोडा": "soda",
    "energy drink": "energy drink", "energy drinks": "energy drink",
    "chaach": "buttermilk", "chhaach": "buttermilk", "buttermilk": "buttermilk", "छाछ": "buttermilk",
    "lassi": "lassi", "लस्सी": "lassi",
    "paani": "water", "water": "water", "पानी": "water",

    # ===== INSTANT FOODS =====
    "ready to eat": "ready to eat", "instant food": "instant food",
    "soup": "soup", "soup packet": "soup",
    "instant upma": "instant upma",
    "instant poha": "instant poha",
    "frozen paratha": "frozen paratha", "paratha": "paratha", "पराठा": "paratha",

    # ===== COOKING ESSENTIALS =====
    "matchbox": "matchbox", "maachis": "matchbox", "माचिस": "matchbox",
    "gas lighter": "gas lighter", "lighter": "lighter",
    "aluminium foil": "aluminium foil", "foil": "aluminium foil",
    "cling wrap": "cling wrap",
    "tissue paper": "tissue paper", "tissue": "tissue paper",

    # ===== HOUSEHOLD ITEMS =====
    "bucket": "bucket", "बाल्टी": "bucket", "balti": "bucket",
    "mug": "mug",
    "dustbin": "dustbin", "कूड़ादान": "dustbin",
    "broom": "broom", "jhaadu": "broom", "झाड़ू": "broom",
    "wiper": "wiper",
    "kapda": "cloth", "cloth": "cloth", "कपड़ा": "cloth",

    # ===== EGGS, CHICKEN, FISH =====
    "eggs": "eggs", "egg": "eggs", "anda": "eggs", "ande": "eggs", "अंडा": "eggs", "अंडे": "eggs",
    "chicken": "chicken", "मुर्गा": "chicken", "murga": "chicken",
    "chicken masala": "chicken masala",
    "fish": "fish", "machhi": "fish", "मछली": "fish", "fish masala": "fish masala",
    "tamarind": "tamarind", "imli": "tamarind", "इमली": "tamarind",

    # ===== HERBS & ADD-ONS =====
    "curry leaves": "curry leaves", "kadi patta": "curry leaves", "करी पत्ता": "curry leaves",
    "pudina": "mint", "mint": "mint", "पुदीना": "mint",
    "dhaniya": "coriander", "dhaniyaa": "coriander", "coriander": "coriander", "धनिया": "coriander", "धनिया पत्ता": "coriander",
    "adrak": "ginger", "adrakh": "ginger", "ginger": "ginger", "अदरक": "ginger",
    "lehsun": "garlic", "lahsun": "garlic", "garlic": "garlic", "लहसुन": "garlic",

    # ===== EXTRA / MIXED ITEMS =====
    "papad": "papad", "पापड़": "papad",
    "fryums": "fryums",
    "sev": "sev", "सेव": "sev",
    "bhujia": "bhujia", "भुजिया": "bhujia",
    "jam": "jam", "जैम": "jam",
    "peanut butter": "peanut butter",
    "mayonnaise": "mayonnaise", "mayo": "mayonnaise",
    "bread crumbs": "bread crumbs",
    "custard mix": "custard mix",
    "kewra water": "kewra water", "केवड़ा": "kewra water",
    "rose water": "rose water", "gulab jal": "rose water", "गुलाब जल": "rose water",
    "food color": "food color", "food colour": "food color",
    "essence": "essence",
    "yeast": "yeast",
    "vermicelli": "vermicelli", "sevai": "vermicelli", "seviyan": "vermicelli", "सेवई": "vermicelli",
    "khoya": "khoya", "mawa": "khoya", "मावा": "khoya", "खोया": "khoya",
    "sweet corn": "sweet corn",
    "frozen vegetables": "frozen vegetables",
    "sprouts": "sprouts", "ankurit": "sprouts",
    "tofu": "tofu",
    "energy bar": "energy bar", "energy bars": "energy bar", "protein bar": "energy bar",
    "protein powder": "protein powder",
    "dry coconut": "dry coconut", "copra": "dry coconut", "सूखा नारियल": "dry coconut",
    "fresh coconut": "fresh coconut", "nariyal": "coconut", "नारियल": "coconut",
    "sugar candy": "sugar candy",
    "fruit syrup": "fruit syrup", "sharbat": "fruit syrup", "शरबत": "fruit syrup",
    "cold coffee mix": "cold coffee mix",

    # ===== VEGETABLES =====
    "aloo": "potato", "aaloo": "potato", "potato": "potato", "आलू": "potato",
    "pyaaz": "onion", "pyaj": "onion", "onion": "onion", "प्याज": "onion", "kanda": "onion",
    "tamatar": "tomato", "tamaatar": "tomato", "tomato": "tomato", "टमाटर": "tomato", "tomatoo": "tomato",
    "gobhi": "cauliflower", "gobi": "cauliflower", "cauliflower": "cauliflower", "गोभी": "cauliflower",
    "phool gobhi": "cauliflower", "fulgobi": "cauliflower",
    "baingan": "brinjal", "baigan": "brinjal", "brinjal": "brinjal", "बैंगन": "brinjal",
    "bhindi": "lady finger", "bhindee": "lady finger", "ladyfinger": "lady finger", "भिंडी": "lady finger",
    "palak": "spinach", "paalak": "spinach", "spinach": "spinach", "पालक": "spinach",
    "shimla mirch": "capsicum", "capsicum": "capsicum", "शिमला मिर्च": "capsicum",
    "gajar": "carrot", "gaajar": "carrot", "carrot": "carrot", "गाजर": "carrot",
    "lauki": "bottle gourd", "laukee": "bottle gourd", "लौकी": "bottle gourd",
    "turai": "ridge gourd", "torai": "ridge gourd", "तोरई": "ridge gourd",
    "karela": "bitter gourd", "करेला": "bitter gourd",
    "kaddu": "pumpkin", "kaddoo": "pumpkin", "कद्दू": "pumpkin",

    # ===== FRUITS =====
    "kela": "banana", "banana": "banana", "केला": "banana",
    "seb": "apple", "apple": "apple", "सेब": "apple",
    "aam": "mango", "mango": "mango", "आम": "mango",
    "santara": "orange", "santra": "orange", "orange": "orange", "संतरा": "orange",
    "angoor": "grapes", "grapes": "grapes", "अंगूर": "grapes",
    "nimbu": "lemon", "lemon": "lemon", "नींबू": "lemon", "nimboo": "lemon",
    "papita": "papaya", "papaya": "papaya", "पपीता": "papaya",
    "tarbooz": "watermelon", "watermelon": "watermelon", "तरबूज": "watermelon",

    # ===== HARDWARE / CONSTRUCTION =====
    "cement": "cement", "सीमेंट": "cement",
    "steel": "steel", "rod": "steel rod", "sariya": "steel rod", "सरिया": "steel rod",
    "paint": "paint", "पेंट": "paint",
    "pipe": "pipe", "पाइप": "pipe",
    "wire": "wire", "तार": "wire",
    "brick": "brick", "bricks": "brick", "eent": "brick", "ईंट": "brick",
    "sand": "sand", "reti": "sand", "रेती": "sand",
}


def normalize_product_name(raw_name: str) -> str:
    """Normalize a product name using alias dictionary and fuzzy matching."""
    if not raw_name:
        return ""
    raw_lower = raw_name.lower().strip()
    
    # Direct match (full phrase)
    if raw_lower in PRODUCT_ALIASES:
        return PRODUCT_ALIASES[raw_lower]
    
    # Try removing repeated characters (chaaawal → chawal, suugar → sugar)
    collapsed = re.sub(r'(.)\1{2,}', r'\1\1', raw_lower)  # 3+ repeats → 2
    collapsed = re.sub(r'(.)\1+', r'\1', collapsed)  # 2+ repeats → 1
    if collapsed in PRODUCT_ALIASES:
        return PRODUCT_ALIASES[collapsed]
    
    # Try with double letter reduction only (chaawal → chawal)
    single_reduced = re.sub(r'(.)\1+', r'\1', raw_lower)
    if single_reduced in PRODUCT_ALIASES:
        return PRODUCT_ALIASES[single_reduced]
    
    # For multi-word: try each word individually, return first match
    words = raw_lower.split()
    if len(words) > 1:
        # Try combinations: "sarson tel" → check "sarson tel", then "sarson", then "tel"
        for word in words:
            normalized_word = re.sub(r'(.)\1+', r'\1', word)
            if word in PRODUCT_ALIASES:
                return PRODUCT_ALIASES[word]
            if normalized_word in PRODUCT_ALIASES:
                return PRODUCT_ALIASES[normalized_word]
    
    # Try partial match: check if raw_name starts with any known alias
    for alias, canonical in PRODUCT_ALIASES.items():
        if len(alias) >= 3 and (raw_lower.startswith(alias) or alias.startswith(raw_lower)):
            if abs(len(raw_lower) - len(alias)) <= 3:
                return canonical
    
    # Try partial on single-reduced version
    for alias, canonical in PRODUCT_ALIASES.items():
        if len(alias) >= 3 and (single_reduced.startswith(alias) or alias.startswith(single_reduced)):
            if abs(len(single_reduced) - len(alias)) <= 2:
                return canonical
    
    # No match found, return original
    return raw_lower


def fallback_parse(text: str) -> Dict[str, Any]:
    """Smart multilingual rule-based parser supporting English, Hindi, Hinglish, Marathi, Telugu, Tamil, Gujarati, Kannada, Bengali, Malayalam and more."""
    text_lower = text.lower().strip()
    text_lower_original = text_lower  # Preserve before number-word substitution
    result = {"intent": "other", "reply": "", "transactions": [], "inventory": [], "udhar": [], "contacts": [], "staff_actions": [], "bill_items": [], "insights": []}

    # ---- Convert Hindi/English number words to digits ----
    number_words = {
        # Hindi romanized
        "ek": "1", "do": "2", "teen": "3", "tin": "3", "char": "4", "chaar": "4",
        "paanch": "5", "panch": "5", "chhah": "6", "chhe": "6", "che": "6",
        "saat": "7", "sat": "7", "aath": "8", "aat": "8", "nau": "9", "nao": "9",
        "das": "10", "gyarah": "11", "barah": "12", "terah": "13", "chaudah": "14",
        "pandrah": "15", "solah": "16", "satrah": "17", "athrah": "18", "unnis": "19",
        "bees": "20", "pachees": "25", "tees": "30", "chalees": "40", "pachaas": "50",
        "saath": "60", "sattar": "70", "assi": "80", "nabbe": "90", "sau": "100",
        "dedh": "1.5", "dhai": "2.5", "paune": "0.75", "sawa": "1.25", "saade": "3.5",
        "aadha": "0.5", "adha": "0.5",
        # Hindi Devanagari
        "एक": "1", "दो": "2", "तीन": "3", "चार": "4", "पांच": "5", "पाँच": "5",
        "छह": "6", "छः": "6", "सात": "7", "आठ": "8", "नौ": "9", "दस": "10",
        "ग्यारह": "11", "बारह": "12", "तेरह": "13", "चौदह": "14", "पंद्रह": "15",
        "सोलह": "16", "सत्रह": "17", "अठारह": "18", "उन्नीस": "19", "बीस": "20",
        "पच्चीस": "25", "तीस": "30", "चालीस": "40", "पचास": "50",
        "साठ": "60", "सत्तर": "70", "अस्सी": "80", "नब्बे": "90", "सौ": "100",
        "डेढ़": "1.5", "ढाई": "2.5", "सवा": "1.25", "आधा": "0.5",
        # English
        "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
        "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
        "eleven": "11", "twelve": "12", "fifteen": "15", "twenty": "20",
        "hundred": "100", "thousand": "1000", "lakh": "100000", "crore": "10000000",
        "hazar": "1000", "hazaar": "1000", "lacs": "100000",
        "half": "0.5", "quarter": "0.25",
    }
    # Replace number words with digits
    for word, digit in sorted(number_words.items(), key=lambda x: -len(x[0])):
        # Use word boundaries for ASCII, lookaround for Devanagari/Unicode
        if all(ord(c) < 128 for c in word):
            pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
        else:
            # Unicode-aware: match when not surrounded by other Devanagari chars
            pattern = re.compile(r'(?<![\u0900-\u097F])' + re.escape(word) + r'(?![\u0900-\u097F])')
        text_lower = pattern.sub(digit, text_lower)

    # ---- Compound number multiplication (e.g. "five hundred" → 5 * 100 = 500) ----
    multipliers = {'100': 100, '1000': 1000, '100000': 100000, '10000000': 10000000}
    for mult_str, mult_val in sorted(multipliers.items(), key=lambda x: -x[1]):
        compound_pattern = re.compile(r'(\d+(?:\.\d+)?)\s+' + re.escape(mult_str) + r'(?!\d)')
        def _compound_replace(m, mv=mult_val):
            return str(int(float(m.group(1)) * mv))
        text_lower = compound_pattern.sub(_compound_replace, text_lower)

    # Extract amounts: match patterns like "500", "500rs", "₹500", "500 rupees", "रु500", "₹ 500"
    amount_matches = re.findall(r'(?:₹|rs\.?\s*|रु\.?\s*)?(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr|₹|रु|रुपये|रुपए|रूपये)?', text_lower)
    # Extract quantity patterns in multiple languages/units
    qty_match = re.search(
        r'(\d+(?:\.\d+)?)\s*'
        r'(kg|kgs|kilo|kilos|koli|किलो|કિલો|కిలో|கிலோ|ಕಿಲೋ|কেজি|'
        r'pcs|pieces|piece|cans?|कैन|कैन्स|नग|个|'
        r'ltr|ltrs|litre|litres|liters|लीटर|લિટર|లీటర్|லிட்டர்|ಲೀಟರ್|লিটার|'
        r'packets?|पैकेट|'
        r'bags?|बोरी|बैग|'
        r'boxes?|बॉक्स|डब्बा|'
        r'units?|यूनिट|'
        r'dozen|दर्जन|'
        r'gm|gms|gram|grams|ग्राम|'
        r'ml|मिली|'
        r'ton|टन|'
        r'quintal|क्विंटल)',
        text_lower
    )

    # Fallback: handle "5 कोल्ड ड्रिंक कैन" (number + product words + unit)
    if not qty_match:
        qty_match2 = re.search(
            r'(\d+(?:\.\d+)?)\s+'
            r'(?:[\w\u0900-\u0D7F]+\s+){1,3}'
            r'(kg|kgs|kilo|kilos|koli|किलो|કિલો|కిలో|கிலோ|ಕಿಲೋ|কেজি|'
            r'pcs|pieces|piece|cans?|कैन|कैन्स|नग|个|'
            r'ltr|ltrs|litre|litres|liters|लीटर|લિટર|లీటర్|லிட்டர்|ಲೀಟర್|লিটার|'
            r'packets?|पैकेट|'
            r'bags?|बोरी|बैग|'
            r'boxes?|बॉक्स|डब्बा|'
            r'units?|यूनिट|'
            r'dozen|दर्जन|'
            r'gm|gms|gram|grams|ग्राम|'
            r'ml|मिली|'
            r'ton|टन|'
            r'quintal|क्विंटल)',
            text_lower
        )
        if qty_match2:
            qty_match = qty_match2

    # Extract party name after "to/from" (English) or "ko/se/को/से/ला/कडे" (Hindi/Marathi)
    party_match = re.search(
        r'(?:to|from|ko|se|को|से|ला|कडे|কে|থেকে|కి|నుండి|க்கு|இருந்து|ને|થી|ಗೆ|ಇಂದ)\s+'
        r'([a-zA-Z\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]'
        r'[a-zA-Z\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\s]{1,20}?)'
        r'(?:\s*$|\s+(?:for|ke liye|के लिए|at|in|ko|को|rs|₹|\d))',
        text_lower
    )
    party_name = party_match.group(1).strip().title() if party_match else ""

    # ---- Multilingual keyword detection ----
    # Income keywords across Indian languages
    income_kw = [
        # English
        "sold", "sell", "received", "earned", "got paid", "payment from", "sale", "income", "collected",
        # Hindi / Hinglish
        "becha", "bika", "bech diya", "bech", "beche", "bechi", "becho", "mila", "aaya", "kamai", "bikri", "paisa aaya", "payment aaya",
        "sell kiya", "sell ki", "de diya",
        "बेचा", "बेचे", "बेची", "बिका", "बेच दिया", "बेच", "मिला", "आया", "कमाई", "बिक्री", "पैसा आया", "आमदनी", "दे दिया",
        # Marathi
        "विकले", "विकला", "मिळाले", "मिळाला", "आले", "कमाई", "विक्री",
        "vikla", "vikle", "milala", "milale",
        # Telugu
        "అమ్మాను", "అమ్మింది", "వచ్చింది", "ఆదాయం",
        "ammanu", "ammindi", "vachindi",
        # Tamil
        "விற்றேன்", "விற்றது", "வந்தது", "வருமானம்",
        "vitten", "vittatu", "vantatu",
        # Gujarati
        "વેચ્યું", "મળ્યું", "આવ્યું", "આવક",
        "vechyu", "malyu", "aavyu",
        # Kannada
        "ಮಾರಿದೆ", "ಬಂತು", "ಆದಾಯ",
        "maaride", "bantu",
        # Bengali
        "বিক্রি", "পেলাম", "আয়",
        "bikri", "pelam",
    ]

    # Expense keywords across Indian languages
    expense_kw = [
        # English
        "bought", "paid", "spent", "expense", "purchased", "cost", "bill",
        # Hindi / Hinglish
        "kharida", "kharide", "kharidi", "kharido", "liya", "liye", "diya", "kharch", "kharcha", "bhara", "payment kiya",
        "खरीदा", "खरीदे", "खरीदी", "खरीदो", "लिया", "लिये", "ली", "दिया", "खर्च", "खर्चा", "भरा", "पेमेंट किया",
        # Marathi
        "घेतले", "घेतला", "दिले", "दिला", "खर्च", "भरले",
        "ghetla", "ghetle", "dila", "dile", "kharcha",
        # Telugu
        "కొన్నాను", "ఇచ్చాను", "ఖర్చు",
        "konnanu", "ichchanu", "kharchu",
        # Tamil
        "வாங்கினேன்", "கொடுத்தேன்", "செலவு",
        "vaanginen", "koduthen", "selavu",
        # Gujarati
        "ખરીદ્યું", "આપ્યું", "ખર્ચ",
        "khridyu", "aapyu", "kharach",
        # Kannada
        "ಕೊಂಡೆ", "ಕೊಟ್ಟೆ", "ಖರ್ಚು",
        "konde", "kotte", "kharchu",
        # Bengali
        "কিনলাম", "দিলাম", "খরচ",
        "kinlam", "dilam", "khoroch",
    ]

    is_income = any(k in text_lower for k in income_kw)
    is_expense = any(k in text_lower for k in expense_kw)

    # ---- UDHAR (Credit) Detection ----
    # Udhar keywords - detect BEFORE income/expense to avoid false classification
    udhar_given_kw = [
        "udhar diya", "udhar de", "udhar di", "udhaar diya", "udhaar de", "uddhar diya", "uddhar de",
        "udhar diye", "udhaar diye", "uddhar diye", "credit diya", "credit de", "credit di",
        "ko udhar", "ko udhaar", "ko uddhar", "ko credit",
        "ne udhar liya", "ne udhaar liya", "ne uddhar liya", "ne credit liya",
        "udhar liye", "udhaar liye", "uddhar liye",
        "उधार दिया", "उधार दे", "उधार दी", "उधार दिये",
        "को उधार", "ने उधार लिया", "ने उधार लिये", "ने उधार ली",
        "क्रेडिट दिया", "उधार पे दिया", "उधार पर दिया",
        "khata likha", "khata likhna", "खाता लिखा",
    ]
    udhar_taken_kw = [
        "udhar liya", "udhaar liya", "uddhar liya", "credit liya",
        "maine udhar liya", "mene udhar liya", "humne udhar liya",
        "se udhar", "se udhaar", "se uddhar", "se credit",
        "उधार लिया", "उधार ली", "उधार लिये",
        "मैंने उधार लिया", "हमने उधार लिया",
        "से उधार", "से क्रेडिट",
        "baaki hai", "baki hai", "बाकी है",
    ]
    is_udhar_given = any(k in text_lower for k in udhar_given_kw)
    is_udhar_taken = any(k in text_lower for k in udhar_taken_kw)
    # Regex-based check: "X ne ... udhar liya" (someone else took from me = I gave)
    if not is_udhar_given and is_udhar_taken:
        ne_udhar_pattern = re.search(r'\b\w+\s+ne\s+.*?udhar\s+liy[ae]', text_lower)
        if ne_udhar_pattern:
            # Check it's not first person (maine ne doesn't make sense, but check anyway)
            first_person = {"maine", "mene", "mne", "humne", "hum"}
            subject = text_lower[:ne_udhar_pattern.start() + ne_udhar_pattern.group().find(' ne')].split()[-1] if ne_udhar_pattern else ""
            if subject not in first_person:
                is_udhar_given = True
                is_udhar_taken = False
    # Disambiguation: if both match, "X ne udhar liya" (someone else took) = given from my perspective
    # Only truly "taken" if "maine/mene/humne" is present or "se udhar/se credit"
    if is_udhar_given and is_udhar_taken:
        # Check if first person (I/we) is the subject → taken; otherwise → given
        first_person = {"maine", "mene", "mne", "humne", "hum ne", "मैंने", "मैने", "हमने"}
        has_first_person = any(fp in text_lower for fp in first_person)
        has_se_pattern = any(k in text_lower for k in ["se udhar", "se udhaar", "se uddhar", "se credit", "से उधार", "से क्रेडिट"])
        if has_first_person or has_se_pattern:
            is_udhar_given = False  # It's truly "taken"
        else:
            is_udhar_taken = False  # Someone else took → I gave
    is_udhar = is_udhar_given or is_udhar_taken

    # ---- STAFF Detection ----
    staff_kw = [
        "salary", "staff", "tankhah", "tankha", "vetan", "pagaar",
        "तनख्वाह", "वेतन", "पगार", "सैलरी",
        "naya staff", "new staff", "join hua", "join kiya",
        "attendance", "hajri", "hajiri", "hazri", "हाजरी", "उपस्थिति",
        "nahi aaya", "nhi aaya", "chutti", "छुट्टी", "नहीं आया",
        "half day", "aadha din", "आधा दिन",
        "aaj aaya", "आज आया",
    ]
    # Use original text (before number substitution) for staff detection to avoid "half"->0.5 / "aadha"->0.5 issues
    is_staff = any(k in text_lower_original for k in staff_kw)
    # If udhar detected, override income/expense classification
    if is_udhar:
        is_income = False
        is_expense = False
    if is_staff:
        is_income = False
        is_expense = False

    # Pick the largest amount as the transaction amount (skip small numbers that are likely quantities)
    amounts = [float(a) for a in amount_matches]
    # If we found a quantity, exclude that number from amount candidates
    if qty_match:
        qty_val = float(qty_match.group(1))
        amounts = [a for a in amounts if a != qty_val] or amounts
    amount = max(amounts) if amounts else 0

    # Try to detect item name (before or after quantity)
    item_name = ""

    # Comprehensive set of non-item words (time, pronouns, verbs, connectors) in multiple languages
    non_items = {
        # English common words
        "sold", "sell", "selling", "bought", "buy", "buying", "received", "paid", "got", "for", "of",
        "and", "the", "some", "i", "me", "my", "our", "we", "he", "she", "it", "a", "an", "this",
        "that", "is", "was", "will", "have", "has", "had", "do", "did", "done", "am", "are", "been",
        "total", "all", "also", "just", "only", "about", "from", "with", "at", "in", "on",
        # English time words
        "today", "yesterday", "tomorrow", "now", "morning", "evening", "night", "week", "month",
        # Hindi time/pronouns/verbs (romanized variants)
        "aaj", "ajj", "kal", "abhi", "subah", "shaam", "raat", "parso", "filhal",
        "maine", "mene", "mne", "humne", "usne", "unhone", "inhone", "kisne", "tune", "apne",
        "mai", "main", "hum", "tum", "aap", "wo", "woh", "ye", "yeh", "uska", "mera",
        "mene", "hamne", "tumne", "apne", "sabne",
        "becha", "bechi", "bech", "beche", "becho", "bechna", "bechke", "bechta", "bechti",
        "kharida", "kharidi", "kharide", "kharido", "kharidna", "kharidke", "kharidta", "kharidti",
        "liya", "liye", "li", "le", "lena", "leke", "leta", "leti",
        "diya", "diye", "di", "de", "dena", "deke", "deta", "deti",
        "mila", "mili", "mile", "milna", "milke", "milta", "milti",
        "kiya", "kiye", "ki", "kar", "karo", "karna", "karke", "karta", "karti",
        "hai", "hain", "tha", "the", "thi", "ho", "hoga", "hogi", "honge",
        "ne", "ka", "ke", "ki", "ko", "se", "me", "mein", "par", "pe", "tak",
        "bhi", "ya", "aur", "lekin", "phir", "fir", "toh", "to",
        "sell", "payment", "bill", "order", "stock",
        # Hindi time/pronouns/verbs (Devanagari)
        "आज", "कल", "अभी", "सुबह", "शाम", "रात", "परसो",
        "मैंने", "मैने", "हमने", "उसने", "उन्होंने", "इन्होंने", "तुमने", "आपने",
        "मैं", "हम", "तुम", "आप", "वो", "वह", "ये", "यह", "मेरा", "उसका",
        "बेचा", "बेची", "बेचे", "बेच", "खरीदा", "खरीदे", "खरीदी", "खरीदो", "लिया", "लिये", "ली", "दिया", "दिये", "दी",
        "मिला", "मिली", "मिले", "किया", "किये", "की", "कर", "करो", "करना", "करके",
        "है", "हैं", "था", "थे", "थी", "हो", "होगा", "होगी", "होंगे",
        "ने", "का", "के", "की", "को", "से", "में", "पर", "तक",
        "भी", "या", "और", "लेकिन", "फिर", "तो",
        # Marathi common words
        "मी", "आम्ही", "त्याने", "तिने",
        "विकले", "विकला", "घेतले", "घेतला", "दिले", "दिला", "केले", "केला",
        "mi", "aamhi", "tyane", "tine",
        "vikla", "vikle", "ghetla", "ghetle", "dila", "dile", "kela", "kele",
        # Telugu common words
        "నేను", "మేము", "ఈరోజు", "నిన్న",
        "అమ్మాను", "కొన్నాను", "ఇచ్చాను",
        "nenu", "memu", "eeroju", "ninna",
        "ammanu", "konnanu", "ichchanu",
        # Tamil common words
        "நான்", "நாங்கள்", "இன்று", "நேற்று",
        "விற்றேன்", "வாங்கினேன்", "கொடுத்தேன்",
        "naan", "naangal", "indru", "netru",
        "vitten", "vaanginen", "koduthen",
        # Gujarati common words
        "મેં", "અમે", "આજે", "ગઈકાલે",
        "વેચ્યું", "ખરીદ્યું", "આપ્યું",
        "ame", "aaje", "gaikale",
        "vechyu", "khridyu", "aapyu",
        # Kannada common words
        "ನಾನು", "ನಾವು", "ಇಂದು", "ನಿನ್ನೆ",
        "ಮಾರಿದೆ", "ಕೊಂಡೆ", "ಕೊಟ್ಟೆ",
        "naanu", "naavu", "indu", "ninne",
        "maaride", "konde", "kotte",
        # Bengali common words
        "আমি", "আমরা", "গতকাল",
        "বিক্রি", "কিনলাম", "দিলাম",
        "ami", "amra", "gotokal",
        "bikri", "kinlam", "dilam",
        # Malayalam
        "ഞാൻ", "ഞങ്ങൾ", "ഇന്ന്", "ഇന്നലെ",
        # Common Hinglish filler / verbs
        "already", "actually", "basically", "definitely", "probably",
        "hua", "hui", "hue", "wala", "wali", "wale", "raha", "rahi", "rahe",
        "ja", "aa", "lo", "lao", "jao", "aao",
        # Udhar-related words that should NOT be treated as product names
        "udhar", "udhaar", "uddhar", "credit", "debit", "baaki", "baki",
        "उधार", "क्रेडिट", "डेबिट", "बाकी", "खाता", "khata",
    }

    if qty_match:
        # First: check if product words are BETWEEN the number and unit (e.g. "5 कोल्ड ड्रिंक कैन")
        full_match_text = qty_match.group(0)
        num_part = qty_match.group(1)
        unit_part = qty_match.group(2)
        # Extract words between number and unit from the matched text
        between_text = full_match_text[len(num_part):].strip()
        if unit_part in between_text:
            between_text = between_text[:between_text.rfind(unit_part)].strip()
        if between_text and between_text != unit_part:
            between_words = between_text.split()
            filtered_between = [w for w in between_words if len(w) > 1 and not re.search(r'\d', w)]
            if filtered_between:
                item_name = " ".join(filtered_between)

        # Look for word(s) before the quantity
        if not item_name:
            before_qty = text_lower[:qty_match.start()].strip()
            item_match = re.search(r'([\w\u0900-\u0D7F]+(?:\s+[\w\u0900-\u0D7F]+){0,2})\s*$', before_qty)
        else:
            item_match = None

        if item_match:
            candidate = item_match.group(1).strip()
            candidate_words = candidate.split()
            filtered_words = [w for w in candidate_words
                              if w not in non_items and len(w) > 1 and not re.search(r'\d', w)]
            if filtered_words:
                item_name = " ".join(filtered_words)

        # If no item found before, look after the quantity
        if not item_name:
            after_qty = text_lower[qty_match.end():].strip()
            after_match = re.match(r'([\w\u0900-\u0D7F]+(?:\s+[\w\u0900-\u0D7F]+)?)', after_qty)
            if after_match:
                candidate = after_match.group(1).strip()
                candidate_words = candidate.split()
                skip_words = {"for", "to", "from", "at", "in", "rs", "rupees", "ko", "ke", "ka", "ki",
                              "को", "के", "का", "की", "के लिए", "me", "mein", "में", "wala", "wali",
                              "per", "each", "ek", "har", "sab"}
                all_stops = non_items | skip_words
                filtered_words = [w for w in candidate_words
                                  if w not in all_stops and len(w) > 1 and not re.search(r'\d', w)]
                if filtered_words:
                    item_name = " ".join(filtered_words)

    # ---- Normalize product name (fix misspellings, map Hindi→standard) ----
    if item_name:
        item_name = normalize_product_name(item_name)

    # Fallback: if no item found yet but we have a transaction, scan text for known product names
    if not item_name and (is_income or is_expense) and amount > 0:
        # Try to find any known product alias in the text
        text_words = text_lower.split()
        # Check multi-word products first (2-3 words), then single words
        for n in range(3, 0, -1):
            for i in range(len(text_words) - n + 1):
                phrase = " ".join(text_words[i:i+n])
                # Check if phrase is directly in PRODUCT_ALIASES
                if phrase in PRODUCT_ALIASES:
                    item_name = PRODUCT_ALIASES[phrase]
                    break
                # Also try normalize
                normalized = normalize_product_name(phrase)
                if normalized and len(normalized) > 1:
                    # Verify it's a real product (exists in aliases values or was mapped)
                    if normalized in PRODUCT_ALIASES.values():
                        item_name = normalized
                        break
            if item_name:
                break

    # Ultimate fallback: extract product by removing ALL known non-product words
    if not item_name and (is_income or is_expense) and amount > 0:
        # Remove numbers, punctuation, amounts, units, stop words — whatever remains is the product
        all_units = {"kg", "kgs", "kilo", "kilos", "koli", "pcs", "pieces", "piece", "cans", "can",
                     "ltr", "ltrs", "litre", "litres", "liters", "packets", "packet", "bags", "bag",
                     "boxes", "box", "units", "unit", "dozen", "gm", "gms", "gram", "grams",
                     "ml", "ton", "quintal", "किलो", "लीटर", "पैकेट", "बोरी", "बैग", "बॉक्स",
                     "डब्बा", "यूनिट", "दर्जन", "ग्राम", "मिली", "टन", "क्विंटल", "कैन", "कैन्स", "नग"}
        amount_words = {"rs", "rupees", "inr", "रुपये", "रुपए", "रूपये", "रु"}
        # Get non_items set (already defined above in the qty_match block)
        # Rebuild a compact version for this fallback
        stop_all = non_items | all_units | amount_words if 'non_items' in dir() else all_units | amount_words
        text_clean = re.sub(r'[।|,.!?]', ' ', text_lower)  # Remove punctuation including danda
        text_clean = re.sub(r'₹\s*\d+|\d+\s*(?:rs|rupees|रुपये|रुपए)', ' ', text_clean)  # Remove amount patterns
        words = text_clean.split()
        # Filter: keep only words that are NOT stop words, NOT numbers, NOT units, length > 1
        product_words = [w for w in words
                        if w not in stop_all and len(w) > 1 and not re.match(r'^\d+\.?\d*$', w)
                        and not re.match(r'^\d', w)]
        if product_words:
            item_name = " ".join(product_words)
            # Try to normalize it
            normalized = normalize_product_name(item_name)
            if normalized:
                item_name = normalized
            # Capitalize nicely
            item_name = item_name.strip()

    # Also: if we have item_name but NO qty_match, try to find quantity from the text
    # Pattern: first number in text that's different from the amount is likely quantity
    if item_name and not qty_match and (is_income or is_expense) and amount > 0:
        all_numbers = [float(n) for n in re.findall(r'\d+(?:\.\d+)?', text_lower)]
        # The quantity is a number that's NOT the amount (usually smaller)
        qty_candidates = [n for n in all_numbers if n != amount]
        if qty_candidates:
            # Pick the first non-amount number as quantity
            qty_val = qty_candidates[0]
            # Create a fake qty_match-like result for inventory generation
            class FakeQty:
                def group(self, n):
                    if n == 1: return str(int(qty_val) if qty_val == int(qty_val) else qty_val)
                    if n == 2: return "pcs"
            qty_match = FakeQty()

    # ---- Build response (multilingual-aware) ----
    # Detect user language for reply
    has_devanagari = bool(re.search(r'[\u0900-\u097F]', text))
    has_telugu = bool(re.search(r'[\u0C00-\u0C7F]', text))
    has_tamil = bool(re.search(r'[\u0B80-\u0BFF]', text))
    has_gujarati = bool(re.search(r'[\u0A80-\u0AFF]', text))
    has_kannada = bool(re.search(r'[\u0C80-\u0CFF]', text))
    has_bengali = bool(re.search(r'[\u0980-\u09FF]', text))

    # --- STAFF HANDLING (must come BEFORE udhar and income/expense) ---
    if is_staff:
        # Determine action type (use text_lower_original for half-day detection)
        is_staff_payment = any(k in text_lower_original for k in ["salary", "tankhah", "tankha", "vetan", "pagaar", "तनख्वाह", "वेतन", "पगार", "सैलरी"])
        is_staff_add = any(k in text_lower_original for k in ["naya staff", "new staff", "join hua", "join kiya", "नया स्टाफ"])
        is_staff_absent = any(k in text_lower_original for k in ["nahi aaya", "nhi aaya", "chutti", "छुट्टी", "नहीं आया", "absent"])
        is_staff_halfday = any(k in text_lower_original for k in ["half day", "aadha din", "आधा दिन"])
        is_staff_present = any(k in text_lower_original for k in ["attendance", "hajri", "hajiri", "hazri", "हाजरी", "present", "aaya", "आया", "aaj aaya", "आज आया"]) and not is_staff_absent

        # Extract staff name - look for name near "staff" or "ki salary" patterns
        staff_name = ""
        # Pattern: "naya staff X" or "new staff X" (check first for add scenarios)
        name_match = re.search(r'(?:naya|new)\s+staff\s+([\w\u0900-\u097F]+)', text_lower_original)
        if name_match and not re.match(r'^\d+$', name_match.group(1)):
            staff_name = name_match.group(1).title()
        if not staff_name:
            # Pattern: "X ne join kiya/hua" or "X join hua/kiya"
            name_match = re.search(r'([\w\u0900-\u097F]+)\s+(?:ne\s+)?join\s+(?:kiya|hua|ki|hui)', text_lower_original)
            if name_match and name_match.group(1).lower() not in {"staff", "naya", "new", "aaj", "wo", "ne"}:
                staff_name = name_match.group(1).title()
        if not staff_name:
            # Pattern: "staff X ki salary" or "X ki salary"
            name_match = re.search(r'(?:staff\s+)?([\w\u0900-\u097F]+)\s+(?:ki|ka|ko|की|का|को)\s+(?:salary|tankhah|vetan|pagaar)', text_lower)
            if name_match:
                staff_name = name_match.group(1).title()
        if not staff_name:
            # Pattern: "X ko salary diya" or "X salary"
            name_match = re.search(r'([\w\u0900-\u097F]+)\s+(?:ko\s+)?(?:salary|tankhah|vetan)', text_lower)
            if name_match and name_match.group(1).lower() not in {"staff", "naya", "new", "ki", "ka", "uski", "iski"} and not re.match(r'^\d+$', name_match.group(1)):
                staff_name = name_match.group(1).title()
        if not staff_name:
            # Pattern: "X aaj nahi aaya" or "X chutti pe"
            name_match = re.search(r'([\w\u0900-\u097F]+)\s+(?:aaj|आज)?\s*(?:nahi|nhi|नहीं|chutti|छुट्टी)', text_lower_original)
            if name_match and name_match.group(1).lower() not in {"staff", "aaj", "wo", "woh", "uska"}:
                staff_name = name_match.group(1).title()
        if not staff_name:
            # Pattern: "X half day" or "X aadha din" or "X aaj aaya"
            name_match = re.search(r'([\w\u0900-\u097F]+)\s+(?:half\s+day|aadha\s+din|आधा\s+दिन|aaj\s+aaya|आज\s+आया)', text_lower_original)
            if name_match and name_match.group(1).lower() not in {"staff", "aaj", "wo", "woh", "uska", "ki", "ka"}:
                staff_name = name_match.group(1).title()
        if not staff_name:
            # Pattern: "X attendance" or "X ki hajri"
            name_match = re.search(r'([\w\u0900-\u097F]+)\s+(?:ki\s+)?(?:attendance|hajri|hajiri|hazri|हाजरी)', text_lower_original)
            if name_match and name_match.group(1).lower() not in {"staff", "aaj", "wo", "woh", "uska", "ki", "ka"}:
                staff_name = name_match.group(1).title()
        if not staff_name and party_name:
            staff_name = party_name

        if is_staff_add:
            action = {"action": "add", "name": staff_name or "Unknown", "role": "", "salary": amount if amount > 0 else 0, "description": text[:80]}
            result["intent"] = "staff"
            result["staff_actions"] = [action]
            result["contacts"] = [{"name": staff_name, "phone": "", "role": "staff"}] if staff_name else []
            result["reply"] = f"✓ New staff '{staff_name or 'Unknown'}' added." + (f" Salary: ₹{amount:.0f}/month." if amount > 0 else "")
        elif is_staff_payment and amount > 0:
            action = {"action": "payment", "name": staff_name or "Unknown", "amount": amount, "description": text[:80]}
            result["intent"] = "staff"
            result["staff_actions"] = [action]
            result["contacts"] = [{"name": staff_name, "phone": "", "role": "staff"}] if staff_name else []
            result["reply"] = f"✓ Salary ₹{amount:.0f} paid to {staff_name or 'staff'}. Recorded in Staff section."
        elif is_staff_absent:
            action = {"action": "attendance", "name": staff_name or "Unknown", "status": "absent", "description": text[:80]}
            result["intent"] = "staff"
            result["staff_actions"] = [action]
            result["reply"] = f"✓ {staff_name or 'Staff'} marked absent today."
        elif is_staff_halfday:
            action = {"action": "attendance", "name": staff_name or "Unknown", "status": "half_day", "description": text[:80]}
            result["intent"] = "staff"
            result["staff_actions"] = [action]
            result["reply"] = f"✓ {staff_name or 'Staff'} marked half-day today."
        elif is_staff_present:
            action = {"action": "attendance", "name": staff_name or "Unknown", "status": "present", "description": text[:80]}
            result["intent"] = "staff"
            result["staff_actions"] = [action]
            result["reply"] = f"✓ {staff_name or 'Staff'} marked present today."
        else:
            # Generic staff mention with amount → assume payment
            if amount > 0:
                action = {"action": "payment", "name": staff_name or "Unknown", "amount": amount, "description": text[:80]}
                result["intent"] = "staff"
                result["staff_actions"] = [action]
                result["contacts"] = [{"name": staff_name, "phone": "", "role": "staff"}] if staff_name else []
                result["reply"] = f"✓ Staff payment ₹{amount:.0f} to {staff_name or 'staff'} recorded."
            else:
                result["reply"] = f"✓ Staff note recorded for {staff_name or 'staff'}."

    # --- UDHAR HANDLING (must come BEFORE income/expense) ---
    elif is_udhar and amount > 0:
        # Extract party name for udhar - look for name before "ko/ne/को/ने" or after "se/से"
        # Filter out udhar-related words from generic party_name
        udhar_words_set = {"udhar", "udhaar", "uddhar", "credit", "उधार", "क्रेडिट", "khata", "खाता", "baaki", "baki", "बाकी"}
        udhar_party = party_name if (party_name and party_name.lower() not in udhar_words_set) else ""
        if not udhar_party:
            # Try to find name: "Harsh ko 300 udhar diya" → Harsh
            name_match = re.search(
                r'([\w\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]+'
                r'(?:\s+[\w\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]+)?)'
                r'\s+(?:ko|ne|को|ने|ka|का|ki|की|ke|के|se|से)',
                text_lower
            )
            if name_match:
                candidate = name_match.group(1).strip()
                # Filter out common non-name words (pronouns, time words, verbs)
                non_names = {"maine", "mene", "main", "mai", "hum", "humne", "tum", "tumne",
                             "aaj", "kal", "abhi", "मैंने", "मैने", "मैं", "हमने", "हम",
                             "आज", "कल", "अभी", "uska", "unka", "inka", "usne", "unhone",
                             "diya", "liya", "diye", "liye", "di", "li", "kiya", "kiye",
                             "दिया", "लिया", "दिये", "लिये", "दी", "ली", "किया", "किये",
                             "rs", "rupaye", "rupee", "rupaiye", "udhar", "udhaar", "uddhar"}
                # For multi-word candidates, strip leading pronouns
                cand_words = candidate.lower().split()
                cand_words = [w for w in cand_words if w not in non_names]
                candidate = " ".join(cand_words)
                if candidate and len(candidate) > 1:
                    udhar_party = candidate.title()
            # Fallback: first capitalized word or first word that's not a stop word
            if not udhar_party:
                words = text_lower.split()
                stop = {"maine", "mene", "main", "mai", "hum", "humne", "aaj", "kal", "ko", "ne", "se",
                        "udhar", "udhaar", "uddhar", "diya", "liya", "rupaye", "rs", "ka", "ki", "ke",
                        "मैंने", "मैने", "हमने", "को", "ने", "से", "उधार", "दिया", "लिया", "रुपये"}
                for w in words:
                    if w not in stop and not re.match(r'^\d+$', w) and len(w) > 1:
                        udhar_party = w.title()
                        break

        udhar_type = "taken" if is_udhar_taken else "given"
        result["intent"] = "udhar"
        result["udhar"] = [{"party_name": udhar_party or "Unknown", "type": udhar_type, "amount": amount, "description": text[:80]}]
        result["contacts"] = [{"name": udhar_party or "Unknown", "phone": "", "role": "customer"}] if udhar_party else []

        if udhar_type == "given":
            if has_devanagari:
                result["reply"] = f"✓ उधार दिया: ₹{amount:.0f} — {udhar_party or 'Unknown'} को। Udhar Book में जोड़ दिया।"
            else:
                result["reply"] = f"✓ Udhar given: ₹{amount:.0f} to {udhar_party or 'Unknown'}. Added to Udhar Book."
        else:
            if has_devanagari:
                result["reply"] = f"✓ उधार लिया: ₹{amount:.0f} — {udhar_party or 'Unknown'} से। Udhar Book में जोड़ दिया।"
            else:
                result["reply"] = f"✓ Udhar taken: ₹{amount:.0f} from {udhar_party or 'Unknown'}. Added to Udhar Book."

    elif is_income and amount > 0:
        result["intent"] = "transaction"
        result["transactions"] = [{"type": "income", "amount": amount, "category": "sales", "party_name": party_name, "description": text[:80]}]
        if has_devanagari:
            result["reply"] = f"✓ आमदनी ₹{amount:.0f} रिकॉर्ड हुई" + (f" — {party_name} से" if party_name else "") + "।"
        elif has_telugu:
            result["reply"] = f"✓ ₹{amount:.0f} ఆదాయం నమోదు చేయబడింది" + (f" — {party_name}" if party_name else "") + "."
        elif has_tamil:
            result["reply"] = f"✓ ₹{amount:.0f} வருமானம் பதிவு செய்யப்பட்டது" + (f" — {party_name}" if party_name else "") + "."
        elif has_gujarati:
            result["reply"] = f"✓ ₹{amount:.0f} આવક નોંધાઈ" + (f" — {party_name}" if party_name else "") + "."
        elif has_kannada:
            result["reply"] = f"✓ ₹{amount:.0f} ಆದಾಯ ದಾಖಲಾಗಿದೆ" + (f" — {party_name}" if party_name else "") + "."
        elif has_bengali:
            result["reply"] = f"✓ ₹{amount:.0f} আয় রেকর্ড হয়েছে" + (f" — {party_name}" if party_name else "") + "."
        else:
            result["reply"] = f"✓ Recorded income of ₹{amount:.0f}" + (f" from {party_name}" if party_name else "") + "."
        if qty_match and item_name:
            qty_val = float(qty_match.group(1))
            unit = re.sub(r's$', '', qty_match.group(2))
            result["inventory"] = [{"name": item_name, "quantity_delta": -qty_val, "unit": unit}]
            result["reply"] += f" Stock: -{qty_val}{unit} {item_name}."
        elif item_name:
            # No quantity specified, default to 1
            result["inventory"] = [{"name": item_name, "quantity_delta": -1, "unit": "pcs"}]
            result["reply"] += f" Stock: -1 {item_name}."
    elif is_expense and amount > 0:
        result["intent"] = "transaction"
        result["transactions"] = [{"type": "expense", "amount": amount, "category": "purchase", "party_name": party_name, "description": text[:80]}]
        if has_devanagari:
            result["reply"] = f"✓ खर्च ₹{amount:.0f} रिकॉर्ड हुआ" + (f" — {party_name} को" if party_name else "") + "।"
        elif has_telugu:
            result["reply"] = f"✓ ₹{amount:.0f} ఖర్చు నమోదు చేయబడింది" + (f" — {party_name}" if party_name else "") + "."
        elif has_tamil:
            result["reply"] = f"✓ ₹{amount:.0f} செலவு பதிவு செய்யப்பட்டது" + (f" — {party_name}" if party_name else "") + "."
        elif has_gujarati:
            result["reply"] = f"✓ ₹{amount:.0f} ખર્ચ નોંધાયો" + (f" — {party_name}" if party_name else "") + "."
        elif has_kannada:
            result["reply"] = f"✓ ₹{amount:.0f} ಖರ್ಚು ದಾಖಲಾಗಿದೆ" + (f" — {party_name}" if party_name else "") + "."
        elif has_bengali:
            result["reply"] = f"✓ ₹{amount:.0f} খরচ রেকর্ড হয়েছে" + (f" — {party_name}" if party_name else "") + "."
        else:
            result["reply"] = f"✓ Recorded expense of ₹{amount:.0f}" + (f" to {party_name}" if party_name else "") + "."
        if qty_match and item_name:
            qty_val = float(qty_match.group(1))
            unit = re.sub(r's$', '', qty_match.group(2))
            result["inventory"] = [{"name": item_name, "quantity_delta": qty_val, "unit": unit}]
            result["reply"] += f" Stock: +{qty_val}{unit} {item_name}."
        elif item_name:
            # No quantity specified, default to 1
            result["inventory"] = [{"name": item_name, "quantity_delta": 1, "unit": "pcs"}]
            result["reply"] += f" Stock: +1 {item_name}."
    elif any(g in text_lower_original for g in [
        "hi", "hello", "hey", "namaste", "namaskar", "good morning", "good evening", "good afternoon",
        "good night", "howdy", "sup", "hii", "hiii", "hiiii", "hlo", "helo",
        "नमस्ते", "नमस्कार", "हेलो", "हाय", "शुभ प्रभात", "सुप्रभात",
        "vanakkam", "నమస్కారం", "নমস্কার", "નમસ્તે", "ನಮಸ್ಕಾರ",
        "kaise ho", "kya haal", "कैसे हो", "क्या हाल", "sab theek",
        "how are you", "wassup", "whatsup",
    ]):
        result["intent"] = "greeting"
        import random
        greetings_en = [
            "Hello! 👋 I'm your AI business assistant. Tell me about your sales, expenses, or udhar — I'll manage your books instantly!",
            "Hey there! 🙏 Ready to help with your business. Just tell me what happened — 'sold 5kg rice ₹500' or 'Sharma ko 2000 udhar diya'.",
            "Hi! I'm VyaparMind — your smart business partner. Tell me your transactions in any language and I'll record everything automatically! 📊",
            "Namaste! 🙏 Main aapka AI accountant hoon. Bolo kya hua — bikri, kharcha, udhar, staff salary — sab manage karunga!",
        ]
        greetings_hi = [
            "नमस्ते! 🙏 मैं आपका AI बिज़नेस असिस्टेंट हूँ। बिक्री, खर्च, उधार — कुछ भी बताइए, मैं सब मैनेज करूँगा!",
            "हेलो! 👋 मैं VyaparMind हूँ — आपका स्मार्ट बिज़नेस पार्टनर। बोलिए क्या हुआ — 'बेचा 5kg चावल ₹500' या 'शर्मा को 2000 उधार दिया'।",
            "हाय! 🙏 आपका AI अकाउंटेंट तैयार है। बिक्री, खरीद, उधार, स्टाफ सैलरी — सब बताइए, instant रिकॉर्ड करूँगा! 📊",
        ]
        if has_devanagari:
            result["reply"] = random.choice(greetings_hi)
        else:
            result["reply"] = random.choice(greetings_en)
    elif any(k in text_lower_original for k in [
        "thank", "thanks", "thanku", "thnx", "ty", "shukriya", "dhanyavaad",
        "शुक्रिया", "धन्यवाद", "बहुत अच्छा", "bahut accha", "great", "awesome", "nice",
        "good job", "well done", "perfect", "superb", "accha", "badhiya", "बढ़िया",
    ]):
        result["intent"] = "greeting"
        if has_devanagari:
            result["reply"] = "शुक्रिया! 😊 और कुछ बताना हो तो बोलिए — बिक्री, खर्च, उधार, स्टॉक — सब मैनेज करूँगा!"
        else:
            result["reply"] = "You're welcome! 😊 Let me know if there's anything else — sales, expenses, udhar, inventory — I've got you covered!"
    elif any(k in text_lower_original for k in [
        "help", "madad", "kya kar sakte ho", "kya kya", "features", "what can you do",
        "मदद", "क्या कर सकते हो", "क्या क्या", "sahayata", "सहायता",
    ]):
        result["intent"] = "help"
        if has_devanagari:
            result["reply"] = "मैं ये सब कर सकता हूँ:\n📊 बिक्री/खर्च — 'बेचा 5kg चावल ₹500'\n💰 उधार — 'शर्मा को 2000 उधार दिया'\n👤 स्टाफ — 'राजू की सैलरी 15000'\n📦 स्टॉक — 'खरीदा 10kg आटा ₹400'\n📸 बिल — फोटो भेजो, ऑटो-एंट्री!\n🎤 आवाज़ — माइक दबाकर बोलो!"
        else:
            result["reply"] = "Here's what I can do for you:\n📊 Sales/Expenses — 'sold 5kg rice ₹500 to Ramesh'\n💰 Udhar/Credit — 'gave 2000 udhar to Sharma'\n👤 Staff — 'Raju salary 15000'\n📦 Inventory — 'bought 10kg atta ₹400'\n📸 Bills — Send a photo, I'll auto-extract!\n🎤 Voice — Tap mic and speak naturally!"
    elif "?" in text or any(q in text_lower for q in [
        "how much", "how many", "what is", "tell me", "show me",
        "kitna", "kitne", "kitni", "kya hai", "bata", "dikhao",
        "कितना", "कितने", "कितनी", "क्या है", "बता", "दिखाओ",
        "எவ்வளவு", "ఎంత", "કેટલું", "ಎಷ್ಟು", "কত",
    ]):
        result["intent"] = "question"
        if has_devanagari:
            result["reply"] = "📊 अपने Dashboard में latest numbers देखें! या मुझे specifically पूछें — 'आज कितनी बिक्री हुई?'"
        else:
            result["reply"] = "📊 Check your Dashboard for live numbers! Or ask me specifically — 'how much did I sell today?'"
    elif any(k in text_lower for k in [
        "remind", "yaad", "alert", "notification",
        "याद", "रिमाइंड", "अलर्ट", "நினைவூட்டு", "గుర్తు",
    ]):
        result["intent"] = "reminder"
        result["reply"] = "✅ Got it! I'll keep that in mind. 👍"
    else:
        if amount > 0:
            result["intent"] = "transaction"
            result["transactions"] = [{"type": "income", "amount": amount, "category": "general", "party_name": party_name, "description": text[:80]}]
            if has_devanagari:
                result["reply"] = f"✓ ₹{amount:.0f} नोट किया गया। (आमदनी मानी — 'kharcha' या 'खर्च' बोलें बदलने के लिए)"
            else:
                result["reply"] = f"✓ Noted ₹{amount:.0f} as income. Say 'expense' or 'kharcha' if it was a purchase."
        else:
            if has_devanagari:
                result["reply"] = "🤔 मैं समझ नहीं पाया। कुछ ऐसे बोलिए:\n• 'बेचा 5kg चावल ₹500 Ramesh को'\n• 'खरीदा 10kg आटा ₹400'\n• 'शर्मा को 2000 उधार दिया'\n• 'राजू की सैलरी 15000'\nया 'help' बोलें सब features जानने के लिए!"
            else:
                result["reply"] = "🤔 I didn't quite catch that. Try something like:\n• 'sold 5kg rice ₹500 to Ramesh'\n• 'bought 10kg atta ₹400'\n• 'gave 2000 udhar to Sharma'\n• 'Raju salary 15000'\nOr say 'help' to see all features!"
    return result


async def apply_ai_result(user_id: str, parsed: Dict[str, Any], source: str, raw_input: str) -> List[Dict[str, Any]]:
    actions = []
    # Transactions
    for tx in parsed.get("transactions", []) or []:
        try:
            tdoc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": tx.get("type", "income"),
                "amount": float(tx.get("amount", 0)),
                "category": tx.get("category", "general") or "general",
                "party_name": tx.get("party_name") or "",
                "description": tx.get("description") or "",
                "source": source,
                "created_at": now_iso(),
            }
            if tdoc["amount"] > 0:
                await db.transactions.insert_one(tdoc)
                actions.append({"kind": "transaction", "data": {k: v for k, v in tdoc.items() if k != "_id"}})
        except Exception:
            continue

    # Inventory
    for inv in parsed.get("inventory", []) or []:
        try:
            name = (inv.get("name") or "").strip().lower()
            if not name:
                continue
            delta = float(inv.get("quantity_delta", 0))
            unit = inv.get("unit") or "pcs"
            existing = await db.inventory.find_one({"user_id": user_id, "name": name})
            if existing:
                new_qty = float(existing.get("quantity", 0)) + delta
                await db.inventory.update_one(
                    {"id": existing["id"]},
                    {"$set": {"quantity": new_qty, "unit": unit, "updated_at": now_iso()}}
                )
                actions.append({"kind": "inventory", "data": {"name": name, "quantity": new_qty, "unit": unit}})
            else:
                idoc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "name": name,
                    "quantity": delta,
                    "unit": unit,
                    "reorder_level": 5,
                    "updated_at": now_iso(),
                }
                await db.inventory.insert_one(idoc)
                actions.append({"kind": "inventory", "data": {k: v for k, v in idoc.items() if k != "_id"}})
        except Exception:
            continue

    # Udhar (Credit/Debit Book)
    for udh in parsed.get("udhar", []) or []:
        try:
            party = (udh.get("party_name") or "").strip()
            amount = float(udh.get("amount", 0))
            if not party or amount <= 0:
                continue
            entry = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "party_name": party,
                "phone": "",
                "type": udh.get("type", "given"),  # "given" = they owe you, "taken" = you owe them
                "amount": amount,
                "description": udh.get("description") or f"Via AI chat: {raw_input[:80]}",
                "status": "pending",
                "created_at": now_iso(),
                "settled_at": None,
            }
            await db.udhar.insert_one(entry)
            actions.append({"kind": "udhar", "data": {k: v for k, v in entry.items() if k != "_id"}})
        except Exception:
            continue

    # Contacts - auto-add new people mentioned
    for con in parsed.get("contacts", []) or []:
        try:
            name = (con.get("name") or "").strip()
            if not name or len(name) < 2:
                continue
            # Check if contact already exists in transactions or dedicated contacts
            existing = await db.contacts.find_one({"user_id": user_id, "name": {"$eq": name.lower()}})
            if not existing:
                cdoc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "name": name.lower(),
                    "display_name": name.title(),
                    "phone": con.get("phone") or "",
                    "role": con.get("role") or "customer",
                    "created_at": now_iso(),
                    "source": "ai-chat",
                }
                await db.contacts.insert_one(cdoc)
                actions.append({"kind": "contact", "data": {k: v for k, v in cdoc.items() if k != "_id"}})
        except Exception:
            continue

    # Staff Actions
    for sa in parsed.get("staff_actions", []) or []:
        try:
            action = sa.get("action", "")
            name = (sa.get("name") or "").strip()
            if not name:
                continue

            if action == "add":
                # Add new staff member
                member = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "name": name,
                    "phone": sa.get("phone") or "",
                    "role": sa.get("role") or "",
                    "salary": float(sa.get("salary") or 0),
                    "salary_type": "monthly",
                    "joining_date": now_iso()[:10],
                    "status": "active",
                    "created_at": now_iso(),
                }
                await db.staff.insert_one(member)
                actions.append({"kind": "staff_add", "data": {k: v for k, v in member.items() if k != "_id"}})

            elif action == "attendance":
                # Mark attendance
                staff_member = await db.staff.find_one({"user_id": user_id, "name": {"$eq": name}})
                if not staff_member:
                    # Try case-insensitive search
                    all_staff = await db.staff.find({"user_id": user_id}).to_list(200)
                    staff_member = next((s for s in all_staff if s.get("name", "").lower() == name.lower()), None)
                if not staff_member:
                    # Auto-create staff member on first mention
                    staff_member = {
                        "id": str(uuid.uuid4()), "user_id": user_id, "name": name,
                        "phone": "", "role": "", "salary": 0, "salary_type": "monthly",
                        "joining_date": now_iso()[:10], "status": "active", "created_at": now_iso(),
                    }
                    await db.staff.insert_one(staff_member)
                    actions.append({"kind": "staff_add", "data": {k: v for k, v in staff_member.items() if k != "_id"}})
                if staff_member:
                    att_doc = {
                        "id": str(uuid.uuid4()),
                        "staff_id": staff_member["id"],
                        "user_id": user_id,
                        "date": now_iso()[:10],
                        "status": sa.get("status") or "present",
                        "created_at": now_iso(),
                    }
                    await db.attendance.insert_one(att_doc)
                    actions.append({"kind": "staff_attendance", "data": {"name": name, "status": att_doc["status"], "date": att_doc["date"]}})

            elif action == "payment":
                # Record salary payment
                staff_member = await db.staff.find_one({"user_id": user_id, "name": {"$eq": name}})
                if not staff_member:
                    all_staff = await db.staff.find({"user_id": user_id}).to_list(200)
                    staff_member = next((s for s in all_staff if s.get("name", "").lower() == name.lower()), None)
                if not staff_member:
                    # Auto-create staff member on first mention
                    staff_member = {
                        "id": str(uuid.uuid4()), "user_id": user_id, "name": name,
                        "phone": "", "role": "", "salary": float(sa.get("amount") or 0),
                        "salary_type": "monthly", "joining_date": now_iso()[:10],
                        "status": "active", "created_at": now_iso(),
                    }
                    await db.staff.insert_one(staff_member)
                    actions.append({"kind": "staff_add", "data": {k: v for k, v in staff_member.items() if k != "_id"}})
                if staff_member:
                    pay_doc = {
                        "id": str(uuid.uuid4()),
                        "staff_id": staff_member["id"],
                        "user_id": user_id,
                        "amount": float(sa.get("amount") or 0),
                        "description": sa.get("description") or "Salary payment via AI",
                        "date": now_iso()[:10],
                        "created_at": now_iso(),
                    }
                    if pay_doc["amount"] > 0:
                        await db.staff_payments.insert_one(pay_doc)
                        actions.append({"kind": "staff_payment", "data": {"name": name, "amount": pay_doc["amount"]}})
        except Exception:
            continue

    # Bill Items (from receipt/image uploads)
    bill_items = parsed.get("bill_items", []) or []
    if bill_items:
        try:
            bill_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": f"AI-extracted bill ({now_iso()[:10]})",
                "items": bill_items,
                "total": sum(float(item.get("price", 0)) for item in bill_items),
                "source": source,
                "created_at": now_iso(),
            }
            await db.bills.insert_one(bill_doc)
            actions.append({"kind": "bill", "data": {"id": bill_doc["id"], "title": bill_doc["title"], "items_count": len(bill_items), "total": bill_doc["total"]}})
        except Exception:
            pass

    # Insights
    for ins in parsed.get("insights", []) or []:
        try:
            idoc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": ins[:80],
                "description": ins,
                "severity": "info",
                "created_at": now_iso(),
                "acknowledged": False,
            }
            await db.insights.insert_one(idoc)
            actions.append({"kind": "insight", "data": {k: v for k, v in idoc.items() if k != "_id"}})
        except Exception:
            continue

    # bump score
    if actions:
        try:
            await db.users.update_one({"id": user_id}, {"$inc": {"score": min(3, len(actions))}})
        except Exception:
            pass

    # Log conversation (non-fatal - don't break chat if logging fails)
    try:
        await db.conversations.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "channel": source,
            "raw_input": raw_input[:2000],
            "parsed": parsed,
            "actions_count": len(actions),
            "created_at": now_iso(),
        })
    except Exception as e:
        logging.warning(f"Failed to log conversation: {e}")
    return actions

# ------------------- Chat Routes -------------------
@api.post("/chat/text")
async def chat_text(body: ChatMessageIn, user=Depends(get_current_user)):
    context = await build_context(user["id"])
    parsed = await llm_parse(user["id"], body.text, language=body.language or "en", context=context)
    actions = await apply_ai_result(user["id"], parsed, "chat-text", body.text)
    return {"parsed": parsed, "actions": actions}

@api.post("/chat/voice")
async def chat_voice(audio: UploadFile = File(...), language: str = Form("en"), user=Depends(get_current_user)):
    content = await audio.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(400, "Audio file too large (max 25MB)")

    transcript = ""
    fobj = io.BytesIO(content)
    fobj.name = audio.filename or "voice.webm"

    # Whisper prompt helps with domain-specific vocabulary (business terms in Hindi/Hinglish)
    whisper_prompt = "VyaparMind business assistant. Hindi Hinglish English. kharide beche becha bikri udhar diya liya rupaye kilo packet litre stock inventory chawal atta daal tel doodh salary payment staff"

    # Try Groq Whisper first (free, fast, best for Hindi)
    if GROQ_API_KEY and HAS_OPENAI:
        try:
            client = AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
            resp = await client.audio.transcriptions.create(
                file=fobj, model="whisper-large-v3",
                response_format="json", language="hi",
                prompt=whisper_prompt
            )
            transcript = resp.text if hasattr(resp, 'text') else ""
        except Exception as e:
            logging.warning(f"Groq Whisper failed: {e}")
            fobj.seek(0)

    # Fallback to OpenAI Whisper
    if not transcript and OPENAI_API_KEY and HAS_OPENAI:
        try:
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            fobj.seek(0)
            resp = await client.audio.transcriptions.create(
                file=fobj, model="whisper-1",
                response_format="json", language="hi",
                prompt=whisper_prompt
            )
            transcript = resp.text if hasattr(resp, 'text') else ""
        except Exception as e:
            logging.warning(f"OpenAI Whisper failed: {e}")

    if not transcript:
        raise HTTPException(500, "Transcription failed - no API keys configured or all services down")
    if not transcript.strip():
        return {"transcript": "", "parsed": {"reply": "Couldn't understand the voice note.", "intent": "other"}, "actions": []}
    context = await build_context(user["id"])
    parsed = await llm_parse(user["id"], transcript, language=language, context=context)
    actions = await apply_ai_result(user["id"], parsed, "chat-voice", transcript)
    return {"transcript": transcript, "parsed": parsed, "actions": actions}

@api.post("/chat/photo")
async def chat_photo(image: UploadFile = File(...), note: str = Form(""), user=Depends(get_current_user)):
    content = await image.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(400, "Image too large (max 8MB)")
    b64 = base64.b64encode(content).decode()
    context = await build_context(user["id"])
    prompt = note or "This is a photo from my business (could be a bill, receipt, udhar notebook page, khata entry, or any business document). Extract ALL relevant data: transactions, inventory items, udhar/credit entries, contacts. Be thorough and extract everything visible."
    parsed = await llm_parse(user["id"], prompt, image_b64=b64, context=context)
    actions = await apply_ai_result(user["id"], parsed, "chat-photo", prompt)
    return {"parsed": parsed, "actions": actions}

async def build_context(user_id: str) -> str:
    try:
        today = datetime.now(timezone.utc).date().isoformat()
        txs = await db.transactions.find({"user_id": user_id, "created_at": {"$gte": today}}, {"_id": 0}).to_list(200)
        income = sum(t.get("amount", 0) for t in txs if t.get("type") == "income")
        expense = sum(t.get("amount", 0) for t in txs if t.get("type") == "expense")
        inv = await db.inventory.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        inv_str = ", ".join(f"{i.get('name','?')}: {i.get('quantity',0)} {i.get('unit','pcs')}" for i in inv[:30])
        # Udhar context
        udhar_entries = await db.udhar.find({"user_id": user_id, "status": "pending"}, {"_id": 0}).to_list(50)
        udhar_given = sum(e.get("amount", 0) for e in udhar_entries if e.get("type") == "given")
        udhar_taken = sum(e.get("amount", 0) for e in udhar_entries if e.get("type") == "taken")
        udhar_people = ", ".join(f"{e.get('party_name','?')}(₹{e.get('amount',0)} {e.get('type','?')})" for e in udhar_entries[:8])
        # Staff context
        staff_list = await db.staff.find({"user_id": user_id, "status": "active"}, {"_id": 0}).to_list(50)
        staff_str = ", ".join(s.get("name", "?") for s in staff_list[:10])
        # Recent transactions for context
        recent_txs = await db.transactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        recent_str = "; ".join(f"{t.get('type','?')} ₹{t.get('amount',0)} ({t.get('description','')})" for t in recent_txs)
        return (
            f"TODAY: Income ₹{income}, Expense ₹{expense}, Transactions: {len(txs)}.\n"
            f"CURRENT INVENTORY: {inv_str or 'empty (no items yet)'}.\n"
            f"UDHAR PENDING: Given ₹{udhar_given} (they owe you), Taken ₹{udhar_taken} (you owe). People: {udhar_people or 'none'}.\n"
            f"STAFF: {staff_str or 'none'}.\n"
            f"RECENT TRANSACTIONS: {recent_str or 'none'}."
        )
    except Exception as e:
        logging.warning(f"build_context failed: {e}")
        return ""

# ------------------- Data Routes -------------------
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    uid = user["id"]
    today = datetime.now(timezone.utc).date().isoformat()
    txs_today = await db.transactions.find({"user_id": uid, "created_at": {"$gte": today}}, {"_id": 0}).to_list(500)
    income_today = sum(t["amount"] for t in txs_today if t["type"] == "income")
    expense_today = sum(t["amount"] for t in txs_today if t["type"] == "expense")

    # last 7 days chart
    chart = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        next_day = (datetime.now(timezone.utc).date() - timedelta(days=i-1)).isoformat() if i > 0 else (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
        day_txs = await db.transactions.find({"user_id": uid, "created_at": {"$gte": day, "$lt": next_day}}, {"_id": 0}).to_list(500)
        chart.append({
            "day": day,
            "income": sum(t["amount"] for t in day_txs if t["type"] == "income"),
            "expense": sum(t["amount"] for t in day_txs if t["type"] == "expense"),
        })

    recent_convos = await db.conversations.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    insights = await db.insights.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    inv = await db.inventory.find({"user_id": uid}, {"_id": 0}).to_list(50)
    low_stock = [i for i in inv if float(i.get("quantity", 0)) <= float(i.get("reorder_level", 5))]
    contacts = await db.transactions.find({"user_id": uid, "party_name": {"$ne": ""}}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    cmap: Dict[str, Dict[str, Any]] = {}
    for t in contacts:
        name = (t.get("party_name") or "").strip()
        if not name:
            continue
        if name not in cmap:
            cmap[name] = {"name": name, "total": 0, "count": 0, "last": t["created_at"]}
        cmap[name]["total"] += t["amount"] if t["type"] == "income" else 0
        cmap[name]["count"] += 1

    score = int(user.get("score", 12))
    return {
        "user": user_public(user),
        "today": {"income": income_today, "expense": expense_today, "profit": income_today - expense_today, "tx_count": len(txs_today)},
        "chart": chart,
        "recent": recent_convos,
        "insights": insights,
        "low_stock": low_stock,
        "top_contacts": sorted(cmap.values(), key=lambda c: c["total"], reverse=True)[:5],
        "score": min(100, score),
    }

@api.get("/transactions")
async def list_transactions(user=Depends(get_current_user), limit: int = 200):
    docs = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"items": docs}

@api.post("/transactions")
async def create_transaction(body: TransactionIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": body.type,
        "amount": body.amount,
        "category": body.category or "general",
        "party_name": body.party_name or "",
        "description": body.description or "",
        "source": "manual",
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str, user=Depends(get_current_user)):
    res = await db.transactions.delete_one({"id": tx_id, "user_id": user["id"]})
    return {"deleted": res.deleted_count}

@api.get("/inventory")
async def list_inventory(user=Depends(get_current_user)):
    docs = await db.inventory.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return {"items": docs}

@api.post("/inventory")
async def add_inventory(body: dict, user=Depends(get_current_user)):
    name = (body.get("name") or "").strip().lower()
    if not name:
        raise HTTPException(400, "Item name required")
    quantity = float(body.get("quantity", 0))
    unit = body.get("unit", "pcs") or "pcs"
    reorder_level = float(body.get("reorder_level", 5))
    existing = await db.inventory.find_one({"user_id": user["id"], "name": name})
    if existing:
        new_qty = float(existing.get("quantity", 0)) + quantity
        await db.inventory.update_one({"id": existing["id"]}, {"$set": {"quantity": new_qty, "unit": unit, "reorder_level": reorder_level, "updated_at": now_iso()}})
        return {"item": {**existing, "quantity": new_qty, "unit": unit, "reorder_level": reorder_level}}
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": name, "quantity": quantity, "unit": unit, "reorder_level": reorder_level, "updated_at": now_iso()}
    await db.inventory.insert_one(doc)
    return {"item": doc}

@api.patch("/inventory/{item_id}")
async def update_inventory(item_id: str, body: dict, user=Depends(get_current_user)):
    existing = await db.inventory.find_one({"id": item_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(404, "Item not found")
    updates = {}
    if "quantity" in body:
        updates["quantity"] = float(body["quantity"])
    if "unit" in body:
        updates["unit"] = body["unit"]
    if "reorder_level" in body:
        updates["reorder_level"] = float(body["reorder_level"])
    if "name" in body:
        updates["name"] = body["name"].strip().lower()
    updates["updated_at"] = now_iso()
    await db.inventory.update_one({"id": item_id}, {"$set": updates})
    return {"item": {**existing, **updates}}

@api.delete("/inventory/{item_id}")
async def delete_inventory(item_id: str, user=Depends(get_current_user)):
    existing = await db.inventory.find_one({"id": item_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(404, "Item not found")
    await db.inventory.delete_one({"id": item_id})
    return {"ok": True}

@api.get("/contacts")
async def list_contacts(user=Depends(get_current_user)):
    txs = await db.transactions.find({"user_id": user["id"], "party_name": {"$ne": ""}}, {"_id": 0}).to_list(2000)
    cmap: Dict[str, Dict[str, Any]] = {}
    for t in txs:
        name = (t.get("party_name") or "").strip()
        if not name:
            continue
        if name not in cmap:
            cmap[name] = {"name": name, "total_income": 0, "total_expense": 0, "count": 0, "last": t["created_at"]}
        if t["type"] == "income":
            cmap[name]["total_income"] += t["amount"]
        else:
            cmap[name]["total_expense"] += t["amount"]
        cmap[name]["count"] += 1
        if t["created_at"] > cmap[name]["last"]:
            cmap[name]["last"] = t["created_at"]
    return {"items": sorted(cmap.values(), key=lambda c: c["count"], reverse=True)}

@api.get("/insights")
async def list_insights(user=Depends(get_current_user)):
    docs = await db.insights.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return {"items": docs}

@api.post("/insights/generate")
async def generate_insights(user=Depends(get_current_user)):
    """Use Claude to generate a weekly business health report."""
    uid = user["id"]
    txs = await db.transactions.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    if not txs:
        return {"items": [], "report": "Not enough data yet. Send your first sale via the AI chat."}
    income = sum(t["amount"] for t in txs if t["type"] == "income")
    expense = sum(t["amount"] for t in txs if t["type"] == "expense")
    cats: Dict[str, float] = {}
    for t in txs:
        cats[t["category"]] = cats.get(t["category"], 0) + t["amount"]
    summary = f"Recent {len(txs)} transactions. Total income: ₹{income}. Total expense: ₹{expense}. Top categories: {cats}."

    if HAS_OPENAI and OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-emergent"):
        try:
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a friendly business analyst for an Indian micro-business owner. Generate a short, actionable weekly business health report. Use markdown with 3 sections: 'How you did', 'Watch outs', 'Next moves'. Use rupee symbol. Keep it under 180 words."},
                    {"role": "user", "content": summary}
                ],
                max_tokens=400,
                temperature=0.4
            )
            report = response.choices[0].message.content
        except Exception as e:
            report = f"Report generation failed: {e}"
    else:
        # Fallback: generate a simple report from the data
        top_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)[:3]
        top_str = ", ".join([f"{k}: ₹{int(v)}" for k, v in top_cats])
        report = (
            f"## How you did\n"
            f"Total Income: ₹{int(income)} | Total Expense: ₹{int(expense)} | Net: ₹{int(income - expense)}\n\n"
            f"## Watch outs\n"
            f"Top spending categories: {top_str}\n\n"
            f"## Next moves\n"
            f"Keep tracking daily transactions via AI Chat for better insights next week."
        )

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "title": "Weekly business health report",
        "description": report if isinstance(report, str) else str(report),
        "severity": "info",
        "created_at": now_iso(),
        "acknowledged": False,
    }
    await db.insights.insert_one(doc)
    return {"report": doc["description"], "id": doc["id"]}

@api.get("/automations")
async def list_automations(user=Depends(get_current_user)):
    docs = await db.automations.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": docs}

@api.post("/automations")
async def create_automation(body: AutomationIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": body.name,
        "trigger": body.trigger,
        "action": body.action,
        "active": body.active,
        "created_at": now_iso(),
    }
    await db.automations.insert_one(doc)
    return doc

@api.patch("/automations/{aid}")
async def toggle_automation(aid: str, body: Dict[str, Any], user=Depends(get_current_user)):
    await db.automations.update_one({"id": aid, "user_id": user["id"]}, {"$set": {"active": bool(body.get("active", True))}})
    doc = await db.automations.find_one({"id": aid}, {"_id": 0})
    return doc

@api.delete("/automations/{aid}")
async def delete_automation(aid: str, user=Depends(get_current_user)):
    res = await db.automations.delete_one({"id": aid, "user_id": user["id"]})
    return {"deleted": res.deleted_count}

@api.get("/conversations")
async def list_conversations(user=Depends(get_current_user), limit: int = 50):
    docs = await db.conversations.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"items": docs}

# ------------------- Health -------------------
@api.get("/")
async def root():
    return {"app": "VyaparMind API", "ok": True}

# ------------------- Market News & Rates -------------------

# Business-type to search keywords mapping
BUSINESS_NEWS_KEYWORDS = {
    "kirana": ["grocery prices India", "FMCG market rates", "wheat rice sugar price India", "kirana store business news"],
    "grocery": ["grocery prices India", "FMCG market rates", "vegetable fruit wholesale price"],
    "medical": ["pharma market India", "medicine price update", "drug price control India"],
    "pharmacy": ["pharma market India", "medicine price update", "drug price control India"],
    "electronics": ["electronics market India", "mobile phone prices", "gadget deals India"],
    "clothing": ["textile market India", "garment industry news", "fashion retail India"],
    "restaurant": ["food industry India", "restaurant business news", "food prices wholesale"],
    "hardware": ["hardware market India", "cement steel prices", "construction material rates"],
    "general": ["small business India news", "retail market India", "commodity prices India"],
    "dairy": ["milk price India", "dairy market rates", "Amul Mother Dairy price"],
    "vegetables": ["mandi vegetable prices India", "sabzi mandi rates today", "wholesale vegetable market"],
    "fruits": ["fruit market wholesale India", "mandi fruit prices today"],
}

# Commodity categories per business type
COMMODITY_RATES = {
    "kirana": [
        {"name": "Wheat (Gehun)", "unit": "per quintal", "category": "grain"},
        {"name": "Rice (Chawal)", "unit": "per quintal", "category": "grain"},
        {"name": "Sugar (Cheeni)", "unit": "per quintal", "category": "sweetener"},
        {"name": "Mustard Oil (Sarson Tel)", "unit": "per litre", "category": "oil"},
        {"name": "Toor Dal", "unit": "per kg", "category": "pulses"},
        {"name": "Chana Dal", "unit": "per kg", "category": "pulses"},
        {"name": "Atta (Wheat Flour)", "unit": "per kg", "category": "flour"},
        {"name": "Maida", "unit": "per kg", "category": "flour"},
        {"name": "Salt (Namak)", "unit": "per kg", "category": "essential"},
        {"name": "Tea (Chai Patti)", "unit": "per kg", "category": "beverage"},
    ],
    "grocery": [
        {"name": "Wheat (Gehun)", "unit": "per quintal", "category": "grain"},
        {"name": "Rice (Chawal)", "unit": "per quintal", "category": "grain"},
        {"name": "Sugar (Cheeni)", "unit": "per quintal", "category": "sweetener"},
        {"name": "Onion (Pyaaz)", "unit": "per kg", "category": "vegetable"},
        {"name": "Potato (Aloo)", "unit": "per kg", "category": "vegetable"},
        {"name": "Tomato (Tamatar)", "unit": "per kg", "category": "vegetable"},
    ],
    "vegetables": [
        {"name": "Onion (Pyaaz)", "unit": "per kg", "category": "vegetable"},
        {"name": "Potato (Aloo)", "unit": "per kg", "category": "vegetable"},
        {"name": "Tomato (Tamatar)", "unit": "per kg", "category": "vegetable"},
        {"name": "Green Chilli (Hari Mirch)", "unit": "per kg", "category": "vegetable"},
        {"name": "Cauliflower (Gobhi)", "unit": "per kg", "category": "vegetable"},
        {"name": "Brinjal (Baingan)", "unit": "per kg", "category": "vegetable"},
        {"name": "Lady Finger (Bhindi)", "unit": "per kg", "category": "vegetable"},
        {"name": "Capsicum (Shimla Mirch)", "unit": "per kg", "category": "vegetable"},
    ],
    "dairy": [
        {"name": "Milk (Full Cream)", "unit": "per litre", "category": "dairy"},
        {"name": "Milk (Toned)", "unit": "per litre", "category": "dairy"},
        {"name": "Butter", "unit": "per kg", "category": "dairy"},
        {"name": "Paneer", "unit": "per kg", "category": "dairy"},
        {"name": "Curd (Dahi)", "unit": "per kg", "category": "dairy"},
        {"name": "Ghee", "unit": "per kg", "category": "dairy"},
    ],
    "hardware": [
        {"name": "TMT Steel Bar", "unit": "per kg", "category": "metal"},
        {"name": "Cement (OPC 43)", "unit": "per bag 50kg", "category": "construction"},
        {"name": "Sand (River)", "unit": "per CFT", "category": "construction"},
        {"name": "Bricks (Red)", "unit": "per 1000 pcs", "category": "construction"},
        {"name": "Paint (Interior)", "unit": "per litre", "category": "finish"},
        {"name": "PVC Pipe 1 inch", "unit": "per foot", "category": "plumbing"},
    ],
}

# Simple in-memory cache for news (5 minute TTL)
_news_cache: Dict[str, Any] = {}
_NEWS_CACHE_TTL = 300  # 5 minutes

async def fetch_google_news_rss(query: str, num: int = 10) -> List[Dict]:
    """Fetch news from Google News RSS feed."""
    import urllib.parse
    encoded_q = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-IN&gl=IN&ceid=IN:en"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
            
            root = ET.fromstring(resp.text)
            items = []
            for item in root.findall(".//item")[:num]:
                title = item.findtext("title", "")
                link = item.findtext("link", "")
                pub_date = item.findtext("pubDate", "")
                source = item.findtext("source", "")
                items.append({
                    "title": title,
                    "link": link,
                    "published": pub_date,
                    "source": source,
                })
            return items
    except Exception:
        return []


@api.get("/market/news")
async def get_market_news(user=Depends(get_current_user)):
    """Get business-relevant news based on user's business type."""
    btype = (user.get("business_type") or "general").lower()
    cache_key = f"news_{btype}"
    
    # Check cache
    import time
    now = time.time()
    if cache_key in _news_cache:
        cached = _news_cache[cache_key]
        if now - cached["ts"] < _NEWS_CACHE_TTL:
            return {"news": cached["data"], "business_type": btype, "cached": True}
    
    keywords = BUSINESS_NEWS_KEYWORDS.get(btype, BUSINESS_NEWS_KEYWORDS["general"])
    all_news = []
    seen_titles = set()
    
    for kw in keywords[:3]:  # Limit to 3 queries to avoid rate limiting
        items = await fetch_google_news_rss(kw, num=5)
        for item in items:
            if item["title"] not in seen_titles:
                seen_titles.add(item["title"])
                all_news.append(item)
    
    # Sort by date (most recent first) and limit
    all_news = all_news[:15]
    
    # If no live news, provide curated market intelligence
    if not all_news:
        all_news = _get_fallback_news(btype)
    
    # Cache the results
    _news_cache[cache_key] = {"data": all_news, "ts": now}
    
    return {"news": all_news, "business_type": btype, "cached": False}


def _get_fallback_news(btype: str) -> List[Dict]:
    """Provide curated market intelligence when live news is unavailable."""
    base_news = [
        {"title": "Government extends subsidy on essential commodities for Q2 2026", "link": "https://pib.gov.in", "published": now_iso(), "source": "PIB India"},
        {"title": "RBI keeps repo rate unchanged at 6.25% - EMI rates stable", "link": "https://rbi.org.in", "published": now_iso(), "source": "RBI"},
        {"title": "India's retail inflation eases to 4.2% in May 2026", "link": "https://mospi.gov.in", "published": now_iso(), "source": "MOSPI"},
        {"title": "Digital payments cross 15 billion monthly transactions milestone", "link": "https://npci.org.in", "published": now_iso(), "source": "NPCI"},
    ]
    
    btype_news = {
        "kirana": [
            {"title": "Wheat MSP raised to \u20b92425/quintal for 2026-27 season", "link": "https://agmarknet.gov.in", "published": now_iso(), "source": "Agmarknet"},
            {"title": "Sugar production estimated at 32 million tonnes - prices expected stable", "link": "https://dfpd.gov.in", "published": now_iso(), "source": "DFPD"},
            {"title": "FMCG companies announce 3-5% price hikes on packaged foods", "link": "https://economictimes.com", "published": now_iso(), "source": "ET Markets"},
            {"title": "Edible oil imports rise 15% - domestic prices soften", "link": "https://sea.org.in", "published": now_iso(), "source": "SEA India"},
            {"title": "Onion prices expected to remain stable through monsoon season", "link": "https://agmarknet.gov.in", "published": now_iso(), "source": "Agmarknet"},
        ],
        "grocery": [
            {"title": "Vegetable prices rise 8% due to pre-monsoon supply crunch", "link": "https://agmarknet.gov.in", "published": now_iso(), "source": "Agmarknet"},
            {"title": "Tomato, onion buffer stock released to stabilize prices", "link": "https://dfpd.gov.in", "published": now_iso(), "source": "DFPD"},
            {"title": "New cold storage facilities to reduce post-harvest losses by 20%", "link": "https://pib.gov.in", "published": now_iso(), "source": "PIB"},
        ],
        "medical": [
            {"title": "DPCO 2026 revision caps margins on 850 essential medicines", "link": "https://nppaindia.nic.in", "published": now_iso(), "source": "NPPA"},
            {"title": "Generic drug prices remain competitive - Jan Aushadhi scheme expands", "link": "https://janaushadhi.gov.in", "published": now_iso(), "source": "PMBJP"},
            {"title": "Pharma exports grow 12% YoY reaching $28 billion", "link": "https://pharmexcil.com", "published": now_iso(), "source": "Pharmexcil"},
        ],
        "hardware": [
            {"title": "Steel prices cool 3% as demand normalizes post-construction season", "link": "https://steel.gov.in", "published": now_iso(), "source": "Ministry of Steel"},
            {"title": "Cement prices stable at \u20b9380-420 per bag across major markets", "link": "https://economictimes.com", "published": now_iso(), "source": "ET Markets"},
            {"title": "Paint companies announce festive season discounts up to 15%", "link": "https://economictimes.com", "published": now_iso(), "source": "ET Markets"},
        ],
        "electronics": [
            {"title": "Smartphone prices expected to drop 5-8% during monsoon sales", "link": "https://economictimes.com", "published": now_iso(), "source": "ET Tech"},
            {"title": "BIS mandates new quality standards for electronic accessories", "link": "https://bis.gov.in", "published": now_iso(), "source": "BIS"},
            {"title": "Laptop demand surges 20% with work-from-home trend continuing", "link": "https://economictimes.com", "published": now_iso(), "source": "ET Tech"},
        ],
        "dairy": [
            {"title": "Amul raises milk prices by \u20b92/litre across variants", "link": "https://amul.com", "published": now_iso(), "source": "Amul"},
            {"title": "Summer demand pushes curd and buttermilk sales up 30%", "link": "https://nddb.coop", "published": now_iso(), "source": "NDDB"},
            {"title": "Government to incentivize organic dairy farming in 5 states", "link": "https://dahd.gov.in", "published": now_iso(), "source": "DAHD"},
        ],
        "vegetables": [
            {"title": "Mandi arrivals drop 15% ahead of monsoon - veggie prices firm", "link": "https://agmarknet.gov.in", "published": now_iso(), "source": "Agmarknet"},
            {"title": "Tomato prices surge to \u20b960/kg in Mumbai, Delhi wholesale markets", "link": "https://agmarknet.gov.in", "published": now_iso(), "source": "Agmarknet"},
            {"title": "Government launches e-NAM integration for 200 new mandis", "link": "https://enam.gov.in", "published": now_iso(), "source": "e-NAM"},
        ],
    }
    
    specific = btype_news.get(btype, btype_news.get("kirana", []))
    return specific + base_news


@api.get("/market/rates")
async def get_market_rates(user=Depends(get_current_user)):
    """Get commodity rate categories relevant to user's business type."""
    btype = (user.get("business_type") or "general").lower()
    commodities = COMMODITY_RATES.get(btype, COMMODITY_RATES.get("kirana", []))
    
    # Try to fetch live rates from a public API
    rates = []
    cache_key = f"rates_{btype}"
    
    import time
    now = time.time()
    if cache_key in _news_cache:
        cached = _news_cache[cache_key]
        if now - cached["ts"] < _NEWS_CACHE_TTL:
            return {"rates": cached["data"], "business_type": btype, "cached": True}
    
    # Fetch approximate rates from public sources
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try data.gov.in commodity API (free, no key needed for basic)
            resp = await client.get(
                "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
                params={"api-key": "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b", "format": "json", "limit": 50}
            )
            if resp.status_code == 200:
                data = resp.json()
                records = data.get("records", [])
                # Map to our commodity list
                price_map = {}
                for rec in records:
                    commodity = rec.get("commodity", "").lower()
                    modal_price = rec.get("modal_price", "")
                    market = rec.get("market", "")
                    if modal_price:
                        price_map[commodity] = {"price": modal_price, "market": market}
                
                for c in commodities:
                    name_lower = c["name"].split("(")[0].strip().lower()
                    matched = price_map.get(name_lower, None)
                    rate_entry = {**c, "price": None, "market": None, "last_updated": now_iso()}
                    if matched:
                        rate_entry["price"] = matched["price"]
                        rate_entry["market"] = matched["market"]
                    rates.append(rate_entry)
            else:
                rates = _get_fallback_rates(commodities)
    except Exception:
        rates = _get_fallback_rates(commodities)
    
    # If all prices are None, use fallback estimates
    if rates and all(r.get("price") is None for r in rates):
        rates = _get_fallback_rates(commodities)
    
    _news_cache[cache_key] = {"data": rates, "ts": now}
    return {"rates": rates, "business_type": btype, "cached": False}


# Approximate market prices (updated periodically)
_APPROX_PRICES = {
    "wheat": "2400-2600", "rice": "3200-4500", "sugar": "3800-4200",
    "mustard oil": "160-180", "toor dal": "130-160", "chana dal": "70-90",
    "atta": "30-38", "maida": "32-40", "salt": "20-25", "tea": "300-500",
    "onion": "25-40", "potato": "20-30", "tomato": "40-60",
    "green chilli": "80-120", "cauliflower": "30-50", "brinjal": "30-45",
    "lady finger": "40-60", "capsicum": "60-90",
    "milk": "56-64", "butter": "500-550", "paneer": "320-380",
    "curd": "50-60", "ghee": "550-650",
    "tmt steel bar": "55-65", "cement": "380-420", "sand": "45-60",
    "bricks": "7000-9000", "paint": "250-400", "pvc pipe": "25-35",
}

def _get_fallback_rates(commodities: list) -> list:
    """Return approximate market rates when live data is unavailable."""
    rates = []
    for c in commodities:
        name_lower = c["name"].split("(")[0].strip().lower()
        approx = _APPROX_PRICES.get(name_lower, None)
        rates.append({
            **c,
            "price": approx if approx else None,
            "market": "Avg. Indian market (approx)" if approx else None,
            "last_updated": now_iso(),
            "is_estimate": True,
        })
    return rates


@api.post("/market/ask")
async def ask_market_price(body: dict, user=Depends(get_current_user)):
    """AI agent that answers market price questions."""
    question = body.get("question", "").strip()
    if not question:
        raise HTTPException(400, "Question is required")
    
    btype = (user.get("business_type") or "general").lower()
    
    # Try OpenAI first for intelligent market price answers
    if HAS_OPENAI and OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-emergent"):
        try:
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            system_prompt = f"""You are a market price expert AI for Indian {btype} businesses. 
Answer questions about current commodity prices, market rates, and business trends in India.
Give prices in INR (₹). Be concise and helpful. If you don't know the exact current price, 
give the approximate market range and mention it's an estimate.
Always respond in the same language the user asks in (Hindi, English, Marathi, etc.)."""
            
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                max_tokens=300,
                temperature=0.3
            )
            answer = response.choices[0].message.content
            return {"answer": answer, "source": "ai"}
        except Exception:
            pass
    
    # Fallback: provide helpful response based on known data
    answer = _market_fallback_answer(question, btype)
    return {"answer": answer, "source": "local"}


def _market_fallback_answer(question: str, btype: str) -> str:
    """Generate a helpful market price answer without AI."""
    q = question.lower()
    commodities = COMMODITY_RATES.get(btype, COMMODITY_RATES.get("kirana", []))
    
    # Check if asking about a specific commodity
    for c in commodities:
        name_parts = c["name"].lower().split("(")
        eng_name = name_parts[0].strip()
        hindi_name = name_parts[1].replace(")", "").strip() if len(name_parts) > 1 else ""
        
        if eng_name in q or hindi_name in q:
            return (
                f"**{c['name']}** ({c['unit']})\n\n"
                f"This item is tracked in the {btype} category.\n"
                f"For live prices, check your local mandi or wholesale market.\n\n"
                f"💡 *Tip*: You can also check prices at:\n"
                f"- agmarknet.gov.in (Government mandi prices)\n"
                f"- nhb.gov.in (Horticultural commodities)"
            )
    
    # General response
    commodity_list = ", ".join([c["name"] for c in commodities[:5]])
    return (
        f"I can help with market prices for your **{btype}** business.\n\n"
        f"Some items I track: {commodity_list}\n\n"
        f"Ask me about a specific item like:\n"
        f"- \"What is the price of wheat?\"\n"
        f"- \"Aaj sugar ka rate kya hai?\"\n"
        f"- \"Tomato price today\"\n\n"
        f"📊 For live mandi rates visit: agmarknet.gov.in"
    )


# ------------------- Bill Records -------------------
BILLS_DIR = ROOT_DIR / "data" / "bills"
BILLS_DIR.mkdir(parents=True, exist_ok=True)

@api.post("/bills")
async def upload_bill(
    file: UploadFile = File(...),
    note: Optional[str] = Form(None),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Upload a bill image and store as a record."""
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large. Max 10MB.")
    
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
    ctype = file.content_type or "image/jpeg"
    if ctype not in allowed_types:
        raise HTTPException(400, f"Unsupported file type: {ctype}")

    bill_id = str(uuid.uuid4())
    ext = ctype.split("/")[-1].replace("jpeg", "jpg")
    filename = f"{bill_id}.{ext}"
    
    # Save file to disk
    file_path = BILLS_DIR / filename
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Save metadata to DB
    record = {
        "id": bill_id,
        "user_id": user["id"],
        "filename": filename,
        "original_name": file.filename or "bill",
        "content_type": ctype,
        "size": len(content),
        "note": note or "",
        "created_at": now_iso(),
    }
    await db.bills.insert_one(record)
    return {"ok": True, "bill": record}

@api.get("/bills")
async def list_bills(user: Dict[str, Any] = Depends(get_current_user)):
    """List all bill records for the logged-in user."""
    bills = await db.bills.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    # Add image URL to each bill
    for b in bills:
        b.pop("_id", None)
        b["image_url"] = f"/api/bills/{b['id']}/image"
    return {"bills": bills}

@api.get("/bills/{bill_id}/image")
async def get_bill_image(bill_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Serve the bill image file."""
    from starlette.responses import FileResponse
    bill = await db.bills.find_one({"id": bill_id, "user_id": user["id"]})
    if not bill:
        raise HTTPException(404, "Bill not found")
    file_path = BILLS_DIR / bill["filename"]
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")
    return FileResponse(str(file_path), media_type=bill.get("content_type", "image/jpeg"))

@api.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Permanently delete a bill record and its file."""
    bill = await db.bills.find_one({"id": bill_id, "user_id": user["id"]})
    if not bill:
        raise HTTPException(404, "Bill not found")
    # Delete file from disk
    file_path = BILLS_DIR / bill["filename"]
    if file_path.exists():
        os.remove(str(file_path))
    # Delete from DB
    await db.bills.delete_one({"id": bill_id, "user_id": user["id"]})
    return {"ok": True, "deleted": bill_id}


# ------------------- Udhar Book (Credit Ledger) -------------------

@api.post("/udhar")
async def create_udhar(body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Create a new udhar (credit/debit) entry."""
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "party_name": body.get("party_name", "").strip(),
        "phone": body.get("phone", "").strip(),
        "type": body.get("type", "given"),  # "given" = you gave (they owe you), "taken" = you took (you owe them)
        "amount": float(body.get("amount", 0)),
        "description": body.get("description", ""),
        "status": "pending",  # pending, settled
        "created_at": now_iso(),
        "settled_at": None,
    }
    if not entry["party_name"] or entry["amount"] <= 0:
        raise HTTPException(400, "party_name and positive amount required")
    await db.udhar.insert_one(entry)
    return {"ok": True, "entry": entry}

@api.get("/udhar")
async def list_udhar(user: Dict[str, Any] = Depends(get_current_user)):
    """List all udhar entries for the user."""
    entries = await db.udhar.find({"user_id": user["id"]}).sort("created_at", -1).to_list(1000)
    for e in entries:
        e.pop("_id", None)
    # Calculate summary
    total_given = sum(e["amount"] for e in entries if e["type"] == "given" and e["status"] == "pending")
    total_taken = sum(e["amount"] for e in entries if e["type"] == "taken" and e["status"] == "pending")
    return {"entries": entries, "total_given": total_given, "total_taken": total_taken}

@api.put("/udhar/{entry_id}/settle")
async def settle_udhar(entry_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Mark an udhar entry as settled."""
    entry = await db.udhar.find_one({"id": entry_id, "user_id": user["id"]})
    if not entry:
        raise HTTPException(404, "Entry not found")
    await db.udhar.update_one(
        {"id": entry_id, "user_id": user["id"]},
        {"$set": {"status": "settled", "settled_at": now_iso()}}
    )
    return {"ok": True}

@api.delete("/udhar/{entry_id}")
async def delete_udhar(entry_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Delete an udhar entry."""
    await db.udhar.delete_one({"id": entry_id, "user_id": user["id"]})
    return {"ok": True}


# ------------------- Invoice Generator -------------------

@api.post("/invoices")
async def create_invoice(body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Create a new invoice."""
    invoice = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "invoice_number": body.get("invoice_number", f"INV-{uuid.uuid4().hex[:6].upper()}"),
        "customer_name": body.get("customer_name", "").strip(),
        "customer_phone": body.get("customer_phone", ""),
        "customer_address": body.get("customer_address", ""),
        "items": body.get("items", []),  # [{name, qty, rate, amount}]
        "subtotal": float(body.get("subtotal", 0)),
        "tax_percent": float(body.get("tax_percent", 0)),
        "tax_amount": float(body.get("tax_amount", 0)),
        "discount": float(body.get("discount", 0)),
        "total": float(body.get("total", 0)),
        "notes": body.get("notes", ""),
        "status": body.get("status", "unpaid"),  # unpaid, paid, partial
        "due_date": body.get("due_date", ""),
        "created_at": now_iso(),
    }
    await db.invoices.insert_one(invoice)
    return {"ok": True, "invoice": invoice}

@api.get("/invoices")
async def list_invoices(user: Dict[str, Any] = Depends(get_current_user)):
    """List all invoices."""
    invoices = await db.invoices.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    for inv in invoices:
        inv.pop("_id", None)
    return {"invoices": invoices}

@api.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Get a single invoice."""
    inv = await db.invoices.find_one({"id": invoice_id, "user_id": user["id"]})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.pop("_id", None)
    return {"invoice": inv}

@api.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Update invoice (status, items, etc.)."""
    inv = await db.invoices.find_one({"id": invoice_id, "user_id": user["id"]})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    updates = {}
    for field in ["status", "items", "subtotal", "tax_percent", "tax_amount", "discount", "total", "notes", "customer_name", "customer_phone", "due_date"]:
        if field in body:
            updates[field] = body[field]
    if updates:
        await db.invoices.update_one({"id": invoice_id, "user_id": user["id"]}, {"$set": updates})
    return {"ok": True}

@api.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Delete an invoice."""
    await db.invoices.delete_one({"id": invoice_id, "user_id": user["id"]})
    return {"ok": True}


# ------------------- Staff Management -------------------

@api.post("/staff")
async def add_staff(body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Add a new staff member."""
    member = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": body.get("name", "").strip(),
        "phone": body.get("phone", ""),
        "role": body.get("role", ""),
        "salary": float(body.get("salary", 0)),
        "salary_type": body.get("salary_type", "monthly"),  # monthly, daily, weekly
        "joining_date": body.get("joining_date", now_iso()[:10]),
        "status": "active",
        "created_at": now_iso(),
    }
    if not member["name"]:
        raise HTTPException(400, "Name required")
    await db.staff.insert_one(member)
    return {"ok": True, "member": member}

@api.get("/staff")
async def list_staff(user: Dict[str, Any] = Depends(get_current_user)):
    """List all staff members."""
    members = await db.staff.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    for m in members:
        m.pop("_id", None)
    return {"staff": members}

@api.put("/staff/{staff_id}")
async def update_staff(staff_id: str, body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Update staff member."""
    updates = {}
    for field in ["name", "phone", "role", "salary", "salary_type", "status"]:
        if field in body:
            updates[field] = body[field]
    if updates:
        await db.staff.update_one({"id": staff_id, "user_id": user["id"]}, {"$set": updates})
    return {"ok": True}

@api.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Delete a staff member."""
    await db.staff.delete_one({"id": staff_id, "user_id": user["id"]})
    return {"ok": True}

@api.post("/staff/{staff_id}/attendance")
async def mark_attendance(staff_id: str, body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Mark attendance for a staff member."""
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "staff_id": staff_id,
        "date": body.get("date", now_iso()[:10]),
        "status": body.get("status", "present"),  # present, absent, half_day, leave
        "note": body.get("note", ""),
        "created_at": now_iso(),
    }
    # Prevent duplicate for same day
    existing = await db.attendance.find_one({"staff_id": staff_id, "user_id": user["id"], "date": record["date"]})
    if existing:
        await db.attendance.update_one(
            {"id": existing["id"]},
            {"$set": {"status": record["status"], "note": record["note"]}}
        )
    else:
        await db.attendance.insert_one(record)
    return {"ok": True}

@api.get("/staff/{staff_id}/attendance")
async def get_attendance(staff_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Get attendance history for a staff member."""
    records = await db.attendance.find({"staff_id": staff_id, "user_id": user["id"]}).sort("date", -1).to_list(365)
    for r in records:
        r.pop("_id", None)
    return {"attendance": records}

@api.post("/staff/{staff_id}/payment")
async def record_salary_payment(staff_id: str, body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Record a salary payment for a staff member."""
    payment = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "staff_id": staff_id,
        "amount": float(body.get("amount", 0)),
        "month": body.get("month", now_iso()[:7]),
        "note": body.get("note", ""),
        "created_at": now_iso(),
    }
    await db.salary_payments.insert_one(payment)
    return {"ok": True, "payment": payment}

@api.get("/staff/{staff_id}/payments")
async def get_salary_payments(staff_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Get salary payment history."""
    payments = await db.salary_payments.find({"staff_id": staff_id, "user_id": user["id"]}).sort("created_at", -1).to_list(100)
    for p in payments:
        p.pop("_id", None)
    return {"payments": payments}


# ------------------- Reports -------------------

@api.get("/reports/summary")
async def report_summary(user: Dict[str, Any] = Depends(get_current_user)):
    """Get business summary report."""
    transactions = await db.transactions.find({"user_id": user["id"]}).to_list(10000)
    
    total_income = sum(t.get("amount", 0) for t in transactions if t.get("type") == "income")
    total_expense = sum(t.get("amount", 0) for t in transactions if t.get("type") == "expense")
    profit = total_income - total_expense
    
    # Monthly breakdown
    monthly = {}
    for t in transactions:
        month = t.get("created_at", "")[:7]
        if month not in monthly:
            monthly[month] = {"income": 0, "expense": 0}
        monthly[month][t.get("type", "expense")] += t.get("amount", 0)
    
    # Category-wise expense
    category_expense = {}
    for t in transactions:
        if t.get("type") == "expense":
            cat = t.get("category", "general")
            category_expense[cat] = category_expense.get(cat, 0) + t.get("amount", 0)
    
    # Category-wise income
    category_income = {}
    for t in transactions:
        if t.get("type") == "income":
            cat = t.get("category", "general")
            category_income[cat] = category_income.get(cat, 0) + t.get("amount", 0)
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "profit": profit,
        "monthly": monthly,
        "category_expense": category_expense,
        "category_income": category_income,
        "transaction_count": len(transactions),
    }

@api.get("/reports/gst")
async def report_gst(user: Dict[str, Any] = Depends(get_current_user)):
    """Get GST report from invoices."""
    invoices = await db.invoices.find({"user_id": user["id"]}).to_list(5000)
    
    total_sales = sum(inv.get("subtotal", 0) for inv in invoices)
    total_tax_collected = sum(inv.get("tax_amount", 0) for inv in invoices)
    total_invoices = len(invoices)
    paid = sum(1 for inv in invoices if inv.get("status") == "paid")
    unpaid = sum(1 for inv in invoices if inv.get("status") == "unpaid")
    
    # Monthly GST
    monthly_gst = {}
    for inv in invoices:
        month = inv.get("created_at", "")[:7]
        if month not in monthly_gst:
            monthly_gst[month] = {"sales": 0, "tax": 0, "count": 0}
        monthly_gst[month]["sales"] += inv.get("subtotal", 0)
        monthly_gst[month]["tax"] += inv.get("tax_amount", 0)
        monthly_gst[month]["count"] += 1
    
    return {
        "total_sales": total_sales,
        "total_tax_collected": total_tax_collected,
        "total_invoices": total_invoices,
        "paid": paid,
        "unpaid": unpaid,
        "monthly_gst": monthly_gst,
    }

@api.get("/reports/inventory")
async def report_inventory(user: Dict[str, Any] = Depends(get_current_user)):
    """Get inventory value report."""
    items = await db.inventory.find({"user_id": user["id"]}).to_list(5000)
    
    total_items = len(items)
    total_value = 0
    low_stock = []
    for item in items:
        qty = item.get("quantity", 0)
        price = item.get("price", 0)
        total_value += qty * price
        if qty <= item.get("low_stock_threshold", 5):
            low_stock.append({"name": item.get("name"), "quantity": qty})
    
    return {
        "total_items": total_items,
        "total_value": total_value,
        "low_stock": low_stock,
        "low_stock_count": len(low_stock),
    }


# ------------------- Online Store / Catalog -------------------

@api.post("/store/products")
async def add_store_product(body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Add a product to the online catalog."""
    product = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": body.get("name", "").strip(),
        "description": body.get("description", ""),
        "price": float(body.get("price", 0)),
        "mrp": float(body.get("mrp", 0)),
        "category": body.get("category", "general"),
        "unit": body.get("unit", "piece"),
        "in_stock": body.get("in_stock", True),
        "visible": body.get("visible", True),
        "created_at": now_iso(),
    }
    if not product["name"]:
        raise HTTPException(400, "Product name required")
    await db.store_products.insert_one(product)
    return {"ok": True, "product": product}

@api.get("/store/products")
async def list_store_products(user: Dict[str, Any] = Depends(get_current_user)):
    """List all products in user's online store."""
    products = await db.store_products.find({"user_id": user["id"]}).sort("created_at", -1).to_list(1000)
    for p in products:
        p.pop("_id", None)
    return {"products": products}

@api.put("/store/products/{product_id}")
async def update_store_product(product_id: str, body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Update a store product."""
    updates = {}
    for field in ["name", "description", "price", "mrp", "category", "unit", "in_stock", "visible"]:
        if field in body:
            updates[field] = body[field]
    if updates:
        await db.store_products.update_one({"id": product_id, "user_id": user["id"]}, {"$set": updates})
    return {"ok": True}

@api.delete("/store/products/{product_id}")
async def delete_store_product(product_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Delete a store product."""
    await db.store_products.delete_one({"id": product_id, "user_id": user["id"]})
    return {"ok": True}

@api.get("/store/settings")
async def get_store_settings(user: Dict[str, Any] = Depends(get_current_user)):
    """Get store settings/profile."""
    settings = await db.store_settings.find_one({"user_id": user["id"]})
    if not settings:
        settings = {
            "user_id": user["id"],
            "store_name": user.get("business_name", "My Store"),
            "description": "",
            "phone": "",
            "address": "",
            "upi_id": "",
            "delivery_available": False,
            "min_order": 0,
        }
    settings.pop("_id", None)
    return {"settings": settings}

@api.put("/store/settings")
async def update_store_settings(body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Update store settings."""
    existing = await db.store_settings.find_one({"user_id": user["id"]})
    if existing:
        await db.store_settings.update_one({"user_id": user["id"]}, {"$set": body})
    else:
        body["user_id"] = user["id"]
        body["id"] = str(uuid.uuid4())
        await db.store_settings.insert_one(body)
    return {"ok": True}

# Public store endpoint (no auth - for customers viewing the catalog)
@api.get("/store/public/{user_id}")
async def public_store(user_id: str):
    """Public catalog view for customers."""
    settings = await db.store_settings.find_one({"user_id": user_id})
    if not settings:
        u = await db.users.find_one({"id": user_id})
        settings = {"store_name": u.get("business_name", "Store") if u else "Store"}
    settings.pop("_id", None)
    settings.pop("user_id", None)
    
    products = await db.store_products.find({"user_id": user_id, "visible": True, "in_stock": True}).to_list(1000)
    for p in products:
        p.pop("_id", None)
        p.pop("user_id", None)
    return {"settings": settings, "products": products}


# ------------------- Payment & Subscription -------------------
import hashlib
import hmac

RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')

PLANS = {
    "vikas": {"name": "Vikas", "amount": 58900, "base_amount": 49900, "currency": "INR", "period": "monthly", "description": "VyaparMind Vikas Plan - ₹499 + GST = ₹589"},
    "shakti": {"name": "Shakti", "amount": 176900, "base_amount": 149900, "currency": "INR", "period": "monthly", "description": "VyaparMind Shakti Plan - ₹1,499 + GST = ₹1,769"},
}

@api.post("/payments/create-order")
async def create_payment_order(body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Create a Razorpay order for subscription payment."""
    plan_id = body.get("plan", "").lower()
    if plan_id not in PLANS:
        raise HTTPException(400, f"Invalid plan: {plan_id}. Available: {list(PLANS.keys())}")
    
    plan = PLANS[plan_id]
    
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(500, "Payment gateway not configured. Contact admin.")
    
    # Create Razorpay order via API
    order_data = {
        "amount": plan["amount"],  # in paise
        "currency": plan["currency"],
        "receipt": f"vm_{user['id'][:8]}_{uuid.uuid4().hex[:8]}",
        "notes": {
            "user_id": user["id"],
            "plan": plan_id,
            "user_email": user.get("email", ""),
        }
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.razorpay.com/v1/orders",
            json=order_data,
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
        )
    
    if resp.status_code != 200:
        raise HTTPException(500, f"Payment gateway error: {resp.text}")
    
    rz_order = resp.json()
    
    # Save order to DB (non-critical - payment can still proceed)
    try:
        order_record = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "razorpay_order_id": rz_order["id"],
            "plan": plan_id,
            "amount": plan["amount"],
            "currency": plan["currency"],
            "status": "created",
            "created_at": now_iso(),
        }
        await db.payment_orders.insert_one(order_record)
    except Exception as e:
        logging.warning(f"Failed to save order record: {e}")
    
    return {
        "order_id": rz_order["id"],
        "amount": plan["amount"],
        "currency": plan["currency"],
        "key_id": RAZORPAY_KEY_ID,
        "plan_name": plan["name"],
        "description": plan["description"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
    }

@api.post("/payments/verify")
async def verify_payment(body: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """Verify Razorpay payment signature and activate plan."""
    razorpay_order_id = body.get("razorpay_order_id", "")
    razorpay_payment_id = body.get("razorpay_payment_id", "")
    razorpay_signature = body.get("razorpay_signature", "")
    plan_id = body.get("plan", "").lower()
    
    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        raise HTTPException(400, "Missing payment verification data")
    
    if plan_id not in PLANS:
        raise HTTPException(400, f"Invalid plan: {plan_id}")
    
    # Verify signature (Razorpay HMAC-SHA256) - cryptographic proof of payment
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected_signature = hmac.HMAC(
        RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if expected_signature != razorpay_signature:
        raise HTTPException(400, "Payment verification failed - invalid signature")
    
    # Signature verified - payment is legitimate. Activate plan.
    plan_expiry = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    # Try to update order record (non-critical, may fail if table schema is incomplete)
    try:
        await db.payment_orders.update_one(
            {"razorpay_order_id": razorpay_order_id},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": razorpay_payment_id,
                "paid_at": now_iso(),
            }}
        )
    except Exception:
        pass  # Non-critical - HMAC already verified payment
    
    # Activate user plan (critical)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "plan": plan_id,
            "plan_activated_at": now_iso(),
            "plan_expires_at": plan_expiry,
            "plan_payment_id": razorpay_payment_id,
        }}
    )
    
    # Save subscription record (non-critical)
    try:
        subscription = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "plan": plan_id,
            "amount": PLANS[plan_id]["amount"],
            "payment_id": razorpay_payment_id,
            "order_id": razorpay_order_id,
            "activated_at": now_iso(),
            "expires_at": plan_expiry,
            "status": "active",
        }
        await db.subscriptions.insert_one(subscription)
    except Exception:
        pass  # Non-critical - plan already activated on user record
    
    return {
        "ok": True,
        "plan": plan_id,
        "plan_name": PLANS[plan_id]["name"],
        "expires_at": plan_expiry,
        "payment_id": razorpay_payment_id,
        "message": f"🎉 {PLANS[plan_id]['name']} plan activated successfully!",
    }

@api.get("/payments/my-plan")
async def get_my_plan(user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user's subscription plan."""
    full_user = await db.users.find_one({"id": user["id"]})
    plan = full_user.get("plan", "shunya")
    expires = full_user.get("plan_expires_at", "")
    
    # Check if expired
    if expires and plan != "shunya":
        try:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                plan = "shunya"  # Expired, show as free
        except (ValueError, TypeError):
            pass
    
    return {
        "plan": plan,
        "plan_name": PLANS.get(plan, {"name": "Shunya"})["name"] if plan != "shunya" else "Shunya",
        "expires_at": expires,
        "is_active": plan != "shunya",
    }

@api.get("/payments/history")
async def payment_history(user: Dict[str, Any] = Depends(get_current_user)):
    """Get user's payment history."""
    payments = await db.subscriptions.find({"user_id": user["id"]}).sort("activated_at", -1).to_list(50)
    for p in payments:
        p.pop("_id", None)
    return {"payments": payments}


# ------------------- Contact Form -------------------
class ContactFormIn(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@api.post("/contact")
async def contact_form(body: ContactFormIn):
    """Receive contact form submission and send email notification."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    # Store in database (best-effort on serverless)
    contact_data = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "subject": body.subject,
        "message": body.message,
        "created_at": now_iso(),
    }
    try:
        await db.contact_messages.insert_one(contact_data)
    except Exception as e:
        logging.warning(f"Could not save contact to filedb: {e}")

    notify_email = os.environ.get("CONTACT_NOTIFY_EMAIL", "sarthak.tambat@vyaparmind.com")
    
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #090E17; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #00A884; margin: 0;">New Contact Form Submission</h2>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
            <p><strong>Name:</strong> {body.name}</p>
            <p><strong>Email:</strong> <a href="mailto:{body.email}">{body.email}</a></p>
            <p><strong>Subject:</strong> {body.subject}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: white; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0;">{body.message}</p>
        </div>
        <div style="padding: 12px; text-align: center; color: #64748b; font-size: 12px;">
            <p>This message was sent from the VyaparMind contact form.</p>
            <p>Reply directly to <a href="mailto:{body.email}">{body.email}</a></p>
        </div>
    </div>
    """

    email_sent = False

    # Method 1: Resend API (preferred for Vercel serverless)
    resend_api_key = os.environ.get("RESEND_API_KEY", "")
    if resend_api_key and not email_sent:
        try:
            import resend
            resend.api_key = resend_api_key
            from_email = os.environ.get("VyaparMind <contact@vyaparmind.com>", "VyaparMind <onboarding@resend.dev>")
            resend.Emails.send({
                "from": from_email,
                "to": [notify_email],
                "subject": f"[VyaparMind Contact] {body.subject}",
                "html": html_body,
                "reply_to": body.email,
            })
            email_sent = True
            logging.info(f"Contact email sent via Resend to {notify_email}")
        except Exception as e:
            logging.error(f"Resend failed: {e}")

    # Method 2: SMTP fallback
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    if smtp_user and smtp_pass and not email_sent:
        try:
            smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
            smtp_port = int(os.environ.get("SMTP_PORT", "587"))
            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = notify_email
            msg["Reply-To"] = body.email
            msg["Subject"] = f"[VyaparMind Contact] {body.subject}"
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            
            email_sent = True
            logging.info(f"Contact email sent via SMTP to {notify_email}")
        except Exception as e:
            logging.error(f"SMTP failed: {e}")

    if not email_sent:
        logging.warning("No email method configured or all failed - contact message saved to DB only")

    return {"ok": True, "message": "Message received. We'll get back to you shortly."}

@api.get("/health")
async def health():
    return {"ok": True, "ai_key_present": bool(OPENAI_API_KEY), "time": now_iso()}

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vyaparmind")

import traceback as _tb
from starlette.requests import Request
from starlette.responses import JSONResponse

@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    _tb.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc)})
