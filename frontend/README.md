# 신재훈 | Portfolio (Frontend)

Santioni Spirits 스타일에서 영감을 받은 시네마틱 개인 포트폴리오 (정적 사이트).

> 이 폴더는 [`../`](../README.md) 모노레포의 프론트엔드입니다. 백엔드(연락처 폼 저장용
> API)는 [`../backend`](../backend/README.md)에 별도로 있으며, 백엔드가 없어도 이
> 프론트엔드만으로 완전히 동작합니다.

## 구성

| 파일 | 설명 |
| --- | --- |
| `index.html` | 페이지 마크업 |
| `style.css` | 스타일 |
| `script.js` | 인터랙션 (패스코드 게이트, 타이핑, 모달 등) |
| `profile.jpg` | 프로필 이미지 (웹용 1400px, ~220KB) |
| `vercel.json` | 배포 설정 (보안 헤더, cleanUrls) |

빌드 과정이 없는 순수 정적 사이트입니다.

## 로컬 미리보기

```bash
# 방법 1: 파일을 브라우저로 직접 열기
start index.html

# 방법 2: 간단한 로컬 서버 (Python)
python -m http.server 8000
# http://localhost:8000
```

## 배포 (Vercel)

빌드 명령 없이 이 폴더(`frontend/`)를 그대로 서빙합니다.

> ⚠️ 저장소가 프론트엔드/백엔드로 나뉘면서 사이트 파일이 저장소 루트가 아닌
> `frontend/` 안에 있습니다. Vercel 프로젝트 설정 → **Root Directory**를
> `frontend`로 지정해야 기존과 동일하게 배포됩니다.

### GitHub 연동 방식 (권장 — push 하면 자동 재배포)

1. GitHub에서 새 저장소 생성 (예: `portfolio`).
2. 로컬 저장소에 원격 추가 후 push:
   ```bash
   git remote add origin https://github.com/<사용자명>/portfolio.git
   git push -u origin main
   ```
3. https://vercel.com/new 접속 → GitHub 계정 연결 → `portfolio` 저장소 Import.
4. **Root Directory**를 `frontend`로 지정, Framework Preset = **Other**, Build Command 비움, Output Directory 비움 → **Deploy**.
5. 배포 완료 후 `https://portfolio-<해시>.vercel.app` 주소 발급. 이후 `main`에 push할 때마다 자동 재배포.

### Vercel CLI 방식 (Node.js 필요)

```bash
npm i -g vercel
vercel        # 미리보기 배포
vercel --prod # 프로덕션 배포
```

### 커스텀 도메인

Vercel 프로젝트 → Settings → Domains 에서 도메인 추가 후 안내되는 DNS 레코드를 등록.

## 관리자 페이지 (`admin.html`)

파일을 직접 고치지 않고도 프로젝트를 추가/수정할 수 있는 페이지입니다.
비밀번호 로그인이 필요하며, 로그인/데이터 저장은 전부 `../backend`가 처리합니다
(비밀번호는 백엔드에만 해시로 저장되고 프론트엔드로 노출되지 않습니다).
자세한 사용법과 초기 설정은 [`../backend/README.md`](../backend/README.md)를 참고하세요.

여기서 "공개"로 저장한 프로젝트는 `index.html`의 프로젝트 목록에 자동으로 추가되고,
"초안"으로 저장한 프로젝트는 관리자 페이지에서만 보입니다. 백엔드가 꺼져 있으면
admin.html은 로그인 화면만 뜨고, index.html은 기존 6개 카드만 그대로 보여줍니다.

## 참고

- 패스코드 게이트(`1234`)는 클라이언트 측 연출용이며 실제 접근 제어가 아닙니다.
- 폰트/아이콘은 Google Fonts, jsDelivr, cdnjs CDN에서 로드합니다.
- 연락처 폼과 프로젝트 목록은 `script.js`/`admin.js` 상단의 `API_BASE_URL`(`../backend`)로
  전송을 시도하고, 백엔드가 꺼져 있으면 자동으로 기존 방식(화면 시뮬레이션/기존 카드만 표시)으로 대체됩니다.
