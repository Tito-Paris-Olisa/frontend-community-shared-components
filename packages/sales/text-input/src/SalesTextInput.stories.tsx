import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SalesTextInput } from "./SalesTextInput";

const meta = {
  title: "Sales/SalesTextInput",
  component: SalesTextInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "SalesTextInput is the standard text input component for Sales-owned forms.",
      },
    },
  },
  args: {
    label: "Email",
    variant: "outlined",
  },
} satisfies Meta<typeof SalesTextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState("");

    return (
      <SalesTextInput
        {...args}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    );
  },
};

export const WithHelperText: Story = {
  args: {
    helperText: "We'll never share your email",
  },
};

export const Error: Story = {
  args: {
    error: true,
    helperText: "Invalid email address",
  },
};
