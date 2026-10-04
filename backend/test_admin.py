import asyncio
from core.security import service_supabase

async def main():
    users = service_supabase.auth.admin.list_users()
    if users:
        u_id = users[0].id
        u = service_supabase.auth.admin.get_user_by_id(u_id)
        print(dir(u.user))

if __name__ == "__main__":
    asyncio.run(main())
