import validator from 'validator';
import {Request,Response,NextFunction} from 'express';
import { logger } from '../utils/logger.js';
  const allowedDomainsYoutube = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'music.youtube.com'
  ];
  const allowedDomainsInstagram = [
    'instagram.com',
    'www.instagram.com',
    'm.instagram.com',
    'instagr.am',
    'www.instagr.am'
  ];
export default function validateYouTubeOrInstagramUrl(req:Request,res:Response,next:NextFunction) {
    const url = req.body.url;
    const platform = req.body.platform;
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string');
  }

  if (url.length > 200) {
    throw new Error('URL too long');
  }



  if (!validator.isURL(url, {
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_query_components: true,
    allow_fragments: true
  })) {
    throw new Error('Invalid URL format');
  }

  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (error) {
    throw new Error('Cannot parse URL');
  }

  if (platform === 'youtube') {
    if (!allowedDomainsYoutube.includes(urlObj.hostname)) {
      throw new Error(`Only YouTube domains allowed: ${allowedDomainsYoutube.join(', ')}`);
    }
  } else if (platform === 'instagram') {
    if (!allowedDomainsInstagram.includes(urlObj.hostname)) {
      throw new Error(`Only Instagram domains allowed: ${allowedDomainsInstagram.join(', ')}`);
    }
  } else {
    throw new Error('Invalid platform');
  }



  if (!['https:'].includes(urlObj.protocol)) {
    throw new Error('Only HTTPS protocols allowed');
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



  next();
}

