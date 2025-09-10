# Firebase 설정 가이드

## 🚀 빠른 설정 (터미널 사용)

### 전제조건
- Firebase CLI 설치: `npm install -g firebase-tools`
- Firebase 로그인: `firebase login`

### 1단계: Firebase 프로젝트 생성 및 초기화
```bash
# 새 Firebase 프로젝트 생성 (웹 콘솔에서 미리 생성 필요)
firebase projects:list  # 프로젝트 목록 확인
firebase use your-project-id  # 프로젝트 선택

# 현재 디렉터리를 Firebase 프로젝트로 초기화
firebase init
# ✅ Firestore 선택
# ✅ Hosting 선택
# 기본 설정으로 진행
```

### 2단계: Firestore 데이터베이스 생성 (터미널)
```bash
# Firestore 데이터베이스 생성 (서울 리전)
firebase firestore:databases:create "(default)" --location=asia-northeast3

# 보안 규칙 배포
firebase deploy --only firestore:rules

# 데이터베이스 목록 확인
firebase firestore:databases:list
```

### 3단계: 환경 변수 자동 설정
```bash
# Firebase 프로젝트 설정 정보 확인
firebase projects:list
firebase apps:list

# .env.local 파일 생성 (수동으로 값 입력 필요)
echo "VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id" > .env.local
```

### 4단계: 빌드 및 배포
```bash
# 프로덕션 빌드
npm run build

# Firebase Hosting에 배포
firebase deploy --only hosting

# 전체 배포 (Firestore 규칙 + Hosting)
firebase deploy
```

---

## 🖱️ 수동 설정 (웹 콘솔 사용)

### 1단계: Firebase Console에서 프로젝트 생성
1. https://console.firebase.google.com/ 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `settlement-calculator` (또는 원하는 이름)
4. Google Analytics: 사용 안 함 (선택사항)
5. 프로젝트 생성 완료

### 2단계: Firestore 데이터베이스 설정
1. 왼쪽 메뉴에서 "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. "테스트 모드에서 시작" 선택
4. 위치: asia-northeast3 (서울) 선택
5. "완료" 클릭

### 3단계: 웹 앱 추가
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

### 4단계: 환경 변수 설정
위 설정 정보로 `.env.local` 파일을 생성:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### 5단계: Firebase Hosting 설정
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

### 6단계: Firestore 보안 규칙 설정
1. Firestore Database > 규칙 탭
2. 다음 규칙으로 교체:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /settlements/{document} {
      allow read, write: if true;
    }
    match /monthly-records/{document} {
      allow read, write: if true;
    }
  }
}
```

3. "게시" 클릭

---

## 🔧 문제 해결

### 일반적인 오류들

#### 1. `400 Bad Request` 에러
```bash
# 원인: Firestore API 비활성화 또는 데이터베이스 미생성
# 해결:
firebase firestore:databases:create "(default)" --location=asia-northeast3
```

#### 2. `permission-denied` 에러
```bash
# 원인: Firestore 보안 규칙 문제
# 해결: 보안 규칙 재배포
firebase deploy --only firestore:rules
```

#### 3. 환경 변수 인식 안됨
```bash
# .env.local 파일 확인
cat .env.local

# 빌드 재실행
npm run build
firebase deploy --only hosting
```

#### 4. Firebase CLI 로그인 문제
```bash
# 재로그인
firebase logout
firebase login
```

### 유용한 명령어들

```bash
# Firebase 프로젝트 상태 확인
firebase projects:list
firebase use --list

# Firestore 상태 확인
firebase firestore:databases:list

# 배포 히스토리 확인
firebase hosting:releases:list

# 로그 확인
firebase functions:log
```

---

## ✅ 설정 완료 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] Firestore 데이터베이스 생성 (서울 리전)
- [ ] 웹 앱 등록
- [ ] `.env.local` 파일 생성
- [ ] 보안 규칙 배포
- [ ] 첫 배포 완료
- [ ] 브라우저에서 앱 정상 작동 확인

이제 앱이 완전히 작동할 준비가 되었습니다! 🎉
