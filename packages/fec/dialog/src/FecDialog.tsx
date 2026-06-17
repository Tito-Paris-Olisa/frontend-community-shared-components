import { ReactNode } from "react";
import MuiDialog, { DialogProps } from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

export type FecDialogProps = DialogProps & {
  title?: string;
  actions?: ReactNode;
};

export function FecDialog({
  title,
  actions,
  children,
  ...dialogProps
}: FecDialogProps) {
  return (
    <MuiDialog {...dialogProps}>
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </MuiDialog>
  );
}
