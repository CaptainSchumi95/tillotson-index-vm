import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Sheet } from './Sheet'

/** Potvrdenie nevratnej akcie (odstránenie a pod.). */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  loading,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  body?: ReactNode
  confirmLabel: ReactNode
  onConfirm: () => void
  loading?: boolean
  error?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={body}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            block
            size="lg"
            loading={loading}
            onClick={onConfirm}
            className="bg-danger! text-white! sm:flex-1"
          >
            {confirmLabel}
          </Button>
          <Button block size="lg" variant="secondary" onClick={() => onOpenChange(false)} className="sm:flex-1">
            {t('common.cancel')}
          </Button>
        </div>
      }
    >
      {error ? <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-[0.95rem] text-danger">{error}</p> : <div />}
    </Sheet>
  )
}
