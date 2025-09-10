# 공과금/월세 정산 계산기 (PWA)

2인이 공과금과 월세를 반반 정산할 때 사용하는 계산기 앱입니다.

## 주요 기능

- 내 명의 항목과 동생 명의 항목 관리
- 항목 추가/삭제/수정
- 고정비/변동비 구분
- 실시간 정산 금액 계산
- PWA 지원 (모바일 홈 화면에 설치 가능)
- Firebase Firestore를 통한 클라우드 데이터 동기화

## 설치 및 실행

1. 의존성 설치
```bash
npm install
```

2. Firebase 설정
   - Firebase Console에서 새 프로젝트 생성
   - Firestore 데이터베이스 활성화
   - 웹 앱 추가하여 설정 정보 획득
   - `firebase.env.example` 파일을 참고하여 `.env.local` 파일 생성
   - Firebase 설정 정보를 `.env.local`에 입력

```bash
# .env.local 파일 생성 예시
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. 개발 서버 실행
```bash
npm run dev
```

4. 빌드
```bash
npm run build
```

## 기술 스택

- React 18
- Vite
- Firebase Firestore
- PWA (vite-plugin-pwa)

## Firebase 설정 방법

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 새 프로젝트 생성
3. Firestore Database 생성 (테스트 모드로 시작)
4. 프로젝트 설정 > 일반 > 웹 앱 추가
5. 설정 정보를 복사하여 `.env.local` 파일에 입력

## PWA 기능

- 오프라인 사용 가능
- 모바일 홈 화면에 앱 설치 가능
- 자동 업데이트 지원