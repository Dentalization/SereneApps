import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';

self.onmessage = (event) => {
  const { id, contourValue, dims, spacing, origin, scalarBuffer } = event.data || {};

  try {
    const imageData = vtkImageData.newInstance();
    imageData.setDimensions(...dims);
    imageData.setSpacing(...spacing);
    imageData.setOrigin(...origin);
    imageData.getPointData().setScalars(vtkDataArray.newInstance({
      name: 'Scalars',
      values: new Float32Array(scalarBuffer),
      numberOfComponents: 1,
    }));

    const marching = vtkImageMarchingCubes.newInstance({
      contourValue,
      computeNormals: false,
      mergePoints: true,
    });
    marching.setInputData(imageData);
    marching.update();

    const polyData = marching.getOutputData();
    const pointArray = polyData?.getPoints?.()?.getData?.() || new Float32Array();
    const polyArray = polyData?.getPolys?.()?.getData?.() || new Uint32Array();

    self.postMessage({
      id,
      ok: true,
      points: pointArray,
      polys: polyArray,
    }, [pointArray.buffer, polyArray.buffer]);

    try { marching.delete?.(); } catch (_) { }
    try { imageData.delete?.(); } catch (_) { }
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
