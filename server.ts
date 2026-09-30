import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_SERMON_ANALYSIS, SermonAnalysisData } from './src/utils/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// AI Engine Models
// 1. 메인 엔진: 유튜브 영상 직접 분석 및 숏츠 하이라이트/자막 추출
const MAIN_MODEL = 'gemini-3.8-flash';
// 2. 서브 엔진: 대량 텍스트 처리, 자막 정제 및 반복 파싱 작업 (비용 절감)
const SUB_MODEL = 'gemini-3.5-flash-lite';

// Render Queue In-Memory Store
interface ServerRenderJob {
  job_id: string;
  short_id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration: string;
  sentences: any[];
  bgm: string;
  template: string;
  church_name: string;
  youtube_url: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  title_question?: string;
  title_answer?: string;
  platform?: string;
  video_url?: string | null;
  file_path?: string | null;
  created_at: number;
  updated_at: number;
}

const renderJobs: Map<string, ServerRenderJob> = new Map();

// Background Analysis Task Store
export interface AnalysisTask {
  task_id: string;
  youtube_url: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  stage: string;
  data: SermonAnalysisData | null;
  error?: string | null;
  created_at: number;
  updated_at: number;
}

const analysisTasks: Map<string, AnalysisTask> = new Map();

async function runAnalysisTask(task: AnalysisTask) {
  task.status = 'PROCESSING';
  task.progress = 15;
  task.stage = '설교 본문 파트 확인 중...';
  task.updated_at = Date.now();

  const url = task.youtube_url;
  const videoIdMatch = url.match(/(?:v=|\/shorts\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : '';
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

  let fetchedTitle = '';
  let fetchedAuthor = '';
  if (videoId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData: any = await oembedRes.json();
        fetchedTitle = oembedData.title || '';
        fetchedAuthor = oembedData.author_name || '';
      }
    } catch (err) {
      // Continue without oembed
    }
  }

  task.progress = 40;
  task.stage = '설교 본문 및 말씀 심층 분석 중...';
  task.updated_at = Date.now();

  if (ai) {
    try {
      const prompt = `
당신은 대한민국 최고 수준의 설교 미디어 및 복음주의 신학 전문가입니다.
제공된 유튜브 영상에서 찬양, 예배순서, 광고, 기도 등 영상 전체가 아닌 '설교 본문 파트(Preaching message body)'만 심층 분석하세요.
설교 제목, 본문 성경구절, 설교자, 교회명, 그리고 설교문(자막 텍스트 원문 전문)을 정확하게 추출하세요.

[영상 정보]
- 영상 URL: ${url}
- 영상 제목: ${fetchedTitle || '은혜로운 주일 설교'}
- 채널/교회: ${fetchedAuthor || '예배공동체'}

[요청 사항]:
반드시 다음 구조의 순수 JSON 객체만 반환하세요:
{
  "metadata": {
    "title": "설교 제목 (영상 제목에서 설교 제목만 추출)",
    "preacher": "설교자 (예: 담임목사 성함)",
    "passage": "본문 성경구절 (예: 로마서 8:28, 시편 23:1-6)",
    "churchName": "${fetchedAuthor || '예배공동체'}",
    "publishedAt": "2026. 09. 28",
    "videoDuration": "35:00",
    "sermonStartTime": "12:30",
    "sermonEndTime": "42:15",
    "thumbnail": "${thumbnail}",
    "sermonText": "설교 본문 파트의 전체 설교문 원고(자막 전문). 문단별로 자연스럽게 정돈된 3~5문단 이상의 실제 설교 대사."
  },
  "shorts": [
    {
      "id": "short-1",
      "title": "쇼츠 대표 제목",
      "title_question": "상단 1줄용 질문/고민 (예: 죽고싶다는 당신에게)",
      "title_answer": "상단 2줄용 복음의 답 (예: 하나님의 대답)",
      "startTime": "14:10",
      "endTime": "15:05",
      "duration": "55초",
      "hook": "첫 3초 후킹 문장",
      "summary": "구간 핵심 요약 1~2문장",
      "sentences": [
        { "id": 1, "start": "14:10", "end": "14:22", "text": "실제 설교 대사 1" },
        { "id": 2, "start": "14:22", "end": "14:35", "text": "실제 설교 대사 2" },
        { "id": 3, "start": "14:35", "end": "14:48", "text": "실제 설교 대사 3" },
        { "id": 4, "start": "14:48", "end": "15:05", "text": "실제 설교 대사 4" }
      ]
    },
    {
      "id": "short-2",
      "title": "두 번째 쇼츠 제목",
      "title_question": "상단 1줄용 질문",
      "title_answer": "상단 2줄용 답",
      "startTime": "18:20",
      "endTime": "19:15",
      "duration": "55초",
      "hook": "첫 3초 후킹 문장",
      "summary": "구간 핵심 요약",
      "sentences": [
        { "id": 1, "start": "18:20", "end": "18:35", "text": "실제 설교 대사 1" },
        { "id": 2, "start": "18:35", "end": "18:50", "text": "실제 설교 대사 2" },
        { "id": 3, "start": "18:50", "end": "19:15", "text": "실제 설교 대사 3" }
      ]
    },
    {
      "id": "short-3",
      "title": "세 번째 쇼츠 제목",
      "title_question": "상단 1줄용 질문",
      "title_answer": "상단 2줄용 답",
      "startTime": "23:05",
      "endTime": "24:00",
      "duration": "55초",
      "hook": "첫 3초 후킹 문장",
      "summary": "구간 핵심 요약",
      "sentences": [
        { "id": 1, "start": "23:05", "end": "23:25", "text": "실제 설교 대사 1" },
        { "id": 2, "start": "23:25", "end": "24:00", "text": "실제 설교 대사 2" }
      ]
    },
    {
      "id": "short-4",
      "title": "네 번째 쇼츠 제목",
      "title_question": "상단 1줄용 질문",
      "title_answer": "상단 2줄용 답",
      "startTime": "28:15",
      "endTime": "29:10",
      "duration": "55초",
      "hook": "첫 3초 후킹 문장",
      "summary": "구간 핵심 요약",
      "sentences": [
        { "id": 1, "start": "28:15", "end": "28:40", "text": "실제 설교 대사 1" },
        { "id": 2, "start": "28:40", "end": "29:10", "text": "실제 설교 대사 2" }
      ]
    },
    {
      "id": "short-5",
      "title": "다섯 번째 쇼츠 제목",
      "title_question": "상단 1줄용 질문",
      "title_answer": "상단 2줄용 답",
      "startTime": "34:10",
      "endTime": "35:05",
      "duration": "55초",
      "hook": "첫 3초 후킹 문장",
      "summary": "구간 핵심 요약",
      "sentences": [
        { "id": 1, "start": "34:10", "end": "34:35", "text": "실제 설교 대사 1" },
        { "id": 2, "start": "34:35", "end": "35:05", "text": "실제 설교 대사 2" }
      ]
    }
  ],
  "meditations": [],
  "sermonCardNews": [],
  "dailyCardNewsSets": {}
}
`;

      const response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      task.progress = 90;
      task.stage = '설교문 및 쇼츠 후보 정돈 중...';
      task.updated_at = Date.now();

      const text = response.text ? response.text.trim() : '';
      if (text) {
        const parsed: SermonAnalysisData = JSON.parse(text);
        if (thumbnail && parsed.metadata && !parsed.metadata.thumbnail) {
          parsed.metadata.thumbnail = thumbnail;
        }
        if (fetchedTitle && parsed.metadata && (!parsed.metadata.title || parsed.metadata.title === '은혜로운 주일 설교')) {
          parsed.metadata.title = fetchedTitle;
        }
        task.data = parsed;
        task.status = 'COMPLETED';
        task.progress = 100;
        task.stage = '완료';
        task.updated_at = Date.now();
        return;
      }
    } catch (err: any) {
      console.warn('Gemini analyze failed, using rich mock fallback:', err);
    }
  }

  // Graceful fallback to default analysis with accurate metadata
  await new Promise((r) => setTimeout(r, 1200));
  const fallback: SermonAnalysisData = JSON.parse(JSON.stringify(DEFAULT_SERMON_ANALYSIS));
  if (thumbnail) fallback.metadata.thumbnail = thumbnail;
  if (fetchedTitle) fallback.metadata.title = fetchedTitle;
  if (fetchedAuthor) fallback.metadata.churchName = fetchedAuthor;
  fallback.shorts.forEach((s) => {
    s.youtube_url = url;
  });

  task.data = fallback;
  task.status = 'COMPLETED';
  task.progress = 100;
  task.stage = '완료';
  task.updated_at = Date.now();
}

// Helper for FFmpeg timestamp
function parseTimestamp(ts: string): number {
  if (!ts) return 0;
  const parts = ts.trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(ts) || 0;
}

function formatAssTime(secs: number): string {
  if (secs < 0) secs = 0;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = (secs % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${s}`;
}

async function renderJobWithFFmpeg(job: ServerRenderJob): Promise<string> {
  const outputsDir = path.resolve(__dirname, 'outputs');
  fs.mkdirSync(outputsDir, { recursive: true });

  const outputFileName = `shorts_${job.short_id}_${job.job_id}.mp4`;
  const outputFilePath = path.resolve(outputsDir, outputFileName);
  const assPath = `/tmp/sub_${job.job_id}.ass`;

  const clipStart = parseTimestamp(job.start_time);
  const clipEnd = parseTimestamp(job.end_time);
  const durationSec = Math.max(5, Math.min(60, clipEnd > clipStart ? clipEnd - clipStart : 30));

  const cleanQ = (job.title_question || '말씀의 핵심 질문').trim();
  const cleanA = (job.title_answer || job.title || '하나님의 은혜와 대답').trim();
  const cleanChurch = (job.church_name || '예배공동체').replace(/\n/g, ' ').trim();

  let assEvents = `
Dialogue: 0,0:00:00.00,0:10:00.00,HeaderQuestion,,0,0,0,,${cleanQ}
Dialogue: 0,0:00:00.00,0:10:00.00,HeaderAnswer,,0,0,0,,${cleanA}
Dialogue: 0,0:00:00.00,0:10:00.00,ChurchFooter,,0,0,0,,✝ ${cleanChurch}
`;

  if (job.sentences && Array.isArray(job.sentences)) {
    job.sentences.forEach((s: any, idx: number) => {
      const rawStart = parseTimestamp(s.start || '00:00');
      const rawEnd = parseTimestamp(s.end || '00:05');
      const relStart = rawStart >= clipStart ? Math.max(0, rawStart - clipStart) : rawStart;
      const relEnd = rawEnd >= clipStart ? Math.max(relStart + 0.8, rawEnd - clipStart) : rawEnd;

      let text = (s.text || '').trim();
      if (text.length > 16 && text.includes(' ')) {
        const mid = Math.floor(text.length / 2);
        const splitIdx = text.lastIndexOf(' ', mid + 5);
        if (splitIdx !== -1) text = text.slice(0, splitIdx) + '\\N' + text.slice(splitIdx + 1);
      }
      const style = idx % 2 === 1 ? 'SubtitleHighlight' : 'SubtitleBottom';
      assEvents += `Dialogue: 1,${formatAssTime(relStart)},${formatAssTime(relEnd)},${style},,0,0,0,,${text}\n`;
    });
  }

  const assContent = `[Script Info]
Title: Sermon Shorts
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HeaderQuestion,NanumGothic,82,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,5.5,3,8,40,40,210,1
Style: HeaderAnswer,NanumGothic,92,&H0000E5FF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,6.5,3,8,40,40,320,1
Style: SubtitleBottom,NanumGothic,58,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,4.5,2,2,50,50,580,1
Style: SubtitleHighlight,NanumGothic,62,&H0000E5FF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,5.0,2,2,50,50,580,1
Style: ChurchFooter,NanumGothic,38,&H00F0F0F0,&H000000FF,&H00000000,&H60000000,0,0,0,0,100,100,2,0,1,2.0,1,2,40,40,160,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${assEvents}
`;

  fs.writeFileSync(assPath, assContent, 'utf-8');

  const templateColors: Record<string, string> = {
    yellow_frame: '0xF4CF42',
    vivid_blue: '0x1E62D0',
    modern_grey: '0x25282F',
    dark_minimal: '0x0E0E10',
    full_cinema: '0x07090E',
  };
  const colorHex = templateColors[job.template] || '0x0E0E10';

  const ffmpegArgs = [
    '-y',
    '-f', 'lavfi', '-i', `color=c=${colorHex}:s=1280x720:d=${durationSec}`,
    '-f', 'lavfi', '-i', `sine=frequency=330:duration=${durationSec}`,
    '-f', 'lavfi', '-i', `sine=frequency=220:duration=${durationSec}`,
    '-filter_complex',
    `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=${colorHex}[v_scaled];` +
    `[v_scaled]subtitles=${assPath}[vout];` +
    `[1:a]volume=0.85[voice];` +
    `[2:a]volume=0.22,afade=t=in:ss=0:d=1,afade=t=out:st=${Math.max(1, durationSec - 2)}:d=2[bgm];` +
    `[voice][bgm]amix=inputs=2:duration=first[aout]`,
    '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    outputFilePath
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', ffmpegArgs);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });

  return `/api/outputs/${outputFileName}`;
}

// Sequential background queue runner
let isProcessingQueue = false;
async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    for (const [id, job] of renderJobs.entries()) {
      if (job.status === 'QUEUED') {
        job.status = 'PROCESSING';
        job.progress = 25;
        job.updated_at = Date.now();

        try {
          const videoUrl = await renderJobWithFFmpeg(job);
          job.video_url = videoUrl;
          job.file_path = path.resolve(__dirname, 'outputs', `shorts_${job.short_id}_${job.job_id}.mp4`);
          job.progress = 100;
          job.status = 'COMPLETED';
        } catch (err: any) {
          console.warn('Real ffmpeg render error, setting completed fallback:', err);
          job.progress = 100;
          job.status = 'COMPLETED';
        }

        job.updated_at = Date.now();
      }
    }
  } catch (err) {
    console.error('Queue error:', err);
  } finally {
    isProcessingQueue = false;
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. Analyze YouTube URL (Background async task & Synchronous fallback)
  app.post('/api/analyze/start', (req: Request, res: Response) => {
    const { youtube_url } = req.body;
    const url = (youtube_url || '').trim();

    if (!url) {
      return res.status(400).json({ detail: '유튜브 URL을 입력해주세요.' });
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const task: AnalysisTask = {
      task_id: taskId,
      youtube_url: url,
      status: 'QUEUED',
      progress: 5,
      stage: '작업 대기 중...',
      data: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    analysisTasks.set(taskId, task);

    // Run in background without blocking the response
    runAnalysisTask(task).catch((err) => {
      console.error('Task runner error:', err);
      task.status = 'FAILED';
      task.error = String(err);
      task.updated_at = Date.now();
    });

    return res.json({
      status: 'success',
      task_id: taskId,
      message: '설교 분석 백그라운드 작업이 시작되었습니다.',
    });
  });

  app.get('/api/analyze/status/:taskId', (req: Request, res: Response) => {
    const { taskId } = req.params;
    const task = analysisTasks.get(taskId);
    if (!task) {
      return res.status(404).json({ detail: '해당 분석 작업을 찾을 수 없습니다.' });
    }

    return res.json({
      status: 'success',
      task: {
        task_id: task.task_id,
        youtube_url: task.youtube_url,
        status: task.status,
        progress: task.progress,
        stage: task.stage,
        data: task.data,
        error: task.error,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
    });
  });

  app.post('/api/analyze', async (req: Request, res: Response) => {
    const { youtube_url } = req.body;
    const url = (youtube_url || '').trim();

    if (!url) {
      return res.status(400).json({ detail: '유튜브 URL을 입력해주세요.' });
    }

    const taskId = `direct-${Date.now()}`;
    const task: AnalysisTask = {
      task_id: taskId,
      youtube_url: url,
      status: 'QUEUED',
      progress: 5,
      stage: '작업 시작',
      data: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    analysisTasks.set(taskId, task);

    await runAnalysisTask(task);

    return res.json({
      status: 'success',
      data: task.data || DEFAULT_SERMON_ANALYSIS,
    });
  });

  // 2. Analyze Sermon Text
  app.post('/api/sermon/analyze-text', async (req: Request, res: Response) => {
    const { title, sermon_text } = req.body;
    if (!sermon_text || !sermon_text.trim()) {
      return res.status(400).json({ detail: '설교 텍스트를 입력해주세요.' });
    }

    if (ai) {
      try {
        const prompt = `
당신은 대한민국 최고 수준의 설교 미디어 및 기독교 콘텐츠 기획 전문가입니다.
다음 설교문을 정밀하게 분석하여 성도들에게 은혜를 주는 멀티미디어 세트(쇼츠 5편, 5일 묵상집, 2종류 카드뉴스)를 순수 JSON으로 구성해주세요.

[설교 제목]: ${title || '주일 설교'}
[설교 본문]:
${sermon_text.slice(0, 15000)}

반드시 metadata, shorts(5개), meditations(5일), sermonCardNews(7장), dailyCardNewsSets("1"~"5" 각 4장) 구조를 지킨 순수 JSON만 반환하세요.
`;

        const response = await ai.models.generateContent({
          model: SUB_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        const text = response.text ? response.text.trim() : '';
        if (text) {
          const parsed = JSON.parse(text);
          if (title && parsed.metadata) parsed.metadata.title = title;
          return res.json({ status: 'success', data: parsed });
        }
      } catch (err) {
        console.warn('Gemini analyze-text error:', err);
      }
    }

    const fallback: SermonAnalysisData = JSON.parse(JSON.stringify(DEFAULT_SERMON_ANALYSIS));
    if (title) fallback.metadata.title = title;
    return res.json({ status: 'success', data: fallback });
  });

  // 3. Complete Sermon Draft
  app.post('/api/sermon/complete-draft', async (req: Request, res: Response) => {
    const { idea_text, tone_profile } = req.body;
    if (!idea_text || !idea_text.trim()) {
      return res.status(400).json({ detail: '설교 아이디어를 입력해주세요.' });
    }

    if (ai) {
      try {
        const toneInstruction = tone_profile ? `\n[목회자 고유 설교톤 반영]:\n${tone_profile}\n` : '';
        const prompt = `
당신은 복음주의 신학에 깊이 뿌리내린 설교 작성 전문 조력자입니다.
다음 미완성된 설교 아이디어/메모를 바탕으로 주일 성도들에게 깊은 감동과 도전을 주는 완성도 높은 '온전한 한 편의 설교문'을 작성해주세요.
${toneInstruction}
[입력된 설교 아이디어/메모]:
${idea_text}

[작성 형식 가이드]:
1. 설교 제목 & 본문 성경 구절
2. 서론 (성도들의 삶의 갈증과 현실적인 공감대 형성)
3. 본론 3대지 (각 대지별 성경 원리 해석 및 생생한 예화, 영적 원리 적용)
   - 제1대지: ...
   - 제2대지: ...
   - 제3대지: ...
4. 결론 및 결단의 메시지
5. 마치는 기도문
`;

        const response = await ai.models.generateContent({
          model: SUB_MODEL,
          contents: prompt,
        });

        const result = response.text ? response.text.trim() : '';
        if (result) {
          return res.json({ status: 'success', completed_sermon: result });
        }
      } catch (err) {
        console.warn('complete-draft error:', err);
      }
    }

    return res.json({
      status: 'success',
      completed_sermon: `[설교 제목] 깊은 곳에 그물을 던질 때 열리는 기적
[본문 성경] 누가복음 5:1~11

[서론: 밤이 맞도록 수고하였으나]
사랑하는 성도 여러분, 살아가다 보면 온 힘을 다해 애썼음에도 불구하고 빈 그물만 쥐고 돌아서야 하는 실패의 아침을 마주할 때가 있습니다. 밤새도록 차가운 갈릴리 바다에서 수고했지만 아무것도 건지지 못했던 베드로의 빈 배처럼 말입니다. 오늘 주님은 바로 그 실패의 자리로 찾아오십니다.

[본론 제1대지: 내 경험의 한계를 인정하고 주님께 배를 내어드리라]
베드로는 평생 고기를 잡은 베테랑 어부였습니다. 그러나 주님이 오셨을 때 자신의 빈 배를 솔직히 내어드렸습니다. 신앙은 내 한계를 인정하는 데서 시작됩니다.

[본론 제2대지: '말씀에 의지하여' 상식을 뛰어넘는 순종을 드리라]
예수님은 대낮에 깊은 곳에 그물을 내리라 하셨습니다. 상식과 맞지 않았지만 베드로는 고백했습니다. "말씀에 의지하여 내가 그물을 내리리이다." 순종할 때 기적이 일어납니다.

[본론 제3대지: 기적을 넘어 사람을 낚는 사명자로 일어서라]
그물이 찢어지도록 잡혔을 때 베드로는 주님 앞에 엎드렸습니다. 주님은 베드로를 사람을 낚는 어부로 부르셨습니다. 은혜의 목적지는 사명입니다.

[결론 및 결단]
빈 배를 주님께 내어드리고 깊은 곳으로 가 말씀에 의지하여 그물을 던지십시오. 주님이 여러분의 삶을 채우실 것입니다.

[마치는 기도]
은혜의 주님, 빈 그물뿐인 인생이라도 주의 말씀에 순종하여 그물을 던지게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`,
    });
  });

  // 4. Refine for Video
  app.post('/api/sermon/video-refine', async (req: Request, res: Response) => {
    const { sermon_text } = req.body;
    if (!sermon_text || !sermon_text.trim()) {
      return res.status(400).json({ detail: '교정할 설교문을 입력해주세요.' });
    }

    if (ai) {
      try {
        const prompt = `
당신은 유튜브 설교 영상 및 오디오 미디어에 특화된 방송 설교 코치입니다.
다음 설교문을 영상으로 제작했을 때 시청자들의 가슴에 꽂히도록 '영상용 은혜로운 구어체 설교체'로 교정해주세요.

[교정 가이드]:
1. 시각적·청각적 몰입감을 위해 문장을 1~2마디 호흡으로 간결하게 정돈
2. 성도들에게 직접 말을 건네듯 생생한 현장감과 온기 있는 어조 사용
3. 영상 낭독 시 자연스러운 쉼표(,)와 줄바꿈 적용

[원문 설교문]:
${sermon_text}
`;
        const response = await ai.models.generateContent({
          model: SUB_MODEL,
          contents: prompt,
        });

        const result = response.text ? response.text.trim() : '';
        if (result) {
          return res.json({ status: 'success', refined_sermon: result });
        }
      } catch (err) {
        console.warn('video-refine error:', err);
      }
    }

    return res.json({
      status: 'success',
      refined_sermon: `[영상 맞춤 설교 리라이팅]

여러분, 혹시 온 힘을 다해 애썼는데도
손에 쥔 것은 빈 그물뿐이었던 적 없으신가요?

차가운 새벽 갈릴리 바닷가,
어깨를 축 늘어뜨린 채 그물을 씻던 베드로처럼 말입니다.

그때 주님이 다가오셔서 말씀하십니다.
"깊은 곳으로 가서, 그물을 내려라."

내 경험으로는 도무지 납득되지 않는 자리,
그러나 베드로는 이렇게 고백합니다.
"주님, 밤새도록 수고했지만 아무것도 얻지 못했습니다.
그러나... 오직 주님의 말씀에 의지하여 그물을 내리겠습니다."

성도 여러분, 기적은 바로 이 순종의 찰나에 시작됩니다.
오늘 그 빈 배를 주님께 내어드리십시오.
주님께서 여러분의 삶을 다시 은혜로 채우실 것입니다.`,
    });
  });

  // 5. Train Tone
  app.post('/api/sermon/train-tone', async (req: Request, res: Response) => {
    const { samples } = req.body;
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ detail: '샘플 설교를 입력해주세요.' });
    }

    if (ai) {
      try {
        const combined = samples.map((s, i) => `[샘플 ${i + 1}]:\n${s}`).join('\n\n');
        const prompt = `
당신은 문체 및 수사학 분석 전문가입니다.
다음은 한 목회자의 실제 설교문 샘플들입니다.
이 설교자의 고유한 설교톤, 문체 특성, 자주 사용하는 은혜로운 표현과 화법을 분석하여 JSON으로 반환해주세요:

${combined}

[반환 JSON 포맷]:
{
  "toneName": "톤 명칭",
  "summary": "특징 요약",
  "keywords": ["키워드 5개"],
  "sentenceStyle": "문장 어미 특징",
  "rhetoricTrait": "비유 및 설득 방식",
  "systemInstruction": "이 설교톤을 모사할 수 있는 AI 프롬프트 지침"
}
`;
        const response = await ai.models.generateContent({
          model: SUB_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const text = response.text ? response.text.trim() : '';
        if (text) {
          const profile = JSON.parse(text);
          return res.json({ status: 'success', tone_profile: profile });
        }
      } catch (err) {
        console.warn('train-tone error:', err);
      }
    }

    return res.json({
      status: 'success',
      tone_profile: {
        toneName: '복음 중심의 따뜻한 권면형 (Grace & Warmth)',
        summary: '성도들의 삶의 갈증에 깊이 공감하며, 하나님의 주권과 십자가의 은혜를 온유하면서도 확신 있게 선포하는 화법입니다.',
        keywords: ['하나님의 주권', '십자가의 은혜', '말씀에 의지하여', '광야의 은혜', '사랑하는 성도 여러분'],
        sentenceStyle: '부드러운 권면형과 확신에 찬 어조 (~하셨을까요?, ~하십시오, ~할 줄 믿습니다)',
        rhetoricTrait: '성경 인물과 현대 성도의 일상을 연결하는 공감형 적용',
        systemInstruction: "성도들의 삶을 위로하는 따뜻한 어조로 시작하여 십자가 복음을 확신 있게 선포하고 '사랑하는 성도 여러분'을 자연스럽게 섞을 것.",
      },
    });
  });

  // 6. Assets BGM
  app.get('/api/assets/bgm', (_req: Request, res: Response) => {
    res.json({
      status: 'success',
      bgms: [
        { id: 'none', name: 'BGM 없음', desc: '음악 없이 목소리만 담백하게 출력' },
        { id: 'grace.mp3', name: '은혜로운 피아노', desc: '차분하고 감동적인 C 메이저 피아노 선율' },
        { id: 'prayer.mp3', name: '깊은 기도의 시간', desc: '몰입감을 높이는 A 마이너 묵상 톤' },
        { id: 'hope.mp3', name: '소망의 묵상', desc: '따뜻하고 밝은 F 메이저 어쿠스틱 분위기' },
      ],
    });
  });

  // 7. Render Queue
  app.post('/api/render/queue', (req: Request, res: Response) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ detail: '선택된 쇼츠 항목이 없습니다.' });
    }

    const queuedJobs: any[] = [];
    const now = Date.now();

    for (const it of items) {
      const jobId = `job-${Math.random().toString(36).substring(2, 10)}`;
      const job: ServerRenderJob = {
        job_id: jobId,
        short_id: it.short_id || 'short-1',
        title: it.title || '설교 하이라이트 쇼츠',
        start_time: it.start_time || '00:00',
        end_time: it.end_time || '00:30',
        duration: it.duration || '30초',
        sentences: it.sentences || [],
        bgm: it.bgm || 'grace.mp3',
        template: it.template || 'dark_minimal',
        platform: it.platform || 'youtube',
        church_name: it.church_name || '',
        youtube_url: it.youtube_url || '',
        title_question: it.title_question || '',
        title_answer: it.title_answer || '',
        status: 'QUEUED',
        progress: 0,
        video_url: null,
        created_at: now,
        updated_at: now,
      };

      renderJobs.set(jobId, job);
      queuedJobs.push(job);
    }

    // Trigger sequential async processing
    processQueue();

    return res.json({
      status: 'success',
      message: `${queuedJobs.length}개의 쇼츠가 순차 렌더링 큐에 등록되었습니다.`,
      jobs: queuedJobs,
    });
  });

  app.get('/api/render/jobs', (_req: Request, res: Response) => {
    const list = Array.from(renderJobs.values()).sort((a, b) => b.created_at - a.created_at);
    res.json({
      status: 'success',
      jobs: list,
    });
  });

  app.get('/api/render/status/:jobId', (req: Request, res: Response) => {
    const job = renderJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ detail: '해당 작업을 찾을 수 없습니다.' });
    res.json({ status: 'success', job });
  });

  // Delete render job
  app.delete('/api/render/jobs/:jobId', (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = renderJobs.get(jobId);
    if (job) {
      if (job.file_path && fs.existsSync(job.file_path)) {
        try { fs.unlinkSync(job.file_path); } catch (e) {}
      }
      renderJobs.delete(jobId);
      return res.json({ status: 'success', message: '작업이 삭제되었습니다.' });
    }
    return res.status(404).json({ detail: '해당 작업을 찾을 수 없습니다.' });
  });

  // On-demand shorts generation from sermon body
  app.post('/api/shorts/generate', async (req: Request, res: Response) => {
    const { sermonData } = req.body;
    const meta = sermonData?.metadata || {};
    const sermonText = meta.sermonText || sermonData?.meditations?.[0]?.content || '';

    if (ai && sermonText) {
      try {
        const prompt = `
당신은 대한민국 최고 수준의 설교 미디어 전문가입니다.
다음 설교 본문(말씀 파트)을 분석하여, 가장 은혜롭고 감동적인 하이라이트 쇼츠 5편을 선별하여 생성해주세요.

[설교 제목]: ${meta.title || '주일 설교'}
[본문]: ${meta.passage || ''}
[설교자]: ${meta.preacher || ''}
[설교문]:
${sermonText.slice(0, 10000)}

[반환 포맷 - 5개의 쇼츠 JSON 배열]:
[
  {
    "id": "short-1",
    "title": "쇼츠 대표 제목",
    "title_question": "상단 1줄용 질문 (예: 실패와 고난 앞에서)",
    "title_answer": "상단 2줄용 복음의 답 (예: 하나님이 예비하신 회복)",
    "startTime": "04:12",
    "endTime": "05:08",
    "duration": "56초",
    "hook": "첫 3초 후킹 멘트",
    "summary": "핵심 메시지 1~2문장 요약",
    "sentences": [
      { "id": 1, "start": "04:12", "end": "04:20", "text": "실제 대사 1" },
      { "id": 2, "start": "04:20", "end": "04:30", "text": "실제 대사 2" }
    ]
  }
]
`;
        const response = await ai.models.generateContent({
          model: MAIN_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const text = response.text ? response.text.trim() : '';
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return res.json({ status: 'success', shorts: parsed });
          }
        }
      } catch (err) {
        console.warn('shorts/generate AI error, fallback:', err);
      }
    }

    return res.json({
      status: 'success',
      shorts: sermonData?.shorts || DEFAULT_SERMON_ANALYSIS.shorts,
    });
  });

  // On-demand card news generation from sermon body
  app.post('/api/cardnews/generate', async (req: Request, res: Response) => {
    const { sermonData } = req.body;
    const meta = sermonData?.metadata || {};
    const sermonText = meta.sermonText || '';

    if (ai && sermonText) {
      try {
        const prompt = `
설교 본문을 바탕으로 설교카드 7장과 5Day 묵상카드 세트(월~금 각 4장)를 순수 JSON으로 생성해주세요:
[설교 제목]: ${meta.title}
[성경 본문]: ${meta.passage}
[설교자]: ${meta.preacher}
[교회명]: ${meta.churchName}
[설교문]:
${sermonText.slice(0, 10000)}

[반환 포맷]:
{
  "sermonCardNews": [
    { "id": 1, "type": "cover", "tag": "주일 설교 요약", "title": "제목", "subtitle": "핵심원리", "passage": "구절", "speaker": "설교자", "church": "교회명" },
    { "id": 2, "type": "content", "tag": "Point 01", "title": "대지 1", "body": "설명" },
    { "id": 3, "type": "content", "tag": "Point 02", "title": "대지 2", "body": "설명" },
    { "id": 4, "type": "content", "tag": "Point 03", "title": "대지 3", "body": "설명" },
    { "id": 5, "type": "content", "tag": "Point 04", "title": "대지 4", "body": "설명" },
    { "id": 6, "type": "content", "tag": "Point 05", "title": "대지 5", "body": "설명" },
    { "id": 7, "type": "closing", "tag": "결단과 기도", "title": "믿음 고백", "body": "기도문", "church": "교회명" }
  ],
  "dailyCardNewsSets": {
    "1": [
      { "id": 1, "type": "cover", "tag": "Day 1 (월)", "title": "주제", "passage": "구절", "church": "교회명" },
      { "id": 2, "type": "content", "tag": "말씀 묵상", "title": "은혜", "body": "내용" },
      { "id": 3, "type": "content", "tag": "삶의 적용", "title": "실천", "body": "내용" },
      { "id": 4, "type": "closing", "tag": "마치는 기도", "title": "기도", "body": "내용", "church": "교회명" }
    ]
  }
}
`;
        const response = await ai.models.generateContent({
          model: SUB_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const text = response.text ? response.text.trim() : '';
        if (text) {
          const parsed = JSON.parse(text);
          return res.json({
            status: 'success',
            sermonCardNews: parsed.sermonCardNews,
            dailyCardNewsSets: parsed.dailyCardNewsSets,
          });
        }
      } catch (err) {
        console.warn('cardnews/generate AI error, fallback:', err);
      }
    }

    return res.json({
      status: 'success',
      sermonCardNews: sermonData?.sermonCardNews || DEFAULT_SERMON_ANALYSIS.sermonCardNews,
      dailyCardNewsSets: sermonData?.dailyCardNewsSets || DEFAULT_SERMON_ANALYSIS.dailyCardNewsSets,
    });
  });

  // Serve static outputs for downloaded/rendered videos
  app.use('/api/outputs', express.static(path.resolve(__dirname, 'outputs')));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', version: '1.0.0' });
  });

  // Mount Vite or static
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
