/**
 * ResizeHandle Component
 *
 * A draggable vertical handle for resizing adjacent panels.
 */

import React, { useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  position: 'left' | 'right';
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onResize, position }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      // For right sidebar, invert the delta since dragging left should increase width
      const adjustedDelta = position === 'right' ? -delta : delta;
      onResize(adjustedDelta);
      setStartX(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Add cursor style to body while dragging
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, startX, onResize, position]);

  return (
    <div
      className={`w-1 shrink-0 cursor-col-resize transition-colors duration-150 hover:bg-accent/50 ${
        isDragging ? 'bg-accent' : 'bg-transparent hover:bg-white/20'
      }`}
      onMouseDown={handleMouseDown}
      title="Drag to resize"
    />
  );
};

export default ResizeHandle;
