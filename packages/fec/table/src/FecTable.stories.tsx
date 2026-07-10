import type { Meta, StoryObj } from "@storybook/react";
import Checkbox from "@mui/material/Checkbox";
import { useState } from "react";
import { FecTable } from "./FecTable";

const columns = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "active", header: "Active", align: "center" as const },
];

const rows = [
  {
    id: "u-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    active: true,
  },
  {
    id: "u-2",
    name: "Grace Hopper",
    email: "grace@example.com",
    active: false,
  },
];

const meta = {
  title: "FEC/FecTable",
  component: FecTable,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "FecTable is the standard table component for FEC-owned screens that need a consistent, lightweight data table.",
      },
    },
  },
  args: {
    columns,
    rows,
    size: "small",
    stickyHeader: false,
  },
} satisfies Meta<typeof FecTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Empty: Story = {
  args: {
    rows: [],
    emptyMessage: "No users matched your filters.",
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    rows: [],
    loadingMessage: "Fetching the latest users...",
  },
};

export const SelectableWithCheckboxes: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(["u-1"]);

    const isSelected = (id: string) => selectedIds.includes(id);

    const toggleSelection = (id: string) => {
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      );
    };

    const selectableColumns = [
      {
        key: "selected",
        header: "",
        align: "center" as const,
        width: 64,
        render: (_value: unknown, row: { id?: string | number }) => {
          const rowId = String(row.id ?? "");

          return (
            <Checkbox
              checked={isSelected(rowId)}
              onClick={(event) => event.stopPropagation()}
              onChange={() => toggleSelection(rowId)}
              inputProps={{ "aria-label": `Select ${rowId}` }}
            />
          );
        },
      },
      ...columns,
    ];

    return (
      <FecTable
        columns={selectableColumns}
        rows={rows}
        size="small"
        onRowClick={(row) => {
          const rowId = String(row.id ?? "");
          toggleSelection(rowId);
        }}
        caption={`Selected users: ${selectedIds.length}`}
      />
    );
  },
};
