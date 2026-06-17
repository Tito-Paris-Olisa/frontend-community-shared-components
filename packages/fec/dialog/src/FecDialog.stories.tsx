import type { Meta, StoryObj } from "@storybook/react";
import Button from "@mui/material/Button";
import { FecDialog } from "./FecDialog";

const meta = {
  title: "FEC/FecDialog",
  component: FecDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "FecDialog is the standard dialog component for FEC-owned workflows.",
      },
    },
  },
  argTypes: {
    actions: {
      control: false,
    },
    children: {
      control: "text",
    },
  },
} satisfies Meta<typeof FecDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    title: "Dialog Title",
    children: "This is the dialog content.",
    actions: (
      <>
        <Button>Cancel</Button>
        <Button variant="contained">Confirm</Button>
      </>
    ),
  },
};
