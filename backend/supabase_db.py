"""
Supabase-backed database that provides the same interface as filedb.py.
Drop-in replacement: just change `from filedb import db` to `from supabase_db import db`

Supports: find_one, find, insert_one, update_one, delete_one, delete_many, sort, limit, to_list
"""
import os
import ssl
import json
from copy import deepcopy
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from pathlib import Path

# Fix SSL for corporate/enterprise networks that intercept HTTPS
import platform
if platform.system() == "Windows":
    try:
        import truststore
        truststore.inject_into_ssl()
    except Exception:
        ssl._create_default_https_context = ssl._create_unverified_context

load_dotenv(Path(__file__).parent / '.env')

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")  # Use service_role key for backend

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_KEY in .env file.\n"
        "Get these from: https://app.supabase.com → Project Settings → API"
    )

from supabase import create_client, Client

_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def _mongo_query_to_postgrest(query: Dict[str, Any], builder):
    """Convert MongoDB-style query to Supabase/PostgREST filters."""
    for key, val in query.items():
        if key == "$and":
            for sub in val:
                builder = _mongo_query_to_postgrest(sub, builder)
        elif key == "$or":
            # PostgREST 'or' filter
            or_parts = []
            for sub in val:
                for k, v in sub.items():
                    if isinstance(v, dict):
                        for op, operand in v.items():
                            if op == "$eq":
                                or_parts.append(f"{k}.eq.{operand}")
                            elif op == "$ne":
                                or_parts.append(f"{k}.neq.{operand}")
                            elif op == "$gt":
                                or_parts.append(f"{k}.gt.{operand}")
                            elif op == "$gte":
                                or_parts.append(f"{k}.gte.{operand}")
                            elif op == "$lt":
                                or_parts.append(f"{k}.lt.{operand}")
                            elif op == "$lte":
                                or_parts.append(f"{k}.lte.{operand}")
                    else:
                        or_parts.append(f"{k}.eq.{v}")
            if or_parts:
                builder = builder.or_(",".join(or_parts))
        elif isinstance(val, dict):
            for op, operand in val.items():
                if op == "$eq":
                    builder = builder.eq(key, operand)
                elif op == "$ne":
                    builder = builder.neq(key, operand)
                elif op == "$gt":
                    builder = builder.gt(key, operand)
                elif op == "$gte":
                    builder = builder.gte(key, operand)
                elif op == "$lt":
                    builder = builder.lt(key, operand)
                elif op == "$lte":
                    builder = builder.lte(key, operand)
                elif op == "$in":
                    builder = builder.in_(key, operand)
                elif op == "$nin":
                    # Not in - use negation
                    for item in operand:
                        builder = builder.neq(key, item)
                elif op == "$exists":
                    if operand:
                        builder = builder.not_.is_(key, "null")
                    else:
                        builder = builder.is_(key, "null")
        else:
            builder = builder.eq(key, val)
    return builder


def _apply_projection_to_columns(projection: Optional[Dict[str, Any]]) -> Optional[str]:
    """Convert MongoDB projection to PostgREST column selection."""
    if not projection:
        return "*"
    
    has_inclusion = any(v == 1 for k, v in projection.items() if k != "_id")
    
    if has_inclusion:
        cols = [k for k, v in projection.items() if v == 1]
        # Always include id
        if "id" not in cols:
            cols.insert(0, "id")
        return ",".join(cols)
    
    # For exclusion, we select all and filter in Python
    return "*"


def _apply_exclusion(doc: Dict[str, Any], projection: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Apply exclusion projection in Python (PostgREST doesn't support exclusion natively)."""
    if not projection:
        return doc
    
    has_exclusion = any(v == 0 for k, v in projection.items())
    if has_exclusion:
        result = dict(doc)
        for key, val in projection.items():
            if val == 0 and key in result:
                del result[key]
        return result
    return doc


def _apply_mongo_update(doc: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB update operators to a flat dict for Supabase update."""
    result = {}
    
    if "$set" in update:
        result.update(update["$set"])
    if "$inc" in update:
        for key, val in update["$inc"].items():
            result[key] = (doc.get(key, 0) or 0) + val
    if "$unset" in update:
        for key in update["$unset"]:
            result[key] = None
    
    # If no operators, treat as full replacement (keeping id)
    if not any(k.startswith("$") for k in update.keys()):
        result = {k: v for k, v in update.items() if k != "id"}
    
    return result


class SupabaseCollection:
    """A single collection backed by a Supabase table."""

    def __init__(self, name: str):
        self.name = name

    def _table(self):
        return _client.table(self.name)

    async def find_one(self, query: Dict[str, Any] = None, projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        query = query or {}
        columns = _apply_projection_to_columns(projection)
        
        builder = self._table().select(columns)
        builder = _mongo_query_to_postgrest(query, builder)
        builder = builder.limit(1)
        
        response = builder.execute()
        
        if response.data and len(response.data) > 0:
            doc = response.data[0]
            return _apply_exclusion(doc, projection)
        return None

    def find(self, query: Dict[str, Any] = None, projection: Optional[Dict[str, Any]] = None) -> "SupabaseCursor":
        query = query or {}
        return SupabaseCursor(self.name, query, projection)

    async def insert_one(self, doc: Dict[str, Any]) -> "InsertResult":
        new_doc = deepcopy(doc)
        new_doc.pop("_id", None)
        
        # Convert any nested dicts/lists to JSON strings for JSONB columns
        for key, val in new_doc.items():
            if isinstance(val, (list, dict)):
                # Keep as-is; Supabase handles JSON serialization
                pass
        
        response = self._table().insert(new_doc).execute()
        
        inserted_id = ""
        if response.data and len(response.data) > 0:
            inserted_id = response.data[0].get("id", "")
        
        return InsertResult(inserted_id)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> "UpdateResult":
        # First find the document
        doc = await self.find_one(query)
        if not doc:
            return UpdateResult(0)
        
        # Build the update payload
        update_data = _apply_mongo_update(doc, update)
        
        if not update_data:
            return UpdateResult(0)
        
        # Update by id
        self._table().update(update_data).eq("id", doc["id"]).execute()
        return UpdateResult(1)

    async def delete_one(self, query: Dict[str, Any]) -> "DeleteResult":
        # Find the document first
        doc = await self.find_one(query)
        if not doc:
            return DeleteResult(0)
        
        self._table().delete().eq("id", doc["id"]).execute()
        return DeleteResult(1)

    async def delete_many(self, query: Dict[str, Any]) -> "DeleteResult":
        # Find all matching
        builder = self._table().select("id")
        builder = _mongo_query_to_postgrest(query, builder)
        response = builder.execute()
        
        if not response.data:
            return DeleteResult(0)
        
        count = len(response.data)
        ids = [d["id"] for d in response.data]
        
        for doc_id in ids:
            self._table().delete().eq("id", doc_id).execute()
        
        return DeleteResult(count)


class SupabaseCursor:
    """Mimics Motor's async cursor with sort, limit, to_list."""

    def __init__(self, table_name: str, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None):
        self._table_name = table_name
        self._query = query
        self._projection = projection
        self._sort_key = None
        self._sort_dir = 1
        self._limit_val = None

    def sort(self, key: str, direction: int = -1) -> "SupabaseCursor":
        self._sort_key = key
        self._sort_dir = direction
        return self

    def limit(self, n: int) -> "SupabaseCursor":
        self._limit_val = n
        return self

    async def to_list(self, length: int = None) -> List[Dict[str, Any]]:
        columns = _apply_projection_to_columns(self._projection)
        builder = _client.table(self._table_name).select(columns)
        builder = _mongo_query_to_postgrest(self._query, builder)
        
        # Apply sort
        if self._sort_key:
            desc = (self._sort_dir == -1)
            builder = builder.order(self._sort_key, desc=desc)
        
        # Apply limit
        limit = self._limit_val or length
        if limit:
            builder = builder.limit(limit)
        
        response = builder.execute()
        
        docs = response.data or []
        
        # Apply exclusion projection if needed
        if self._projection:
            docs = [_apply_exclusion(d, self._projection) for d in docs]
        
        return docs


class InsertResult:
    def __init__(self, inserted_id: str):
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, modified_count: int):
        self.modified_count = modified_count
        self.matched_count = modified_count


class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class SupabaseDatabase:
    """Mimics the FileDatabase interface - returns collections on attribute access."""

    def __init__(self):
        self._collections: Dict[str, SupabaseCollection] = {}

    def __getattr__(self, name: str) -> SupabaseCollection:
        if name.startswith("_"):
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = SupabaseCollection(name)
        return self._collections[name]

    def __getitem__(self, name: str) -> SupabaseCollection:
        return self.__getattr__(name)


# Singleton instance - same interface as filedb.db
db = SupabaseDatabase()
