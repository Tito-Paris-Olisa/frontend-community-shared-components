import type { Meta, StoryObj } from "@storybook/react";
import { FecDialog } from "./FecDialog";
import Button from "@mui/material/Button";

const meta = {
  title: "fec/FecDialog",
  component: FecDialog,
} satisfies Meta<typeof FecDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    title: "Dialog Title",
    children: "This is the dialog content.",
    actions: (
      <>
        <Button onClick={() => {}}>Cancel</Button>
        <Button variant="contained" onClick={() => {}}>
          Confirm
        </Button>
      </>
    ),
  },
};
