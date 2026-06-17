export type SalesButtonProps = {
  label?: string;
};

export function SalesButton({ label = "SalesButton" }: SalesButtonProps) {
  return <div>{label}</div>;
}
