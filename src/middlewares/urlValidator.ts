import validator from 'validator';
import {Request,Response,NextFunction} from 'express';

export default function validateYouTubeUrl(Request:Request,Response:Response,NextFunction:NextFunction) {
    const input = Request.body.url;
  if (!input || typeof input !== 'string') {
    throw new Error('URL is required and must be a string');
  }

  if (input.length > 200) {
    throw new Error('URL too long');
  }


  if (!validator.isURL(input, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_query_components: true,
    allow_fragments: true
  })) {
    throw new Error('Invalid URL format');
  }


  let urlObj;
  try {
    urlObj = new URL(input);
  } catch (error) {
    throw new Error('Cannot parse URL');
  }

  const allowedDomains = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'music.youtube.com'
  ];

  if (!allowedDomains.includes(urlObj.hostname)) {
    throw new Error(`Only YouTube domains allowed: ${allowedDomains.join(', ')}`);
  }


  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols allowed');
  }


  const hostname = urlObj.hostname;
  const privateIPRanges = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./, 
    /^::1$/,       
    /^fc00:/,      
    /^fe80:/       
  ];

  if (privateIPRanges.some(regex => regex.test(hostname))) {
    throw new Error('Private/internal URLs not allowed');
  }


  const videoId = extractVideoId(urlObj);
  if (!videoId) {
    throw new Error('Invalid YouTube video ID');
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error('Invalid video ID format');
  }


  NextFunction();
}

function extractVideoId(urlObj: URL) {
  if (urlObj.hostname.includes('youtube.com')) {
    return urlObj.searchParams.get('v');
  }

  if (urlObj.hostname === 'youtu.be') {
    return urlObj.pathname.slice(1).split('/')[0];
  }
  
  return null;
}