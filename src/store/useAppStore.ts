import { create } from 'zustand';

interface DownloadState {
  taskId: string;
  url: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'x';
  isLoading: boolean;
  progress: number;
  result: any;
  error: string | null;
}

interface ConversionState {
  taskId: string;
  file: File | null;
  inputFormat: string;
  outputFormat: string;
  isLoading: boolean;
  progress: number;
  result: any;
  error: string | null;
}

interface OCRState {
  image: File | null;
  extractedText: string;
  aiResult: string;
  isLoading: boolean;
  error: string | null;
}

interface AppState {
  // Download state
  download: DownloadState;
  setDownloadTaskId: (taskId: string) => void;
  setDownloadUrl: (url: string) => void;
  setDownloadPlatform: (platform: DownloadState['platform']) => void;
  setDownloadLoading: (loading: boolean) => void;
  setDownloadProgress: (progress: number) => void;
  setDownloadResult: (result: any) => void;
  setDownloadError: (error: string | null) => void;
  resetDownload: () => void;

  // Conversion state
  conversion: ConversionState;
  setConversionTaskId: (taskId: string) => void;
  setConversionFile: (file: File | null) => void;
  setInputFormat: (format: string) => void;
  setOutputFormat: (format: string) => void;
  setConversionLoading: (loading: boolean) => void;
  setConversionProgress: (progress: number) => void;
  setConversionResult: (result: any) => void;
  setConversionError: (error: string | null) => void;
  resetConversion: () => void;

  // OCR state
  ocr: OCRState;
  setOCRImage: (image: File | null) => void;
  setExtractedText: (text: string) => void;
  setAIResult: (result: string) => void;
  setOCRLoading: (loading: boolean) => void;
  setOCRError: (error: string | null) => void;
  resetOCR: () => void;
}

const initialDownloadState: DownloadState = {
  taskId: '',
  url: '',
  platform: 'youtube',
  isLoading: false,
  progress: 0,
  result: null,
  error: null,
};

const initialConversionState: ConversionState = {
  taskId: '',
  file: null,
  inputFormat: '',
  outputFormat: '',
  isLoading: false,
  progress: 0,
  result: null,
  error: null,
};

const initialOCRState: OCRState = {
  image: null,
  extractedText: '',
  aiResult: '',
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Download state and actions
  download: initialDownloadState,
  setDownloadUrl: (url) => set((state) => ({ download: { ...state.download, url } })),
  setDownloadPlatform: (platform) => set((state) => ({ download: { ...state.download, platform } })),
  setDownloadLoading: (isLoading) => set((state) => ({ download: { ...state.download, isLoading } })),
  setDownloadProgress: (progress) => set((state) => ({ download: { ...state.download, progress } })),
  setDownloadResult: (result) => set((state) => ({ download: { ...state.download, result } })),
  setDownloadError: (error) => set((state) => ({ download: { ...state.download, error } })),
  resetDownload: () => set({ download: initialDownloadState }),
  setDownloadTaskId: (taskId) => set((state) => ({ download: { ...state.download, taskId } })),

  // Conversion state and actions
  conversion: initialConversionState,
  setConversionFile: (file) => set((state) => ({ conversion: { ...state.conversion, file } })),
  setInputFormat: (inputFormat) => set((state) => ({ conversion: { ...state.conversion, inputFormat } })),
  setOutputFormat: (outputFormat) => set((state) => ({ conversion: { ...state.conversion, outputFormat } })),
  setConversionLoading: (isLoading) => set((state) => ({ conversion: { ...state.conversion, isLoading } })),
  setConversionProgress: (progress) => set((state) => ({ conversion: { ...state.conversion, progress } })),
  setConversionResult: (result) => set((state) => ({ conversion: { ...state.conversion, result } })),
  setConversionError: (error) => set((state) => ({ conversion: { ...state.conversion, error } })),
  resetConversion: () => set({ conversion: initialConversionState }),
  setConversionTaskId: (taskId) => set((state) => ({ conversion: { ...state.conversion, taskId } })),

  // OCR state and actions
  ocr: initialOCRState,
  setOCRImage: (image) => set((state) => ({ ocr: { ...state.ocr, image } })),
  setExtractedText: (extractedText) => set((state) => ({ ocr: { ...state.ocr, extractedText } })),
  setAIResult: (aiResult) => set((state) => ({ ocr: { ...state.ocr, aiResult } })),
  setOCRLoading: (isLoading) => set((state) => ({ ocr: { ...state.ocr, isLoading } })),
  setOCRError: (error) => set((state) => ({ ocr: { ...state.ocr, error } })),
  resetOCR: () => set({ ocr: initialOCRState }),
}));