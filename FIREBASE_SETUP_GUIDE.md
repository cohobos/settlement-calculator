# Firebase 설정 가이드

## 1단계: Firebase Console에서 프로젝트 생성
1. https://console.firebase.google.com/ 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `settlement-calculator` (또는 원하는 이름)
4. Google Analytics: 사용 안 함 (선택사항)
5. 프로젝트 생성 완료

## 2단계: Firestore 데이터베이스 설정
1. 왼쪽 메뉴에서 "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. "테스트 모드에서 시작" 선택
4. 위치: asia-northeast3 (서울) 선택
5. "완료" 클릭

## 3단계: 웹 앱 추가
1. 프로젝트 개요 페이지에서 웹 아이콘 (</>) 클릭
2. 앱 닉네임: `settlement-calculator-web`
3. Firebase Hosting 설정: 체크
4. "앱 등록" 클릭
5. **설정 정보를 복사해서 보관** (다음 단계에서 사용)

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 4단계: 환경 변수 설정
위 설정 정보로 `.env.local` 파일을 생성:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

## 5단계: Firebase Hosting 설정
1. 왼쪽 메뉴에서 "Hosting" 클릭
2. "시작하기" 클릭
3. Firebase CLI 설치는 이미 완료됨
4. 터미널에서 다음 명령어 실행:

```bash
# 프로젝트와 연결
firebase use your-project-id

# 배포
firebase deploy --only hosting
```

## 6단계: Firestore 보안 규칙 설정
1. Firestore Database > 규칙 탭
2. 다음 규칙으로 교체:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /settlements/{document} {
      allow read, write: if true;
    }
  }
}
```

3. "게시" 클릭

이제 앱이 완전히 작동할 준비가 되었습니다!
