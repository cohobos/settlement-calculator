import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore'

// Firebase 설정 객체 (실제 프로젝트 설정으로 교체 필요)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Firebase 설정 검증
const validateFirebaseConfig = () => {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
  const missing = required.filter(key => !firebaseConfig[key])
  
  if (missing.length > 0) {
    return false
  }
  return true
}


// Firebase 초기화 (설정이 유효한 경우에만)
let app = null
let db = null

try {
  if (validateFirebaseConfig()) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
  }
} catch (error) {
  // Firebase 초기화 실패
}

export { db }

// 연결 상태 확인 및 복구 함수
export const checkFirestoreConnection = async () => {
  if (!db) {
    return false
  }
  
  try {
    await enableNetwork(db)
    return true
  } catch (error) {
    return false
  }
}

// Firebase가 초기화된 경우에만 연결 확인
if (db) {
  checkFirestoreConnection()
}

export default app
