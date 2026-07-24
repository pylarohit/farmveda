"use client";

import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Camera,
  ScanLine,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Bug,
  Sparkles,
  Droplets,
  Activity,
  Maximize2,
  Cpu,
  FlaskConical,
  ShieldCheck,
  Zap,
  Info,
  X,
  SwitchCamera,
  Volume2,
  VolumeX,
  ShoppingBag,
  Loader2,
  ExternalLink
} from "lucide-react"; import { IKContext, IKUpload } from "imagekitio-react";

const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const authenticator = async () => {
  try {
    const response = await fetch('/api/imagekit/auth');
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();
    return { signature: data.signature, expire: data.expire, token: data.token };
  } catch (error: any) {
    throw new Error(`Authentication request failed: ${error.message}`);
  }
};
export default function DiseaseDetectionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanState, setScanState] = useState<"idle" | "camera" | "scanning" | "results" | "error">("idle");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"organic" | "chemical" | "protocol" | "preventive">("organic");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("crop_disease_history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  // Fetch Google Shopping products based on diagnosis treatment recommendation
  useEffect(() => {
    if (result && scanState === "results") {
      fetchProducts();
    }
  }, [result, scanState]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProducts([]);
    try {
      let queryTerm = "";
      if (result.diseaseName.toLowerCase().includes("healthy")) {
        queryTerm = "organic fertilizer plants";
      } else {
        // Use the diseaseName for a direct targeted shopping search
        queryTerm = `${result.diseaseName} treatment`;
      }

      const res = await fetch(`/api/disease-products?q=${encodeURIComponent(queryTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const selectHistoryItem = (item: any) => {
    setResult(item.result);
    setPreviewUrl(item.imageUrl);
    setScanState("results");
    setErrorMsg("");
  };

  // Stop camera when unmounted or state changes away from camera
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async (facing: "environment" | "user" = facingMode) => {
    stopCamera();
    setScanState("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setErrorMsg("Could not access camera. Please allow camera permissions or upload an image.");
      setScanState("error");
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `leaf_scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        const url = URL.createObjectURL(capturedFile);
        stopCamera();
        setFile(capturedFile);
        setPreviewUrl(url);
        processImage(capturedFile);
      }
    }, "image/jpeg", 0.92);
  };

  const processImage = async (selectedFile: File) => {
    setScanState("scanning");
    setErrorMsg("");
    setResult(null);
    setActiveStep(1);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setTimeout(() => setActiveStep(2), 600);
      setTimeout(() => setActiveStep(3), 1200);
      setTimeout(() => setActiveStep(4), 1800);

      let response: Response;
      try {
        response = await fetch("http://localhost:8000/api/detect-disease", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Backend port 8000 non-OK");
      } catch (err) {
        console.log("Direct port 8000 fetch failed, trying Next.js API route fallback...");
        response = await fetch("/api/detect-disease", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to process image through AI backend pipeline.");
      }

      const data = await response.json();
      setResult(data);
      setScanState("results");

      // Save to localStorage history
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const newHistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }),
          diseaseName: data.diseaseName,
          imageUrl: base64data,
          result: data
        };
        setHistory((prev) => {
          const updated = [newHistoryItem, ...prev.filter(item => item.result.diseaseName !== data.diseaseName).slice(0, 9)];
          localStorage.setItem("crop_disease_history", JSON.stringify(updated));
          return updated;
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      console.error("Scan error:", error);
      setErrorMsg(error.message);
      setScanState("error");
    }
  };

  const handleImageKitSuccess = async (res: any) => {
    setPreviewUrl(res.url);
    setScanState("scanning");
    setErrorMsg("");
    setResult(null);
    setActiveStep(1);

    try {
      const imageRes = await fetch(res.url);
      const blob = await imageRes.blob();
      const selectedFile = new File([blob], res.name || "uploaded.jpg", { type: blob.type });
      setFile(selectedFile);
      processImage(selectedFile);
    } catch (err) {
      console.error("Image fetch error", err);
      setErrorMsg("Failed to prepare ImageKit upload for processing.");
      setScanState("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      processImage(selectedFile);
    }
  };



  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      processImage(selectedFile);
    }
  };

  const resetScan = () => {
    stopCamera();
    setFile(null);
    setPreviewUrl(null);
    setScanState("idle");
    setActiveStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Text to Speech for Farmer Audio Guidance
  const toggleSpeechGuidance = () => {
    if (!result || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = `Diagnosis complete for ${result.diseaseName}. Severity level is ${result.severity || 'Moderate'}. Description: ${result.description}. Immediate action protocol: ${result.immediateProtocol?.join('. ')}. Recommended organic treatment: ${result.treatment?.organic?.join('. ')}.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const pipeline = result?.pipeline;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gradient-to-br from-emerald-50/40 via-slate-50 to-teal-50/30 font-sans text-slate-800 relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-200/20 blur-[150px] rounded-full pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-200/15 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col relative z-10">
        {/* IDLE MODE: Choice between Live Camera & File Upload */}
        {scanState === "idle" && (
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700 w-full">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                <Sparkles className="w-4 h-4 text-emerald-600" /> AI Field Diagnostics for Farmers
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 text-transparent bg-clip-text mb-3">
                Diagnose Crop Disease Instantly
              </h2>
              <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto font-medium">
                Find out what sickness your plant has and how to cure it. Upload a photo or take one now.
              </p>
            </div>

            {/* Unified Options Card */}
            <div className="bg-white/80 border border-slate-200/60 rounded-[32px] p-8 shadow-md w-full max-w-3xl flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />

              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 mb-4 text-emerald-600">
                <ScanLine className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2">Check Your Crop</h3>
              <p className="text-slate-600 text-sm max-w-md text-center mb-8 font-medium">
                Choose one option below to start the diagnosis. It takes only a few seconds.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {/* Option A: Click Photo */}
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg hover:scale-[1.02]"
                >
                  <Camera className="h-5 w-5" /> Click Photo with Camera
                </button>

                {/* Option B: Upload Photo */}
                <div className="relative bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all border border-slate-200 hover:scale-[1.02] cursor-pointer overflow-hidden text-center">
                  <IKContext
                    publicKey={publicKey}
                    urlEndpoint={urlEndpoint}
                    authenticator={authenticator}
                  >
                    <IKUpload
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                      onSuccess={(res: any) => { handleImageKitSuccess(res); }}
                      onError={(err: any) => { setErrorMsg("ImageKit Upload failed: " + err.message); setScanState("error"); }}
                    />
                  </IKContext>
                  <UploadCloud className="h-5 w-5" /> Upload via ImageKit
                </div>
              </div>
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="w-full max-w-3xl mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" /> Previous Plant Diagnoses
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => selectHistoryItem(item)}
                      className="bg-white/80 border border-slate-200/60 hover:border-emerald-300 hover:bg-emerald-50/10 rounded-2xl p-4 cursor-pointer flex items-center gap-4 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                        <img src={item.imageUrl} alt={item.diseaseName} className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{item.diseaseName}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.timestamp}</p>
                        <span className="inline-block text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
                          View Report
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIVE CAMERA VIEWFINDER MODAL */}
        {scanState === "camera" && (
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 w-full max-w-3xl mx-auto">
            <div className="bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-[32px] overflow-hidden shadow-2xl w-full relative">

              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Live Field Framing Camera</h3>
                    <p className="text-xs text-slate-500">Align infected leaf inside the framing guide</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={switchCameraFacing}
                    className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center gap-1.5 text-xs transition-colors"
                    title="Switch Camera"
                  >
                    <SwitchCamera className="h-4 w-4" /> Flip
                  </button>
                  <button
                    onClick={() => { stopCamera(); setScanState("idle"); }}
                    className="p-2.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Video Stream Container */}
              <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Farmer Guidance Camera Target Framing Box Overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-4 bg-emerald-950/10">
                  <div className="w-full flex justify-between">
                    <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  </div>

                  <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-400/40 text-center">
                    <p className="text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-400" /> Hold camera 10–15 cm from leaf
                    </p>
                  </div>

                  <div className="w-full flex justify-between">
                    <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  </div>
                </div>

                {/* Corner Instructions badge */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-400" /> Good lighting recommended
                </div>
              </div>

              {/* Shutter Controls */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-6">
                <button
                  onClick={capturePhotoFromCamera}
                  className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 rounded-full p-1.5 shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-transform active:scale-95 flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-full border-4 border-slate-50 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner">
                      <Camera className="h-6 w-6 text-slate-900" />
                    </div>
                  </div>
                </button>
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        )}

        {/* SCANNING & RESULTS DASHBOARD */}
        {(scanState === "scanning" || scanState === "results") && previewUrl && (
          <div className="flex flex-col gap-6 items-start w-full animate-in fade-in duration-500">

            {/* Live Pipeline Loading Header */}
            {scanState === "scanning" && (
              <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 animate-pulse">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Analyzing Leaf Health...</h3>
                    <p className="text-sm text-slate-500 font-medium">Please wait. AI is finding any leaf sickness.</p>
                  </div>
                </div>
              </div>
            )}

            {scanState === "results" && result && (
              <div className="w-full flex flex-col gap-6">

                {/* Farmer Message Motivational Header Banner */}
                {result.farmerMessage && (
                  <div className="w-full bg-emerald-500 text-white rounded-[24px] p-5 shadow-md flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[30px] rounded-full" />
                    <Sparkles className="h-8 w-8 text-emerald-100 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-emerald-100 mb-0.5">Farmveda AI Encouragement</h4>
                      <p className="text-base font-bold">{result.farmerMessage}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">

                  {/* Left Column: Scanned image & simple explanation */}
                  <div className="lg:col-span-3 flex flex-col gap-4 w-full">
                    {/* Leaf Photo */}
                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-md">
                      <img src={previewUrl} alt="Leaf Scan" className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Scanned
                      </div>
                    </div>

                    {/* Simple Disease Info Card */}
                    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-6 shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4 uppercase tracking-wider ${result.diseaseName?.toLowerCase().includes('healthy')
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-rose-50 border-rose-200 text-rose-700"
                        }`}>
                        {result.diseaseName?.toLowerCase().includes('healthy') ? <Leaf className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {result.diseaseName?.toLowerCase().includes('healthy') ? 'Healthy Plant' : 'Sick Plant'}
                      </span>

                      <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">{result.diseaseName}</h2>

                      <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-2xl p-4 mb-4">
                        <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-1">📢 Simple Explanation:</h4>
                        <p className="text-slate-700 text-sm font-medium leading-relaxed">
                          {result.simpleDescription}
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Estimated Recovery:</span>
                          <span className="font-black text-slate-800">{result.estimatedRecovery || "N/A"}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Severity:</span>
                          <span className="font-black text-amber-700">{result.severity || "N/A"}</span>
                        </div>
                      </div>

                      <button onClick={resetScan} className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-5 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-sm">
                        <RefreshCw className="h-4 w-4" /> Scan Another Leaf
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Solutions and Treatments */}
                  <div className="lg:col-span-9 flex flex-col gap-5 w-full">

                    {/* What and Why Diagnosis Summary */}
                    <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 mb-2.5 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <Info className="h-4 w-4 text-emerald-600" /> What Happened
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                          {(result.whatHappened || result.description || "Pathogen activity detected on crop foliage.")
                            .split('.')
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                            .map((sentence: string, idx: number) => (
                              <li key={idx}>{sentence}.</li>
                            ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 mb-2.5 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-600" /> Why It Happened
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                          {(result.whyItHappened || "This is usually caused by excessive humidity or wetness on leaves.")
                            .split('.')
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                            .map((sentence: string, idx: number) => (
                              <li key={idx}>{sentence}.</li>
                            ))}
                        </ul>
                      </div>
                    </div>

                    {/* Visible Symptoms */}
                    {result.visibleSymptoms && result.visibleSymptoms.length > 0 && (
                      <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-6 shadow-sm">
                        <h3 className="font-black text-slate-900 flex items-center gap-2 text-lg mb-4">
                          <Bug className="h-5 w-5 text-emerald-600" /> Visible Symptoms
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {result.visibleSymptoms.map((sym: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              <p className="text-xs text-slate-700 font-medium">{sym}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Organic Remedy (What to do naturally) */}
                    {result.organicTreatment && result.organicTreatment.length > 0 && (
                      <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-6 shadow-sm">
                        <h3 className="font-black text-emerald-700 flex items-center gap-2 text-lg mb-4">
                          <Leaf className="h-5 w-5 text-emerald-600" /> 🌿 Organic Remedy (Natural Solutions)
                        </h3>
                        <div className="space-y-2">
                          {result.organicTreatment.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-xl">
                              <span className="w-5 h-5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                              <p className="text-sm text-slate-700 font-medium">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chemical Remedies */}
                    {result.chemicalTreatment && result.chemicalTreatment.length > 0 && (
                      <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-6 shadow-sm">
                        <h3 className="font-black text-blue-700 flex items-center gap-2 text-lg mb-4">
                          <FlaskConical className="h-5 w-5 text-blue-600" /> 🧪 Chemical Solutions (Store Medicine)
                        </h3>
                        <div className="space-y-3">
                          {result.chemicalTreatment.map((chem: any, i: number) => (
                            <div key={i} className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl space-y-2">
                              <div className="flex justify-between items-center border-b border-blue-150/40 pb-1.5">
                                <span className="font-bold text-blue-800 text-sm flex items-center gap-1.5">
                                  <FlaskConical className="h-4 w-4" /> {chem.medicine}
                                </span>
                                <span className="bg-blue-100 text-blue-800 font-black text-xs px-2.5 py-0.5 rounded-full">
                                  Dosage: {chem.dosage}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 font-medium">
                                <strong>How to apply:</strong> {chem.howToUse}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Urgent Actions */}
                    {result.doToday && result.doToday.length > 0 && (
                      <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-6 shadow-sm">
                        <h3 className="font-black text-amber-700 flex items-center gap-2 text-lg mb-4">
                          <AlertTriangle className="h-5 w-5 text-amber-600" /> 🚨 Urgent Action (Save Other Crops)
                        </h3>
                        <div className="space-y-2">
                          {result.doToday.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 bg-amber-50/40 border border-amber-100 p-3.5 rounded-xl">
                              <span className="w-5 h-5 bg-amber-100 text-amber-700 font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">!</span>
                              <p className="text-sm text-slate-700 font-medium">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prevention */}
                    {result.prevention && result.prevention.length > 0 && (
                      <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-6 shadow-sm">
                        <h3 className="font-black text-teal-700 flex items-center gap-2 text-lg mb-4">
                          <ShieldCheck className="h-5 w-5 text-teal-600" /> 🛡️ Prevention (For Next Time)
                        </h3>
                        <div className="space-y-2">
                          {result.prevention.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 bg-teal-50/40 border border-teal-100 p-3.5 rounded-xl">
                              <span className="w-5 h-5 bg-teal-100 text-teal-700 font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">✓</span>
                              <p className="text-sm text-slate-700 font-medium">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Watering and Fertilizer Advice Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-5 shadow-sm">
                        <h4 className="text-sm font-black text-slate-900 mb-2.5 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <Droplets className="h-4.5 w-4.5 text-blue-500" /> Watering Advice
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                          {(result.wateringAdvice || "Water only at the base of the plant in the morning so the soil dries during the day.")
                            .split('.')
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                            .map((sentence: string, idx: number) => (
                              <li key={idx}>{sentence}.</li>
                            ))}
                        </ul>
                      </div>
                      <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-5 shadow-sm">
                        <h4 className="text-sm font-black text-slate-900 mb-2.5 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <Sparkles className="h-4.5 w-4.5 text-emerald-500" /> Fertilizer Advice
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                          {(result.fertilizerAdvice || "Apply a balanced potash-rich fertilizer to improve plant defense mechanisms.")
                            .split('.')
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                            .map((sentence: string, idx: number) => (
                              <li key={idx}>{sentence}.</li>
                            ))}
                        </ul>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Google Shopping Products via SerpApi */}
                <div className="bg-white/80 border border-slate-200/60 rounded-[32px] p-6 shadow-md w-full mt-4">
                  <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-emerald-600" /> 🛒 Recommended Products to Buy
                  </h3>

                  {loadingProducts ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-2" />
                      <p className="text-xs text-slate-500 font-bold">Searching for local store products...</p>
                    </div>
                  ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {products.map((prod, i) => (
                        <a
                          key={i}
                          href={prod.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group bg-white border border-slate-200/60 rounded-2xl p-3 flex flex-col hover:border-emerald-300 hover:shadow-md transition-all"
                        >
                          <div className="aspect-square w-full rounded-xl bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center p-2 mb-2 group-hover:scale-95 transition-transform">
                            <img src={prod.thumbnail} alt={prod.title} className="max-h-full max-w-full object-contain" />
                          </div>
                          <h4 className="text-xs font-black text-slate-800 line-clamp-2 h-8 leading-tight mb-1 group-hover:text-emerald-700 transition-colors">
                            {prod.title}
                          </h4>
                          <p className="text-xs font-black text-emerald-600 mb-1">{prod.price}</p>
                          <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                            <span>{prod.source}</span>
                            <span className="text-emerald-600 hover:underline flex items-center gap-0.5">
                              Buy <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium py-4 text-center">
                      No specific products found for this disease. Ask local dealer for general broad spectrum fungicide.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {scanState === "error" && (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 mt-8 animate-in zoom-in-95 duration-500">
          <div className="bg-white border border-rose-250 rounded-[32px] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Processing Failure</h2>
            </div>
            <p className="text-slate-600 text-base mb-6">{errorMsg}</p>
            <button onClick={resetScan} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors w-full">
              <RefreshCw className="h-5 w-5" /> Retake Photo
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scanLine {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
