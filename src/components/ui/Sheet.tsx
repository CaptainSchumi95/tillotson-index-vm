import type { ReactNode } from 'react'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Spodný panel na mobile, centrovaný panel na počítači. */
export function Sheet({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  const { t } = useTranslation()
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[rgb(8_12_20/0.45)] backdrop-blur-[2px]" />
        <Drawer.Content
          className={
            'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col ' +
            'rounded-t-[28px] bg-surface outline-none shadow-float lg:bottom-6 lg:rounded-[28px]'
          }
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong lg:hidden" />
          <div className="flex items-start gap-3 px-6 pt-4 pb-2 lg:pt-6">
            <div className="min-w-0 flex-1">
              <Drawer.Title className="display text-[1.35rem]">{title}</Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-2 text-[0.95rem] text-ink-2">{description}</Drawer.Description>
              ) : (
                <Drawer.Description className="sr-only">{title}</Drawer.Description>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('common.close')}
              className="-mt-1 -mr-2 grid size-10 place-items-center rounded-full text-ink-3 hover:bg-sunken"
            >
              <X className="size-5" />
            </button>
          </div>
          <div data-vaul-no-drag="" className="min-h-0 flex-1 overflow-y-auto px-6 pt-3 pb-4">
            {children}
          </div>
          {footer && <div className="safe-bottom border-t border-line px-6 pt-4 pb-4 lg:pb-6">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
