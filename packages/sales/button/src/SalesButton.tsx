import MuiButton, { ButtonProps } from "@mui/material/Button";

export type SalesButtonProps = ButtonProps;

export function SalesButton(props: SalesButtonProps) {
  return <MuiButton {...props} />;
}
