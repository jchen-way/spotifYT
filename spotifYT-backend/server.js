const express = require('express');
const cors = require('cors');
const ytSearch = require('yt-search');
const { spawn } = require('child_process');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

const sanitizeFilename = (value) => value.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'download';
const resolveBinary = (binaryName, configuredPath) => configuredPath || binaryName;
const normalizeFormat = (value) => (value === 'mp4' ? 'mp4' : 'mp3');

const runYtDlp = (args) =>
  new Promise((resolve, reject) => {
    const proc = spawn(resolveBinary('yt-dlp', process.env.YT_DLP_PATH), args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }

      reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
    });
  });

const streamFileAndCleanup = (filePath, downloadName, contentType, res) => {
  res.header('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.header('Content-Type', contentType);

  const fileStream = fs.createReadStream(filePath);

  fileStream.on('error', async (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not read the downloaded media file.' });
    }
    await fsp.rm(path.dirname(filePath), { recursive: true, force: true }).catch(() => {});
  });

  fileStream.on('close', async () => {
    await fsp.rm(path.dirname(filePath), { recursive: true, force: true }).catch(() => {});
  });

  fileStream.pipe(res);
};

const downloadWithYtDlp = async (url, format, res) => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'spotifyt-'));
  const outputTemplate = path.join(tmpDir, '%(title)s.%(ext)s');
  const normalizedFormat = normalizeFormat(format);

  try {
    const infoArgs = ['--no-playlist', '--print', '%(title)s', url];
    const { stdout: rawTitle } = await runYtDlp(infoArgs);
    const title = sanitizeFilename(rawTitle.split('\n').filter(Boolean).pop() || 'download');

    if (normalizedFormat === 'mp4') {
      const args = [
        '--no-playlist',
        '--print',
        'after_move:filepath',
        '-f',
        'bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4][vcodec^=avc1]/b[ext=mp4]',
        '--merge-output-format',
        'mp4',
        '--remux-video',
        'mp4',
        '-o',
        outputTemplate,
        url,
      ];

      const { stdout } = await runYtDlp(args);
      const filePath = stdout.split('\n').filter(Boolean).pop();
      if (!filePath) {
        throw new Error('yt-dlp did not return an output path for mp4 download.');
      }

      streamFileAndCleanup(filePath, `${title}.mp4`, 'video/mp4', res);
      return;
    }

    const args = [
      '--no-playlist',
      '--print',
      'after_move:filepath',
      '-f',
      'bestaudio',
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '192K',
      '-o',
      outputTemplate,
      url,
    ];

    const { stdout } = await runYtDlp(args);
    const filePath = stdout.split('\n').filter(Boolean).pop();
    if (!filePath) {
      throw new Error('yt-dlp did not return an output path for mp3 download.');
    }

    streamFileAndCleanup(filePath, `${title}.mp3`, 'audio/mpeg', res);
  } catch (error) {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
};

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'spotifYT-backend',
    ytDlpPath: resolveBinary('yt-dlp', process.env.YT_DLP_PATH),
  });
});

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const result = await ytSearch(query);
    const videos = result.videos.slice(0, 15).map((video) => ({
      author: video.author,
      duration: video.seconds,
      thumbnail: video.thumbnail,
      timestamp: video.timestamp,
      title: video.title,
      url: video.url,
      videoId: video.videoId,
      views: video.views,
    }));
    return res.json(videos);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Could not query YouTube.' });
  }
});

const handleDownload = async (url, format, res) => downloadWithYtDlp(url, format, res);

app.get('/download', async (req, res) => {
  const { format = 'mp3', url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    await handleDownload(url, format, res);
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Could not download media.' });
    }
  }
});

app.post('/download', async (req, res) => {
  const { format = 'mp3', url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    await handleDownload(url, format, res);
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Could not download media.' });
    }
  }
});

app.listen(PORT, HOST, () => {
  console.log(`spotifYT backend listening on http://${HOST}:${PORT}`);
});
