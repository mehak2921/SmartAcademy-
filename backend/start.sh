#!/bin/bash
# Start the Celery worker in the background (concurrency=1 to save memory on free tier)
celery -A tasks.celery_app worker --loglevel=info --concurrency=1 &

# Start the FastAPI web server in the foreground
uvicorn main:app --host 0.0.0.0 --port $PORT
