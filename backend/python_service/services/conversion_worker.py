"""Architecture C: Celery worker for VTI conversion.

Started separately from the API process:

    celery -A services.conversion_worker.celery_app worker \
        --concurrency=<N> --pool=threads --loglevel=info

The API enqueues with XCORE_CONVERSION_ARCH=celery. Status polling still reads
the study folder (volume.vti existence), because progress callbacks run in the
worker process and are not shared with the API process.
"""
import os
import sys

from celery import Celery

BROKER_URL = os.environ.get("XCORE_CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery("xcore_conversion", broker=BROKER_URL, backend=None)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    task_acks_late=False,
    worker_prefetch_multiplier=1,
    task_track_started=False,
    task_ignore_result=True,
)


@celery_app.task(name="xcore.convert_study")
def convert_study_task(study_path, force, segment, quality, run_id, case_id, iteration):
    # Imported lazily so the broker-side import of this module stays light.
    # main.py lives in the python_service root, which the worker must have on sys.path.
    service_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if service_root not in sys.path:
        sys.path.insert(0, service_root)
    from main import _ensure_vti_conversion_singleflight

    _ensure_vti_conversion_singleflight(
        study_path, force, True, segment, quality, run_id, case_id, iteration
    )
