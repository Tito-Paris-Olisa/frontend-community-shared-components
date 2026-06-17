import type { Meta, StoryObj } from "@storybook/react";
import { FecDialog } from "./FecDialog";

const meta = {
  title: "fec/FecDialog",
  component: FecDialog
} satisfies Meta<typeof FecDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "FecDialog"
  }
};
