export type FecDialogProps = {
  label?: string;
};

export function FecDialog({ label = "FecDialog" }: FecDialogProps) {
  return <div>{label}</div>;
}
