import type { Meta, StoryObj } from "@storybook/react";
import { SalesTextInput } from "./SalesTextInput";

const meta = {
  title: "sales/SalesTextInput",
  component: SalesTextInput
} satisfies Meta<typeof SalesTextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Email",
    variant: "outlined"
  }
};

export const WithHelperText: Story = {
  args: {
    label: "Email",
    helperText: "We'll never share your email",
    variant: "outlined"
  }
};

export const Error: Story = {
  args: {
    label: "Email",
    error: true,
    helperText: "Invalid email address",
    variant: "outlined"
  }
};
