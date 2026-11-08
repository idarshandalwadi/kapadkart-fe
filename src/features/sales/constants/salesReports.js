export const DEFAULT_SALES_SORT = {
  sortBy: 'bill_no',
  sortOrder: 'desc',
}

export const SALES_HISTORY_TABLE_COLUMNS = [
  { key: 'bill_no', label: 'Bill No', sortKey: 'bill_no' },
  { key: 'name', label: 'Name', sortKey: 'name' },
  { key: 'village', label: 'Village', sortKey: 'village' },
  { key: 'order_date', label: 'Order Date', sortKey: 'order_date' },
  { key: 'return_date', label: 'Return Date', sortKey: 'return_date' },
  { key: 'products', label: 'Product & Code' },
  { key: 'qty', label: 'Qty', align: 'right' },
  { key: 'paid', label: 'Paid Amount', sortKey: 'paid_amount', align: 'right' },
  { key: 'due', label: 'Due Amount', sortKey: 'due_amount', align: 'right' },
  { key: 'total', label: 'Grand Total', sortKey: 'grand_total', align: 'right' },
]
