"""
Migration script: Move existing JSON data to Supabase.
Only inserts columns that exist in the schema (strips extras).
"""
import json, os, ssl
from pathlib import Path
from dotenv import load_dotenv

try:
    import truststore
    truststore.inject_into_ssl()
except Exception:
    ssl._create_default_https_context = ssl._create_unverified_context

load_dotenv(Path(__file__).parent / '.env')

from supabase import create_client
client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

DATA_DIR = Path(__file__).parent / "data"

# Only these columns will be inserted (matches schema.sql)
SCHEMA = {
    "users": ["id","name","email","password_hash","business_name","business_type","language","score","plan","plan_activated_at","plan_expires_at","plan_payment_id","created_at"],
    "transactions": ["id","user_id","type","amount","category","description","party","date","created_at"],
    "contacts": ["id","user_id","name","phone","email","type","notes","created_at"],
    "inventory": ["id","user_id","name","quantity","unit","price","cost_price","category","low_stock_alert","created_at"],
    "udhar": ["id","user_id","party","amount","type","description","status","due_date","created_at"],
    "staff": ["id","user_id","name","role","phone","salary","join_date","status","created_at"],
    "staff_payments": ["id","user_id","staff_id","amount","month","status","created_at"],
    "conversations": ["id","user_id","messages","created_at","updated_at"],
    "bills": ["id","user_id","vendor","amount","items","image_path","ocr_text","status","date","created_at"],
    "invoices": ["id","user_id","invoice_number","customer_name","customer_phone","items","subtotal","tax","total","status","due_date","created_at"],
    "payment_orders": ["id","user_id","order_id","amount","currency","status","plan","payment_id","created_at"],
    "automations": ["id","user_id","name","trigger_type","action_type","config","enabled","created_at"],
    "insights": ["id","user_id","type","title","content","data","created_at"],
    "subscriptions": ["id","user_id","plan","status","payment_id","starts_at","expires_at","created_at"],
    "store_products": ["id","user_id","name","price","description","image_url","category","in_stock","created_at"],
    "store_settings": ["id","user_id","store_name","store_url","theme","config","created_at"],
}


def load_json(name):
    f = DATA_DIR / f"{name}.json"
    if not f.exists():
        return []
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except:
        return []


def migrate(table):
    docs = load_json(table)
    if not docs:
        return 0

    cols = SCHEMA[table]
    cleaned = [{k: v for k, v in d.items() if k in cols} for d in docs]

    total = 0
    for i in range(0, len(cleaned), 50):
        batch = cleaned[i:i+50]
        try:
            r = client.table(table).insert(batch).execute()
            total += len(r.data) if r.data else 0
        except Exception:
            for doc in batch:
                try:
                    client.table(table).insert(doc).execute()
                    total += 1
                except Exception as e:
                    print(f"    skip ({table}): {str(e)[:50]}")
    return total


def main():
    print("Migrating JSON → Supabase...\n")
    total = 0
    for table in SCHEMA:
        n = migrate(table)
        if n > 0:
            print(f"  ✅ {table}: {n} records")
        total += n
    print(f"\nDone! {total} records migrated.")
    print("View: https://supabase.com/dashboard/project/vukbhnnbwcsiquwnnfzi/editor")


if __name__ == "__main__":
    main()
