import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { loadSettlementData, saveSettlementData, debounce } from './firestore.js'

// 정산금(동생→나 양수 / 내가→동생 음수) = (내 명의 총합 - 동생 명의 총합) / 2
export default function SettlementCalculator() {
  const [mine, setMine] = useState([])
  const [siblings, setSiblings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('') // 저장 상태 표시

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      // 즉시 기본 데이터 표시
      setMine([
        { id: 'rent', name: '월세', amount: 250000, fixed: true },
        { id: 'mgmt', name: '관리비', amount: 170000, fixed: true },
        { id: 'water', name: '수도(물)', amount: 10000, fixed: false },
        { id: 'gas', name: '가스', amount: 15300, fixed: false },
        { id: 'elec', name: '전기', amount: 93620, fixed: false },
        { id: 'jaewoo-var', name: '재우(변동비)', amount: 365200, fixed: false },
      ])
      setSiblings([
        { id: 'sib1', name: '재경(변동비)', amount: 153089, fixed: false },
      ])
      setLoading(false) // 즉시 로딩 완료
      
      // 백그라운드에서 Firebase 데이터 시도
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('타임아웃')), 2000) // 2초로 단축
        )
        
        const dataPromise = loadSettlementData()
        const data = await Promise.race([dataPromise, timeoutPromise])
        
        // Firebase 데이터가 있으면 업데이트
        setMine(data.mine)
        setSiblings(data.siblings)
        setSaveStatus('클라우드 동기화 완료')
        setTimeout(() => setSaveStatus(''), 2000)
      } catch (error) {
        console.log('Firebase 연결 실패, 오프라인 모드로 작동')
        setSaveStatus('오프라인 모드')
        setTimeout(() => setSaveStatus(''), 3000)
      }
    }
    loadData()
  }, [])

  // 디바운스된 저장 함수
  const debouncedSave = useCallback(
    debounce(async (mineData, siblingsData) => {
      try {
        setSaveStatus('저장 중...')
        await saveSettlementData(mineData, siblingsData)
        setSaveStatus('저장 완료')
        setTimeout(() => setSaveStatus(''), 2000)
      } catch (error) {
        console.error('저장 실패:', error)
        setSaveStatus('저장 실패')
        setTimeout(() => setSaveStatus(''), 3000)
      }
    }, 1000),
    []
  )

  // 데이터가 변경될 때마다 자동 저장
  useEffect(() => {
    if (!loading && mine.length > 0) {
      debouncedSave(mine, siblings)
    }
  }, [mine, siblings, loading, debouncedSave])

  const addRow = (owner) => {
    const row = { id: Math.random().toString(36).slice(2), name: '새 항목', amount: 0, fixed: false }
    owner === 'mine' ? setMine(v => [...v, row]) : setSiblings(v => [...v, row])
  }
  const updateRow = (owner, id, patch) => {
    const upd = rows => rows.map(r => (r.id === id ? { ...r, ...patch } : r))
    owner === 'mine' ? setMine(upd) : setSiblings(upd)
  }
  const removeRow = (owner, id) => {
    const fil = rows => rows.filter(r => r.id !== id)
    owner === 'mine' ? setMine(fil) : setSiblings(fil)
  }

  const totalMine = useMemo(() => mine.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0), [mine])
  const totalSiblings = useMemo(() => siblings.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0), [siblings])
  const net = useMemo(() => (totalMine - totalSiblings) / 2, [totalMine, totalSiblings])

  const fmt = n => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(Math.round(n))

  const field = (owner, row) => (
    <div key={row.id} className="space-y-2 p-3 bg-gray-50 rounded-lg">
      {/* 모바일: 세로 레이아웃, 데스크톱: 가로 레이아웃 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          className="flex-1 px-3 py-3 sm:py-2 text-base sm:text-sm rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={row.name}
          onChange={e => updateRow(owner, row.id, { name: e.target.value })}
          placeholder="항목명"
        />
        <div className="flex gap-2 items-center">
          <input
            type="tel"
            className="flex-1 sm:w-32 text-right px-3 py-3 sm:py-2 text-base sm:text-sm rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            inputMode="decimal"
            pattern="[0-9]*"
            value={row.amount.toString()}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              updateRow(owner, row.id, { amount: Number(v || 0) })
            }}
            placeholder="금액"
          />
          <label className="flex items-center gap-1 text-sm text-gray-600 select-none cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={row.fixed}
              onChange={e => updateRow(owner, row.id, { fixed: e.target.checked })}
            />
            고정
          </label>
          <button
            className="px-3 py-2 text-sm rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors min-w-[50px]"
            onClick={() => removeRow(owner, row.id)}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <div className="text-lg sm:text-xl font-medium text-gray-700">데이터 로딩 중...</div>
          <div className="text-sm text-gray-500 mt-2">Firebase 연결 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      {/* 헤더 - 모바일 최적화 */}
      <div className="!sticky !top-0 !bg-white !shadow-sm !border-b !px-12 !py-3 sm:!px-24 lg:!px-32 sm:!py-4">
        <div className="!max-w-4xl !mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">공과금/월세 정산 계산기</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">규칙: 정산금 = (재우 명의 − 재경 명의) / 2</p>
            </div>
            {saveStatus && (
              <div className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium ${
                saveStatus.includes('실패') ? 'bg-red-100 text-red-600' : 
                saveStatus.includes('완료') ? 'bg-green-100 text-green-600' : 
                'bg-yellow-100 text-yellow-600'
              }`}>
                {saveStatus}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 메인 콘텐츠 - 가로 여백 추가 */}
      <div className="!max-w-4xl !mx-auto !px-12 sm:!px-24 lg:!px-32 !py-4 sm:!py-6 !pb-20">

        <div className="!space-y-6 lg:!grid lg:!grid-cols-2 lg:!gap-8 lg:!space-y-0">
          {/* 한재우 명의 카드 */}
          <section className="!bg-white !rounded-2xl !shadow-sm !border !p-6 sm:!p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg sm:text-xl text-gray-900">한재우 명의 항목</h2>
              <button 
                onClick={() => addRow('mine')} 
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              >
                + 추가
              </button>
            </div>
            <div className="space-y-3">
              {mine.map(r => field('mine', r))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-gray-100">
              <div className="text-right">
                <span className="text-sm text-gray-600">합계</span>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{fmt(totalMine)}</div>
              </div>
            </div>
          </section>

          {/* 한재경 명의 카드 */}
          <section className="!bg-white !rounded-2xl !shadow-sm !border !p-6 sm:!p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg sm:text-xl text-gray-900">한재경 명의 항목</h2>
              <button 
                onClick={() => addRow('siblings')} 
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
              >
                + 추가
              </button>
            </div>
            <div className="space-y-3">
              {siblings.map(r => field('siblings', r))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-gray-100">
              <div className="text-right">
                <span className="text-sm text-gray-600">합계</span>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{fmt(totalSiblings)}</div>
              </div>
            </div>
          </section>
        </div>

        {/* 결과 카드 - 모바일 최적화 */}
        <section className="!bg-white !rounded-2xl !shadow-sm !border !p-6 sm:!p-8 !mt-8">
          <h2 className="font-bold text-lg sm:text-xl text-gray-900 mb-4">정산 결과</h2>
          
          {/* 모바일: 세로 배치, 데스크톱: 3단 배치 */}
          <div className="space-y-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:space-y-0">
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-100">
              <div className="text-sm font-medium text-blue-700">한재우 명의 합계</div>
              <div className="text-2xl font-bold text-blue-900 mt-2">{fmt(totalMine)}</div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border-2 border-green-100">
              <div className="text-sm font-medium text-green-700">한재경 명의 합계</div>
              <div className="text-2xl font-bold text-green-900 mt-2">{fmt(totalSiblings)}</div>
            </div>
            <div className={`p-4 rounded-xl border-2 sm:col-span-2 lg:col-span-1 ${
              net >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className={`text-sm font-medium ${
                net >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                정산금 (재경→재우 / 음수면 재우가 지급)
              </div>
              <div className={`text-2xl sm:text-3xl font-bold mt-2 ${
                net >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {fmt(net)}
              </div>
            </div>
          </div>
          
          <div className={`mt-6 p-6 rounded-xl ${
            net >= 0 ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-rose-50 border-2 border-rose-200'
          }`}>
            <p className={`text-sm sm:text-base font-medium ${
              net >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {net >= 0 
                ? `💰 재경이 재우에게 ${fmt(Math.abs(net))}을 보내면 됩니다.`
                : `💸 재우가 재경에게 ${fmt(Math.abs(net))}을 보내면 됩니다.`
              }
            </p>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs sm:text-sm text-gray-500 pb-4">
          💡 금액은 원 단위 정수로 입력하세요 (쉼표 없이 숫자만)
        </footer>
      </div>
    </div>
  )
}
