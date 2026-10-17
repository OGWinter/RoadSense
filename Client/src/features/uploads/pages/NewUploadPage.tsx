import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadApi } from '../uploadApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { useCameraRecorder } from '@/hooks/useCameraRecorder';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  UploadCloud,
  FileVideo,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Info,
  Camera,
  Video,
  RotateCcw,
  Square,
  Circle,
  Navigation,
  Compass,
  Trash2,
  SwitchCamera,
  ShieldAlert,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { toast } from 'sonner';

const MAX_VIDEO_SIZE_MB = 100;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

export const NewUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  // Mode selection: 'file' or 'camera'
  const [activeTab, setActiveTab] = useState<'file' | 'camera'>('file');

  // File Upload State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [manualGpsFile, setManualGpsFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  // Upload Progress
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Camera & GPS Hook
  const camera = useCameraRecorder();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fileToUpload = activeTab === 'file' ? videoFile : camera.recordedFile;
      if (!fileToUpload) throw new Error('Video file is required');

      const gpsToUpload = activeTab === 'file' ? manualGpsFile : camera.gpsFile;

      setIsUploading(true);
      return uploadApi.uploadVideoMvp({
        videoFile: fileToUpload,
        gpsFile: gpsToUpload,
        gpsSamples: activeTab === 'camera' && camera.gpsSamples.length > 0 ? camera.gpsSamples : undefined,
        description: description || (activeTab === 'camera' ? 'Live mobile dashcam sweep' : 'Uploaded dashcam survey'),
        recordingStartedAt: activeTab === 'camera' ? camera.recordingStartedAt : undefined,
        recordingEndedAt: activeTab === 'camera' ? camera.recordingEndedAt : undefined,
        onUploadProgress: (percent) => setUploadProgress(percent),
      });
    },
    onSuccess: (upload) => {
      toast.success('Survey video submitted successfully to AI processing pipeline');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UPLOADS() });
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ISSUES() });
      queryClient.refetchQueries({ queryKey: ['uploads'] });

      // Clean up camera resources if active
      camera.stopCamera();
      camera.discardRecording();

      navigate(`/app/uploads/${upload._id}`);
    },
    onError: (err: any) => {
      setIsUploading(false);
      setUploadProgress(0);
      const msg = err?.message || 'Failed to upload video survey.';
      setClientError(msg);
      toast.error('Upload failed');
    },
  });

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setClientError(`Video file exceeds maximum allowable size of ${MAX_VIDEO_SIZE_MB}MB.`);
      return;
    }

    const isExtensionValid = /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
    if (!isExtensionValid && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setClientError('Invalid video format. Supported formats: MP4, MOV, AVI, MKV, WebM.');
      return;
    }

    setVideoFile(file);
  };

  const handleManualGpsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.(csv|gpx|json)$/i.test(file.name)) {
      setClientError('GPS file must be a .csv, .gpx, or .json telemetry file.');
      return;
    }

    setManualGpsFile(file);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (user?.role === 'municipal_officer') {
      setClientError(
        'Municipal Officers hold review and triage permissions. Please sign in as a Volunteer Surveyor or Administrator to ingest new road survey footage.'
      );
      return;
    }

    if (activeTab === 'file' && !videoFile) {
      setClientError('Please select a valid road video file to proceed.');
      return;
    }

    if (activeTab === 'camera' && !camera.recordedFile) {
      setClientError('Please complete a camera recording before submitting.');
      return;
    }

    uploadMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Submit Road Survey Video"
        description="Capture or upload dashcam video sweeps for automated computer vision road damage identification."
      />

      {user?.role === 'municipal_officer' && (
        <Alert className="bg-amber-950/20 border-amber-800/40 text-amber-300">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-sm font-semibold">Surveyor Role Notice</AlertTitle>
          <AlertDescription className="text-xs text-amber-200 mt-1">
            You are logged in as a <strong>Municipal Officer</strong>. In RoadSense, field video ingestions are submitted by Volunteer Surveyors or Administrators. As an officer, your role is to review, verify, and transition triage status on detected road issues.
          </AlertDescription>
        </Alert>
      )}

      {clientError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Notice</AlertTitle>
          <AlertDescription>{clientError}</AlertDescription>
        </Alert>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => {
            setActiveTab('file');
            camera.stopCamera();
          }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'file'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          Upload Existing Video
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'camera'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Camera className="h-4 w-4" />
          Record Live Camera
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'file' && (
            <>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Survey Video & Telemetry Files</CardTitle>
                <CardDescription className="text-xs">
                  Upload recorded footage from vehicle dashcam, drone sweep, or citizen drive.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="video-input" className="text-xs font-semibold flex items-center gap-1.5">
                    <FileVideo className="h-4 w-4 text-primary" />
                    Dashcam / Inspection Video <span className="text-destructive">*</span>
                  </Label>

                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors">
                    <Input
                      id="video-input"
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.mp4,.mov,.avi,.mkv,.webm"
                      onChange={handleVideoSelect}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <label
                      htmlFor="video-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      {videoFile ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{videoFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Click to browse or drop dashcam video
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supports MP4, MOV, WebM, AVI up to {MAX_VIDEO_SIZE_MB}MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Optional GPS Track */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gps-input" className="text-xs font-semibold flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      GPS Telemetry Track (Optional)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">CSV or GPX format</span>
                  </div>
                  <Input
                    id="gps-input"
                    type="file"
                    accept=".csv,.gpx,.json"
                    onChange={handleManualGpsSelect}
                    disabled={isUploading}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Optional synchronized GPS track with timestamp, lat, lng. If omitted, default sector coordinates will be used.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-xs font-semibold">
                    Route / Sector Notes (Optional)
                  </Label>
                  <Input
                    id="desc"
                    placeholder="e.g., North Arterial Ring Road, Lane 2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isUploading}
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* TAB 2: LIVE CAMERA RECORDING */}
          {activeTab === 'camera' && (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      Live Device Camera Recording
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Record road surface directly via vehicle-mounted smartphone or mobile device.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[11px] border-primary/30 text-primary">
                    In-Browser Recording
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {camera.cameraError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Camera Access Notice</AlertTitle>
                    <AlertDescription className="text-xs">{camera.cameraError}</AlertDescription>
                  </Alert>
                )}

                {/* HTTPS / Security Information */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Camera access requires browser permission. Deployed production environments must use HTTPS; localhost is supported for local development testing.
                  </span>
                </div>

                {/* Camera Viewfinder & Controls */}
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-border shadow-inner">
                  {/* Live Stream Viewfinder */}
                  {!camera.recordedUrl && (
                    <video
                      ref={camera.videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${!camera.isStreamActive ? 'hidden' : ''}`}
                    />
                  )}

                  {/* Recorded Clip Preview */}
                  {camera.recordedUrl && (
                    <video
                      src={camera.recordedUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Inactive Camera State Overlay */}
                  {!camera.isStreamActive && !camera.recordedUrl && (
                    <div className="text-center p-6 space-y-3">
                      <div className="h-14 w-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <Video className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">Camera preview is standby</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Click below to grant camera permission and activate live viewfinder.
                      </p>
                      <Button
                        type="button"
                        onClick={camera.startCamera}
                        className="gap-2 shadow-sm"
                        size="sm"
                      >
                        <Camera className="h-4 w-4" /> Activate Camera Preview
                      </Button>
                    </div>
                  )}

                  {/* Live Recording HUD Overlays */}
                  {camera.isRecording && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase animate-pulse shadow-md">
                      <span className="h-2 w-2 rounded-full bg-white" />
                      REC {formatSeconds(camera.recordingDuration)}
                    </div>
                  )}

                  {/* Camera Controls Bar (Facing Mode Switch) */}
                  {camera.isStreamActive && !camera.isRecording && !camera.recordedUrl && (
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={camera.switchCamera}
                        className="h-8 px-2.5 text-xs bg-black/60 text-white hover:bg-black/80 backdrop-blur border border-white/20 gap-1.5"
                        title="Switch Front/Rear Camera"
                      >
                        <SwitchCamera className="h-3.5 w-3.5" />
                        <span>{camera.facingMode === 'environment' ? 'Rear' : 'Front'}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Recording Control Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-2">
                    {camera.isStreamActive && !camera.isRecording && !camera.recordedUrl && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={camera.startRecording}
                        className="gap-1.5 font-semibold"
                      >
                        <Circle className="h-4 w-4 fill-white" />
                        Start Recording Sweep
                      </Button>
                    )}

                    {camera.isRecording && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={camera.stopRecording}
                        className="gap-1.5 font-semibold"
                      >
                        <Square className="h-4 w-4 fill-white" />
                        Stop Recording ({formatSeconds(camera.recordingDuration)})
                      </Button>
                    )}

                    {camera.recordedUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={camera.discardRecording}
                        className="gap-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Discard & Re-Record
                      </Button>
                    )}

                    {camera.isStreamActive && !camera.isRecording && !camera.recordedUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={camera.stopCamera}
                        className="text-xs"
                      >
                        Stop Preview
                      </Button>
                    )}
                  </div>

                  {/* GPS Telemetry Status Pill */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={camera.gpsEnabled}
                        onChange={(e) => camera.setGpsEnabled(e.target.checked)}
                        disabled={camera.isRecording}
                        className="rounded border-border"
                      />
                      <Navigation className="h-3.5 w-3.5 text-primary" />
                      <span>Capture GPS</span>
                    </label>

                    {!camera.gpsEnabled ? (
                      <Badge variant="outline" className="text-[10px] border-slate-300 text-muted-foreground">
                        Location not enabled
                      </Badge>
                    ) : camera.locationStatus === 'active' && camera.latestGps ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          camera.latestGps.accuracy > 30
                            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {camera.latestGps.accuracy > 30
                          ? `Location captured (Low accuracy: ±${camera.latestGps.accuracy}m)`
                          : `Location captured (±${camera.latestGps.accuracy}m)`}
                      </Badge>
                    ) : camera.locationStatus === 'requesting' || camera.locationStatus === 'waiting' ? (
                      <Badge variant="outline" className="text-[10px] border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        Waiting for GPS...
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-red-300 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300">
                        Location unavailable
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Recorded Clip Summary */}
                {camera.recordedFile && (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Recording Prepared for Municipal AI Analysis
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                      <div>
                        <span>File Name:</span>
                        <p className="font-mono text-foreground font-medium truncate">{camera.recordedFile.name}</p>
                      </div>
                      <div>
                        <span>Format:</span>
                        <p className="font-mono text-foreground font-medium">{camera.recordedFile.type || 'video/webm'}</p>
                      </div>
                      <div>
                        <span>Size:</span>
                        <p className="font-mono text-foreground font-medium">
                          {(camera.recordedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <div>
                        <span>GPS Track:</span>
                        <p className="font-mono text-foreground font-medium">
                          {camera.gpsSamples.length > 0 ? `${camera.gpsSamples.length} samples logged` : 'No GPS samples'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 mx-6 mb-4 rounded-lg bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Transmitting survey video to RoadSense API gateway...
                </span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
              <p className="text-[11px] text-muted-foreground">
                Step 1 of 2: Byte transfer. Once received, deep learning frame inference begins.
              </p>
            </div>
          )}

          <CardFooter className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Record first, then upload. Camera is not streamed to AI in real time.</span>
            </div>

            <Button
              type="submit"
              disabled={
                (activeTab === 'file' && !videoFile) ||
                (activeTab === 'camera' && !camera.recordedFile) ||
                isUploading
              }
              className="gap-2 shadow-sm font-semibold"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading ({uploadProgress}%)
                </>
              ) : (
                <>
                  Upload & Analyze Video
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};
