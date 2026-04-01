const colors = {
  Active:   'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Paused:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Closed:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Draft:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Pending:  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Reviewed: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Testing:  'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Hired:    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Accepted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Expired:  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function Badge({ status, label }) {
  const cls = colors[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label || status}
    </span>
  )
}
