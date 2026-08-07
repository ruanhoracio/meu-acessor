"use client";

import { useState, useRef, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Check, Move } from "lucide-react";

interface ModalCropperProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropSave: (croppedBase64: string) => void;
}

export function ModalCropper({ isOpen, imageSrc, onClose, onCropSave }: ModalCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    const cropBoxSize = 240; // tamanho do círculo de corte visual na tela em px

    // Calcular escala do zoom e posição relativa
    const scale = (img.naturalWidth / img.clientWidth) / zoom;
    
    // Centro do círculo visual no container
    const cropCenterX = cropBoxSize / 2;
    const cropCenterY = cropBoxSize / 2;

    // Posição da imagem relativa ao centro do corte
    const imgX = (cropCenterX - (img.clientWidth * zoom) / 2 - position.x) * scale;
    const imgY = (cropCenterY - (img.clientHeight * zoom) / 2 - position.y) * scale;
    const cropWidth = cropBoxSize * scale;
    const cropHeight = cropBoxSize * scale;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.drawImage(
      img,
      Math.max(0, imgX),
      Math.max(0, imgY),
      cropWidth,
      cropHeight,
      0,
      0,
      outputSize,
      outputSize
    );

    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.92);
    onCropSave(croppedBase64);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in-up">
      <div className="card w-full max-w-md p-6 bg-white shadow-elevated relative overflow-hidden flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-500 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-heading text-lg font-bold mb-1 text-gray-900">
          Ajustar & Enquadrar Foto
        </h3>
        <p className="text-xs text-gray-500 mb-5 flex items-center gap-1">
          <Move className="w-3.5 h-3.5" />
          Arraste a foto e use o zoom para enquadrar no círculo
        </p>

        {/* Viewfinder / Círculo de Corte */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-[240px] h-[240px] rounded-full overflow-hidden border-4 border-accent shadow-inner bg-gray-900 cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Para enquadrar"
            draggable={false}
            className="max-w-none transition-transform duration-75 pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              width: "100%",
              height: "auto",
              minWidth: "240px",
            }}
          />
          {/* Overlay Guia Transparente */}
          <div className="absolute inset-0 rounded-full border-2 border-white/40 pointer-events-none" />
        </div>

        {/* Controles de Zoom */}
        <div className="w-full max-w-xs mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-accent cursor-pointer h-2 bg-gray-200 rounded-lg"
            />
            <ZoomIn className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-600 min-w-[32px] text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px] text-gray-400 px-1">
            <button
              type="button"
              onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
              className="hover:underline text-gray-500 cursor-pointer"
            >
              Resetar Posição
            </button>
            <span>Arraste para mover</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 w-full mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 py-2.5 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Check className="w-4 h-4" />
            Salvar Foto
          </button>
        </div>
      </div>
    </div>
  );
}
