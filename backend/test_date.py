import os
import sys
import asyncio
from dotenv import load_dotenv

# load env
load_dotenv(".env")
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing credentials")
    sys.exit(1)

client = create_client(url, key)

res = client.table("chat_sessions").select("updated_at").limit(1).execute()
print(res.data)
