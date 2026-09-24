"""Headless VTK geometry imports; do not initialize rendering/UI plugins in offline jobs."""
from vtkmodules.vtkCommonCore import reference
from vtkmodules.vtkCommonDataModel import vtkPolyData, vtkStaticCellLocator, vtkImageData
from vtkmodules.vtkCommonTransforms import vtkTransform
from vtkmodules.vtkFiltersCore import vtkTriangleFilter, vtkFlyingEdges3D
from vtkmodules.vtkFiltersGeneral import vtkTransformPolyDataFilter
from vtkmodules.vtkFiltersSources import vtkPlaneSource
from vtkmodules.vtkIOGeometry import vtkSTLReader, vtkOBJReader, vtkSTLWriter
from vtkmodules.vtkIOPLY import vtkPLYReader
