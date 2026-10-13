# @jcurve/ads

공용 **광고** 패키지 — AdMob 보상형 · 일반 전면 · 적응형 배너 · iOS 추적 허용(ATT) · 광고 식별자 · 틱톡 광고 전환.
「광고는 전부 이 패키지」(2026-10-02 대표님). 앱마다 다른 것은 **설정값**(광고 단위 ID · 어드민 설정 그룹 이름)뿐이다.
왜 이렇게 생겼는지(꼬꼬농장 실기기에서 밟은 것들)는 `src/index.ts` 머리말에 있다.

## 설치

이 브랜치의 일반 전면/배너 API는 **기여 후보 계약**이며 공식 출시 API가 아니다. 후보 버전은
`1.10.0-arcana.20261013`이다. 현재 앱의 공식 1.9.1 설치·스토어 제출물을 이 기여 작업에서 교체하지 않는다.
아래 설치 주소는 기존 공식판이다. 후보는 저장소의 `packages/ads`를 빌드/pack하여 검토하며 공식 배포는 별도 절차다.

```jsonc
// package.json
"@jcurve/ads": "https://github.com/jxamen/jcurve-packages/releases/download/ads-v1.9.1/jcurve-ads-1.9.1.tgz"
```

```jsonc
// app.json — 1.7 부터. 안드로이드 틱톡 SDK 의 JitPack 저장소를 넣는다
"plugins": ["@jcurve/ads"]
```

앱에 있어야 하는 것: `react-native-google-mobile-ads` · `expo-tracking-transparency` · `expo-updates` · `expo-constants`(Expo 기본).
1.7 은 네이티브 모듈(`JcurveTikTok`)이 들어 있어 **새 빌드**가 필요하다. 모듈이 없는 옛 빌드에 OTA 로 내려가도 틱톡만 조용히 꺼지고 나머지는 그대로 돈다.


## 미디에이션 — 광고 회사 5곳 기본(1.9)

`@jcurve/ads` 1.9 부터 AdMob 미디에이션 어댑터 **앱러빈 · 유니티 · 민티그럴 · 팽글 · 메타(입찰)** 가 같이 들어간다(대표님 10-09).
1.9.1 부터 이 패키지 안(`mediation.plugin.js` · `src/mediation`)에 있다 — 따로 쓰던 `@jcurve/mediation` 은 없앴다(대표님 10-09 「mediation은 없애」). 앱의 react-native-google-mobile-ads 가 고정한 AdMob SDK 판을 올리지 않는 어댑터를 골라
`build.gradle`(민티그럴 · 팽글 maven 저장소 포함) · `Podfile` · iOS `SKAdNetworkItems`(156개)에 넣는다. 런타임 코드는 없다(처음 광고 직전 켜기 · 미리 안 받기 그대로).

1. `package.json` 의 `@jcurve/ads` 를 1.9 릴리스 주소로 올린다. `app.json` 의 `plugins` 에 `"@jcurve/ads"` 가 있어야 한다(1.7 부터 있음).
2. `npx expo prebuild --clean` → **새 스토어 빌드**(네이티브가 바뀐다 — OTA 로는 안 된다). 판 · runtimeVersion 을 올린다.
3. 각 회사 키 · 앱 ID 는 **앱에 넣지 않는다** — AdMob 웹 「미디에이션 그룹」의 매핑에만 넣으면 새 빌드부터 쓰인다.

- 틱톡 비즈니스 SDK(이 패키지의 JcurveTikTok 또는 앱 `modules/*`)가 있으면 안드에서 팽글이 따로 들고 오는 `tiktok-business-android-sdk-comp` 만 빼고 앱의 틱톡 한 벌을 같이 쓴다(중복 클래스 방지).
- 끄기 `["@jcurve/ads", { "mediation": false }]` · 일부만 `{ "mediation": { "networks": ["applovin", "meta"] } }` · 팽글만 빼기 `{ "mediation": { "pangle": false } }`.
- 예전에 `@jcurve/mediation` 플러그인을 적어 둔 앱은 그 줄과 패키지를 지운다(남겨도 표시 사이만 다시 써서 같지만, 패키지는 더 고치지 않는다).

## 쓰는 법

```ts
import { createRewarded, createTikTok, isTestAds } from '@jcurve/ads';

export const ads = createRewarded({
  units: { rewarded: { android: 'ca-app-pub-…', ios: 'ca-app-pub-…' } },
  test: isTestAds(process.env.EXPO_PUBLIC_ADMOB_TEST),
});

// 틱톡 — 그룹 이름만 앱마다 다르다
export const tiktok = createTikTok({
  group: 'carrot',
  test: isTestAds(process.env.EXPO_PUBLIC_ADMOB_TEST),
  waitForTracking: () => ads.requestTracking(),   // iOS: ATT 답을 기다린 뒤 켠다(창은 한 번)
  // events: (name, p) => (name === 'harvest_done' && p?.daily ? { custom: 'WeeklyMission' } : null),   // 앱만의 이벤트(선택)
});
ads.setTikTok(tiktok);   // 보상형 광고가 열리면 InAppADImpr 를 패키지가 보낸다

// 앱 루트 — 켤 때 한 번(로그인 전 설치를 잡는다). 인증 없는 공개 설정 조회를 넘긴다
useEffect(() => {
  void ads.requestTracking().then(() => askNotifyOnce());
  tiktok.boot(() => fetchCustomConfig().then((c) => c?.values));
}, []);

tiktok.track('signup_done');   // 가입 → Registration · 'login_done' → Login
tiktok.identify(memberId);     // 로그인 · 세션 복원(회원 번호만)
tiktok.logout();
```

## 끝난 결과 하나로 받기 — `play()`(1.8)

앱이 닫힘 뒤 몇 백 ms 에 스스로 「끝까지 보지 않았어요」로 끝내면, 닫힘 **뒤에** 오는 보상(최대 1.2초)을 버린다(2026-10-02 여러 앱의
0.7초 판정). `play()` 는 엔진이 그 대기까지 끝낸 뒤 **결과 하나**만 준다 — 앱은 타이머로 판정하지 않는다.

```ts
const r = await ads.play({ userId, customData, onOpened: () => hideWaiting() });
if (r.busy) return;                       // 이미 다른 광고가 도는 중
if (r.earned) celebrate();                // 보상은 서버 SSV 가 확정, 이건 연출
else toast(r.message ?? '광고를 보지 못했어요');   // r.noAd 면 「잠시 후 다시」, 아니면 중간에 닫음
```

`show()` 와 콜백은 그대로 있다(옛 앱 그대로 돈다).

## 틱톡 값표

| 어디 | 칸 | 값 | 비면 |
|---|---|---|---|
| 어드민 앱 설정(custom) | `{그룹}.tiktok_sdk_access` | 이벤트 관리자 App Secret(공용) | 틱톡 꺼짐 |
| 어드민 앱 설정(custom) | `{그룹}.tiktok_android_sdk_access` | 안드 전용 App Secret(다를 때만) | 공용 칸을 쓴다 |
| 어드민 앱 설정(custom) | `{그룹}.tiktok_app_id_ios` | 이벤트 관리자 iOS 앱 ID(**글자**, 19자리) | iOS 꺼짐 |
| 어드민 앱 설정(custom) | `{그룹}.tiktok_app_id_android` | 이벤트 관리자 안드 앱 ID(**글자**) | 안드 꺼짐 |
| app.json `extra` | `appleAppId` | 앱스토어 앱 번호(공개) | iOS 꺼짐 (`createTikTok({ appleAppId })` 로도) |
| app.json `extra` | `androidPackage` | 안드로이드 패키지 이름 | 안드 꺼짐 (`createTikTok({ androidPackage })` 로도) |
| 코드 | `createTikTok({ group })` | 어드민 설정 그룹 이름(예: `carrot`) | — |

- 칸 이름이 `_secret`·`_token` 으로 끝나면 서버가 앱에 안 내려준다(9/22) — 그래서 `_access` · `_id_*` 다. 열쇠는 번들에 굽지 않는다(재발급을 새 빌드 없이).
- 틱톡 앱 ID 는 숫자로 넣으면 자릿수가 깨진다(2^53 초과) — **글자로** 넣는다. 숫자로 오면 무시한다.
- 보내는 이벤트: 설치 · 실행(SDK 자동) · 보상형 광고 열람 `InAppADImpr`(자동) · 가입 `Registration` · 로그인 `Login` · `identify`(회원 번호만) · `logout` · 앱이 `events` 로 더한 것.
- 인앱 결제 자동 추적은 끈다(안드 `disableAutoIapTrack`, Play 결제 라이브러리를 싣지 않아 BILLING 권한이 생기지 않는다).
- 시험 빌드(`test: true`)는 SDK 디버그 모드 — 콘솔에 「[tiktok] on · test event code …」가 찍힌다(이벤트 관리자 › 테스트 이벤트).
- **꺼져 있으면(어드민 값이 비면) Debug 에서도 로그가 없다** — `start()` 가 조용히 끝난다. 켜졌는지는 `tiktok.isOn()` 이나 「[tiktok] on」 줄로 본다.
  모듈이 실렸는지는 Xcode 로그의 `Registering module 'JcurveTikTok'`(iOS 확인 2026-10-02 앱빌드, 총무님 ea71a35 · Xcode 27).

## 앱 안 로컬 틱톡 모듈에서 옮길 때

앱에 따로 넣은 `modules/tiktok-business/` · `src/tiktok*.ts` 는 **지운다**(패키지 모듈은 이름이 `JcurveTikTok` 이라 겹치지는 않지만,
둘 다 있으면 같은 이벤트가 두 번 나간다). `expo-build-properties` 의 JitPack 줄은 남겨도 된다(플러그인이 겹치면 건너뛴다).

## 기여 후보: 일반 전면 광고

`createInterstitial(options, env?)`는 보상형과 다른 SDK `InterstitialAd`를 사용한다. 보상·SSV 입력과
`earned` 결과가 없다. 서버가 정한 광고 위치·빈도와 광고 단위는 앱에서 넘긴다.

```ts
import { createInterstitial, type AdUnits } from '@jcurve/ads';

export function createLevelTransitionAds(units: AdUnits, test: boolean) {
  return createInterstitial({ units: { interstitial: units }, test });
}

export async function playLevelTransition(ads: ReturnType<typeof createLevelTransitionAds>) {
  const result = await ads.play();
  if (result.busy || result.cancelled) return false;
  return result.opened;
}
```

- 입력: `units.interstitial: AdUnits`, `test: boolean`, 선택 `testDevices: string[]`,
  `requestNonPersonalizedAdsOnly: boolean`.
- 반환: `available`, `show({ onOpened?, onClosed?, onFail(message, noAd), onAbort? }): Promise<boolean>`,
  `play({ onOpened? } = {}): Promise<InterstitialResult>`, `cancel()`, `warm()`(무동작), `warmReady()`(늘 false).
- `InterstitialResult`: `opened`, `busy`, `noAd`, `cancelled`, 선택 `message`.
  `opened`는 SDK OPENED를 받은 사실이다. 닫힌 정상 광고의 결과는
  `{ opened: true, busy: false, noAd: false, cancelled: false }`.
- `show()`의 boolean은 요청을 시작했는지를 알려 준다. 실패/취소/완료의 최종 판정은 콜백 또는 `play()` 결과 하나로 받는다.
- 미지원 빌드·단위 없음·재고 없음·표시 요청 전 로드/준비 실패는 `noAd: true`, 중복 시도는 `busy: true`.
  `cancel()`은 대기 중 바로 끝난다. 이미 열린 네이티브 광고는 JS로 닫을 수 없으므로 취소 결과를 반환해도
  SDK CLOSED 또는 전경 복귀까지 공통 잠금을 유지한다. `show()`를 네이티브에 호출한 뒤 OPENED가 아직 오지 않은
  표시 미확정 구간도 잠금을 유지하고 `noAd: false`로 반환한다. `opened: false, noAd: false`는 이 구간을 포함한다.
  네이티브 show 동기 예외/Promise 거절 또는 SDK ERROR가 OPENED 전에 도착하면 표시 실패가 확정돼 잠금을 정리한다.
  OPENED 후 ERROR는 이미 열린 화면의 종료 근거로 쓰지 않고 CLOSED/전경 복귀를 기다린다.

## 기여 후보: anchored adaptive banner

앱은 `AnchoredAdaptiveBanner`만 사용하며 `react-native-google-mobile-ads`를 직접 import하지 않는다.
Google `BannerAd`의 `ANCHORED_ADAPTIVE_BANNER`와 실제 `onAdLoaded({ width, height })`를 사용한다.
단위는 원격 설정에서 확정된 값으로 전달한다. 이 계약은 서버 설정 키나 보상 API를 만들지 않는다.

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { AnchoredAdaptiveBanner, type AdUnits } from '@jcurve/ads';

export function LevelBanner({ units, test, enabled }: { units: AdUnits; test: boolean; enabled: boolean }) {
  const [height, setHeight] = useState(0);
  return (
    <View style={{ minHeight: height }}>
      <AnchoredAdaptiveBanner units={units} test={test} enabled={enabled} onHeightChange={setHeight} />
    </View>
  );
}
```

- 필수 props: `units: AdUnits`, `test`, `onHeightChange(height)`.
  선택: `testDevices`, `requestNonPersonalizedAdsOnly`, `enabled`(기본 true), `width`(dp, 기본 RN 창 너비),
  `onLoaded({ width, height })`, `onFail(message, noAd)`.
- 마운트/대기/실패/비활성/백그라운드/언마운트는 높이 0이다. 로드 성공 전에는 슬롯을 펼치지 않는다.
  로드 뒤 실제 양수 높이만 전달한다. `onSizeChange`만으로 로드 성공을 꾸며 내지 않는다.
- 백그라운드에서는 네이티브 배너 뷰를 제거한다. 전경으로 돌아오면 현재 보이는 슬롯에서 새 요청을 시작한다.
  이전 인스턴스의 늦은 콜백은 무시한다. no-fill/로드 시간 초과는 즉시 접고 같은 전경 세션에서 자동 반복 요청하지 않는다.
- 너비·활성 상태·광고 설정이 바뀌면 기존 뷰를 내리고 다시 준비한다. 하단 safe-area 위치·게임 버튼과의 간격은 앱 레이아웃이 정한다.

## 모든 형식의 공통 정책과 기존 호환성

1. 네이티브 빌드이고 AppState가 `active`여야 요청/표시한다. SDK 없음·Expo Go·웹에서는 전면 `available: false`, 배너 높이 0이다.
2. 첫 요청 시 `AdsConsent.gatherConsent()` → `getConsentInfo().canRequestAds === true` → 테스트 기기 등록 →
   `mobileAds().initialize()` 순서다. UMP 갱신 오류는 실제 이전 동의가 아직 유효한 경우에만 허용한다.
   동의 모듈 없음·판정값 없음/false·시간 초과에서는 광고를 요청하지 않는다. 멈춘 UMP 폼 중 두 번째 폼을 열지 않는다.
3. 비개인화 광고가 기본이다. `requestNonPersonalizedAdsOnly: false`도 UMP 저장/프로파일/개인화 선택을 모두 확인한 경우에만
   개인화하며 iOS ATT 미허용은 비개인화한다. ATT를 거부해도 비개인화 광고를 사용할 수 있다.
4. `createRewarded()`의 메서드·옵션·`PlayResult`·SSV 전달·틱톡 계측·1.2초 늦은 보상 처리는 유지한다.
   보상형의 자동 ATT는 UMP → ATT → SDK 초기화 → 요청 순서다. 앱 루트에서 `requestTracking()`을 먼저 await하고 알림 권한을 요청하는 기존 계약도 유지한다.
5. 보상형/보상형 전면/일반 전면은 **모든 factory 인스턴스 사이 공통 잠금 하나**를 쓴다.
   표시 요청을 시작한 광고를 시간만으로 강제 잠금 해제하던 경로는 제거했다. 15초 시간 초과는 대기 결과를 끝내지만
   네이티브 표시를 시작했다면 잠금을 유지한다. 닫힘/전경 복귀 또는 OPENED 전 show 동기 예외/Promise 거절/SDK ERROR가 잠금 종료 근거다.
6. 광고 인스턴스는 요청마다 새로 만들고 리스너·타이머를 정리한다. 중복 LOADED/OPENED/EARNED/CLOSED와 정리 뒤 늦은 콜백을 차단한다.
   생성·warm·닫힘 직후에 다음 광고를 미리 요청하지 않는다. 개발 모드 또는 `test: true`는 Google TestIds를 사용한다.
7. 광고 완료는 서버 SSV 지급 증명이 아니다. 이 패키지는 앱 지갑/아이템을 지급하지 않는다.
8. 공식 master `fc417a2da43ce2d492ab4bb218e4ad45b87636b5`는 ads 1.8.0이다. 공식
   `ads-v1.9.1` 태그 `4a18ef122640bc52ef79a40dfe4a30ba1749c231`의 실제 release tgz와 설치본 src가 같음을 확인했다.
   추가된 미디에이션 source/dist/plugin과 package files 설정의 기능을 보존했다. 생성 JS 공백 제거를 위한 주석 위치 정리만 포함한다.

네이티브 설정의 `react-native-google-mobile-ads` 플러그인에 `delayAppMeasurementInit: true`를 지정해야
앱 시작 시 동의 전 측정 초기화도 지연된다. 이 브랜치가 앱 설정이나 네이티브 제출물을 자동 변경하지 않는다.
UMP Privacy & messaging 콘솔 구성, 필요한 개인정보 옵션 폼 진입점, 실제 ATT 표시, 배너 크기/회전/전경 복귀,
테스트 기기 로그, 실광고 정책, SSV 지급은 출시 전 별도 앱·기기 검증 대상이다.

API 검토 근거: 설치 SDK `react-native-google-mobile-ads` 16.5.0의 `BannerAdProps`/`AdsConsentInterface`,
[Invertase UMP 문서](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent),
[Google iOS UMP 가이드](https://developers.google.com/admob/ios/privacy),
[Invertase anchored banner 가이드](https://docs.page/invertase/react-native-google-mobile-ads/ads/banner).
가짜 SDK 테스트는 생명주기/계약 근거이며 실기기 광고·SSV 검증이나 최종 합격 판정이 아니다.

## 생산자 점검 (2026-10-13)

패키지 범위 TypeScript 빌드, 기존 rewarded/틱톡/모드/미디에이션 및 새 형식 테스트 111개,
pack 포함 파일, SDK 없는 Node의 public entry import/`available: false`/`noAd` 반환을 확인했다.
네이티브 SDK를 연결하거나 실광고를 요청하지 않았다. 독립 검증과 방어 코드 무력화 실험은 별도 검증 세션의 책임이다.

```sh
npm run build --workspace @jcurve/ads
npm run test --workspace @jcurve/ads
npm pack --workspace @jcurve/ads --dry-run
git diff --check
```

전체 workspace 설치 없이 루트 devDependencies(TypeScript 5.9.2, Vitest 3.2.4, @types/node 22.10.2)만 있는
별도 도구 디렉터리로 실행할 수 있다. Expo prebuild, CocoaPods/Gradle 네이티브 빌드, 실제 React Native 화면 표시,
스토어 제출, 공식 패키지 릴리스, 기기 UMP/ATT·배너·SSV는 이 점검으로 증명하지 않는다.

첫 독립 검증에서 표시 직전 취소/백그라운드/시간 초과 잠금, OPENED 없는 CLOSED 중복 종료,
보상형 iOS ATT 순서의 8개 실패가 재현돼 해당 회귀 테스트와 수정이 포함됐다.
수정본의 독립 재검증 결과는 별도로 판정한다.

표시 실패 복구의 SDK 근거: 설치된 RNGMA 16.5.0의
`ios/RNGoogleMobileAds/RNGoogleMobileAdsFullScreenContentDelegate.mm`에서 41–43행
`didFailToPresentFullScreenContentWithError`가 ERROR를 전달하고, 46–47행 `adDidDismissFullScreenContent`가 CLOSED를 따로 전달한다.
따라서 OPENED 전 ERROR에서 CLOSED를 무조건 기다리면 다음 광고가 계속 busy가 될 수 있다.
명확한 SDK 실패는 잠금을 풀되 취소/백그라운드/시간 초과만으로 표시 실패를 추정하지 않는다.
이 경로는 `formats.test.ts`의 SDK 표시 실패 후 CLOSED 없이 재시도, 취소 뒤 ERROR의 중복 종료 방지 테스트가 지킨다.
