import type { Meta, StoryObj } from "@storybook/react";
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
