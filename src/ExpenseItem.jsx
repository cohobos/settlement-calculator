import React, { useState, useRef, useEffect } from 'react'

const ExpenseItem = React.memo(({ owner, item, updateRow, deleteRow }) => {
  const fmt = (num) => new Intl.NumberFormat('ko-KR').format(Math.round(num))
  const [localAmount, setLocalAmount] = useState(item.amount === 0 ? '' : fmt(item.amount))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pressTimer, setPressTimer] = useState(null)
  const inputRef = useRef(null)

  // item.amount가 외부에서 변경될 때만 localAmount 업데이트
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalAmount(item.amount === 0 ? '' : fmt(item.amount))
    }
  }, [item.amount])

  const handleAmountChange = (e) => {
    const value = e.target.value
    // 콤마 제거하고 숫자만 추출
    const numericValue = value.replace(/[,\s]/g, '')
    
    // 숫자만 허용 (계산기 자판용)
    if (numericValue === '' || /^\d+$/.test(numericValue)) {
      const parsedValue = numericValue === '' ? 0 : parseInt(numericValue)
      setLocalAmount(parsedValue === 0 ? '' : fmt(parsedValue))
      updateRow(owner, item.id, 'amount', parsedValue)
    }
  }

  const handleAmountBlur = () => {
    // 포커스를 잃을 때 최종 값 동기화
    const numericValue = localAmount === '' ? 0 : parseInt(localAmount.replace(/[,\s]/g, ''))
    if (numericValue !== item.amount) {
      updateRow(owner, item.id, 'amount', numericValue)
    }
    // 포맷팅된 값으로 업데이트
    setLocalAmount(numericValue === 0 ? '' : fmt(numericValue))
  }

  const handleLongPressStart = (e) => {
    // 입력 필드인 경우 long press 무시
    if (e.target.tagName === 'INPUT') {
      return
    }
    
    const timer = setTimeout(() => {
      setShowDeleteConfirm(true)
    }, 800)
    setPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }

  const confirmDelete = () => {
    deleteRow(owner, item.id)
    setShowDeleteConfirm(false)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  return (
    <div 
      className="bg-white rounded-xl !p-4 shadow-sm border border-gray-100 mb-3" style={{pedding: '0.5rem'}}
      onMouseDown={!item.fixed ? handleLongPressStart : undefined}
      onMouseUp={!item.fixed ? handleLongPressEnd : undefined}
      onMouseLeave={!item.fixed ? handleLongPressEnd : undefined}
      onTouchStart={!item.fixed ? handleLongPressStart : undefined}
      onTouchEnd={!item.fixed ? handleLongPressEnd : undefined}
      title={!item.fixed ? "빈 영역을 길게 누르면 삭제" : ""}
    >
      <div className="flex items-center justify-between !mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <input
            type="text"
            value={item.name}
            onChange={(e) => updateRow(owner, item.id, 'name', e.target.value)}
            placeholder="항목명을 입력하세요"
            className="flex-1 text-base font-medium text-gray-800 bg-transparent border-none outline-none placeholder-gray-400"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500"></span>
          {item.fixed && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"></span>
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
            className="text-right text-lg font-semibold text-gray-800 bg-gray-50 rounded-lg !px-3 !py-2 border-none outline-none w-32"
            placeholder="0"
          />
          <span className="ml-2 text-sm text-gray-500">원</span>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800 mb-2">항목 삭제</h3>
              <p className="text-gray-600 mb-6">
                "{item.name}" 항목을 삭제하시겠습니까?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

ExpenseItem.displayName = 'ExpenseItem'

export default ExpenseItem
