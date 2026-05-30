"""
Lightweight file-based database that mimics the Motor (async MongoDB) interface.
Stores data in JSON files under ./data/ directory.
Supports: find_one, find, insert_one, update_one, delete_one, sort, limit, to_list
"""
import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional
from copy import deepcopy


DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

_lock = threading.Lock()


def _match(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    """Check if a document matches a MongoDB-style query (subset)."""
    for key, val in query.items():
        if key == "$and":
            return all(_match(doc, sub) for sub in val)
        if key == "$or":
            return any(_match(doc, sub) for sub in val)

        doc_val = doc.get(key)

        if isinstance(val, dict):
            # Handle operators
            for op, operand in val.items():
                if op == "$ne":
                    if doc_val == operand:
                        return False
                elif op == "$gte":
                    if doc_val is None or doc_val < operand:
                        return False
                elif op == "$gt":
                    if doc_val is None or doc_val <= operand:
                        return False
                elif op == "$lte":
                    if doc_val is None or doc_val > operand:
                        return False
                elif op == "$lt":
                    if doc_val is None or doc_val >= operand:
                        return False
                elif op == "$in":
                    if doc_val not in operand:
                        return False
                elif op == "$nin":
                    if doc_val in operand:
                        return False
                elif op == "$exists":
                    if operand and key not in doc:
                        return False
                    if not operand and key in doc:
                        return False
        else:
            if doc_val != val:
                return False
    return True


def _apply_projection(doc: Dict[str, Any], projection: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Apply MongoDB-style projection to a document."""
    if not projection:
        return deepcopy(doc)
    
    result = deepcopy(doc)
    # Check if it's inclusion or exclusion
    has_inclusion = any(v == 1 for k, v in projection.items() if k != "_id")
    has_exclusion = any(v == 0 for k, v in projection.items())

    if has_exclusion:
        for key, val in projection.items():
            if val == 0 and key in result:
                del result[key]
    elif has_inclusion:
        keys_to_keep = {k for k, v in projection.items() if v == 1}
        keys_to_keep.add("_id")  # _id included by default unless excluded
        if projection.get("_id") == 0:
            keys_to_keep.discard("_id")
        result = {k: v for k, v in result.items() if k in keys_to_keep}

    return result


def _apply_update(doc: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """Apply MongoDB-style update operators to a document."""
    result = deepcopy(doc)
    if "$set" in update:
        for key, val in update["$set"].items():
            result[key] = val
    if "$inc" in update:
        for key, val in update["$inc"].items():
            result[key] = result.get(key, 0) + val
    if "$unset" in update:
        for key in update["$unset"]:
            result.pop(key, None)
    # If no operators, treat as replacement (keeping _id)
    if not any(k.startswith("$") for k in update.keys()):
        _id = result.get("_id")
        result = deepcopy(update)
        if _id:
            result["_id"] = _id
    return result


class FileCollection:
    """A single collection backed by a JSON file."""

    def __init__(self, name: str):
        self.name = name
        self._file = DATA_DIR / f"{name}.json"
        self._ensure_file()

    def _ensure_file(self):
        if not self._file.exists():
            with open(self._file, "w") as f:
                json.dump([], f)

    def _load(self) -> List[Dict[str, Any]]:
        with _lock:
            try:
                with open(self._file, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                return []

    def _save(self, docs: List[Dict[str, Any]]):
        with _lock:
            with open(self._file, "w") as f:
                json.dump(docs, f, indent=2, default=str)

    async def find_one(self, query: Dict[str, Any] = None, projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        query = query or {}
        docs = self._load()
        for doc in docs:
            if _match(doc, query):
                return _apply_projection(doc, projection)
        return None

    def find(self, query: Dict[str, Any] = None, projection: Optional[Dict[str, Any]] = None) -> "Cursor":
        query = query or {}
        return Cursor(self._load(), query, projection)

    async def insert_one(self, doc: Dict[str, Any]) -> "InsertResult":
        docs = self._load()
        new_doc = deepcopy(doc)
        # Remove _id if present (we use our own 'id' field)
        new_doc.pop("_id", None)
        docs.append(new_doc)
        self._save(docs)
        return InsertResult(new_doc.get("id", ""))

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> "UpdateResult":
        docs = self._load()
        modified = 0
        for i, doc in enumerate(docs):
            if _match(doc, query):
                docs[i] = _apply_update(doc, update)
                modified = 1
                break
        if modified:
            self._save(docs)
        return UpdateResult(modified)

    async def delete_one(self, query: Dict[str, Any]) -> "DeleteResult":
        docs = self._load()
        for i, doc in enumerate(docs):
            if _match(doc, query):
                docs.pop(i)
                self._save(docs)
                return DeleteResult(1)
        return DeleteResult(0)

    async def delete_many(self, query: Dict[str, Any]) -> "DeleteResult":
        docs = self._load()
        original_len = len(docs)
        docs = [d for d in docs if not _match(d, query)]
        deleted = original_len - len(docs)
        if deleted:
            self._save(docs)
        return DeleteResult(deleted)


class Cursor:
    """Mimics Motor's async cursor with sort, limit, to_list."""

    def __init__(self, docs: List[Dict[str, Any]], query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None):
        self._docs = [d for d in docs if _match(d, query)]
        self._projection = projection
        self._sort_key = None
        self._sort_dir = 1
        self._limit_val = None

    def sort(self, key: str, direction: int = -1) -> "Cursor":
        self._sort_key = key
        self._sort_dir = direction
        return self

    def limit(self, n: int) -> "Cursor":
        self._limit_val = n
        return self

    async def to_list(self, length: int = None) -> List[Dict[str, Any]]:
        docs = self._docs

        if self._sort_key:
            docs = sorted(docs, key=lambda d: d.get(self._sort_key, ""), reverse=(self._sort_dir == -1))

        limit = self._limit_val or length
        if limit:
            docs = docs[:limit]

        if self._projection:
            docs = [_apply_projection(d, self._projection) for d in docs]
        else:
            docs = [deepcopy(d) for d in docs]

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


class FileDatabase:
    """Mimics Motor's database object - returns collections on attribute access."""

    def __init__(self):
        self._collections: Dict[str, FileCollection] = {}

    def __getattr__(self, name: str) -> FileCollection:
        if name.startswith("_"):
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = FileCollection(name)
        return self._collections[name]

    def __getitem__(self, name: str) -> FileCollection:
        return self.__getattr__(name)


# Singleton instance
db = FileDatabase()
