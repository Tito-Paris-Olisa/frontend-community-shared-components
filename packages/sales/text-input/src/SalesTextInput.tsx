export type SalesTextInputProps = {
  label?: string;
};

export function SalesTextInput({ label = "SalesTextInput" }: SalesTextInputProps) {
  return <div>{label}</div>;
}
