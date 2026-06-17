import MuiTextField, { TextFieldProps } from "@mui/material/TextField";

export type SalesTextInputProps = TextFieldProps;

export function SalesTextInput(props: SalesTextInputProps) {
  return <MuiTextField {...props} />;
}
