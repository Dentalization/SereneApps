import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { createVolume3DAnnotationCanvasController } from './volume3DAnnotationCanvasRenderer.mjs';

const Volume3DAnnotationCanvas = forwardRef(function Volume3DAnnotationCanvas({
  width,
  height,
  visible = true,
}, ref) {
  const canvasRef = useRef(null);
  const controller = useMemo(() => createVolume3DAnnotationCanvasController({
    getCanvas: () => canvasRef.current,
    getDevicePixelRatio: () => window.devicePixelRatio || 1,
  }), []);

  useImperativeHandle(ref, () => ({
    update: controller.update,
    clear: controller.clear,
    drawNow: controller.drawNow,
  }), [controller]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    controller.drawNow();
  }, [controller, height, width]);

  useEffect(() => () => {
    controller.dispose();
  }, [controller]);

  return (
    <canvas
      ref={canvasRef}
      data-xcore-ui="true"
      data-xcore-annotation-canvas="true"
      className="pointer-events-none absolute inset-0 z-[21]"
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    />
  );
});

export default Volume3DAnnotationCanvas;
