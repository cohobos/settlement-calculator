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
    console.error('❌ Firebase 설정 누락:', missing)
    console.error('📝 .env.local 파일을 생성하고 다음 변수들을 설정하세요:')
    missing.forEach(key => {
      console.error(`   VITE_FIREBASE_${key.toUpperCase()}=your_${key}_here`)
    })
    return false
  }
  return true
}

console.log('🔧 Firebase 설정 확인:', {
  apiKey: firebaseConfig.apiKey ? '✅ 설정됨' : '❌ 없음',
  projectId: firebaseConfig.projectId || '❌ 없음',
  authDomain: firebaseConfig.authDomain || '❌ 없음',
  isValid: validateFirebaseConfig()
})

// Firebase 초기화 (설정이 유효한 경우에만)
let app = null
let db = null

try {
  if (validateFirebaseConfig()) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    console.log('✅ Firebase 초기화 완료')
  } else {
    console.warn('⚠️ Firebase 설정이 불완전하여 오프라인 모드로 실행됩니다.')
  }
} catch (error) {
  console.error('❌ Firebase 초기화 실패:', error)
}

export { db }

// 연결 상태 확인 및 복구 함수
export const checkFirestoreConnection = async () => {
  if (!db) {
    console.warn('⚠️ Firebase가 초기화되지 않았습니다.')
    return false
  }
  
  try {
    await enableNetwork(db)
    console.log('✅ Firestore 네트워크 연결 활성화')
    return true
  } catch (error) {
    console.error('❌ Firestore 연결 실패:', error)
    return false
  }
}

// Firebase가 초기화된 경우에만 연결 확인
if (db) {
  checkFirestoreConnection()
}

export default app
