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
    label: "SalesTextInput"
  }
};
