import asyncio
from core.security import service_supabase

async def main():
    # List users
    users = service_supabase.auth.admin.list_users()
    for u in users:
        print(f"User: {u.email}, Last Sign In: {getattr(u, 'last_sign_in_at', 'NOT FOUND')}")
        break

if __name__ == "__main__":
    asyncio.run(main())
