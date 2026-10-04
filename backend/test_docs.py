import asyncio
from core.security import service_supabase

async def main():
    res = service_supabase.table("documents").select("*").limit(1).execute()
    if res.data:
        print(res.data[0].keys())
    else:
        print("No documents")

if __name__ == "__main__":
    asyncio.run(main())
