const BASE_URL = 'http://127.0.0.1:8000';

export async function analyzeSermonUrl(youtubeUrl, apiKey = '', forceRefresh = false) {
  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl, gemini_api_key: apiKey, force_refresh: forceRefresh }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `설교 분석 실패 (${response.status})`);
  }
  const json = await response.json();
  if (!json.data) throw new Error('분석 결과 데이터가 올바르지 않습니다.');
  return json.data;
}

export async function analyzeSermonText(title, sermonText, apiKey = '') {
  const response = await fetch(`${BASE_URL}/api/sermon/analyze-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, sermon_text: sermonText, gemini_api_key: apiKey }),
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `설교 텍스트 분석에 실패했습니다. (${response.status})`);
  }
  const json = await response.json();
  if (!json.data) throw new Error('설교 텍스트 분석 결과가 올바르지 않습니다.');
  return json.data;
}

export async function completeSermonDraft(ideaText, toneProfile = '', apiKey = '') {
  const response = await fetch(`${BASE_URL}/api/sermon/complete-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea_text: ideaText, tone_profile: toneProfile, gemini_api_key: apiKey }),
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `설교문 완성에 실패했습니다. (${response.status})`);
  }
  const json = await response.json();
  if (!json.completed_sermon) throw new Error('완성된 설교문 데이터를 받지 못했습니다.');
  return json.completed_sermon;
}

export async function refineSermonForVideo(sermonText, apiKey = '') {
  const response = await fetch(`${BASE_URL}/api/sermon/video-refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sermon_text: sermonText, gemini_api_key: apiKey }),
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `영상 맞춤 교정에 실패했습니다. (${response.status})`);
  }
  const json = await response.json();
  if (!json.refined_sermon) throw new Error('교정된 설교문 데이터를 받지 못했습니다.');
  return json.refined_sermon;
}

export async function trainSermonTone(samples, apiKey = '') {
  const response = await fetch(`${BASE_URL}/api/sermon/train-tone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ samples, gemini_api_key: apiKey }),
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `설교톤 학습에 실패했습니다. (${response.status})`);
  }
  const json = await response.json();
  if (!json.tone_profile) throw new Error('설교톤 프로필 데이터를 받지 못했습니다.');
  return json.tone_profile;
}

export async function queueRenderItems(items) {
  const response = await fetch(`${BASE_URL}/api/render/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `렌더링 큐 등록에 실패했습니다. (${response.status})`);
  }
  return await response.json();
}

export async function fetchRenderJobs() {
  const response = await fetch(`${BASE_URL}/api/render/jobs`);
  if (!response.ok) {
    throw new Error(`작업 목록 조회 실패 (${response.status})`);
  }
  return await response.json();
}

export async function fetchBgmList() {
  const response = await fetch(`${BASE_URL}/api/assets/bgm`);
  if (!response.ok) {
    throw new Error('BGM 목록 조회 실패');
  }
  const json = await response.json();
  return json.bgms;
}

export function getVideoDownloadUrl(filename) {
  return `${BASE_URL}/api/outputs/${filename}`;
}
