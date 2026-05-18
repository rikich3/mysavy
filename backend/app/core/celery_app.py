from celery import Celery
import os

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "misavy_worker",
    broker=redis_url,
    backend=redis_url,
    include=['app.services.analyze_service', 'app.services.render_service'] # include modules with tasks if any
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
