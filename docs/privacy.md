# 프라이버시 설계

[← README](../README.md)

"서버로 안 보낸다"를 말로만 하지 않고 브라우저가 강제하게 했습니다.

| 장치 | 내용 |
|---|---|
| 온디바이스 추론 | MediaPipe Face Landmarker가 wasm + WebGL로 브라우저에서 돌아갑니다. 프레임은 `<canvas>` 밖으로 나가지 않습니다. |
| 모델·wasm 자체 호스팅 | `public/models/face_landmarker.task`(커밋)와 `public/wasm/<tasks-vision 버전>/`(postinstall·build 때 node_modules에서 복사, 버전 경로라 immutable 캐시가 예전 파일을 붙잡지 않음). CDN을 쓰지 않습니다. |
| CSP `connect-src 'self'` | `next.config.ts`에서 모든 응답에 붙습니다. 외부 도메인으로의 fetch/XHR/WebSocket이 브라우저 레벨에서 차단됩니다. 실제로 tasks-vision이 `odml.pa.googleapis.com/v1/log`로 보내려는 텔레메트리가 이 정책에 막히는 걸 E2E 콘솔에서 확인할 수 있습니다. |
| 폰트 자체 호스팅 | 제목은 고운바탕(`next/font/google`이 빌드 때 받아 자체 호스팅), 본문은 Pretendard(npm `pretendard`의 글자 범위별 분할 파일). 둘 다 SIL OFL 1.1이라 무료로 상업 이용할 수 있고, 화면에 쓰인 글자 범위만 받습니다. |
| 공유 URL | `/r/{tone}` 뿐입니다 (예: `/r/spring-light`). 측정값, 이미지, 식별자 어떤 것도 싣지 않습니다. |
| 공유 카드 | `next/og`로 서버에서 그리는 OG 이미지는 톤 이름과 팔레트만 담습니다. 얼굴이 들어갈 입력 자체가 없습니다. |
| 방문 통계 | Umami(쿠키 없음)를 `/stats`로 프록시해서 씁니다. 브라우저는 우리 도메인만 보고, 이벤트에는 단계 이름과 톤 이름만 싣습니다. |
| 진단 피드백·AI 상담 | 서버로 가는 건 측정 숫자(색상각·ITA·채도)와 이용자가 고른 진단·입력한 질문뿐입니다. 요청 본문은 서버에서 필요한 필드만 골라 쓰고(사진 필드가 있어도 버림), 질문 내용은 DB에 남기지 않습니다. |
