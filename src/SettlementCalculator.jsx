import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { loadSettlementData, saveSettlementData, debounce, saveMonthlyRecord, getMonthlyRecords } from './firestore.js'
import ExpenseItem from './ExpenseItem.jsx'
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
  const [showChart, setShowChart] = useState(false)

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setSaveStatus('☁️ 데이터 로딩 중...')
        const data = await loadSettlementData()
        
        setMine(data.mine)
        setSiblings(data.siblings)
        setLoading(false)
        setSaveStatus('✅ 데이터 로드 완료')
        setTimeout(() => setSaveStatus(''), 3000)
      } catch (error) {
        setLoading(false)
        setSaveStatus('📱 오프라인 모드')
        setTimeout(() => setSaveStatus(''), 5000)
      }
    }
    loadData()
  }, [])

  // 월별 기록 로드
  useEffect(() => {
    const loadMonthlyData = async () => {
      try {
        const records = await getMonthlyRecords()
        setMonthlyRecords(records)
      } catch (error) {
        // 월별 기록 로드 실패
      }
    }
    loadMonthlyData()
  }, [])

  const totalMine = mine.reduce((sum, r) => sum + r.amount, 0)
  const totalSiblings = siblings.reduce((sum, r) => sum + r.amount, 0)
  const settlementAmount = (totalMine - totalSiblings) / 2

  const fmt = (num) => new Intl.NumberFormat('ko-KR').format(Math.round(num))

  const debouncedSave = useCallback(
    debounce(async (mineData, siblingsData) => {
      try {
        // 백그라운드에서 조용히 저장 (상태 업데이트 최소화)
        await saveSettlementData(mineData, siblingsData)
      } catch (error) {
        // 자동 저장 실패
      }
    }, 2000), // 더 긴 debounce로 입력 중 방해 최소화
    []
  )

  // 자동 저장을 위한 debounced save (리렌더링 방지)
  useEffect(() => {
    if (mine.length > 0 || siblings.length > 0) {
      // 저장은 하되, 상태 업데이트로 인한 리렌더링 방지
      const timeoutId = setTimeout(() => {
        debouncedSave(mine, siblings)
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [mine, siblings, debouncedSave])

  const updateRow = (owner, id, field, value) => {
    const setter = owner === 'mine' ? setMine : setSiblings
    setter(prev => prev.map(row => 
      row.id === id ? { 
        ...row, 
        [field]: field === 'amount' ? (typeof value === 'string' ? parseFloat(value) || 0 : value) : value 
      } : row
    ))
  }

  const addRow = (owner) => {
    const setter = owner === 'mine' ? setMine : setSiblings
    const newId = `${owner}-${Date.now()}`
    setter(prev => [...prev, { id: newId, name: '', amount: 0, fixed: false }])
  }

  const deleteRow = (owner, id) => {
    const setter = owner === 'mine' ? setMine : setSiblings
    setter(prev => prev.filter(row => row.id !== id))
  }

  // 이달 기록 저장
  const saveCurrentMonth = async () => {
    try {
      setSaveStatus('📊 월별 기록 저장 중...')
      await saveMonthlyRecord()
      setSaveStatus('✅ 월별 기록 저장 완료!')
      
      // 월별 기록 다시 로드
      const records = await getMonthlyRecords()
      setMonthlyRecords(records)
      
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setSaveStatus('❌ 월별 기록 저장 실패')
      setTimeout(() => setSaveStatus(''), 5000)
    }
  }


  // 차트 데이터 준비
    const chartData = useMemo(() => {
      if (monthlyRecords.length === 0) return null

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
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: '재우 명의 총합',
          data: mineAmounts,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          fill: false,
        },
        {
          label: '재경 명의 총합',
          data: siblingsAmounts,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.3,
          fill: false,
        },
      ],
    }
  }, [monthlyRecords])

  // 차트 옵션 (모바일 최적화)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: '월별 정산 추이',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '년월',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          display: true,
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: false,
          callback: function(value, index, ticks) {
            return this.getLabelForValue(value);
          }
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: '금액',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('ko-KR').format(Math.round(value)) + '원'
          }
        }
      }
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 편한가계부 스타일 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">🏠 정산 계산기</h1>
              <p className="text-sm text-gray-500 mt-1">2인 반반 정산</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">이번 달</div>
              <div className="text-lg font-bold text-blue-600">
                {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}
              </div>
            </div>
          </div>
          
          {/* 상태 메시지 */}
          {saveStatus && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 text-center">{saveStatus}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-6">
        {/* 정산 결과 카드 (상단 고정) */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
          <div className="text-center mb-4">
            <h2 className="text-lg font-medium mb-2">정산 결과</h2>
            <div className="text-3xl font-bold mb-1">
              {settlementAmount > 0 ? '+' : ''}{fmt(Math.round(settlementAmount))}원
            </div>
            <p className="text-blue-100 text-sm">
              {settlementAmount > 0 
                ? '재경이 재우에게 줘야 할 금액' 
                : settlementAmount < 0 
                  ? '재우가 재경에게 줘야 할 금액'
                  : '정산할 금액이 없습니다'
              }
            </p>
          </div>
          
          {/* 액션 버튼들 */}
          <div className="flex space-x-2 mb-2">
            <button 
              onClick={saveCurrentMonth}
              className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-3 px-4 text-center text-sm font-medium transition-colors"
            >
              💾 이달 기록 저장
            </button>
              <button 
                onClick={() => setShowHistory(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-3 px-4 text-center text-sm font-medium transition-colors"
              >
                📊 월별 기록
              </button>
              <button 
                onClick={() => setShowChart(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-3 px-4 text-center text-sm font-medium transition-colors"
              >
                📈 추이 차트
              </button>
          </div>
          
          {/* 설명 텍스트 */}
          <div className="text-center text-white/70 text-xs mt-2">
            💡 "이달 기록 저장"은 현재 입력된 실제 데이터를 저장합니다
          </div>
        </div>

        {/* 재우 명의 항목들 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold"></span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">한재우 명의</h3>
                <p className="text-sm text-gray-500">총 {fmt(totalMine)}원</p>
              </div>
            </div>
            <button 
              onClick={() => addRow('mine')}
              className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl hover:bg-blue-600 transition-colors"
            >
              +
            </button>
          </div>
          
          {mine.map((item, index) => (
            <ExpenseItem 
              key={item.id} 
              owner="mine" 
              item={item} 
              updateRow={updateRow}
              deleteRow={deleteRow}
            />
          ))}
        </div>

        {/* 재경 명의 항목들 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold"></span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">한재경 명의</h3>
                <p className="text-sm text-gray-500">총 {fmt(totalSiblings)}원</p>
              </div>
            </div>
            <button 
              onClick={() => addRow('siblings')}
              className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl hover:bg-emerald-600 transition-colors"
            >
              +
            </button>
          </div>
          
          {siblings.map((item, index) => (
            <ExpenseItem 
              key={item.id} 
              owner="siblings" 
              item={item} 
              updateRow={updateRow}
              deleteRow={deleteRow}
            />
          ))}
        </div>

      {/* 월별 기록 모달 */}
      {showHistory && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            zIndex: 10000, 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            position: 'fixed' 
          }}
          onClick={() => setShowHistory(false)}
        >
          <div 
            className="bg-white w-80 h-96 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              animation: 'modalSlideUp 0.3s ease-out'
            }}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: 'white', borderRadius: '8px 8px 0 0' }}>
              <h3 className="font-bold text-black text-lg flex items-center">
                📊 월별 정산 기록
              </h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 bg-gray-100 text-black flex items-center justify-center hover:bg-gray-200 transition-colors rounded-full"
              >
                ×
              </button>
            </div>
            
            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(24rem - 80px)', backgroundColor: 'white', borderRadius: '0 0 8px 8px' }}>
              {monthlyRecords.length > 0 ? (
                <div className="space-y-3">
                  {monthlyRecords.map((record) => (
                    <div key={record.yearMonth} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-800">{record.yearMonth}</div>
                        <div className={`font-bold ${record.settlementAmount > 0 ? 'text-blue-600' : record.settlementAmount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {record.settlementAmount > 0 ? '+' : ''}{fmt(Math.round(record.settlementAmount))}원
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        재우: {fmt(record.totalMine)}원 | 재경: {fmt(record.totalSiblings)}원
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  아직 저장된 월별 기록이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 차트 모달 */}
      {showChart && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            zIndex: 10000, 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            position: 'fixed' 
          }}
          onClick={() => setShowChart(false)}
        >
          <div 
            className="bg-white w-96 h-96 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              animation: 'modalSlideUp 0.3s ease-out'
            }}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: 'white', borderRadius: '8px 8px 0 0' }}>
              <h3 className="font-bold text-black text-lg flex items-center">
                📈 정산 추이 차트
              </h3>
              <button 
                onClick={() => setShowChart(false)}
                className="w-8 h-8 bg-gray-100 text-black flex items-center justify-center hover:bg-gray-200 transition-colors rounded-full"
              >
                ×
              </button>
            </div>
            
            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(24rem - 80px)', backgroundColor: 'white', borderRadius: '0 0 8px 8px' }}>
              {chartData ? (
                <div style={{ height: '240px', minHeight: '240px', backgroundColor: 'white', borderRadius: '8px', padding: '8px' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  차트를 표시할 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}