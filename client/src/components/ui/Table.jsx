import { EmptyState } from './Feedback';

export function DataTable({ columns, rows, emptyTitle = 'داده‌ای برای نمایش وجود ندارد', emptyDescription, rowKey = (row, i) => row.id ?? i }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="table-wrap">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
