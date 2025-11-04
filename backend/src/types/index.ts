export type TaskStatus = 'queued' | 'processing' | 'completed' | 'error' | 'encourage';

export interface TaskResult {
  downloadUrl?: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export interface TaskInfo {
  id: string;
  status: TaskStatus;
  progress: number; // 0..100
  message?: string;
  result?: TaskResult;
  error?: string;
}
