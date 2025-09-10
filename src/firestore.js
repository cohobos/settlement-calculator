import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  getDocs, 
  updateDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase.js'

// 정산 데이터 컬렉션 이름
const COLLECTION_NAME = 'settlements'

// 기본 정산 데이터 ID (단일 사용자용)
const DEFAULT_DOC_ID = 'default'

// 기본 정산 데이터 구조
const defaultSettlementData = {
  mine: [
    { id: 'rent', name: '월세', amount: 250000, fixed: true },
    { id: 'mgmt', name: '관리비', amount: 170000, fixed: true },
    { id: 'water', name: '수도(물)', amount: 10000, fixed: false },
    { id: 'gas', name: '가스', amount: 15300, fixed: false },
    { id: 'elec', name: '전기', amount: 93620, fixed: false },
    { id: 'jaewoo-total', name: '재우 총금액', amount: 365200, fixed: false },
  ],
  siblings: [
    { id: 'sib1', name: '재경 총금액', amount: 153089, fixed: false },
  ],
  lastUpdated: null
}

/**
 * 정산 데이터를 Firestore에서 불러오기 (재시도 로직 포함)
 */
export const loadSettlementData = async (retries = 2) => {
  // Firebase가 초기화되지 않은 경우 기본 데이터 반환
  if (!db) {
    console.warn('⚠️ Firebase 미초기화 - 기본 데이터 사용')
    return {
      mine: defaultSettlementData.mine,
      siblings: defaultSettlementData.siblings
    }
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Firebase 데이터 로드 시도 ${attempt}/${retries}`)
      const docRef = doc(db, COLLECTION_NAME, DEFAULT_DOC_ID)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        console.log('✅ Firebase 데이터 로드 성공:', data)
        return {
          mine: data.mine || defaultSettlementData.mine,
          siblings: data.siblings || defaultSettlementData.siblings
        }
      } else {
        console.log('📝 새 문서 생성 중...')
        // 문서가 없으면 기본 데이터로 초기화
        await saveSettlementData(defaultSettlementData.mine, defaultSettlementData.siblings)
        return {
          mine: defaultSettlementData.mine,
          siblings: defaultSettlementData.siblings
        }
      }
    } catch (error) {
      console.error(`❌ 시도 ${attempt} 실패:`, error)
      
      if (attempt === retries) {
        console.error('🚫 모든 재시도 실패, 오프라인 모드로 전환')
        // 모든 재시도 실패 시 기본 데이터 반환
        return {
          mine: defaultSettlementData.mine,
          siblings: defaultSettlementData.siblings
        }
      }
      
      // 재시도 전 잠시 대기 (빠른 재시도)
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }
}

/**
 * 정산 데이터를 Firestore에 저장 (재시도 로직 포함)
 */
export const saveSettlementData = async (mine, siblings, retries = 2) => {
  // Firebase가 초기화되지 않은 경우 저장 건너뛰기
  if (!db) {
    console.warn('⚠️ Firebase 미초기화 - 저장 건너뛰기')
    return
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`💾 Firebase 데이터 저장 시도 ${attempt}/${retries}`)
      const docRef = doc(db, COLLECTION_NAME, DEFAULT_DOC_ID)
      await setDoc(docRef, {
        mine,
        siblings,
        lastUpdated: serverTimestamp()
      }, { merge: true })
      console.log('✅ 정산 데이터 저장 완료')
      return // 성공 시 함수 종료
    } catch (error) {
      console.error(`❌ 저장 시도 ${attempt} 실패:`, error)
      
      if (attempt === retries) {
        console.error('🚫 모든 저장 시도 실패')
        throw error // 마지막 시도 실패 시 에러 던지기
      }
      
      // 재시도 전 잠시 대기 (빠른 재시도)
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }
}

/**
 * 실시간 정산 데이터 구독
 */
export const subscribeToSettlementData = (callback) => {
  const docRef = doc(db, COLLECTION_NAME, DEFAULT_DOC_ID)
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data()
      callback({
        mine: data.mine || defaultSettlementData.mine,
        siblings: data.siblings || defaultSettlementData.siblings
      })
    } else {
      callback({
        mine: defaultSettlementData.mine,
        siblings: defaultSettlementData.siblings
      })
    }
  }, (error) => {
    console.error('실시간 데이터 구독 오류:', error)
  })
}

/**
 * 디바운스 함수 - 빈번한 저장을 방지
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Firebase 연결 상태 확인
 */
export const checkConnectionStatus = async () => {
  if (!db) {
    console.warn('⚠️ Firebase 미초기화')
    return false
  }
  
  try {
    // 간단한 읽기 테스트로 연결 상태 확인
    const testDocRef = doc(db, 'test', 'connection')
    await getDoc(testDocRef)
    return true
  } catch (error) {
    console.error('Firebase 연결 상태 확인 실패:', error)
    return false
  }
}

/**
 * 월별 정산 기록을 Firestore에 저장 (연결 상태 확인 포함)
 * 현재 정산 데이터의 스냅샷을 월별 기록으로 저장
 * @param {string} yearMonth 년월 (YYYY-MM 형식)
 * @returns {Promise<void>}
 */
export async function saveMonthlyRecord(yearMonth = null) {
  try {
    // Firebase 연결 상태 먼저 확인
    const isConnected = await checkConnectionStatus()
    if (!isConnected) {
      throw new Error('Firebase 연결이 불안정합니다. 인터넷 연결을 확인해주세요.')
    }

    // 년월이 없으면 현재 년월 사용
    if (!yearMonth) {
      const now = new Date()
      yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    console.log(`📅 월별 기록 저장 시작: ${yearMonth}`)

    // 현재 정산 데이터를 먼저 가져오기 (재시도 로직 포함)
    const currentData = await loadSettlementData(3)
    
    if (!currentData || !currentData.mine || !currentData.siblings) {
      throw new Error('현재 정산 데이터를 불러올 수 없습니다.')
    }
    
    // 총합 계산
    const totalMine = currentData.mine.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0)
    const totalSiblings = currentData.siblings.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0)
    const settlementAmount = (totalMine - totalSiblings) / 2

    const docRef = doc(db, 'monthly-records', yearMonth)
    
    // 기존 기록이 있는지 확인 (타임아웃 설정)
    const existingDoc = await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('문서 조회 시간 초과')), 10000)
      )
    ])

    const saveData = {
      yearMonth,
      totalMine,
      totalSiblings,
      settlementAmount,
      mineItems: currentData.mine,
      siblingsItems: currentData.siblings,
      lastUpdated: serverTimestamp(),
      lastUpdatedBy: 'system',
      createdTimestamp: Date.now() // 백업용 타임스탬프
    }

    if (existingDoc.exists()) {
      // 기존 기록이 있으면 업데이트
      await Promise.race([
        updateDoc(docRef, saveData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('업데이트 시간 초과')), 15000)
        )
      ])
      console.log(`✅ 월별 기록 업데이트 완료: ${yearMonth}`)
    } else {
      // 새 기록 생성
      await Promise.race([
        setDoc(docRef, {
          ...saveData,
          createdAt: serverTimestamp(),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('생성 시간 초과')), 15000)
        )
      ])
      console.log(`✅ 월별 기록 생성 완료: ${yearMonth}`)
    }
  } catch (error) {
    console.error('❌ 월별 기록 저장 실패:', error)
    
    // 더 구체적인 에러 메시지 제공
    if (error.code === 'unavailable') {
      throw new Error('Firebase 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } else if (error.code === 'permission-denied') {
      throw new Error('데이터베이스 접근 권한이 없습니다. Firebase 보안 규칙을 확인해주세요.')
    } else if (error.message.includes('offline')) {
      throw new Error('오프라인 상태입니다. 인터넷 연결을 확인해주세요.')
    } else if (error.message.includes('시간 초과')) {
      throw new Error('네트워크가 느려서 저장에 실패했습니다. 다시 시도해주세요.')
    }
    
    throw error
  }
}

/**
 * 월별 정산 기록들을 Firestore에서 불러오기
 * @param {number} months 가져올 개월 수 (기본값: 12개월)
 * @returns {Promise<Array>}
 */
export async function getMonthlyRecords(months = 12) {
  try {
    const recordsRef = collection(db, 'monthly-records')
    const querySnapshot = await getDocs(recordsRef)
    
    const records = []
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() })
    })
    
    // 년월 기준으로 내림차순 정렬 (최신순)
    records.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
    
    // 지정된 개월 수만큼만 반환
    return records.slice(0, months)
  } catch (error) {
    console.error('월별 기록 불러오기 실패:', error)
    return []
  }
}

