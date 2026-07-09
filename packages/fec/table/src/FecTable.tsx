import { ReactNode } from "react";
import Paper from "@mui/material/Paper";
import MuiTable, { TableProps } from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { TableCellProps } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

export type FecTableRow = Record<string, unknown> & {
  id?: string | number;
};

export type FecTableColumn = {
  key: string;
  header: ReactNode;
  align?: TableCellProps["align"];
  width?: number | string;
  render?: (value: unknown, row: FecTableRow, rowIndex: number) => ReactNode;
};

export type FecTableProps = Omit<TableProps, "children"> & {
  columns: FecTableColumn[];
  rows: FecTableRow[];
  caption?: string;
  emptyMessage?: ReactNode;
  loading?: boolean;
  loadingMessage?: ReactNode;
  getRowId?: (row: FecTableRow, rowIndex: number) => string | number;
  onRowClick?: (row: FecTableRow, rowIndex: number) => void;
};

export function formatFecTableCellValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function FecTable({
  columns,
  rows,
  caption,
  emptyMessage = "No rows to display.",
  loading = false,
  loadingMessage = "Loading table data...",
  getRowId,
  onRowClick,
  ...tableProps
}: FecTableProps) {
  const columnCount = Math.max(columns.length, 1);

  const resolveRowId = (row: FecTableRow, rowIndex: number) => {
    if (getRowId) {
      return getRowId(row, rowIndex);
    }

    if (typeof row.id === "string" || typeof row.id === "number") {
      return row.id;
    }

    return rowIndex;
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <MuiTable {...tableProps}>
        {caption && <caption>{caption}</caption>}

        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align}
                sx={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {loading && (
            <TableRow>
              <TableCell align="center" colSpan={columnCount}>
                {loadingMessage}
              </TableCell>
            </TableRow>
          )}

          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell align="center" colSpan={columnCount}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            rows.map((row, rowIndex) => {
              const isClickable = Boolean(onRowClick);

              return (
                <TableRow
                  hover={isClickable}
                  key={resolveRowId(row, rowIndex)}
                  onClick={
                    isClickable ? () => onRowClick?.(row, rowIndex) : undefined
                  }
                  sx={isClickable ? { cursor: "pointer" } : undefined}
                >
                  {columns.map((column) => {
                    const rawValue = row[column.key];
                    const content = column.render
                      ? column.render(rawValue, row, rowIndex)
                      : formatFecTableCellValue(rawValue);

                    return (
                      <TableCell
                        key={`${resolveRowId(row, rowIndex)}-${column.key}`}
                        align={column.align}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
}
