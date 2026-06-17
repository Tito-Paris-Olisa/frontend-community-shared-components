import type { Meta, StoryObj } from "@storybook/react";
import { SalesButton } from "./SalesButton";

const meta = {
  title: "Sales/SalesButton",
  component: SalesButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "SalesButton is the standard button component for Sales-owned features.",
      },
    },
  },
  args: {
    children: "Click me",
    variant: "contained",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["contained", "outlined", "text"],
    },
  },
} satisfies Meta<typeof SalesButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Outlined: Story = {
  args: {
    variant: "outlined",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
