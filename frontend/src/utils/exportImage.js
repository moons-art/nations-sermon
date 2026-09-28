import html2canvas from 'html2canvas';

/**
 * 특정 DOM 요소를 고해상도 PNG 이미지로 캡처하여 다운로드합니다.
 */
export async function downloadElementAsImage(element, filename = 'cardnews.png') {
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 고해상도 2배율 렌더링
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('이미지 다운로드 실패:', error);
    alert('이미지 생성 중 오류가 발생했습니다.');
  }
}

/**
 * 여러 슬라이드를 순차적으로 캡처하여 다운로드합니다.
 */
export async function batchDownloadSlides(slideElements, baseName = 'sermon-card') {
  for (let i = 0; i < slideElements.length; i++) {
    const el = slideElements[i];
    if (el) {
      await downloadElementAsImage(el, `${baseName}-slide-${i + 1}.png`);
      // 브라우저 팝업 차단 방지용 딜레이
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
}
