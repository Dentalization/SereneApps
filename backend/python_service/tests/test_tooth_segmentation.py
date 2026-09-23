"""
test_tooth_segmentation_service.py
Phase 12 unit tests for geometric heuristic tooth segmentation.
"""
import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.tooth_segmentation_service import (
    segment_teeth_from_mesh,
    run_tooth_segmentation_pipeline,
    load_tooth_instances,
)


def _make_arch_vertices(n_per_side=8, z_levels=(-4.0, 4.0)):
    """Generate a synthetic parabolic arch mesh (same geometry as reconstruction_service)."""
    import math
    vertices = []
    for z in z_levels:
        for i in range(-n_per_side, n_per_side + 1):
            t = i / float(n_per_side)
            x = round(t * 24.0, 3)
            y = round(-0.045 * (x * x) + 20.0, 3)
            vertices.append([x, y, z])
    return vertices


def _make_arch_faces(n_per_side=8, n_z_levels=2):
    """Generate face connectivity for the arch grid."""
    cols = n_per_side * 2 + 1
    faces = []
    for z_idx in range(n_z_levels - 1):
        for c in range(cols - 1):
            v1 = z_idx * cols + c + 1
            v2 = v1 + 1
            v3 = (z_idx + 1) * cols + c + 1
            v4 = v3 + 1
            faces.append([v1, v2, v3])
            faces.append([v2, v4, v3])
    return faces


class TestSegmentTeethFromMesh:
    def test_empty_vertices_returns_empty(self):
        result = segment_teeth_from_mesh([], [])
        assert result == [], "Empty vertices should return empty list"

    def test_synthetic_arch_produces_instances(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        assert len(instances) > 0, "Should produce at least some tooth instances"
        assert len(instances) <= 32, f"Should produce at most 32 FDI slots, got {len(instances)}"

    def test_fdi_range_valid(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        valid_fdi = {
            *range(11, 19),  # Q1: 11-18
            *range(21, 29),  # Q2: 21-28
            *range(31, 39),  # Q3: 31-38
            *range(41, 49),  # Q4: 41-48
        }
        for inst in instances:
            assert inst['fdi'] in valid_fdi, f"FDI {inst['fdi']} not in valid FDI set"

    def test_confidence_range(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        for inst in instances:
            assert 0.0 <= inst['confidence'] <= 0.40, (
                f"Confidence {inst['confidence']} out of expected range [0, 0.40]"
            )

    def test_experimental_flag_set(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        for inst in instances:
            assert inst.get('experimental') is True, "All instances must be marked experimental"

    def test_engine_id(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        for inst in instances:
            assert inst['engine'] == 'geometric_heuristic_v1'

    def test_centroid_within_arch_bounds(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        for inst in instances:
            cx, cy, cz = inst['centroid']
            assert abs(cx) <= 30.0, f"Centroid X={cx} out of expected arch range"

    def test_tooth_type_valid(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        valid_types = {'incisor', 'canine', 'premolar', 'molar'}
        for inst in instances:
            assert inst['type'] in valid_types, f"Tooth type {inst['type']} not valid"

    def test_unique_fdi_per_instance(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(vertices, faces)
        fdis = [inst['fdi'] for inst in instances]
        assert len(fdis) == len(set(fdis)), f"Duplicate FDI numbers: {fdis}"

    def test_scan_id_and_patient_id_in_output(self):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        instances = segment_teeth_from_mesh(
            vertices, faces, scan_id='SCAN-001', patient_id='PAT-999'
        )
        for inst in instances:
            assert inst['scan_id'] == 'SCAN-001'
            assert inst['patient_id'] == 'PAT-999'

    def test_single_vertex_bucket_skipped(self):
        # A mesh with only 1 vertex — should produce empty result (bucket too sparse)
        vertices = [[0.0, 20.0, 0.0]]
        faces = []
        instances = segment_teeth_from_mesh(vertices, faces)
        # 1 vertex → 1 bucket with 1 vertex → skipped (< 2)
        assert len(instances) == 0, "Single-vertex bucket should be skipped"


class TestRunPipeline:
    def test_writes_json_to_study_dir(self, tmp_path):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        result = run_tooth_segmentation_pipeline(
            study_dir=str(tmp_path),
            vertices=vertices,
            faces=faces,
            scan_id='SCAN-TEST',
        )
        out_file = tmp_path / 'tooth_instances.json'
        assert out_file.exists(), "tooth_instances.json should be written"
        data = json.loads(out_file.read_text())
        assert 'instances' in data
        assert data['experimental'] is True

    def test_result_has_summary_fields(self, tmp_path):
        vertices = _make_arch_vertices()
        faces = _make_arch_faces()
        result = run_tooth_segmentation_pipeline(
            study_dir=str(tmp_path),
            vertices=vertices,
            faces=faces,
        )
        assert 'tooth_count' in result
        assert 'duration_ms' in result
        assert 'completed_at' in result
        assert result['tooth_count'] >= 0


class TestLoadToothInstances:
    def test_load_existing(self, tmp_path):
        data = {'instances': [{'fdi': 11}], 'tooth_count': 1, 'experimental': True}
        (tmp_path / 'tooth_instances.json').write_text(json.dumps(data))
        loaded = load_tooth_instances(str(tmp_path))
        assert loaded is not None
        assert loaded['tooth_count'] == 1

    def test_load_missing_returns_none(self, tmp_path):
        result = load_tooth_instances(str(tmp_path))
        assert result is None

    def test_load_corrupt_returns_none(self, tmp_path):
        (tmp_path / 'tooth_instances.json').write_text('not_valid_json{{{')
        result = load_tooth_instances(str(tmp_path))
        assert result is None


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v'])
