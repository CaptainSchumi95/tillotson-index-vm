import { useEffect, useState, type FormEvent } from 'react'
import { Check, MailCheck, Send, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Sheet } from '@/components/ui/Sheet'
import { errorCode, safe, useInviteMember, useKarts, useRoles } from '@/data/queries'
import type { InviteResult } from '@/data/types'
import { KartMultiSelect, RolePicker } from './pickers'

/** Pozvanie člena cez Google e-mail – s rolou a pridelenými motokárami. */
export function InviteSheet({
  teamId,
  open,
  onOpenChange,
}: {
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const roles = useRoles(teamId)
  const karts = useKarts(teamId)
  const invite = useInviteMember(teamId)
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState<string | null>(null)
  const [kartIds, setKartIds] = useState<string[]>([])
  const [result, setResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Predvolene „Mechanik“ – najčastejší prípad.
  const defaultRole = roles.data?.find((r) => r.preset === 'mechanic') ?? roles.data?.[0]

  useEffect(() => {
    if (open) {
      setEmail('')
      setKartIds([])
      setResult(null)
      setCopied(false)
      invite.reset()
    }
  }, [open])

  useEffect(() => {
    if (open && !roleId && defaultRole) setRoleId(defaultRole.id)
  }, [open, roleId, defaultRole])

  const role = roles.data?.find((r) => r.id === roleId)
  const seesAll = role?.permissions.includes('kart.all')
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && !!roleId

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || !roleId) return
    const r = await safe(invite.mutateAsync({ email: email.trim(), roleId, kartIds: seesAll ? [] : kartIds }))
    if (r.ok) setResult(r.value)
  }

  async function share() {
    const url = window.location.origin
    const text = t('members.shareText', { email: email.trim() })
    if (navigator.share) {
      try {
        await navigator.share({ title: t('app.name'), text, url })
        return
      } catch {
        /* zrušené – skúsime schránku */
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`)
    setCopied(true)
  }

  const code = errorCode(invite.error)

  if (result)
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={result === 'added' ? t('members.added') : t('members.invited')}
        footer={
          result === 'invited' ? (
            <div className="flex flex-col gap-3">
              <Button block size="lg" icon={copied ? <Check className="size-5" /> : <Send className="size-5" />} onClick={() => void share()}>
                {copied ? t('members.copied') : t('members.share')}
              </Button>
              <Button block size="lg" variant="secondary" onClick={() => onOpenChange(false)}>
                {t('common.done')}
              </Button>
            </div>
          ) : (
            <Button block size="lg" onClick={() => onOpenChange(false)}>
              {t('common.done')}
            </Button>
          )
        }
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-5 grid size-16 place-items-center rounded-[20px] bg-accent-soft text-accent-ink">
            {result === 'added' ? <UserCheck className="size-8" /> : <MailCheck className="size-8" />}
          </div>
          <p className="max-w-[34ch] leading-relaxed text-ink-2">
            {result === 'added'
              ? t('members.addedBody', { email: email.trim() })
              : t('members.invitedBody', { email: email.trim() })}
          </p>
        </div>
      </Sheet>
    )

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('members.invite')}
      description={t('members.inviteHint')}
      footer={
        <div className="space-y-3">
          {invite.isError && (
            <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-[0.92rem] leading-snug text-danger">
              {code ? t(`errors.${code}`) : t('common.error')}
            </p>
          )}
          <Button form="invite-form" type="submit" block size="lg" disabled={!valid} loading={invite.isPending}>
            {t('members.send')}
          </Button>
        </div>
      }
    >
      <form id="invite-form" onSubmit={submit} className="space-y-7">
        <Field
          label={t('members.email')}
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t('members.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Section title={t('members.role')}>
          {roles.data && <RolePicker roles={roles.data} value={roleId} onChange={setRoleId} />}
        </Section>

        <Section title={t('members.karts')}>
          {seesAll ? (
            <p className="px-1 text-[0.92rem] text-ink-3">{t('members.kartsAll')}</p>
          ) : karts.data && karts.data.length > 0 ? (
            <>
              <KartMultiSelect karts={karts.data} value={kartIds} onChange={setKartIds} />
              <p className="px-1 text-[0.85rem] text-ink-3">{t('members.kartsHint')}</p>
            </>
          ) : (
            <p className="px-1 text-[0.92rem] text-ink-3">{t('members.noKarts')}</p>
          )}
        </Section>

      </form>
    </Sheet>
  )
}
