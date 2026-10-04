import asyncio
from core.security import service_supabase

async def main():
    res = service_supabase.table("chat_sessions").select("updated_at").limit(1).execute()
    print(res.data)

if __name__ == "__main__":
    asyncio.run(main())
