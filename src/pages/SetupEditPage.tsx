import { useParams, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SetupEditor } from '@/components/setup/SetupEditor'
import { PageHeader } from '@/components/ui/PageHeader'
import { FullScreenLoader } from '@/components/ui/Spinner'
import {
  safe,
  useCan,
  useCurrentKart,
  useCurrentTeam,
  useSaveSetup,
  useSaveVariant,
  useSetupFields,
  useSetupRevisions,
  useSetupVariants,
} from '@/data/queries'
import { KartPlate } from '@/components/ui/Identity'

/** Úprava aktuálneho setupu motokáry (/setup/edit). */
export function SetupEditPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const fields = useSetupFields(team?.id)
  const revisions = useSetupRevisions(kart?.id)
  const save = useSaveSetup(kart?.id ?? '')

  if (!kart || !can('setup.edit')) return null
  if (revisions.isPending) return <FullScreenLoader />

  const current = revisions.data?.[0]?.values ?? {}

  return (
    <>
      <PageHeader
        back
        title={t('setup.editTitle')}
        action={<KartPlate number={kart.number} size="md" />}
      />
      <SetupEditor
        fields={fields}
        initial={current}
        onSave={(values, note) => {
          // Neuložené čakáme bez signálu vo fronte – nečakáme na server.
          save.mutate({
            id: crypto.randomUUID(),
            kartId: kart.id,
            values,
            note,
            recordedAt: new Date().toISOString(),
          })
          router.history.back()
        }}
      />
    </>
  )
}

/** Úprava variantu (/setup/variants/$variantId). */
export function VariantEditPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { variantId } = useParams({ strict: false }) as { variantId: string }
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const fields = useSetupFields(team?.id)
  const variants = useSetupVariants(kart?.id)
  const save = useSaveVariant(kart?.id ?? '')

  if (!kart || !can('setup.edit')) return null
  if (variants.isPending) return <FullScreenLoader />
  const variant = variants.data?.find((v) => v.id === variantId)
  if (!variant) return null

  return (
    <>
      <PageHeader back eyebrow={t('setup.variants.edit')} title={variant.name} />
      <SetupEditor
        fields={fields}
        initial={variant.values}
        withNote={false}
        saving={save.isPending}
        onSave={async (values) => {
          const r = await safe(save.mutateAsync({ id: variant.id, name: variant.name, values }))
          if (r.ok) router.history.back()
        }}
      />
    </>
  )
}
