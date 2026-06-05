import React from 'react';

const stopUiEvent = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

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
  if (!active) return null;

  return (
    <div
      data-xcore-ui="true"
      data-xcore-interaction-layer="true"
      className="absolute inset-0 z-[12]"
      style={{ cursor }}
      onContextMenu={stopUiEvent}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      onWheelCapture={(event) => {
        event.stopPropagation();
      }}
    />
  );
}
