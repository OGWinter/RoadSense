import { useState, useRef, useEffect, useCallback } from 'react';

export interface GpsSample {
  timestamp: string; // UTC ISO string
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  accuracy: number;
}

export type LocationStatus = 'disabled' | 'requesting' | 'active' | 'waiting' | 'denied' | 'unavailable';

export interface UseCameraRecorderReturn {
  // Camera state
  isSupported: boolean;
  isStreamActive: boolean;
  isRecording: boolean;
  facingMode: 'environment' | 'user';
  recordingDuration: number;
  recordedFile: File | null;
  recordedUrl: string | null;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;

  // GPS state
  gpsEnabled: boolean;
  locationStatus: LocationStatus;
  gpsSamples: GpsSample[];
  latestGps: GpsSample | null;
  gpsFile: File | null;

  // Timestamps
  recordingStartedAt: string | null;
  recordingEndedAt: string | null;

  // Actions
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  discardRecording: () => void;
  setGpsEnabled: (enabled: boolean) => void;
}

export function useCameraRecorder(): UseCameraRecorderReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // GPS state
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('disabled');
  const [gpsSamples, setGpsSamples] = useState<GpsSample[]>([]);
  const [latestGps, setLatestGps] = useState<GpsSample | null>(null);
  const [gpsFile, setGpsFile] = useState<File | null>(null);

  // Timestamps
  const [recordingStartedAt, setRecordingStartedAt] = useState<string | null>(null);
  const [recordingEndedAt, setRecordingEndedAt] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check browser feature availability
  useEffect(() => {
    const hasMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
    const hasRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
    setIsSupported(hasMedia && hasRecorder);
  }, []);

  // Stop camera tracks cleanly
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
  }, []);

  // Stop geolocation watcher
  const stopGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Release all resources on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
      stopGpsWatch();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [stopCameraTracks, stopGpsWatch, recordedUrl]);

  // Request camera and start live preview
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access API is not supported in this browser. Please use a modern browser over HTTPS or localhost.');
      return;
    }

    try {
      stopCameraTracks();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false, // Road condition dashcam does not require audio
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsStreamActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Video playback notice:', err);
        });
      }
    } catch (err: any) {
      stopCameraTracks();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No video input camera device detected on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently in use by another application.');
      } else {
        setCameraError(err.message || 'Unable to access device camera.');
      }
    }
  }, [facingMode, stopCameraTracks]);

  // Switch between front and rear cameras
  const switchCamera = useCallback(async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  }, [facingMode]);

  // Trigger camera restart when facingMode changes if stream is already active
  useEffect(() => {
    if (isStreamActive) {
      startCamera();
    }
  }, [facingMode]);

  // Stop camera preview completely
  const stopCamera = useCallback(() => {
    stopCameraTracks();
    stopGpsWatch();
  }, [stopCameraTracks, stopGpsWatch]);

  // Start GPS tracking during recording
  const startGpsTracking = useCallback(() => {
    if (!gpsEnabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }

    setLocationStatus('requesting');
    setGpsSamples([]);
    setLatestGps(null);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const sample: GpsSample = {
            timestamp: new Date(pos.timestamp).toISOString(),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy * 10) / 10,
          };
          setLatestGps(sample);
          setLocationStatus('active');
          setGpsSamples((prev) => [...prev, sample]);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus('denied');
          } else {
            setLocationStatus('unavailable');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch {
      setLocationStatus('unavailable');
    }
  }, [gpsEnabled]);

  // Determine supported recording mimeType
  const getSupportedMimeType = (): string => {
    const candidateTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];
    for (const t of candidateTypes) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current || !streamRef.current.active) {
      setCameraError('Camera stream is not active. Please start the camera preview first.');
      return;
    }

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || 'video/webm';
        const isMp4 = finalMime.includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });

        if (blob.size === 0) {
          setCameraError('Recording produced an empty file. Please try recording again.');
          return;
        }

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `road_survey_${dateStr}.${ext}`;
        const file = new File([blob], filename, { type: finalMime });

        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        const url = URL.createObjectURL(blob);

        setRecordedFile(file);
        setRecordedUrl(url);

        // Build GPS CSV file if samples exist
        setGpsSamples((currentSamples) => {
          if (currentSamples.length > 0) {
            let csv = 'timestamp,latitude,longitude,accuracy\n';
            currentSamples.forEach((s) => {
              csv += `${s.timestamp},${s.latitude},${s.longitude},${s.accuracy}\n`;
            });
            const gpsBlob = new Blob([csv], { type: 'text/csv' });
            const gpsFilename = `gps_track_${dateStr}.csv`;
            const createdGpsFile = new File([gpsBlob], gpsFilename, { type: 'text/csv' });
            setGpsFile(createdGpsFile);
          } else {
            setGpsFile(null);
          }
          return currentSamples;
        });
      };

      const startTime = new Date().toISOString();
      setRecordingStartedAt(startTime);
      setRecordingEndedAt(null);
      setRecordingDuration(0);

      recorder.start(1000); // 1-second timeslices
      setIsRecording(true);

      // Start duration ticker
      const startMs = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startMs) / 1000));
      }, 1000);

      // Start GPS collection
      startGpsTracking();
    } catch (err: any) {
      setCameraError(err.message || 'Failed to initialize MediaRecorder.');
    }
  }, [recordedUrl, startGpsTracking]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingEndedAt(new Date().toISOString());

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    stopGpsWatch();
  }, [stopGpsWatch]);

  // Discard recorded video and reset to camera view
  const discardRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedFile(null);
    setRecordedUrl(null);
    setGpsFile(null);
    setGpsSamples([]);
    setLatestGps(null);
    setRecordingDuration(0);
    setRecordingStartedAt(null);
    setRecordingEndedAt(null);
    setCameraError(null);
  }, [recordedUrl]);

  return {
    isSupported,
    isStreamActive,
    isRecording,
    facingMode,
    recordingDuration,
    recordedFile,
    recordedUrl,
    cameraError,
    videoRef,

    gpsEnabled,
    locationStatus,
    gpsSamples,
    latestGps,
    gpsFile,

    recordingStartedAt,
    recordingEndedAt,

    startCamera,
    stopCamera,
    switchCamera,
    startRecording,
    stopRecording,
    discardRecording,
    setGpsEnabled,
  };
}
