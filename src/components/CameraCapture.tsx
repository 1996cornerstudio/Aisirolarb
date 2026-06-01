"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  title: string;
  accent: "green" | "orange";
  onCancel: () => void;
  onConfirm: (file: File) => void;
  submitting?: boolean;
}

/**
 * Camera-preview modal that captures a still frame from the device camera.
 * Falls back to a plain file uploader when camera access is unavailable.
 */
export default function CameraCapture({
  title,
  accent,
  onCancel,
  onConfirm,
  submitting = false,
}: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(
    null
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError(true);
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setPreview({ url: URL.createObjectURL(file), file });
        stopCamera();
      },
      "image/jpeg",
      0.85
    );
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview({ url: URL.createObjectURL(file), file });
    stopCamera();
  }

  function retake() {
    setPreview(null);
    startCamera();
  }

  const accentBtn =
    accent === "green"
      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
      : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-fade-up w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900">
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview.url}
                alt="Captured preview"
                className="h-full w-full object-cover"
              />
            ) : cameraError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-300">
                <Camera size={32} className="opacity-60" />
                <p className="text-sm">{t.camera.unavailable}</p>
                <label className="cursor-pointer rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
                  <span className="inline-flex items-center gap-2">
                    <Upload size={15} /> {t.camera.chooseFile}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={onPickFile}
                  />
                </label>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
                    {t.camera.starting}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            {preview ? (
              <>
                <button
                  onClick={retake}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw size={16} /> {t.camera.retake}
                </button>
                <button
                  onClick={() => onConfirm(preview.file)}
                  disabled={submitting}
                  className={`flex flex-[1.4] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${accentBtn}`}
                >
                  {submitting ? t.camera.saving : t.camera.confirm}
                </button>
              </>
            ) : (
              !cameraError && (
                <button
                  onClick={capture}
                  disabled={!cameraReady}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${accentBtn}`}
                >
                  <Camera size={18} /> {t.camera.takePhoto}
                </button>
              )
            )}
          </div>

          {!preview && !cameraError && (
            <label className="mt-3 block cursor-pointer text-center text-xs font-medium text-slate-400 transition hover:text-slate-600">
              {t.camera.orUpload}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
