"""Vercel serverless function wrapper for the FastAPI backend."""
import sys
from pathlib import Path

# Add backend directory to Python path so imports work
backend_dir = str(Path(__file__).parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from server import app  # noqa: E402 - the FastAPI app
