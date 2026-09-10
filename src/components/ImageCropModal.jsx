import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';

/**
 * ImageCropModal
 * High-performance, Canvas-based interactive circular photo cropping modal.
 * Supports drag-to-pan, pinch/wheel zoom, 90-deg rotation, and crisp 1:1 export.
 */
export default function ImageCropModal({ imageSrc, onClose, onSave }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const VIEWPORT_SIZE = 280; // Diameter of circular crop area in UI
  const OUTPUT_SIZE = 400;   // High-definition square output dimensions

  // Load the image into an Image object
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Center the image initially
      setPan({ x: 0, y: 0 });
      setScale(1);
      setRotation(0);
    };
  }, [imageSrc]);

  // Draw the preview onto the interactive canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !imageLoaded) return;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    canvas.width = VIEWPORT_SIZE;
    canvas.height = VIEWPORT_SIZE;

    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Save context state
    ctx.save();

    // Move to center of canvas
    ctx.translate(VIEWPORT_SIZE / 2 + pan.x, VIEWPORT_SIZE / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Calculate aspect-ratio fitted base dimensions
    const imgAspect = img.width / img.height;
    let drawWidth = VIEWPORT_SIZE;
    let drawHeight = VIEWPORT_SIZE;

    if (imgAspect > 1) {
      drawWidth = VIEWPORT_SIZE * imgAspect;
      drawHeight = VIEWPORT_SIZE;
    } else {
      drawWidth = VIEWPORT_SIZE;
      drawHeight = VIEWPORT_SIZE / imgAspect;
    }

    // Draw centered
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();
  }, [imageLoaded, pan, rotation, scale]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Mouse & Touch Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => Math.min(Math.max(1, +(prev + zoomFactor).toFixed(2)), 3.5));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset adjustments
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Perform crisp export of cropped circle to data URL
  const handleSave = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    // Create an offscreen output canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext('2d');

    const factor = OUTPUT_SIZE / VIEWPORT_SIZE;

    // Optional circular clip for output canvas (so it's naturally round or transparent corners)
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill dark background just in case
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Apply transformation scaled by factor
    ctx.translate(OUTPUT_SIZE / 2 + pan.x * factor, OUTPUT_SIZE / 2 + pan.y * factor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * factor, scale * factor);

    const imgAspect = img.width / img.height;
    let drawWidth = VIEWPORT_SIZE;
    let drawHeight = VIEWPORT_SIZE;

    if (imgAspect > 1) {
      drawWidth = VIEWPORT_SIZE * imgAspect;
      drawHeight = VIEWPORT_SIZE;
    } else {
      drawWidth = VIEWPORT_SIZE;
      drawHeight = VIEWPORT_SIZE / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Export as high-quality JPEG (or PNG)
    const croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.9);
    onSave(croppedDataUrl);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000,
        background: 'rgba(5, 4, 10, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'linear-gradient(180deg, #161226 0%, #0d0a17 100%)',
          border: '1px solid rgba(255, 117, 140, 0.3)',
          borderRadius: '24px',
          padding: '22px 20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 59, 104, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Header */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              Crop Profile Picture
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.55)' }}>
              Drag to position • Scroll to zoom
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Viewport Crop Box */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            width: `${VIEWPORT_SIZE}px`,
            height: `${VIEWPORT_SIZE}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            border: '3px solid rgba(255, 117, 140, 0.8)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 8px 32px rgba(255, 59, 104, 0.35)',
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: `${VIEWPORT_SIZE}px`,
              height: `${VIEWPORT_SIZE}px`,
              pointerEvents: 'none'
            }}
          />

          {/* Grid Guideline Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr'
            }}
          >
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)' }} />
            <div />
          </div>
        </div>

        {/* Zoom Slider Control */}
        <div style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(1, +(s - 0.2).toFixed(2)))}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}
          >
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#ff3b68',
              cursor: 'pointer'
            }}
          />
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}
          >
            <ZoomIn size={16} />
          </button>
          <span style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>
            {scale.toFixed(1)}x
          </span>
        </div>

        {/* Action Toolbar: Rotate & Reset */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', width: '100%', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleRotate}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '100px',
              padding: '6px 14px',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCw size={14} />
            <span>Rotate</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '100px',
              padding: '6px 14px',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Footer Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '500px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 2,
              padding: '10px',
              borderRadius: '500px',
              background: 'linear-gradient(135deg, #ff3b68 0%, #a238ff 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(255, 59, 104, 0.4)'
            }}
          >
            <Check size={16} />
            <span>Save Profile Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
