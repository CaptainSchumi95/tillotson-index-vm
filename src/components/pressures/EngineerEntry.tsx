import { Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'

/** Vstup do výpočtu tlakov – iba pre rolu s oprávnením pressure.engineer. */
export function EngineerEntry() {
  const { t } = useTranslation()
  return (
    <ListGroup>
      <ListRow
        leading={
          <RowIcon tone="accent">
            <Gauge className="size-5" />
          </RowIcon>
        }
        title={t('pressures.open')}
        subtitle={t('pressures.openHint')}
        to="/pressures"
      />
    </ListGroup>
  )
}
