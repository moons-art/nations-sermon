import { DEFAULT_SERMON_ANALYSIS } from '../utils/mockData';

const BASE_URL = 'http://127.0.0.1:8000';

export async function analyzeSermonUrl(youtubeUrl, apiKey = '') {
  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl, gemini_api_key: apiKey }),
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
  try {
    const response = await fetch(`${BASE_URL}/api/sermon/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, sermon_text: sermonText, gemini_api_key: apiKey }),
    });
    if (!response.ok) throw new Error('텍스트 분석 실패');
    const json = await response.json();
    return json.data;
  } catch (err) {
    console.warn('텍스트 분석 Mock fallback:', err);
    await new Promise((r) => setTimeout(r, 600));
    const mock = JSON.parse(JSON.stringify(DEFAULT_SERMON_ANALYSIS));
    if (title) mock.metadata.title = title;
    return mock;
  }
}

export async function completeSermonDraft(ideaText, toneProfile = '', apiKey = '') {
  try {
    const response = await fetch(`${BASE_URL}/api/sermon/complete-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea_text: ideaText, tone_profile: toneProfile, gemini_api_key: apiKey }),
    });
    if (!response.ok) throw new Error('설교 완성 실패');
    const json = await response.json();
    return json.completed_sermon;
  } catch (err) {
    console.warn('설교 완성 Mock fallback:', err);
    return `[설교 제목] 깊은 곳에 그물을 던질 때 열리는 기적
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
은혜의 주님, 빈 그물뿐인 인생이라도 주의 말씀에 순종하여 그물을 던지게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.`;
  }
}

export async function refineSermonForVideo(sermonText, apiKey = '') {
  try {
    const response = await fetch(`${BASE_URL}/api/sermon/video-refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sermon_text: sermonText, gemini_api_key: apiKey }),
    });
    if (!response.ok) throw new Error('영상 교정 실패');
    const json = await response.json();
    return json.refined_sermon;
  } catch (err) {
    return `[영상 맞춤 설교 리라이팅]

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
주님께서 여러분의 삶을 다시 은혜로 채우실 것입니다.`;
  }
}

export async function trainSermonTone(samples, apiKey = '') {
  try {
    const response = await fetch(`${BASE_URL}/api/sermon/train-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples, gemini_api_key: apiKey }),
    });
    if (!response.ok) throw new Error('설교톤 학습 실패');
    const json = await response.json();
    return json.tone_profile;
  } catch (err) {
    return {
      toneName: "복음 중심의 따뜻한 권면형 (Grace & Warmth)",
      summary: "성도들의 삶의 갈증에 깊이 공감하며, 하나님의 주권과 십자가의 은혜를 온유하면서도 확신 있게 선포하는 화법입니다.",
      keywords: ["하나님의 주권", "십자가의 은혜", "말씀에 의지하여", "광야의 은혜", "사랑하는 성도 여러분"],
      sentenceStyle: "부드러운 권면형과 확신에 찬 어조 (~하셨을까요?, ~하십시오, ~할 줄 믿습니다)",
      rhetoricTrait: "성경 인물과 현대 성도의 일상을 연결하는 공감형 적용",
      systemInstruction: "성도들의 삶을 위로하는 따뜻한 어조로 시작하여 십자가 복음을 확신 있게 선포하고 '사랑하는 성도 여러분'을 자연스럽게 섞을 것."
    };
  }
}

export async function queueRenderItems(items) {
  try {
    const response = await fetch(`${BASE_URL}/api/render/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) throw new Error('큐 등록 실패');
    return await response.json();
  } catch (err) {
    return {
      status: 'success',
      jobs: items.map((it, idx) => ({
        job_id: `mock-job-${Date.now()}-${idx}`,
        short_id: it.short_id,
        title: it.title,
        status: 'QUEUED',
      })),
    };
  }
}

export async function fetchRenderJobs() {
  try {
    const response = await fetch(`${BASE_URL}/api/render/jobs`);
    if (!response.ok) throw new Error('작업 목록 조회 실패');
    return await response.json();
  } catch (err) {
    return { status: 'error', jobs: [] };
  }
}

export async function fetchBgmList() {
  try {
    const response = await fetch(`${BASE_URL}/api/assets/bgm`);
    if (!response.ok) throw new Error('BGM 목록 조회 실패');
    const json = await response.json();
    return json.bgms;
  } catch (err) {
    return [
      { id: "none", name: "BGM 없음", desc: "음악 없이 목소리만 담백하게 출력" },
      { id: "grace.mp3", name: "은혜로운 피아노", desc: "차분하고 감동적인 피아노 선율" },
      { id: "prayer.mp3", name: "깊은 기도의 시간", desc: "몰입감을 높이는 묵상 패드" },
      { id: "hope.mp3", name: "소망의 묵상", desc: "따뜻하고 밝은 어쿠스틱 분위기" },
    ];
  }
}

export function getVideoDownloadUrl(filename) {
  return `${BASE_URL}/api/outputs/${filename}`;
}
