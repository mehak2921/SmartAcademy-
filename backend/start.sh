#!/bin/bash
# Start the Celery worker in the background
celery -A tasks.celery_app worker --loglevel=info &

# Start the FastAPI web server in the foreground
uvicorn main:app --host 0.0.0.0 --port $PORT
