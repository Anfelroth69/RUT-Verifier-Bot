import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { HistoryItem } from '../types'

const columnHelper = createColumnHelper<HistoryItem>()

const columns = [
  columnHelper.accessor('cedula', {
    header: 'Cédula',
    cell: (info) => (
      <span className="font-medium text-gray-900">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('rut_exists', {
    header: 'Estado RUT',
    cell: (info) => {
      const value = info.getValue()
      let label: string
      let color: string
      if (value === true) {
        label = 'Activo'
        color = 'bg-green-100 text-green-800'
      } else if (value === false) {
        label = 'Sin RUT'
        color = 'bg-red-100 text-red-800'
      } else {
        label = 'Error'
        color = 'bg-yellow-100 text-yellow-800'
      }
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
          {label}
        </span>
      )
    },
  }),
  columnHelper.accessor('timestamp', {
    header: 'Fecha',
    cell: (info) => {
      const date = new Date(info.getValue())
      return (
        <span className="text-sm text-gray-500">
          {date.toLocaleString('es-CO')}
        </span>
      )
    },
  }),
  columnHelper.accessor('message', {
    header: 'Resultado',
    cell: (info) => (
      <span className="text-sm text-gray-600 truncate max-w-[200px] block">
        {info.getValue() || 'Sin mensaje'}
      </span>
    ),
  }),
]

interface VerificationTableProps {
  data: HistoryItem[]
}

export function VerificationTable({ data }: VerificationTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        Aún no hay consultas en el historial.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
