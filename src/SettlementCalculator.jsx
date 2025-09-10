import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { loadSettlementData, saveSettlementData, debounce, saveMonthlyRecord, getMonthlyRecords } from './firestore.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
)

// 정산금(동생→나 양수 / 내가→동생 음수) = (내 명의 총합 - 동생 명의 총합) / 2
export default function SettlementCalculator() {
  const [mine, setMine] = useState([])
  const [siblings, setSiblings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')
  const [monthlyRecords, setMonthlyRecords] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showChart, setShowChart] = useState(false) // 저장 상태 표시

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
      
      // 백그라운드에서 Firebase 데이터 시도 (재시도 로직 포함)
      try {
        setSaveStatus('☁️ 클라우드 연결 중...')
        const data = await loadSettlementData() // 재시도 로직이 내장된 함수 사용
        
        // Firebase 데이터가 있으면 업데이트
        setMine(data.mine)
        setSiblings(data.siblings)
        setSaveStatus('✅ 클라우드 동기화 완료')
        setTimeout(() => setSaveStatus(''), 3000)
      } catch (error) {
        console.log('Firebase 연결 실패, 오프라인 모드로 작동')
        setSaveStatus('📱 오프라인 모드')
        setTimeout(() => setSaveStatus(''), 5000)
      }
    }
    loadData()
  }, [])

  // 디바운스된 저장 함수
  const debouncedSave = useCallback(
    debounce(async (mineData, siblingsData) => {
      try {
        console.log('🔄 Firebase 저장 시도:', { mineData, siblingsData })
        setSaveStatus('☁️ 클라우드 저장 중...')
        await saveSettlementData(mineData, siblingsData)
        console.log('✅ Firebase 저장 완료')
        setSaveStatus('✅ 클라우드 저장 완료')
        setTimeout(() => setSaveStatus(''), 3000)
      } catch (error) {
        console.error('❌ Firebase 저장 실패:', error)
        setSaveStatus(`❌ 저장 실패: ${error.message}`)
        setTimeout(() => setSaveStatus(''), 5000)
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

  // 월별 기록 저장 (현재 데이터를 Firebase에서 실시간으로 가져와서 저장)
  const saveCurrentMonth = async () => {
    try {
      console.log('월별 기록 저장 시작 - 현재 Firebase 데이터를 스냅샷으로 저장')
      setSaveStatus('월별 기록 저장 중...')
      await saveMonthlyRecord() // 파라미터 없이 호출하면 현재 월로 저장
      setSaveStatus('월별 기록 저장 완료 ✅')
      setTimeout(() => setSaveStatus(''), 3000)
      // 저장 후 기록 다시 불러오기
      loadMonthlyHistory()
    } catch (error) {
      console.error('월별 기록 저장 실패:', error)
      setSaveStatus(`월별 기록 저장 실패: ${error.message}`)
      setTimeout(() => setSaveStatus(''), 5000)
    }
  }

  // 월별 기록 불러오기
  const loadMonthlyHistory = async () => {
    try {
      const records = await getMonthlyRecords(12) // 최근 12개월
      setMonthlyRecords(records)
    } catch (error) {
      console.error('월별 기록 불러오기 실패:', error)
    }
  }

  // 컴포넌트 마운트 시 월별 기록도 불러오기
  useEffect(() => {
    loadMonthlyHistory()
  }, [])

  // 차트 데이터 준비
  const chartData = useMemo(() => {
    if (monthlyRecords.length === 0) return null

    // 데이터를 시간순으로 정렬 (오래된 순)
    const sortedRecords = [...monthlyRecords].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))

    const labels = sortedRecords.map(record => record.yearMonth)
    const settlementAmounts = sortedRecords.map(record => record.settlementAmount)
    const mineAmounts = sortedRecords.map(record => record.totalMine)
    const siblingsAmounts = sortedRecords.map(record => record.totalSiblings)

    return {
      labels,
      datasets: [
        {
          label: '정산금 (재경→재우)',
          data: settlementAmounts,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: '한재우 명의 총합',
          data: mineAmounts,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          fill: false,
        },
        {
          label: '한재경 명의 총합',
          data: siblingsAmounts,
          borderColor: 'rgb(245, 101, 101)',
          backgroundColor: 'rgba(245, 101, 101, 0.1)',
          tension: 0.3,
          fill: false,
        },
      ],
    }
  }, [monthlyRecords])

  // 차트 옵션
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '월별 정산 추이',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            return `${context.dataset.label}: ${new Intl.NumberFormat('ko-KR', { 
              style: 'currency', 
              currency: 'KRW',
              maximumFractionDigits: 0 
            }).format(value)}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('ko-KR', {
              style: 'currency',
              currency: 'KRW',
              maximumFractionDigits: 0,
              notation: 'compact'
            }).format(value)
          }
        }
      }
    },
    interaction: {
      intersect: false,
    },
  }

  const field = (owner, row) => (
    <div key={row.id} className="group p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-gray-300/50 hover:shadow-md transition-all duration-200">
      {/* 모바일: 세로 레이아웃, 데스크톱: 가로 레이아웃 */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* 항목명 입력 */}
        <div className="flex-1 relative">
          <input
            className="w-full px-4 py-3 text-base sm:text-sm rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all duration-200 placeholder-gray-400"
            value={row.name}
            onChange={e => updateRow(owner, row.id, { name: e.target.value })}
            placeholder="항목명을 입력하세요"
          />
          {row.name && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-400 rounded-full opacity-60"></div>
          )}
        </div>
        
        <div className="flex gap-3 items-center">
          {/* 금액 입력 */}
          <div className="relative">
            <input
              type="tel"
              className="w-32 text-right px-4 py-3 text-base sm:text-sm rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all duration-200 placeholder-gray-400"
              inputMode="decimal"
              pattern="[0-9]*"
              value={row.amount.toString()}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                updateRow(owner, row.id, { amount: Number(v || 0) })
              }}
              placeholder="0"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">원</div>
          </div>
          
          {/* 고정 체크박스 */}
          <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer whitespace-nowrap group-hover:text-gray-700 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={row.fixed}
                onChange={e => updateRow(owner, row.id, { fixed: e.target.checked })}
              />
              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                row.fixed 
                  ? 'bg-blue-500 border-blue-500 shadow-sm' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}>
                {row.fixed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="font-medium">고정</span>
          </label>
          
          {/* 삭제 버튼 */}
          <button
            className="group/btn p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 active:scale-95 transition-all duration-200 min-w-[44px]"
            onClick={() => removeRow(owner, row.id)}
            title="항목 삭제"
          >
            <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 m-0 p-0">
      {/* 헤더 - 모던 그라디언트 디자인 */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 px-6 sm:px-12 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">💰</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  공과금/월세 정산 계산기
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  정산금 = (재우 명의 − 재경 명의) ÷ 2
                </p>
              </div>
            </div>
            {saveStatus && (
              <div className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 ${
                saveStatus.includes('실패') ? 'bg-red-100/80 text-red-700 border border-red-200' : 
                saveStatus.includes('완료') ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200' : 
                'bg-amber-100/80 text-amber-700 border border-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    saveStatus.includes('실패') ? 'bg-red-500' : 
                    saveStatus.includes('완료') ? 'bg-emerald-500' : 
                    'bg-amber-500'
                  }`}></span>
                  {saveStatus}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 메인 콘텐츠 - 가로 여백 추가 */}
      <div className="max-w-2xl mx-auto px-6 sm:px-12 py-6 pb-20">

        <div className="space-y-8">
          {/* 한재우 명의 카드 - 개선된 디자인 */}
          <section className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm">재우</span>
                </div>
                <div>
                  <h2 className="font-bold text-lg sm:text-xl text-gray-900">한재우 명의 항목</h2>
                  <p className="text-xs text-gray-500 mt-0.5">지출 항목을 관리하세요</p>
                </div>
              </div>
              <button 
                onClick={() => addRow('mine')} 
                className="group px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg group-hover:scale-110 transition-transform">+</span>
                  <span>추가</span>
                </span>
              </button>
            </div>
            <div className="space-y-3">
              {mine.map(r => field('mine', r))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 font-medium">합계</span>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    {fmt(totalMine)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">원</div>
                </div>
              </div>
            </div>
          </section>

          {/* 한재경 명의 카드 - 개선된 디자인 */}
          <section className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm">재경</span>
                </div>
                <div>
                  <h2 className="font-bold text-lg sm:text-xl text-gray-900">한재경 명의 항목</h2>
                  <p className="text-xs text-gray-500 mt-0.5">지출 항목을 관리하세요</p>
                </div>
              </div>
              <button 
                onClick={() => addRow('siblings')} 
                className="group px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg group-hover:scale-110 transition-transform">+</span>
                  <span>추가</span>
                </span>
              </button>
            </div>
            <div className="space-y-3">
              {siblings.map(r => field('siblings', r))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 font-medium">합계</span>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
                    {fmt(totalSiblings)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">원</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 정산 결과 카드 - 프리미엄 디자인 */}
        <section className="bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8 mt-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">⚖️</span>
              </div>
              <div>
                <h2 className="font-bold text-lg sm:text-xl text-gray-900">정산 결과</h2>
                <p className="text-xs text-gray-500 mt-0.5">계산된 정산 금액을 확인하세요</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 주요 액션 버튼 */}
              <button 
                onClick={saveCurrentMonth}
                className="group flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl border-none cursor-pointer shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
              >
                <span className="text-base group-hover:scale-110 transition-transform">💾</span>
                <span>이달 기록 저장</span>
              </button>
              
              {/* 보조 버튼들 */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`group flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border-none cursor-pointer shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ${
                    showHistory 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                      : 'bg-white/80 text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">📊</span>
                  <span className="hidden sm:inline">{showHistory ? '기록 숨기기' : '월별 기록'}</span>
                </button>
                
                <button 
                  onClick={() => setShowChart(!showChart)}
                  className={`group flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border-none cursor-pointer shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ${
                    showChart 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' 
                      : 'bg-white/80 text-purple-600 border border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">📈</span>
                  <span className="hidden sm:inline">{showChart ? '차트 숨기기' : '추이 차트'}</span>
                </button>
                
                <button 
                  onClick={() => debouncedSave(mine, siblings)}
                  className="group flex items-center gap-2 px-4 py-3 text-sm font-medium bg-white/80 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer shadow-md hover:shadow-lg active:scale-95 transition-all duration-200"
                  title="개발용 테스트 버튼"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">🔄</span>
                  <span className="hidden sm:inline">테스트</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* 정산 결과 카드들 - 개선된 디자인 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {/* 재우 명의 총액 */}
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">재우</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">총 지출</span>
                </div>
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-125 transition-transform"></div>
              </div>
              <div className="text-2xl font-bold text-blue-800 mb-1">{fmt(totalMine)}</div>
              <div className="text-xs text-blue-500">원</div>
            </div>

            {/* 재경 명의 총액 */}
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">재경</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">총 지출</span>
                </div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full group-hover:scale-125 transition-transform"></div>
              </div>
              <div className="text-2xl font-bold text-emerald-800 mb-1">{fmt(totalSiblings)}</div>
              <div className="text-xs text-emerald-500">원</div>
            </div>

            {/* 정산 금액 - 하이라이트 */}
            <div className={`group sm:col-span-2 lg:col-span-1 p-6 rounded-2xl border hover:shadow-xl transition-all duration-300 relative overflow-hidden ${
              net >= 0 
                ? 'bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-violet-200/50' 
                : 'bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 border-rose-200/50'
            }`}>
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-10 translate-x-10 ${
                net >= 0 
                  ? 'bg-gradient-to-br from-violet-200/30 to-purple-200/30' 
                  : 'bg-gradient-to-br from-rose-200/30 to-red-200/30'
              }`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      net >= 0 
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600' 
                        : 'bg-gradient-to-r from-rose-500 to-red-600'
                    }`}>
                      <span className="text-white text-xs">⚖️</span>
                    </div>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      net >= 0 ? 'text-violet-600' : 'text-rose-600'
                    }`}>정산금</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform ${
                      net >= 0 ? 'bg-violet-500' : 'bg-rose-500'
                    }`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform delay-75 ${
                      net >= 0 ? 'bg-purple-500' : 'bg-red-500'
                    }`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform delay-150 ${
                      net >= 0 ? 'bg-pink-500' : 'bg-pink-500'
                    }`}></div>
                  </div>
                </div>
                <div className={`text-3xl font-bold bg-clip-text text-transparent mb-1 ${
                  net >= 0 
                    ? 'bg-gradient-to-r from-violet-700 to-purple-700' 
                    : 'bg-gradient-to-r from-rose-700 to-red-700'
                }`}>
                  {fmt(Math.abs(net))}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs ${net >= 0 ? 'text-violet-500' : 'text-rose-500'}`}>원</div>
                  <div className={`text-xs px-2 py-1 bg-white/60 font-medium rounded-full ${
                    net >= 0 ? 'text-violet-700' : 'text-rose-700'
                  }`}>
                    {net >= 0 ? '재경 → 재우' : '재우 → 재경'}
                  </div>
                </div>
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

        {/* 차트 섹션 */}
        {showChart && chartData && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mt-8">
            <div className="h-96 w-full">
              <Line data={chartData} options={chartOptions} />
            </div>
          </section>
        )}

        {/* 차트 데이터 없을 때 안내 */}
        {showChart && !chartData && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mt-8">
            <div className="text-center text-gray-500 py-16">
              <div className="text-5xl mb-4">📈</div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                차트를 표시할 데이터가 없습니다
              </h3>
              <p className="text-sm">
                월별 기록을 2개 이상 저장하면 추이 차트를 볼 수 있습니다.<br/>
                "💾 이달 기록 저장" 버튼을 눌러 데이터를 쌓아보세요!
              </p>
            </div>
          </section>
        )}

        {/* 월별 기록 섹션 */}
        {showHistory && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mt-8">
            <h3 className="font-bold text-lg text-gray-900 mb-4">
              📈 월별 정산 기록 (최근 12개월)
            </h3>
            
            {monthlyRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>아직 저장된 월별 기록이 없습니다.</p>
                <p className="text-sm mt-2">위의 "💾 이달 기록 저장" 버튼을 눌러 기록을 저장해보세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 bg-white">년월</th>
                      <th className="text-right py-3 px-4 font-semibold text-blue-600 bg-white">한재우</th>
                      <th className="text-right py-3 px-4 font-semibold text-emerald-600 bg-white">한재경</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 bg-white">정산금</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyRecords.map((record, index) => (
                      <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {record.yearMonth}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-700">
                          {fmt(record.totalMine)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                          {fmt(record.totalSiblings)}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          record.settlementAmount >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {fmt(record.settlementAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <footer className="mt-8 text-center text-xs sm:text-sm text-gray-500 pb-4">
          💡 금액은 원 단위 정수로 입력하세요 (쉼표 없이 숫자만)
        </footer>
      </div>
    </div>
  )
}
