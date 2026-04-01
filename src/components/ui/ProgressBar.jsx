export default function ProgressBar({ value = 0, label, showValue = true, color = 'brand' }) {
  const colorMap = {
    brand: 'bg-brand-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
  }
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {showValue && <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{value}%</span>}
        </div>
      )}
      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorMap[color] || colorMap.brand}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}
