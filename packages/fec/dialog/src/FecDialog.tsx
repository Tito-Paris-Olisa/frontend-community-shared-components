import { ReactNode, useState, useEffect } from "react";
import MuiDialog, { DialogProps } from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

export type FecDialogProps = Omit<DialogProps, "open" | "onClose"> & {
  open?: boolean;
  title?: string;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
   confirmDisabled?: boolean;
};

export function FecDialog({
  title,
  children,
  open: openProp = false,
  onClose,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmDisabled = false,
  ...dialogProps
}: FecDialogProps) {
  const [open, setOpen] = useState(openProp);

  useEffect(() => {
    setOpen(openProp);
  }, [openProp]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleCancel = () => {
    setOpen(false);
    onCancel?.();
    onClose?.();
  };

  const handleConfirm = () => {
    setOpen(false);
    onConfirm?.();
    onClose?.();
  };

  return (
    <MuiDialog open={open} onClose={handleClose} {...dialogProps}>
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>{cancelLabel}</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </MuiDialog>
  );
}
