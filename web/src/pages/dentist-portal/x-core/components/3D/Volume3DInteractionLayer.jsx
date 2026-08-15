import React, { useEffect, useRef } from 'react';

const stopUiEvent = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

/** Keep expensive 3D interaction work at display-frame cadence. */
export default function Volume3DInteractionLayer({
  active,
  cursor = 'crosshair',
  onClick,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
}) {
  const pendingMoveRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    pendingMoveRef.current = null;
  }, []);

  const handlePointerMove = (event) => {
    if (typeof onPointerMove !== 'function') return;
    event.preventDefault();
    event.stopPropagation();

    pendingMoveRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
      screenX: event.screenX,
      screenY: event.screenY,
      offsetX: event.nativeEvent?.offsetX ?? event.offsetX,
      offsetY: event.nativeEvent?.offsetY ?? event.offsetY,
      buttons: event.buttons,
      button: event.button,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      pressure: event.pressure,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    };

    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const sample = pendingMoveRef.current;
      pendingMoveRef.current = null;
      if (sample) onPointerMove(sample);
    });
  };

  const handlePointerLeave = (event) => {
    pendingMoveRef.current = null;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    onPointerLeave?.(event);
  };

  if (!active) return null;

  return (
    <div
      data-xcore-ui="true"
      data-xcore-interaction-layer="true"
      className="absolute inset-0 z-[12]"
      style={{ cursor, touchAction: 'none' }}
      onContextMenu={stopUiEvent}
      onPointerDown={onPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      onWheelCapture={(event) => {
        event.stopPropagation();
      }}
    />
  );
}
