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
      try {
        const data = await loadSettlementData()
        setMine(data.mine)
        setSiblings(data.siblings)
      } catch (error) {
        console.error('데이터 로드 실패:', error)
        setSaveStatus('데이터 로드 실패')
      } finally {
        setLoading(false)
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
    <div key={row.id} className="flex gap-2 items-center">
      <input
        className="flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:ring w-36"
        value={row.name}
        onChange={e => updateRow(owner, row.id, { name: e.target.value })}
        placeholder="항목명"
      />
      <input
        className="w-40 text-right px-3 py-2 rounded-xl border focus:outline-none focus:ring"
        inputMode="numeric"
        pattern="[0-9]*"
        value={row.amount.toString()}
        onChange={e => {
          const v = e.target.value.replace(/[^0-9]/g, '')
          updateRow(owner, row.id, { amount: Number(v || 0) })
        }}
        placeholder="금액"
      />
      <label className="flex items-center gap-1 text-xs text-gray-600 select-none cursor-pointer mr-1">
        <input
          type="checkbox"
          checked={row.fixed}
          onChange={e => updateRow(owner, row.id, { fixed: e.target.checked })}
        />
        고정
      </label>
      <button
        className="px-2 py-1 text-xs rounded-lg border hover:bg-red-50 text-red-600 border-red-200 transition"
        onClick={() => removeRow(owner, row.id)}
      >
        삭제
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">공과금/월세 정산 계산기 (2인, 반반)</h1>
            <p className="text-sm text-gray-600">규칙: 정산금 = (내 명의 총합 − 동생 명의 총합) / 2</p>
          </div>
          {saveStatus && (
            <div className={`mt-4 md:mt-0 px-4 py-2 rounded-xl text-sm font-medium ${
              saveStatus.includes('실패') ? 'bg-red-100 text-red-600' : 
              saveStatus.includes('완료') ? 'bg-green-100 text-green-600' : 
              'bg-yellow-100 text-yellow-600'
            }`}>
              {saveStatus}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 내 명의 카드 */}
          <section className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">내 명의 항목</h2>
              <button 
                onClick={() => addRow('mine')} 
                className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 active:scale-[0.98] transition"
              >
                추가
              </button>
            </div>
            <div className="space-y-3">
              {mine.map(r => field('mine', r))}
            </div>
            <div className="mt-4 pt-3 border-t text-right font-semibold">합계: {fmt(totalMine)}</div>
          </section>

          {/* 동생 명의 카드 */}
          <section className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">동생 명의 항목</h2>
              <button 
                onClick={() => addRow('siblings')} 
                className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 active:scale-[0.98] transition"
              >
                추가
              </button>
            </div>
            <div className="space-y-3">
              {siblings.map(r => field('siblings', r))}
            </div>
            <div className="mt-4 pt-3 border-t text-right font-semibold">합계: {fmt(totalSiblings)}</div>
          </section>
        </div>

        {/* 결과 카드 */}
        <section className="bg-white rounded-2xl shadow p-4 mt-6">
          <h2 className="font-semibold text-lg mb-3">정산 결과</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl border">
              <div className="text-sm text-gray-500">내 명의 합계</div>
              <div className="text-xl font-semibold">{fmt(totalMine)}</div>
            </div>
            <div className="p-3 rounded-xl border">
              <div className="text-sm text-gray-500">동생 명의 합계</div>
              <div className="text-xl font-semibold">{fmt(totalSiblings)}</div>
            </div>
            <div className="p-3 rounded-xl border">
              <div className="text-sm text-gray-500">정산금 (동생→나 / 음수면 내가 지급)</div>
              <div className={`text-xl font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmt(net)}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            • 양수이면 <b>동생이 나에게</b> 보내면 되고, 음수이면 <b>내가 동생에게</b> 보냅니다.
          </p>
        </section>

        <footer className="mt-6 text-xs text-gray-500">
          * 금액은 원 단위 정수로 입력하세요. (쉼표 없이 숫자만)
        </footer>
      </div>
    </div>
  )
}
