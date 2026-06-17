import type { Meta, StoryObj } from "@storybook/react";
import { SalesButton } from "./SalesButton";

const meta = {
  title: "sales/SalesButton",
  component: SalesButton
} satisfies Meta<typeof SalesButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "SalesButton"
  }
};
