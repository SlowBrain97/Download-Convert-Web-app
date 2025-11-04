import path from 'node:path';
import fs from 'node:fs';
import ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import { tasks } from '../utils/taskManager.js';
import { getPublicUrl, toPublicPath } from '../utils/file.js';
import { logger } from '../utils/logger.js';

// === Types ===
type MediaType = 'video' | 'audio';
type VideoFormat = 'mp4' | 'avi' | 'mov' | 'mkv' | 'webm' | 'wmv' | 'flv' | 'mpeg';
type AudioFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg' | 'm4a' | 'wma' | 'opus';
type MediaFormat = VideoFormat | AudioFormat;

interface CodecConfig {
  video?: string;
  audio?: string;
}

interface ConversionResult {
  downloadUrl: string;
  filePath: string;
  fileName: string;
  size: number;
  inputType: MediaType;
  outputFormat: MediaFormat;
}

// === Constants ===
const VIDEO_FORMATS: readonly VideoFormat[] = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'mpeg'];
const AUDIO_FORMATS: readonly AudioFormat[] = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'];

const CODEC_MAP: Record<MediaFormat, CodecConfig> = {
  // Audio codecs
  mp3: { audio: 'libmp3lame' },
  wav: { audio: 'pcm_s16le' },
  flac: { audio: 'flac' },
  aac: { audio: 'aac' },
  ogg: { audio: 'libvorbis' },
  m4a: { audio: 'aac' },
  wma: { audio: 'wmav2' },
  opus: { audio: 'libopus' },
  
  // Video codecs
  mp4: { video: 'libx264', audio: 'aac' },
  avi: { video: 'mpeg4', audio: 'mp3' },
  mov: { video: 'libx264', audio: 'aac' },
  mkv: { video: 'libx264', audio: 'aac' },
  webm: { video: 'libvpx', audio: 'libvorbis' },
  wmv: { video: 'wmv2', audio: 'wmav2' },
  flv: { video: 'flv', audio: 'mp3' },
  mpeg: { video: 'mpeg2video', audio: 'mp2' }
};

// === Helper functions ===

/**
 * Detect if input file is video or audio
 */
async function detectMediaType(filePath: string): Promise<MediaType> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: Error | null, metadata: FfprobeData) => {
      if (err) {
        reject(err);
        return;
      }
      
      const hasVideo = metadata.streams.some(s => s.codec_type === 'video');
      const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');
      
      if (hasVideo) {
        resolve('video');
      } else if (hasAudio) {
        resolve('audio');
      } else {
        reject(new Error('Unknown media type'));
      }
    });
  });
}

/**
 * Check if format is audio format
 */
function isAudioFormat(format: string): format is AudioFormat {
  return (AUDIO_FORMATS as readonly string[]).includes(format);
}

/**
 * Check if format is video format
 */
function isVideoFormat(format: string): format is VideoFormat {
  return (VIDEO_FORMATS as readonly string[]).includes(format);
}

/**
 * Validate if conversion is allowed
 */
function validateConversion(inputType: MediaType, outputFormat: MediaFormat): void {
  const isAudioOut = isAudioFormat(outputFormat);
  const isVideoOut = isVideoFormat(outputFormat);
  
  // Audio files can only convert to audio
  if (inputType === 'audio' && !isAudioOut) {
    throw new Error(
      `Cannot convert audio to video format. Audio files can only be converted to: ${AUDIO_FORMATS.join(', ')}`
    );
  }
  
  // Video can convert to both video and audio (extract audio)
  if (inputType === 'video' && !isAudioOut && !isVideoOut) {
    throw new Error(`Unsupported output format: ${outputFormat}`);
  }
}

/**
 * Configure FFmpeg command based on format
 */
function configureCommand(
  command: ffmpeg.FfmpegCommand, 
  outputFormat: MediaFormat
): ffmpeg.FfmpegCommand {
  const codec = CODEC_MAP[outputFormat];
  
  if (!codec) {
    throw new Error(`Unsupported format: ${outputFormat}`);
  }
  
  // Audio-only conversion
  if (isAudioFormat(outputFormat)) {
    command.noVideo();
    
    if (codec.audio) {
      command.audioCodec(codec.audio);
    }
    
    // Quality settings for audio
    switch (outputFormat) {
      case 'mp3':
        command.audioBitrate('192k');
        break;
      case 'aac':
      case 'm4a':
        command.audioBitrate('192k');
        break;
      case 'ogg':
      case 'opus':
        command.audioBitrate('160k');
        break;
      case 'wav':
        command.audioFrequency(44100);
        break;
      case 'flac':
        // Lossless, no bitrate needed
        break;
    }
  } 
  // Video conversion
  else if (isVideoFormat(outputFormat)) {
    if (codec.video) {
      command.videoCodec(codec.video);
    }
    if (codec.audio) {
      command.audioCodec(codec.audio);
    }
    
    // Quality settings for video
    switch (outputFormat) {
      case 'mp4':
      case 'mov':
      case 'mkv':
        command
          .videoBitrate('2000k')
          .audioBitrate('192k')
          .outputOptions(['-preset fast', '-crf 23']);
        break;
      case 'webm':
        command.videoBitrate('1500k').audioBitrate('128k');
        break;
      case 'avi':
      case 'mpeg':
        command.videoBitrate('2000k').audioBitrate('192k');
        break;
      case 'wmv':
      case 'flv':
        command.videoBitrate('1500k').audioBitrate('128k');
        break;
    }
  }
  
  return command;
}

// === Main conversion function ===
export async function convertMediaTask(
  taskId: string, 
  inputPath: string, 
  outputFormat: string
): Promise<void> {
  let inputType: MediaType | undefined;
  
  try {
    tasks.update(taskId, { 
      status: 'processing', 
      message: 'Detecting media type', 
      progress: 5 
    });
    
    // Detect input type
    inputType = await detectMediaType(inputPath);
    logger.info(`Detected media type: ${inputType} for file: ${inputPath}`);
    
    tasks.update(taskId, { 
      message: `Detected ${inputType} file`, 
      progress: 10 
    });
    

    if (!isAudioFormat(outputFormat) && !isVideoFormat(outputFormat)) {
      throw new Error(`Invalid output format: ${outputFormat}`);
    }
    
    // Validate conversion compatibility
    validateConversion(inputType, outputFormat as MediaFormat);
    
    // Prepare output path
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outFileName = `${baseName}.${outputFormat}`;
    const outPath = toPublicPath(outFileName);
    
    tasks.update(taskId, { 
      message: 'Starting conversion', 
      progress: 15 
    });
    
    // Perform conversion
    await new Promise<void>((resolve, reject) => {
      let lastPercent = 15;
      
      const command = ffmpeg(inputPath)
        .on('start', (cmd: string) => {
          logger.info('FFmpeg command:', cmd);
          tasks.update(taskId, { 
            message: `Converting ${inputType} to ${outputFormat.toUpperCase()}`, 
            progress: 20 
          });
        })
        .on('progress', (p: { percent?: number }) => {
          const pct = Math.min(95, Math.max(20, Math.round(p.percent || 20)));
          if (Math.abs(pct - lastPercent) >= 1) {
            lastPercent = pct;
            tasks.update(taskId, { 
              progress: pct, 
              message: `Processing ${pct}%` 
            });
          }
        })
        .on('error', (err: Error) => {
          logger.error('FFmpeg error:', err);
          reject(err);
        })
        .on('end', () => {
          logger.info('Conversion completed successfully');
          resolve();
        })
        .output(outPath);
      
      // Configure codecs and quality
      configureCommand(command, outputFormat as MediaFormat);
      
      // Set output format and run
      command.toFormat(outputFormat).run();
    });
    
    // Get file info
    const stat = await fs.promises.stat(outPath);
    const result: ConversionResult = {
      downloadUrl: getPublicUrl(path.basename(outPath)),
      filePath: outPath,
      fileName: path.basename(outPath),
      size: stat.size,
      inputType,
      outputFormat: outputFormat as MediaFormat
    };
    
    tasks.update(taskId, { 
      message: 'Conversion completed', 
      progress: 100 
    });
    
    tasks.complete(taskId, result);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
    logger.error('convertMediaTask failed:', { error: err, taskId, inputPath, outputFormat });
    tasks.error(taskId, errorMessage);
  } finally {
    // Cleanup input file
    try { 
      await fs.promises.unlink(inputPath);
      logger.info('Cleaned up input file:', inputPath);
    } catch (cleanupErr) {
      logger.warn('Failed to cleanup input file:', cleanupErr);
    }
  }
}