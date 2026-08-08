import unittest
import os
import sys
import shutil

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import get_series_instances, UPLOAD_DIR

class TestInstancesEndpoint(unittest.TestCase):
    def test_instances_endpoint_not_found(self):
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            get_series_instances("non_existent_study_id_99999", "series_123")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_instances_endpoint_static_png(self):
        study_id = "test_study_p6_unit"
        study_dir = os.path.join(UPLOAD_DIR, study_id)
        os.makedirs(study_dir, exist_ok=True)
        
        try:
            static_file = os.path.join(study_dir, "test_image.png")
            with open(static_file, "wb") as f:
                f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
            
            data = get_series_instances(study_id, "series_1")
            self.assertEqual(data["study_id"], study_id)
            self.assertEqual(data["series_uid"], "series_1")
            self.assertIn("instances", data)
            self.assertEqual(len(data["instances"]), 1)
            inst = data["instances"][0]
            self.assertEqual(inst["source_kind"], "STATIC_PNG")
            self.assertIn("source_instance_key", inst)
        finally:
            shutil.rmtree(study_dir, ignore_errors=True)

if __name__ == '__main__':
    unittest.main()
