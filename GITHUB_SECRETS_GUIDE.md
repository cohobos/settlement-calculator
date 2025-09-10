# GitHub Actions Secrets 설정 가이드

## 📋 설정해야 할 Secrets 목록

GitHub 저장소의 **Settings** → **Secrets and variables** → **Actions**에서 다음 6개의 Secret을 추가해야 합니다.

### 🔑 추가할 Secrets:

#### 1. VITE_FIREBASE_API_KEY
- **Name**: `VITE_FIREBASE_API_KEY`
- **Value**: `AIzaSyBGrPpCG5wC5LeJId8SCzBZuWgygvezEbU`

#### 2. VITE_FIREBASE_AUTH_DOMAIN
- **Name**: `VITE_FIREBASE_AUTH_DOMAIN`
- **Value**: `settlement-calc-2025.firebaseapp.com`

#### 3. VITE_FIREBASE_PROJECT_ID
- **Name**: `VITE_FIREBASE_PROJECT_ID`
- **Value**: `settlement-calc-2025`

#### 4. VITE_FIREBASE_STORAGE_BUCKET
- **Name**: `VITE_FIREBASE_STORAGE_BUCKET`
- **Value**: `settlement-calc-2025.firebasestorage.app`

#### 5. VITE_FIREBASE_MESSAGING_SENDER_ID
- **Name**: `VITE_FIREBASE_MESSAGING_SENDER_ID`
- **Value**: `246038794220`

#### 6. VITE_FIREBASE_APP_ID
- **Name**: `VITE_FIREBASE_APP_ID`
- **Value**: `1:246038794220:web:b5bce35a84762e1151fac9`

## 📝 설정 방법:

1. **GitHub 저장소 접속**: https://github.com/cohobos/settlement-calculator
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **"Secrets and variables"** → **"Actions"** 클릭
4. **"New repository secret"** 버튼 클릭
5. 위의 6개를 하나씩 추가:
   - Name과 Value를 입력
   - **"Add secret"** 클릭
6. 6개 모두 추가 완료

## ✅ 완료 후:

모든 Secrets가 추가되면:
- `git push origin main` → 자동으로 Firebase에 배포됩니다!
- GitHub Actions에서 배포 진행 상황을 확인할 수 있습니다.

## 🔗 관련 링크:

- **GitHub Actions**: https://github.com/cohobos/settlement-calculator/actions
- **Firebase 앱**: https://settlement-calc-2025.web.app
- **Firebase Console**: https://console.firebase.google.com/project/settlement-calc-2025/overview

---

**참고**: 현재 `FIREBASE`라는 하나의 Secret만 있는데, 이것은 삭제하고 위의 6개로 교체해야 합니다.
