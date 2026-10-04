import datetime
from fastapi import APIRouter, Depends, HTTPException
from core.security import get_current_user, service_supabase

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/")
async def get_analytics(user = Depends(get_current_user)):
    try:
        # 1. Documents Uploaded (Count unique titles to avoid counting retries/duplicates)
        docs_res = service_supabase.table("documents").select("title").eq("user_id", user.id).execute()
        docs_count = len(set(d["title"] for d in docs_res.data)) if docs_res.data else 0

        # 2. Quizzes Taken & Average Score
        quizzes_res = service_supabase.table("quizzes").select("score, title").eq("user_id", user.id).execute()
        quizzes = quizzes_res.data
        quizzes_count = len(quizzes)
        
        avg_score = 0
        weak_topics = []
        if quizzes_count > 0:
            valid_scores = [q['score'] for q in quizzes if q.get('score') is not None]
            if valid_scores:
                avg_score = int(sum(valid_scores) / len(valid_scores))
            
            # Find weak topics (score < 75)
            weak_quizzes = [q for q in quizzes if q.get('score') is not None and q['score'] < 75]
            for wq in weak_quizzes:
                weak_topics.append({
                    "title": wq["title"],
                    "score": f"{wq['score']}% Score"
                })

        # 3. Learning Streak
        # Calculate active days in the current week (Monday to Sunday)
        today = datetime.datetime.utcnow().date()
        monday = today - datetime.timedelta(days=today.weekday())
        start_of_week = monday.isoformat()

        active_timestamps = []

        # Documents streak
        try:
            streak_docs = service_supabase.table("documents").select("upload_date").eq("user_id", user.id).gte("upload_date", start_of_week).execute()
            for item in streak_docs.data:
                if item.get("upload_date"):
                    active_timestamps.append(item["upload_date"])
        except Exception:
            pass

        # Quizzes streak
        try:
            streak_quizzes = service_supabase.table("quizzes").select("created_at").eq("user_id", user.id).gte("created_at", start_of_week).execute()
            for item in streak_quizzes.data:
                if item.get("created_at"):
                    active_timestamps.append(item["created_at"])
        except Exception:
            pass
            
        # Chat/Agent Activity Streak
        try:
            streak_chats = service_supabase.table("chat_sessions").select("updated_at").eq("user_id", user.id).gte("updated_at", start_of_week).execute()
            for item in streak_chats.data:
                if item.get("updated_at"):
                    active_timestamps.append(item["updated_at"])
        except Exception:
            pass

        # Add user's last sign-in as an active timestamp so logging in counts
        if getattr(user, 'last_sign_in_at', None):
            active_timestamps.append(user.last_sign_in_at)
        
        # 4. Study Time (Mocked for now, estimating 10 mins per quiz and 5 mins per document)
        estimated_minutes = (quizzes_count * 10) + (docs_count * 5)
        hours = estimated_minutes // 60
        mins = estimated_minutes % 60
        study_time = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"

        return {
            "documents_uploaded": docs_count,
            "quizzes_taken": quizzes_count,
            "average_score": f"{avg_score}%",
            "study_time": study_time,
            "weak_topics": weak_topics[:5], # Top 5 weakest
            "active_timestamps": active_timestamps
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
