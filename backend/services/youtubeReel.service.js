/**
 * Publish reel video to YouTube and add to category playlist.
 * Requires: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 * (Or use service account / other OAuth2 flow and set access token.)
 * If not configured, throws so controller can set youtubeUploadFailed and still approve reel.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YouTubePlaylistMap from '../models/YouTubePlaylistMap.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureYouTubeConfigured() {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('YouTube credentials not configured (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)');
  }
}

/**
 * Get OAuth2 access token using refresh token (caller should cache this)
 */
async function fetchAccessToken() {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('YouTube credentials not configured');
  }
  const res = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
  );
  if (!res.data?.access_token) throw new Error('Failed to get YouTube access token');
  return res.data.access_token;
}

/**
 * Download video from URL to temp file
 */
async function downloadToTemp(videoUrl) {
  const res = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000, maxContentLength: 100 * 1024 * 1024 });
  const tmpDir = path.join(__dirname, '..', 'upload', 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  fs.writeFileSync(tmpPath, res.data);
  return tmpPath;
}

/**
 * Upload video to YouTube via resumable upload API
 * https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */
async function uploadVideoToYouTube(accessToken, filePath, title, description) {
  const fileSize = fs.statSync(filePath).size;
  const metadata = {
    snippet: { title: title.slice(0, 100), description: (description || '').slice(0, 5000) },
    status: { privacyStatus: process.env.YOUTUBE_VIDEO_PRIVACY || 'public' },
  };

  const initRes = await axios.post(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': fileSize,
        'X-Upload-Content-Type': 'video/mp4',
      },
      maxRedirects: 0,
      validateStatus: (s) => s === 200,
      timeout: 10000,
    }
  );
  const uploadUrl = initRes.headers?.location;
  if (!uploadUrl) throw new Error('YouTube did not return upload URL');

  const fileBuffer = fs.readFileSync(filePath);
  const uploadRes = await axios.put(uploadUrl, fileBuffer, {
    headers: {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000,
    validateStatus: (s) => s === 200,
  });
  if (!uploadRes.data?.id) throw new Error('YouTube upload response missing video id');
  return uploadRes.data.id;
}

/**
 * Create YouTube playlist and return playlistId
 */
async function createPlaylist(accessToken, title) {
  const res = await axios.post(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
    {
      snippet: { title: title.slice(0, 150), description: `Category: ${title}` },
      status: { privacyStatus: 'public' },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
  if (!res.data?.id) throw new Error('Failed to create YouTube playlist');
  return res.data.id;
}

/**
 * Add video to playlist
 */
async function addVideoToPlaylist(accessToken, playlistId, videoId) {
  await axios.post(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      snippet: {
        playlistId,
        resourceId: { kind: 'youtube#video', videoId },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
}

/**
 * Publish reel to YouTube: upload video, get or create category playlist, add video to playlist.
 * @param {Object} reel - Reel document with videoUrl, title, description, categoryName
 * @returns {Promise<{ youtubeVideoId, youtubePlaylistId }>}
 */
export async function publishReelToYouTube(reel) {
  ensureYouTubeConfigured();
  const accessToken = await fetchAccessToken();
  let tmpPath;
  try {
    tmpPath = await downloadToTemp(reel.videoUrl);
    const youtubeVideoId = await uploadVideoToYouTube(
      accessToken,
      tmpPath,
      reel.title,
      reel.description
    );

    const categoryName = (reel.categoryName || '').trim() || 'General';
    let map = await YouTubePlaylistMap.findOne({ categoryName: new RegExp('^' + categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
    let playlistId;
    if (map?.youtubePlaylistId) {
      playlistId = map.youtubePlaylistId;
    } else {
      playlistId = await createPlaylist(accessToken, `${categoryName} - Product Reels`);
      await YouTubePlaylistMap.create({
        categoryName,
        youtubePlaylistId: playlistId,
        youtubePlaylistTitle: `${categoryName} - Product Reels`,
      });
    }

    await addVideoToPlaylist(accessToken, playlistId, youtubeVideoId);

    return { youtubeVideoId, youtubePlaylistId: playlistId };
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (_) {}
    }
  }
}
