import React, { useState, useRef, useEffect } from 'react'

const ExpenseItem = React.memo(({ owner, item, updateRow, deleteRow }) => {
  const [localAmount, setLocalAmount] = useState(item.amount === 0 ? '' : String(item.amount))
  const inputRef = useRef(null)

  // item.amount가 외부에서 변경될 때만 localAmount 업데이트
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalAmount(item.amount === 0 ? '' : String(item.amount))
    }
  }, [item.amount])

  const handleAmountChange = (e) => {
    const value = e.target.value
    
    // 숫자만 허용 (계산기 자판용)
    if (value === '' || /^\d+$/.test(value)) {
      setLocalAmount(value)
      updateRow(owner, item.id, 'amount', value === '' ? 0 : parseInt(value))
    }
  }

  const handleAmountBlur = () => {
    // 포커스를 잃을 때 최종 값 동기화
    const numericValue = localAmount === '' ? 0 : parseInt(localAmount)
    if (numericValue !== item.amount) {
      updateRow(owner, item.id, 'amount', numericValue)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <input
            type="text"
            value={item.name}
            onChange={(e) => updateRow(owner, item.id, 'name', e.target.value)}
            placeholder="항목명을 입력하세요"
            className="flex-1 text-base font-medium text-gray-800 bg-transparent border-none outline-none placeholder-gray-400"
          />
        </div>
        {!item.fixed && (
          <button
            onClick={() => deleteRow(owner, item.id)}
            className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors text-sm"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">금액</span>
          {item.fixed && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">고정</span>
          )}
        </div>
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            value={localAmount}
            onChange={handleAmountChange}
            onBlur={handleAmountBlur}
            className="text-right text-lg font-semibold text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border-none outline-none w-32"
            placeholder="0"
          />
          <span className="ml-2 text-sm text-gray-500">원</span>
        </div>
      </div>
    </div>
  )
})

ExpenseItem.displayName = 'ExpenseItem'

export default ExpenseItem
