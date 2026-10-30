"use client";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage, DynamicText } from "@/context/LanguageProvider";
import { DBMentor } from "@/lib/types/allTypes";
import { defaultCropDoctors } from "@/lib/functions/dbActions";

import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Camera,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bug,
  Sparkles,
  Droplets,
  Activity,
  FlaskConical,
  ShieldCheck,
  Info,
  X,
  SwitchCamera,
  ShoppingBag,
  Loader2,
  ExternalLink,
  CalendarDays,
  ArrowLeft,
  Trash2,
  Stethoscope,
  Star,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const SCAN_STEPS = [
  "Uploading image…",
  "Detecting leaf region…",
  "Running AI diagnosis…",
  "Generating treatment plan…",
  "Finalizing report…",
];

export default function DiseaseDetectionPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.farmId as string;
  const supabase = createClient();
  const { lang } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scannedImageBase64, setScannedImageBase64] = useState<string | null>(null);
  const [scanState, setScanState] = useState<"idle" | "camera" | "scanning" | "results" | "error">("idle");
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [doctors, setDoctors] = useState<DBMentor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scanStepInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load only real crop doctors from Supabase mentors table
  useEffect(() => {
    async function loadDoctors() {
      setLoadingDoctors(true);
      try {
        const { data, error } = await supabase
          .from("mentors")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setDoctors(data as DBMentor[]);
        } else {
          setDoctors([]);
        }
      } catch (err) {
        console.warn("Failed to load crop doctors:", err);
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    }
    loadDoctors();
  }, [supabase]);

  // Handle consultation booking with attached diagnosis and leaf image
  const handleConsultDoctor = (doctor: DBMentor) => {
    if (!result) return;

    const cropName = result.cropName || "Crop";
    const diseaseName = result.diseaseName || "Crop Disease";
    const severity = result.severity || "Moderate";
    const confidence = result.confidence ? `${result.confidence}%` : "High";

    const symptomsList =
      result.visibleSymptoms && result.visibleSymptoms.length > 0
        ? result.visibleSymptoms.map((s: string) => `• ${s}`).join("\n")
        : "Foliar lesions and discoloration observed on leaves";

    const organicList =
      result.organicTreatment && result.organicTreatment.length > 0
        ? result.organicTreatment.slice(0, 3).map((s: string) => `• ${s}`).join("\n")
        : "Apply organic neem oil / bio-fungicide";

    const chemicalList =
      result.chemicalTreatment && result.chemicalTreatment.length > 0
        ? result.chemicalTreatment
            .map(
              (c: any) =>
                `• ${c.medicine || c} (Dosage: ${c.dosage || "As per pack"})${
                  c.howToUse ? ` - ${c.howToUse}` : ""
                }`
            )
            .join("\n")
        : "Consult doctor for chemical prescription";

    const urgentList =
      result.doToday && result.doToday.length > 0
        ? result.doToday.map((s: string) => `• ${s}`).join("\n")
        : "Quarantine affected plants and avoid overhead leaf wetting";

    const formattedNote = 
`[🌿 Crop Disease Consultation Request]
🌱 Crop: ${cropName}
🦠 Detected Issue: ${diseaseName} (Severity: ${severity}, Confidence: ${confidence})

📋 Observed Symptoms:
${symptomsList}

💡 AI Initial Diagnostic Advisory:
- What Happened: ${result.whatHappened || result.description || "Pathogen activity detected on crop foliage."}
- Urgent Action:
${urgentList}
- Recommended Organic Solutions:
${organicList}
- Store Medicine Solutions:
${chemicalList}

📷 Leaf Scan Photo: Attached for Doctor's Inspection`;

    const bestImageUrl = scannedImageBase64 || previewUrl || "";

    const consultationData = {
      cropName,
      diseaseName,
      severity,
      confidence,
      notes: formattedNote,
      imageUrl: bestImageUrl,
      autoBook: true,
      doctorId: doctor.id,
      doctorName: doctor.full_name,
      timestamp: Date.now(),
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("crop_consultation_data", JSON.stringify(consultationData));
    }

    router.push(
      `/home/doctor-connect/${doctor.id}?autoBook=true&crop=${encodeURIComponent(
        cropName
      )}&disease=${encodeURIComponent(diseaseName)}`
    );
  };

  // Load history from Supabase
  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("disease_scans")
        .select("*")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const formattedHistory = data.map((item: any) => ({
          id: item.id,
          timestamp: new Date(item.created_at).toLocaleDateString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          }),
          diseaseName: item.disease_name,
          imageUrl: item.image_data,
          result: item.result_json,
        }));
        setHistory(formattedHistory);
      }
    };
    fetchHistory();
  }, [farmId, supabase]);

  // Fetch products on results
  useEffect(() => {
    if (result && scanState === "results") fetchProducts();
  }, [result, scanState]);

  // Cleanup camera on unmount
  useEffect(() => () => stopCamera(), []);

  // Cleanup scan step interval
  useEffect(() => {
    return () => {
      if (scanStepInterval.current) clearInterval(scanStepInterval.current);
    };
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProducts([]);
    try {
      const queryTerm = result.diseaseName.toLowerCase().includes("healthy")
        ? "organic fertilizer plants"
        : `${result.diseaseName} treatment`;
      const res = await fetch(`/api/disease-products?q=${encodeURIComponent(queryTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoadingProducts(false);
    }
  };

  const selectHistoryItem = (item: any) => {
    setResult(item.result);
    setPreviewUrl(item.imageUrl);
    setScannedImageBase64(item.imageUrl);
    setScanState("results");
    setErrorMsg("");
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("disease_scans").delete().eq("id", id);
  };

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
    } catch {
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
    setScanStep(0);

    // Animate scan steps
    let step = 0;
    scanStepInterval.current = setInterval(() => {
      step++;
      if (step < SCAN_STEPS.length) {
        setScanStep(step);
      } else {
        if (scanStepInterval.current) clearInterval(scanStepInterval.current);
      }
    }, 1200);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("lang", lang);

    try {
      const response = await fetch("/api/detect-disease", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || "Failed to process image through AI agronomist pipeline.");
      }

      const data = await response.json();
      if (scanStepInterval.current) clearInterval(scanStepInterval.current);
      setResult(data);
      setScanState("results");

      // Save to Supabase history only if this was an actual valid crop/plant scan
      if (data.isValidCrop !== false) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          setScannedImageBase64(base64data);
          
          const { data: newRow, error } = await supabase
            .from("disease_scans")
            .insert({
              farm_id: farmId,
              disease_name: data.diseaseName,
              image_data: base64data,
              result_json: data
            })
            .select()
            .single();

          if (!error && newRow) {
            const newHistoryItem = {
              id: newRow.id,
              timestamp: new Date(newRow.created_at).toLocaleDateString(undefined, {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              }),
              diseaseName: data.diseaseName,
              imageUrl: base64data,
              result: data,
            };
            setHistory((prev) => {
              const updated = [newHistoryItem, ...prev.filter((item) => item.result.diseaseName !== data.diseaseName).slice(0, 9)];
              return updated;
            });
          }
        };
        reader.readAsDataURL(selectedFile);
      }
    } catch (error: any) {
      if (scanStepInterval.current) clearInterval(scanStepInterval.current);
      setErrorMsg(error.message);
      setScanState("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
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
    setScanStep(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (scanStepInterval.current) clearInterval(scanStepInterval.current);
  };

  const toggleSpeechGuidance = () => {
    if (!result || result.isValidCrop === false || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const textToRead = `Diagnosis complete for ${result.diseaseName}. Severity level is ${result.severity || "Moderate"}. Description: ${result.description}. Immediate action protocol: ${result.immediateProtocol?.join(". ")}. Recommended organic treatment: ${result.treatment?.organic?.join(". ")}.`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gradient-to-br from-emerald-50/40 via-slate-50 to-teal-50/30 font-sans text-slate-800 relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-200/20 blur-[150px] rounded-full pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-200/15 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col relative z-10">

        {/* ──────────── IDLE MODE ──────────── */}
        {scanState === "idle" && (
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700 w-full">
            <div className="text-center mb-8">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 text-transparent bg-clip-text mb-4">
                <DynamicText text="Diagnose Crop Disease Instantly" />
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">
                <DynamicText text="Find out what sickness your plant has and how to cure it. Upload a photo or take one now." />
              </p>
            </div>

            {/* Two Option Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
              {/* Card 1: Camera */}
              <div className="bg-white/80 border border-emerald-100/80 rounded-[32px] p-8 shadow-md flex flex-col items-center text-center relative overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/5 blur-[30px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-5 text-white shadow-md group-hover:scale-105 transition-transform duration-300">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  <DynamicText text="Click Photo with Camera" />
                </h3>
                <p className="text-slate-500 text-sm font-medium mb-6 max-w-[240px]">
                  <DynamicText text="Open device camera to capture photos of crops." />
                </p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg hover:scale-[1.03] mt-auto"
                >
                  <Camera className="h-4 w-4" /> <DynamicText text="Open Camera" />
                </button>
              </div>

              {/* Card 2: Upload */}
              <div className="bg-white/80 border border-slate-200/60 rounded-[32px] p-8 shadow-md flex flex-col items-center text-center relative overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-[40px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200 mb-5 text-emerald-600 group-hover:scale-105 transition-transform duration-300">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  <DynamicText text="Upload Photo from Device" />
                </h3>
                <p className="text-slate-500 text-sm font-medium mb-6 max-w-[240px]">
                  <DynamicText text="Select or drag image of crops from your device." />
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all border border-slate-200 hover:scale-[1.03] mt-auto"
                >
                  <UploadCloud className="h-4 w-4" /> <DynamicText text="Select File" />
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />

            {history.length > 0 && (
              <div className="w-full mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" /> <DynamicText text="Previous Plant Diagnoses" />
                </h3>
                <div className="flex flex-col gap-3 w-full">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => selectHistoryItem(item)}
                      className="bg-white/80 border border-slate-200/60 hover:border-emerald-300 hover:bg-emerald-50/10 rounded-2xl p-4 cursor-pointer flex items-center gap-4 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                        <img src={item.imageUrl} alt={item.diseaseName} className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <h4 className="font-bold text-slate-800 text-sm truncate"><DynamicText text={item.diseaseName} /></h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.timestamp}</p>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0">
                        <DynamicText text="View Report" />
                      </span>
                      <button
                        onClick={(e) => deleteHistoryItem(e, item.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                        title="Delete History"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────── LIVE CAMERA ──────────── */}
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
                    <h3 className="font-bold text-slate-900 text-base">
                      <DynamicText text="Live Field Framing Camera" />
                    </h3>
                    <p className="text-xs text-slate-500">
                      <DynamicText text="Align infected leaf inside the framing guide" />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={switchCameraFacing}
                    className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <SwitchCamera className="h-4 w-4" /> <DynamicText text="Flip" />
                  </button>
                  <button
                    onClick={() => { stopCamera(); setScanState("idle"); }}
                    className="p-2.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Video */}
              <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                {/* Framing Box */}
                <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-4 bg-emerald-950/10">
                  <div className="w-full flex justify-between">
                    <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  </div>
                  <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-400/40 text-center">
                    <p className="text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-400" /> <DynamicText text="Hold camera 10–15 cm from leaf" />
                    </p>
                  </div>
                  <div className="w-full flex justify-between">
                    <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  </div>
                </div>
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-400" /> <DynamicText text="Good lighting recommended" />
                </div>
              </div>

              {/* Shutter */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-center">
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

        {/* ──────────── INTERACTIVE SCANNING OVERLAY ──────────── */}
        {scanState === "scanning" && previewUrl && (
          <div className="w-full max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden shadow-2xl border border-slate-200/60">
              {/* Background: the actual uploaded photo, slightly blurred */}
              <img
                src={previewUrl}
                alt="Scanning leaf"
                className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2px] brightness-[0.4]"
              />

              {/* Animated scan line */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="scan-line-anim absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.8),0_0_60px_rgba(16,185,129,0.4)]" />
              </div>

              {/* Bottom emerald glow bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 animate-pulse" />

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10">
                {/* Pulsing activity icon */}
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-xl animate-pulse scale-150" />
                  <Activity className="h-12 w-12 text-emerald-400 relative z-10 animate-pulse" />
                </div>

                {/* Status pill */}
                <div className="bg-black/70 backdrop-blur-xl px-6 py-3 rounded-full border border-emerald-400/40">
                  <p className="text-emerald-300 font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <DynamicText text="Analyzing Crop Health" />
                  </p>
                </div>

                {/* Pipeline steps */}
                <div className="flex flex-col gap-2 mt-2">
                  {SCAN_STEPS.map((label, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 transition-all duration-500 ${i <= scanStep ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                        }`}
                    >
                      {i < scanStep ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : i === scanStep ? (
                        <Loader2 className="h-4 w-4 text-emerald-300 animate-spin shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-500 shrink-0" />
                      )}
                      <span className={`text-xs font-bold ${i <= scanStep ? "text-emerald-300" : "text-slate-500"}`}>
                        <DynamicText text={label} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────── INVALID PHOTO DETECTED ──────────── */}
        {scanState === "results" && previewUrl && result && result.isValidCrop === false && (
          <div className="flex flex-col gap-6 items-start w-full animate-in fade-in duration-500 max-w-4xl mx-auto">
            {/* Back + Title Row */}
            <div className="w-full flex items-center gap-3">
              <button
                onClick={resetScan}
                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-colors shadow-sm shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                <DynamicText text="Photo Validation Result" />
              </h2>
            </div>

            {/* Warning Banner */}
            <div className="w-full bg-amber-500 text-white rounded-[24px] p-6 shadow-md flex items-start gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[30px] rounded-full" />
              <AlertTriangle className="h-8 w-8 text-amber-100 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-amber-100 mb-1">
                  <DynamicText text="Non-Crop Photo Detected" />
                </h4>
                <p className="text-base font-bold">
                  <DynamicText text={result.farmerMessage || "Please provide a valid photo of a crop, plant, or leaf to detect disease."} />
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-start">
              {/* Left Column: Uploaded Image Preview */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-md">
                  <img src={previewUrl} alt="Uploaded Image" className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-rose-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> <DynamicText text="Not a Crop/Plant" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center font-medium">
                  <DynamicText text="Uploaded Image" />
                </p>
              </div>

              {/* Right Column: Rejection Reason & Guidance */}
              <div className="md:col-span-7 bg-white/95 border border-slate-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-black text-slate-900">
                    <DynamicText text="Why was this photo rejected?" />
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    <DynamicText text={result.reason || "The uploaded image does not appear to contain a living crop, plant, leaf, or farm produce."} />
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> <DynamicText text="Supported Photos" />
                  </h4>
                  <ul className="text-xs text-emerald-900 space-y-1 font-medium list-disc list-inside">
                    <li><DynamicText text="Real farm crops (Rice, Wheat, Tomato, Cotton, Chili, etc.)" /></li>
                    <li><DynamicText text="Individual plant leaves showing symptoms or discoloration" /></li>
                    <li><DynamicText text="Stems, roots, flowers, or fruits of agricultural plants" /></li>
                    <li><DynamicText text="Close-up photos with good lighting (10–15 cm away)" /></li>
                  </ul>
                </div>

                <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4">
                  <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" /> <DynamicText text="What cannot be diagnosed" />
                  </h4>
                  <p className="text-xs text-rose-900 font-medium leading-relaxed">
                    <DynamicText text="Graphics, logos, digital drawings, electronics, vehicles, animals, humans, household items, or cooked food cannot be analyzed for plant diseases." />
                  </p>
                </div>

                <button
                  onClick={resetScan}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" /> <DynamicText text="Upload a Real Crop Photo" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────────── RESULTS DASHBOARD ──────────── */}
        {scanState === "results" && previewUrl && result && result.isValidCrop !== false && (
          <div className="flex flex-col gap-6 items-start w-full animate-in fade-in duration-500">
            {/* Back + Title Row */}
            <div className="w-full flex items-center gap-3">
              <button
                onClick={resetScan}
                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-colors shadow-sm shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                <DynamicText text="Diagnosis Report" />
              </h2>
            </div>

            {/* Farmer Message Banner */}
            {result.farmerMessage && (
              <div className="w-full bg-emerald-500 text-white rounded-[24px] p-5 shadow-md flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[30px] rounded-full" />
                <Sparkles className="h-8 w-8 text-emerald-100 shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-emerald-100 mb-0.5">
                    <DynamicText text="Farmveda AI Encouragement" />
                  </h4>
                  <p className="text-base font-bold">
                    <DynamicText text={result.farmerMessage} />
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
              {/* Left Column */}
              <div className="lg:col-span-3 flex flex-col gap-4 w-full">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-md">
                  <img src={previewUrl} alt="Leaf Scan" className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> <DynamicText text="Scanned" />
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-6 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4 uppercase tracking-wider ${result.diseaseName?.toLowerCase().includes("healthy")
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}>
                    {result.diseaseName?.toLowerCase().includes("healthy") ? <Leaf className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    <DynamicText text={result.diseaseName?.toLowerCase().includes("healthy") ? "Healthy Plant" : "Sick Plant"} />
                  </span>

                  {result.cropName && (
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5">
                      <DynamicText text={result.cropName} />
                    </span>
                  )}
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                    <DynamicText text={result.diseaseName} />
                  </h2>

                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex justify-between items-center text-xs mb-4">
                    <span className="text-slate-500 font-bold"><DynamicText text="Severity:" /></span>
                    <span className="font-black text-amber-700"><DynamicText text={result.severity || "N/A"} /></span>
                  </div>

                  <button onClick={resetScan} className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-5 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-sm">
                    <RefreshCw className="h-4 w-4" /> <DynamicText text="Scan Another Leaf" />
                  </button>
                </div>


                {/* Recovery Estimate */}
                {!result.diseaseName?.toLowerCase().includes("healthy") && (
                  <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-[24px] p-5 shadow-sm">
                    <h4 className="text-sm font-black text-emerald-800 mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-600" /> <DynamicText text="Expected Recovery" />
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-emerald-700">
                        {(() => {
                          const sev = (result.severity || "moderate").toLowerCase();
                          return sev.includes("low") || sev.includes("mild") ? "5–7" : sev.includes("high") || sev.includes("severe") ? "14–21" : "7–14";
                        })()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-emerald-700"><DynamicText text="Days" /></p>
                        <p className="text-[10px] text-emerald-600/80 font-medium"><DynamicText text="with proper treatment" /></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="lg:col-span-9 flex flex-col gap-5 w-full">
                {/* What & Why */}
                <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Info className="h-5 w-5 text-emerald-600" /> <DynamicText text="What Happened" />
                    </h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
                      {(result.whatHappened || result.description || "Pathogen activity detected on crop foliage.")
                        .split(".").map((s: string) => s.trim()).filter(Boolean)
                        .map((sentence: string, idx: number) => (
                          <li key={idx}><DynamicText text={`${sentence}.`} /></li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" /> <DynamicText text="Why It Happened" />
                    </h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
                      {(result.whyItHappened || "This is usually caused by excessive humidity or wetness on leaves.")
                        .split(".").map((s: string) => s.trim()).filter(Boolean)
                        .map((sentence: string, idx: number) => (
                          <li key={idx}><DynamicText text={`${sentence}.`} /></li>
                        ))}
                    </ul>
                  </div>
                </div>

                {/* Visible Symptoms */}
                {result.visibleSymptoms?.length > 0 && (
                  <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm">
                    <h3 className="font-black text-slate-900 flex items-center gap-2 text-xl mb-5">
                      <Bug className="h-6 w-6 text-emerald-600" /> <DynamicText text="Visible Symptoms" />
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.visibleSymptoms.map((sym: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <p className="text-sm text-slate-700 font-medium"><DynamicText text={sym} /></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organic & Chemical — side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {result.organicTreatment?.length > 0 && (
                    <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm">
                      <h4 className="text-base font-black text-emerald-700 mb-3 flex items-center gap-2 border-b border-emerald-100 pb-2">
                        <Leaf className="h-5 w-5 text-emerald-600" /> 🌿 <DynamicText text="Organic Remedy" />
                      </h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
                        {result.organicTreatment.map((item: string, i: number) => (
                          <li key={i}><DynamicText text={item} /></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.chemicalTreatment?.length > 0 && (
                    <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm">
                      <h4 className="text-base font-black text-blue-700 mb-3 flex items-center gap-2 border-b border-blue-100 pb-2">
                        <FlaskConical className="h-5 w-5 text-blue-600" /> 🧪 <DynamicText text="Chemical Solutions" />
                      </h4>
                      <div className="space-y-3">
                        {result.chemicalTreatment.map((chem: any, i: number) => (
                          <div key={i} className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-blue-800 text-sm"><DynamicText text={chem.medicine} /></span>
                              <span className="bg-blue-100 text-blue-800 font-black text-xs px-2.5 py-0.5 rounded-full">
                                <DynamicText text={chem.dosage} />
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium"><DynamicText text={chem.howToUse} /></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Urgent Action & Prevention — side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {result.doToday?.length > 0 && (
                    <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm">
                      <h4 className="text-base font-black text-amber-700 mb-3 flex items-center gap-2 border-b border-amber-100 pb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" /> 🚨 <DynamicText text="Urgent Action" />
                      </h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
                        {result.doToday.map((item: string, i: number) => (
                          <li key={i}><DynamicText text={item} /></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.prevention?.length > 0 && (
                    <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm">
                      <h4 className="text-base font-black text-teal-700 mb-3 flex items-center gap-2 border-b border-teal-100 pb-2">
                        <ShieldCheck className="h-5 w-5 text-teal-600" /> 🛡️ <DynamicText text="Prevention" />
                      </h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
                        {result.prevention.map((item: string, i: number) => (
                          <li key={i}><DynamicText text={item} /></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Watering & Fertilizer — side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm">
                    <h4 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Droplets className="h-5 w-5 text-blue-500" /> <DynamicText text="Watering Advice" />
                    </h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
                      {(result.wateringAdvice || "Water only at the base of the plant in the morning so the soil dries during the day.")
                        .split(".").map((s: string) => s.trim()).filter(Boolean)
                        .map((sentence: string, idx: number) => <li key={idx}><DynamicText text={`${sentence}.`} /></li>)}
                    </ul>
                  </div>
                  <div className="bg-white/95 border border-slate-200/60 rounded-[28px] p-8 shadow-sm">
                    <h4 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Sparkles className="h-5 w-5 text-emerald-500" /> <DynamicText text="Fertilizer Advice" />
                    </h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
                      {(result.fertilizerAdvice || "Apply a balanced potash-rich fertilizer to improve plant defense mechanisms.")
                        .split(".").map((s: string) => s.trim()).filter(Boolean)
                        .map((sentence: string, idx: number) => <li key={idx}><DynamicText text={`${sentence}.`} /></li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* ──────────── SUGGESTED CROP DOCTORS SECTION (REAL DOCTORS ONLY) ──────────── */}
            {(doctors.length > 0 || loadingDoctors) && (
              <div className="bg-white/95 border border-slate-200/80 rounded-[28px] p-6 sm:p-7 shadow-sm w-full mt-4">
                {/* Clean Header: Heading on left, View All on right */}
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 font-sora">
                    <Stethoscope className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span><DynamicText text="Suggested Crop Doctors" /></span>
                  </h3>

                  <button
                    type="button"
                    onClick={() => router.push("/home/doctor-connect")}
                    className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-emerald-200/70 shadow-2xs cursor-pointer"
                  >
                    <span><DynamicText text="View All Doctors" /></span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Real Doctor Cards */}
                {loadingDoctors && doctors.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                    <p className="text-xs font-semibold"><DynamicText text="Loading crop doctors..." /></p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {doctors.slice(0, 3).map((doc) => {
                      const docName = doc.full_name?.startsWith("Dr.") ? doc.full_name : `Dr. ${doc.full_name}`;
                      return (
                        <div
                          key={doc.id}
                          className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/70 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Doctor Avatar + Online Status + Name */}
                            <div className="flex items-start gap-3.5 mb-3">
                              <div className="relative shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={doc.avatar || "/user.png"}
                                  alt={doc.full_name}
                                  className="w-13 h-13 rounded-full object-cover border-2 border-emerald-100 bg-slate-50 shadow-xs"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/user.png";
                                  }}
                                />
                                <span
                                  className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
                                  title="Available Today"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 text-base truncate font-sora" title={docName}>
                                  {docName}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                                  <DynamicText text={doc.current_position || "Crop Specialist & Agronomist"} />
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    {doc.rating || 4.9}
                                  </span>
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                    <DynamicText text="Available Now" />
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Specialization Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {(doc.expertise || ["Plant Pathology", "Organic Care"]).slice(0, 3).map((exp: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                                >
                                  <DynamicText text={exp} />
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Booking Action Button */}
                          <button
                            type="button"
                            onClick={() => handleConsultDoctor(doc)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all hover:shadow-md cursor-pointer group-hover:bg-emerald-600 active:scale-98"
                          >
                            <Stethoscope className="w-4 h-4" />
                            <span><DynamicText text="Consult Doctor" /></span>
                            <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Google Shopping Products */}
            <div className="bg-white/80 border border-slate-200/60 rounded-[32px] p-6 shadow-md w-full mt-4">
              <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" /> 🛒 <DynamicText text="Recommended Products to Buy" />
              </h3>
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-2" />
                  <p className="text-xs text-slate-500 font-bold">
                    <DynamicText text="Searching for local store products..." />
                  </p>
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
                        <DynamicText text={prod.title} />
                      </h4>
                      <p className="text-xs font-black text-emerald-600 mb-1">{prod.price}</p>
                      <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>{prod.source}</span>
                        <span className="text-emerald-600 hover:underline flex items-center gap-0.5">
                          <DynamicText text="Buy" /> <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium py-4 text-center">
                  <DynamicText text="No specific products found for this disease. Ask local dealer for general broad spectrum fungicide." />
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ──────────── ERROR STATE ──────────── */}
      {scanState === "error" && (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 mt-8 px-4 animate-in zoom-in-95 duration-500">
          <div className="bg-white border border-rose-200 rounded-[32px] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                <DynamicText text="Processing Failure" />
              </h2>
            </div>
            <p className="text-slate-600 text-base mb-6">
              <DynamicText text={errorMsg} />
            </p>
            <button onClick={resetScan} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors w-full">
              <RefreshCw className="h-5 w-5" /> <DynamicText text="Retake Photo" />
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scanLineMove {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .scan-line-anim {
          animation: scanLineMove 2.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
