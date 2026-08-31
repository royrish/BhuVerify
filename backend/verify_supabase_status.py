from pathlib import Path

from dotenv import dotenv_values
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, supabase_client

project_root = Path(__file__).resolve().parent.parent
frontend_env_path = project_root / "frontend" / ".env.local"
frontend = dotenv_values(str(frontend_env_path))

print("BACKEND_ENV", bool(SUPABASE_URL), bool(SUPABASE_SERVICE_ROLE_KEY), "URL_PREFIX=" + (SUPABASE_URL[:8] if SUPABASE_URL else "MISSING"), "SERVICE_ROLE_KEY_LEN=" + str(len(SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_SERVICE_ROLE_KEY else 0))
print("FRONTEND_ENV", bool(frontend.get("NEXT_PUBLIC_SUPABASE_URL")), bool(frontend.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")), bool(frontend.get("NEXT_PUBLIC_API_URL")), "URL_PREFIX=" + (frontend.get("NEXT_PUBLIC_SUPABASE_URL", "")[:8] if frontend.get("NEXT_PUBLIC_SUPABASE_URL") else "MISSING"), "ANON_KEY_LEN=" + str(len(frontend.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "") or "")))

client = supabase_client()
print("CLIENT_READY", bool(client))

try:
    buckets = client.storage.list_buckets()
    if isinstance(buckets, list):
        names = [b.get("name") for b in buckets if isinstance(b, dict) and "name" in b]
    else:
        names = [b.get("name") for b in getattr(buckets, "data", []) if isinstance(b, dict) and "name" in b]
    print("BUCKET_COUNT", len(names))
    print("LAND_RECORDS_BUCKET_PRESENT", "land-records" in names)
except Exception as e:
    print("STORAGE_ERROR", type(e).__name__)

try:
    res = client.table("documents").select("id").limit(1).execute()
    print("DB_QUERY_OK", True)
    print("DB_ROWS", len(res.data) if getattr(res, "data", None) is not None else 0)
except Exception as e:
    print("DB_QUERY_OK", False)
    print("DB_ERROR", type(e).__name__)
    print("DB_MESSAGE", str(e)[:220])
