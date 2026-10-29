import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

interface CameraCaptureSheetProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/** Kamera in-app: live preview (kamera belakang) + tombol jepret → File JPEG. */
export const CameraCaptureSheet: React.FC<CameraCaptureSheetProps> = ({
  onCapture,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const stop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (alive) setError('Browser ini tidak mendukung kamera. Pakai upload galeri.');
        return;
      }
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch {
          // HP tanpa kamera belakang / constraint ditolak → kamera apa saja.
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        if (alive) setReady(true);
      } catch {
        if (alive) setError('Izin kamera ditolak. Aktifkan izin kamera di browser, atau pakai upload galeri.');
      }
    };
    void start();
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `struk-${Date.now()}.jpg`, { type: 'image/jpeg' });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onCapture(file);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <Modal
      icon="photo_camera"
      title="Foto Struk"
      subtitle="Posisikan struk di dalam bingkai lalu jepret"
      onClose={onClose}
      position="sheet"
    >
      <div className="flex flex-col gap-3">
        <div className="relative w-full aspect-[3/4] max-h-[52vh] bg-slate-950 rounded-xl overflow-hidden">
          {!error && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Bingkai panduan struk */}
          {!error && ready && (
            <div className="absolute inset-x-8 top-10 bottom-10 border-2 border-dashed border-white/70 rounded-lg pointer-events-none" />
          )}
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-white text-xs font-semibold">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Menyalakan kamera…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <span className="material-symbols-outlined text-amber-400 text-[32px]">videocam_off</span>
              <p className="text-xs text-white font-semibold">{error}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCapture}
          disabled={!ready || !!error}
          className="w-full h-12 rounded-full bg-[#006194] hover:bg-[#007bb9] disabled:bg-slate-300 text-white text-sm font-bold flex items-center justify-center gap-2 shadow active:scale-[0.99] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
          Jepret Struk
        </button>
      </div>
    </Modal>
  );
};
