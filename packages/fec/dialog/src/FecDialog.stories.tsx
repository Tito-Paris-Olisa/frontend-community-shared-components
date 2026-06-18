import type { Meta, StoryObj } from "@storybook/react";
import Button from "@mui/material/Button";
import { useState } from "react";
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
    children: {
      control: "text",
    },
  },
} satisfies Meta<typeof FecDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    const [confirmed, setConfirmed] = useState(false);

    return (
      <>
        <Button
          variant="outlined"
          onClick={() => {
            setConfirmed(false);
            setOpen(true);
          }}
        >
          Open Dialog
        </Button>
        {confirmed && (
          <p style={{ marginTop: 16, color: "green", fontWeight: 600 }}>
            ✓ Action confirmed!
          </p>
        )}
        <FecDialog
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setConfirmed(true)}
        />
      </>
    );
  },
  args: {
    title: "Dialog Title",
    children: "This is the dialog content.",
    confirmDisabled: false,
  },
};
