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
    { id: 'jaewoo-var', name: '재우(변동비)', amount: 365200, fixed: false },
  ],
  siblings: [
    { id: 'sib1', name: '재경(변동비)', amount: 153089, fixed: false },
  ],
  lastUpdated: null
}

/**
 * 정산 데이터를 Firestore에서 불러오기
 */
export const loadSettlementData = async () => {
  try {
    const docRef = doc(db, COLLECTION_NAME, DEFAULT_DOC_ID)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        mine: data.mine || defaultSettlementData.mine,
        siblings: data.siblings || defaultSettlementData.siblings
      }
    } else {
      // 문서가 없으면 기본 데이터로 초기화
      await saveSettlementData(defaultSettlementData.mine, defaultSettlementData.siblings)
      return {
        mine: defaultSettlementData.mine,
        siblings: defaultSettlementData.siblings
      }
    }
  } catch (error) {
    console.error('정산 데이터 로드 실패:', error)
    // 오프라인이거나 오류가 발생한 경우 기본 데이터 반환
    return {
      mine: defaultSettlementData.mine,
      siblings: defaultSettlementData.siblings
    }
  }
}

/**
 * 정산 데이터를 Firestore에 저장
 */
export const saveSettlementData = async (mine, siblings) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, DEFAULT_DOC_ID)
    await setDoc(docRef, {
      mine,
      siblings,
      lastUpdated: serverTimestamp()
    }, { merge: true })
    console.log('정산 데이터 저장 완료')
  } catch (error) {
    console.error('정산 데이터 저장 실패:', error)
    throw error
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
 * 월별 정산 기록을 Firestore에 저장
 * @param {number} totalMine 한재우 명의 총합
 * @param {number} totalSiblings 한재경 명의 총합
 * @param {number} settlementAmount 정산금
 * @param {string} yearMonth 년월 (YYYY-MM 형식)
 * @returns {Promise<void>}
 */
async function saveMonthlyRecord(totalMine, totalSiblings, settlementAmount, yearMonth = null) {
  // 년월이 없으면 현재 년월 사용
  if (!yearMonth) {
    const now = new Date()
    yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const docRef = doc(db, 'monthly-records', yearMonth)
  await setDoc(docRef, {
    yearMonth,
    totalMine,
    totalSiblings,
    settlementAmount,
    savedAt: new Date().toISOString(),
  })
  console.log(`월별 기록 저장 완료: ${yearMonth}`)
}

/**
 * 월별 정산 기록들을 Firestore에서 불러오기
 * @param {number} months 가져올 개월 수 (기본값: 12개월)
 * @returns {Promise<Array>}
 */
async function getMonthlyRecords(months = 12) {
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

export { 
  loadSettlementData, 
  saveSettlementData, 
  debounce, 
  defaultSettlementData,
  saveMonthlyRecord,
  getMonthlyRecords
}
