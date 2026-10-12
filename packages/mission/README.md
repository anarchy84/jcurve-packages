# @jcurve/mission

APIHUB **일주일 방문미션** 공용 — 웹뷰로 열고, 웹페이지가 부르는 `MocationNativeBridge` 를 받아 주고, 에러·점검 화면을 그린다.

```
서버 POST {앱}/apihub/entry  →  { ok, url }     (trackingId · uid 는 서버가 만든다)
앱 화면                       →  <MissionWebView url={url} />
웹페이지 → 앱                 →  openAppTarget(url, fallbackUrl) 만 이 OTA 판에서 동작
```

## 쓰는 법

```tsx
import { MissionWebView, MissionState, fetchEntry } from '@jcurve/mission';

const r = await fetchEntry(request);           // request = 앱 자기 요청 함수(토큰 · 재시도)
if (!r.ok) return <MissionState kind={r.reason === 'network' ? 'error' : r.reason === 'off' ? 'off' : 'notReady'} />;
return <MissionWebView url={r.url} onClose={close} onEvent={(n, p) => track(n, p)} theme={…} />;
```

- `react-native-webview`(≥13)가 앱에 있어야 한다(없으면 새 빌드가 필요하다 — OTA 로는 못 넣는다).
- `fetchEntry` 는 서버가 준 주소가 `https://service.mocation.co.kr` · `test.mocation.co.kr` 의 `/alwayz/entry.php` 일 때만 쓴다.
- 패키지는 아무 데도 보내지 않는다. 계측은 `onEvent`(mission_open · mission_loaded · mission_error · mission_target_open · mission_target_blocked …)로 앱이 보낸다.

## 브릿지(가이드 규격)

| 페이지가 부르는 것 | 이 판의 동작 |
|---|---|
| `openAppTarget({url, fallbackUrl?})` | 열기 — 못 열면 fallbackUrl. 막는 스킴 `javascript data file content about blob` 만 거절, 앱 스킴 · `intent://` · `market://` 는 변환해서 연다 |
| `showFloatingPopup` · `requestOverlayPermission` · `hasOverlayPermission` | **Android 오버레이는 네이티브 모듈이 필요**해서 이 판은 `hasOverlayPermission` 이 항상 false 이고 나머지는 `onFloatingPopup` · `onOverlayRequest` 콜백으로 알리기만 한다. 오버레이는 다음 빌드 묶음 |

iOS 는 가이드대로 `openAppTarget` 만. 페이지가 「`MocationNativeBridge` 가 있으면 Android」로 가를 수 있어 **그 기기 방식 하나만** 심는다.

## 아직 안 한 것

- 일주일 참여 배너(7칸 진행 점)·복구 팝업 — 진행 상황을 알려 주는 조회 API 가 APIHUB 문서에 없다(문의 중).
- 파일 선택(갤러리), 카메라 권한 문구(Info.plist) — 네이티브 설정이라 빌드 묶음.
