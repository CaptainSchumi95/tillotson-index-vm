import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normalizeUnitPrefs } from '@/lib/units'
import type { AuthUser, Backend } from './backend'
import {
  KNOWN_ERRORS,
  type ChatChannel,
  type ChatMessage,
  type ChecklistCheck,
  type ChecklistItem,
  type CustomSetupField,
  type ScheduleItem,
  type Session,
  type TeamEvent,
  type Track,
  type TrackSetup,
  type Invitation,
  type KartNote,
  type PressureOrder,
  type PressureSampleRow,
  type SessionPressures,
  type ServiceEntry,
  type Kart,
  type Member,
  type MyTeam,
  type Permission,
  type Role,
  type SetupRevision,
  type SetupVariant,
  type TeamRole,
} from './types'

type Row = Record<string, any>

function toRole(r: Row): Role {
  return { id: r.id, name: r.name, preset: r.preset ?? null }
}

/** Vnorené merania – PostgREST vráti objekt (1:1) alebo pole. */
function toPressures(v: Row | Row[] | null | undefined): SessionPressures | null {
  const r = Array.isArray(v) ? v[0] : v
  if (!r) return null
  return {
    airTemp: r.air_temp == null ? null : Number(r.air_temp),
    trackTemp: r.track_temp == null ? null : Number(r.track_temp),
    tires: r.tires ?? {},
  }
}

const num = (v: unknown) => (v == null ? null : Number(v))

function toMessage(r: Row): ChatMessage {
  return { id: r.id, channelId: r.channel_id, authorId: r.author_id, body: r.body, createdAt: r.created_at }
}

function toAuthor(r: Row | null) {
  return r ? { id: r.id as string, name: r.name as string, avatarUrl: r.avatar_url as string | null } : null
}

function toKart(r: Row): Kart {
  return { id: r.id, teamId: r.team_id, number: r.number, driverName: r.driver_name }
}

/** Chyby z databázových funkcií (raise exception 'last_manager' …) prevedie na známy kód. */
function must<T>(res: { data: T; error: { message?: string } | null }): T {
  if (res.error) {
    const code = KNOWN_ERRORS.find((c) => res.error?.message === c)
    throw code ? new Error(code) : res.error
  }
  return res.data
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  async function uid(): Promise<string> {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('not authenticated')
    return id
  }

  async function upload(path: string, file: Blob): Promise<string> {
    must(await sb.storage.from('media').upload(path, file, { upsert: true, contentType: 'image/jpeg' }))
    return sb.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  return {
    kind: 'supabase',

    async getUser() {
      const { data } = await sb.auth.getSession()
      return data.session ? { id: data.session.user.id } : null
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        cb(session ? ({ id: session.user.id } satisfies AuthUser) : null)
      })
      return () => data.subscription.unsubscribe()
    },

    async signIn() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async afterSignIn() {
      must(await sb.rpc('accept_invitations'))
    },

    async getProfile() {
      const r = must(await sb.from('profiles').select('*').eq('id', await uid()).single())
      return {
        id: r.id,
        email: r.email,
        name: r.name,
        avatarUrl: r.avatar_url,
        locale: r.locale,
        unitPrefs: normalizeUnitPrefs(r.unit_prefs),
      }
    },

    async updateProfile(patch) {
      const row: Row = {}
      if (patch.name !== undefined) row.name = patch.name
      if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl
      if (patch.locale !== undefined) row.locale = patch.locale
      if (patch.unitPrefs !== undefined) row.unit_prefs = patch.unitPrefs
      must(await sb.from('profiles').update(row).eq('id', await uid()))
    },

    async uploadAvatar(file) {
      return upload(`avatars/${await uid()}/${Date.now()}.jpg`, file)
    },

    async listMyTeams() {
      const rows = must(
        await sb
          .from('memberships')
          .select('id, team:teams(id, name, color, icon_url), role:roles(id, name, preset, role_permissions(permission))')
          .eq('profile_id', await uid()),
      ) as Row[]
      return rows
        .map(
          (m): MyTeam => ({
            id: m.team.id,
            name: m.team.name,
            color: m.team.color,
            iconUrl: m.team.icon_url,
            membershipId: m.id,
            role: toRole(m.role),
            permissions: (m.role.role_permissions as Row[]).map((p) => p.permission as Permission),
          }),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    async createTeam(name, color) {
      return must(await sb.rpc('create_team', { p_name: name, p_color: color })) as string
    },

    async updateTeam(teamId, patch) {
      const row: Row = {}
      if (patch.name !== undefined) row.name = patch.name
      if (patch.color !== undefined) row.color = patch.color
      if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl
      must(await sb.from('teams').update(row).eq('id', teamId))
    },

    async deleteTeam(teamId) {
      must(await sb.from('teams').delete().eq('id', teamId))
    },

    async uploadTeamIcon(teamId, file) {
      return upload(`teams/${teamId}/icon-${Date.now()}.jpg`, file)
    },

    async listMembers(teamId) {
      const rows = must(
        await sb
          .from('memberships')
          .select(
            'id, profile:profiles(id, name, email, avatar_url), role:roles(id, name, preset, sort_order), kart_assignments(kart_id)',
          )
          .eq('team_id', teamId),
      ) as Row[]
      return rows
        .sort((a, b) => a.role.sort_order - b.role.sort_order || a.profile.name.localeCompare(b.profile.name))
        .map(
          (m): Member => ({
            membershipId: m.id,
            profile: { id: m.profile.id, name: m.profile.name, email: m.profile.email, avatarUrl: m.profile.avatar_url },
            role: toRole(m.role),
            kartIds: (m.kart_assignments as Row[]).map((a) => a.kart_id),
          }),
        )
    },

    async updateMember(membershipId, roleId, kartIds) {
      must(await sb.rpc('update_member', { p_membership: membershipId, p_role: roleId, p_karts: kartIds }))
    },

    async removeMember(membershipId) {
      must(await sb.rpc('remove_member', { p_membership: membershipId }))
    },

    async listInvitations(teamId) {
      const rows = must(
        await sb
          .from('invitations')
          .select('id, email, kart_ids, role:roles(id, name, preset)')
          .eq('team_id', teamId)
          .order('created_at'),
      ) as Row[]
      return rows.map((r): Invitation => ({ id: r.id, email: r.email, role: toRole(r.role), kartIds: r.kart_ids ?? [] }))
    },

    async inviteMember(teamId, email, roleId, kartIds) {
      return must(
        await sb.rpc('invite_member', { p_team: teamId, p_email: email, p_role: roleId, p_karts: kartIds }),
      ) as 'added' | 'invited'
    },

    async cancelInvitation(invitationId) {
      must(await sb.from('invitations').delete().eq('id', invitationId))
    },

    async listRoles(teamId) {
      const rows = must(
        await sb
          .from('roles')
          .select('id, name, preset, sort_order, role_permissions(permission), memberships(count)')
          .eq('team_id', teamId)
          .order('sort_order'),
      ) as Row[]
      return rows.map(
        (r): TeamRole => ({
          ...toRole(r),
          permissions: (r.role_permissions as Row[]).map((p) => p.permission as Permission),
          memberCount: r.memberships?.[0]?.count ?? 0,
        }),
      )
    },

    async saveRole(teamId, input) {
      return must(
        await sb.rpc('save_role', {
          p_team: teamId,
          p_role: input.id ?? null,
          p_name: input.name,
          p_permissions: input.permissions,
        }),
      ) as string
    },

    async deleteRole(roleId) {
      must(await sb.rpc('delete_role', { p_role: roleId }))
    },

    async listKarts(teamId) {
      const rows = must(
        await sb.from('karts').select('id, team_id, number, driver_name').eq('team_id', teamId).eq('archived', false),
      ) as Row[]
      return rows.map(toKart).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    },

    async createKart(teamId, input) {
      const r = must(
        await sb
          .from('karts')
          .insert({ team_id: teamId, number: input.number, driver_name: input.driverName })
          .select('id')
          .single(),
      )
      return r!.id as string
    },

    async updateKart(kartId, input) {
      must(await sb.from('karts').update({ number: input.number, driver_name: input.driverName }).eq('id', kartId))
    },

    async archiveKart(kartId) {
      must(await sb.from('karts').update({ archived: true }).eq('id', kartId))
    },

    async listSetupRevisions(kartId) {
      const rows = must(
        await sb
          .from('setup_revisions')
          .select('id, kart_id, values, note, recorded_at, author:profiles(id, name, avatar_url)')
          .eq('kart_id', kartId)
          .order('recorded_at', { ascending: false })
          .limit(100),
      ) as Row[]
      return rows.map(
        (r): SetupRevision => ({
          id: r.id,
          kartId: r.kart_id,
          values: r.values ?? {},
          note: r.note,
          recordedAt: r.recorded_at,
          author: r.author ? { id: r.author.id, name: r.author.name, avatarUrl: r.author.avatar_url } : null,
        }),
      )
    },

    async saveSetupRevision(input) {
      must(
        await sb.from('setup_revisions').upsert(
          {
            id: input.id,
            kart_id: input.kartId,
            values: input.values,
            note: input.note,
            recorded_at: input.recordedAt,
            author_id: await uid(),
          },
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      )
    },

    async listSetupVariants(kartId) {
      const rows = must(
        await sb.from('setup_variants').select('id, kart_id, name, values, updated_at').eq('kart_id', kartId).order('name'),
      ) as Row[]
      return rows.map(
        (r): SetupVariant => ({ id: r.id, kartId: r.kart_id, name: r.name, values: r.values ?? {}, updatedAt: r.updated_at }),
      )
    },

    async saveSetupVariant(input) {
      const row = { kart_id: input.kartId, name: input.name, values: input.values }
      if (input.id) {
        must(await sb.from('setup_variants').update(row).eq('id', input.id))
        return input.id
      }
      return must(await sb.from('setup_variants').insert(row).select('id').single())!.id as string
    },

    async deleteSetupVariant(variantId) {
      must(await sb.from('setup_variants').delete().eq('id', variantId))
    },

    async listSetupFields(teamId) {
      const rows = must(
        await sb.from('setup_fields').select('id, group_key, label, unit').eq('team_id', teamId).order('sort_order').order('created_at'),
      ) as Row[]
      return rows.map((r): CustomSetupField => ({ id: r.id, group: r.group_key, label: r.label, unit: r.unit }))
    },

    async saveSetupField(teamId, input) {
      const row = { team_id: teamId, group_key: input.group, label: input.label, unit: input.unit }
      if (input.id) {
        must(await sb.from('setup_fields').update(row).eq('id', input.id))
        return input.id
      }
      return must(await sb.from('setup_fields').insert(row).select('id').single())!.id as string
    },

    async deleteSetupField(fieldId) {
      must(await sb.from('setup_fields').delete().eq('id', fieldId))
    },

    async listNotes(kartId) {
      const rows = must(
        await sb
          .from('kart_notes')
          .select('id, kart_id, text, recorded_at, author:profiles(id, name, avatar_url)')
          .eq('kart_id', kartId)
          .order('recorded_at', { ascending: false })
          .limit(200),
      ) as Row[]
      return rows.map(
        (r): KartNote => ({ id: r.id, kartId: r.kart_id, text: r.text, recordedAt: r.recorded_at, author: toAuthor(r.author) }),
      )
    },

    async saveNote(input) {
      must(
        await sb
          .from('kart_notes')
          .upsert(
            { id: input.id, kart_id: input.kartId, text: input.text, recorded_at: input.recordedAt, author_id: await uid() },
            { onConflict: 'id', ignoreDuplicates: true },
          ),
      )
    },

    async deleteNote(noteId) {
      must(await sb.from('kart_notes').delete().eq('id', noteId))
    },

    async listService(kartId) {
      const rows = must(
        await sb
          .from('service_log')
          .select('id, kart_id, kind, performed_on, engine_hours, note, author:profiles(id, name, avatar_url)')
          .eq('kart_id', kartId)
          .order('performed_on', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(200),
      ) as Row[]
      return rows.map(
        (r): ServiceEntry => ({
          id: r.id,
          kartId: r.kart_id,
          kind: r.kind,
          performedOn: r.performed_on,
          engineHours: r.engine_hours == null ? null : Number(r.engine_hours),
          note: r.note,
          author: toAuthor(r.author),
        }),
      )
    },

    async saveService(input) {
      must(
        await sb.from('service_log').upsert(
          {
            id: input.id,
            kart_id: input.kartId,
            kind: input.kind,
            performed_on: input.performedOn,
            engine_hours: input.engineHours,
            note: input.note,
            author_id: await uid(),
          },
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      )
    },

    async deleteService(entryId) {
      must(await sb.from('service_log').delete().eq('id', entryId))
    },

    async listEvents(teamId) {
      const rows = must(
        await sb
          .from('events')
          .select('id, kind, name, date_from, date_to, track_name, track_id, notes, event_karts(kart_id, round)')
          .eq('team_id', teamId)
          .order('date_from', { ascending: false })
          .limit(200),
      ) as Row[]
      return rows.map(
        (r): TeamEvent => ({
          id: r.id,
          kind: r.kind,
          name: r.name,
          dateFrom: r.date_from,
          dateTo: r.date_to,
          trackName: r.track_name,
          trackId: r.track_id ?? null,
          notes: r.notes,
          karts: (r.event_karts as Row[]).map((k) => ({ kartId: k.kart_id, round: k.round })),
        }),
      )
    },

    async saveEvent(teamId, input) {
      return must(
        await sb.rpc('save_event', {
          p_id: input.id ?? null,
          p_team: teamId,
          p_kind: input.kind,
          p_name: input.name,
          p_from: input.dateFrom,
          p_to: input.dateTo,
          p_track: input.trackName,
          p_notes: input.notes,
          p_karts: input.kartIds,
          p_track_id: input.trackId,
        }),
      ) as string
    },

    async deleteEvent(eventId) {
      must(await sb.from('events').delete().eq('id', eventId))
    },

    async listSchedule(eventId) {
      const rows = must(
        await sb
          .from('schedule_items')
          .select('id, event_id, day, time, title')
          .eq('event_id', eventId)
          .order('day')
          .order('time', { nullsFirst: true }),
      ) as Row[]
      return rows.map(
        (r): ScheduleItem => ({ id: r.id, eventId: r.event_id, day: r.day, time: r.time ? String(r.time).slice(0, 5) : null, title: r.title }),
      )
    },

    async saveScheduleItem(input) {
      const row = { event_id: input.eventId, day: input.day, time: input.time, title: input.title }
      if (input.id) must(await sb.from('schedule_items').update(row).eq('id', input.id))
      else must(await sb.from('schedule_items').insert(row))
    },

    async deleteScheduleItem(itemId) {
      must(await sb.from('schedule_items').delete().eq('id', itemId))
    },

    async listChecklistItems(teamId) {
      const rows = must(
        await sb.from('checklist_items').select('id, phase, text, sort_order').eq('team_id', teamId).order('sort_order').order('created_at'),
      ) as Row[]
      return rows.map((r): ChecklistItem => ({ id: r.id, phase: r.phase, text: r.text, sortOrder: r.sort_order }))
    },

    async saveChecklistItem(teamId, input) {
      const row = { team_id: teamId, phase: input.phase, text: input.text, sort_order: input.sortOrder }
      if (input.id) must(await sb.from('checklist_items').update(row).eq('id', input.id))
      else must(await sb.from('checklist_items').insert(row))
    },

    async deleteChecklistItem(itemId) {
      must(await sb.from('checklist_items').delete().eq('id', itemId))
    },

    async listChecks(eventId, kartId) {
      const rows = must(
        await sb
          .from('checklist_checks')
          .select('item_id, round, done_at, author:profiles(id, name, avatar_url)')
          .eq('event_id', eventId)
          .eq('kart_id', kartId),
      ) as Row[]
      return rows.map(
        (r): ChecklistCheck => ({ itemId: r.item_id, round: r.round, doneAt: r.done_at, doneBy: toAuthor(r.author) }),
      )
    },

    async setCheck(input) {
      const key = { event_id: input.eventId, kart_id: input.kartId, item_id: input.itemId, round: input.round }
      if (input.done) {
        must(
          await sb
            .from('checklist_checks')
            .upsert({ ...key, done_by: await uid() }, { onConflict: 'event_id,kart_id,item_id,round', ignoreDuplicates: true }),
        )
      } else {
        must(await sb.from('checklist_checks').delete().match(key))
      }
    },

    async setRound(eventId, kartId, round) {
      must(await sb.from('event_karts').update({ round }).eq('event_id', eventId).eq('kart_id', kartId))
    },

    async listSessions(kartId) {
      const rows = must(
        await sb
          .from('sessions')
          .select(
            'id, event_id, kart_id, label, best_lap_ms, laps, track_condition, conditions_note, balance, behaviour, driver_feedback, next_plan, setup_revision_id, recorded_at, author:profiles(id, name, avatar_url), session_pressures(air_temp, track_temp, tires)',
          )
          .eq('kart_id', kartId)
          .order('recorded_at', { ascending: false })
          .limit(300),
      ) as Row[]
      return rows.map(
        (r): Session => ({
          id: r.id,
          eventId: r.event_id,
          kartId: r.kart_id,
          label: r.label,
          bestLapMs: r.best_lap_ms,
          laps: r.laps,
          trackCondition: r.track_condition,
          conditionsNote: r.conditions_note,
          balance: r.balance,
          behaviour: r.behaviour,
          driverFeedback: r.driver_feedback,
          nextPlan: r.next_plan,
          setupRevisionId: r.setup_revision_id,
          pressures: toPressures(r.session_pressures),
          recordedAt: r.recorded_at,
          author: toAuthor(r.author),
        }),
      )
    },

    async saveSession(input) {
      must(
        await sb.from('sessions').upsert(
          {
            id: input.id,
            event_id: input.eventId,
            kart_id: input.kartId,
            label: input.label,
            best_lap_ms: input.bestLapMs,
            laps: input.laps,
            track_condition: input.trackCondition,
            conditions_note: input.conditionsNote,
            balance: input.balance,
            behaviour: input.behaviour,
            driver_feedback: input.driverFeedback,
            next_plan: input.nextPlan,
            setup_revision_id: input.setupRevisionId,
            recorded_at: input.recordedAt,
            author_id: await uid(),
          },
          { onConflict: 'id' },
        ),
      )
      if (input.pressures) {
        must(
          await sb.from('session_pressures').upsert(
            {
              session_id: input.id,
              kart_id: input.kartId,
              air_temp: input.pressures.airTemp,
              track_temp: input.pressures.trackTemp,
              tires: input.pressures.tires,
            },
            { onConflict: 'session_id' },
          ),
        )
      }
    },

    async deleteSession(sessionId) {
      must(await sb.from('sessions').delete().eq('id', sessionId))
    },

    async setSessionFeedback(sessionId, text) {
      must(await sb.rpc('set_session_feedback', { p_session: sessionId, p_text: text }))
    },

    async listTracks(teamId) {
      const rows = must(
        await sb.from('tracks').select('id, team_id, name, location, length_m').or(`team_id.is.null,team_id.eq.${teamId}`).order('name'),
      ) as Row[]
      return rows.map(
        (r): Track => ({ id: r.id, teamId: r.team_id, name: r.name, location: r.location, lengthM: r.length_m }),
      )
    },

    async saveTrack(teamId, input) {
      const row = { team_id: teamId, name: input.name, location: input.location, length_m: input.lengthM }
      if (input.id) {
        must(await sb.from('tracks').update(row).eq('id', input.id))
        return input.id
      }
      return must(await sb.from('tracks').insert(row).select('id').single())!.id as string
    },

    async deleteTrack(trackId) {
      must(await sb.from('tracks').delete().eq('id', trackId))
    },

    async listTrackSetups(teamId) {
      const rows = must(
        await sb
          .from('track_setups')
          .select('id, track_id, name, values, notes, updated_at, author:profiles(id, name, avatar_url)')
          .eq('team_id', teamId)
          .order('updated_at', { ascending: false }),
      ) as Row[]
      return rows.map(
        (r): TrackSetup => ({
          id: r.id,
          trackId: r.track_id,
          name: r.name,
          values: r.values ?? {},
          notes: r.notes,
          updatedAt: r.updated_at,
          updatedBy: toAuthor(r.author),
        }),
      )
    },

    async saveTrackSetup(teamId, input) {
      const row = { team_id: teamId, track_id: input.trackId, name: input.name, values: input.values, notes: input.notes }
      if (input.id) {
        must(await sb.from('track_setups').update(row).eq('id', input.id))
        return input.id
      }
      return must(await sb.from('track_setups').insert(row).select('id').single())!.id as string
    },

    async deleteTrackSetup(setupId) {
      must(await sb.from('track_setups').delete().eq('id', setupId))
    },

    async listPressureSamples(teamId) {
      const rows = must(
        await sb
          .from('session_pressures')
          .select('session_id, kart_id, air_temp, track_temp, tires, session:sessions(label, recorded_at)')
          .eq('team_id', teamId)
          .limit(1000),
      ) as Row[]
      return rows
        .map(
          (r): PressureSampleRow => ({
            sessionId: r.session_id,
            kartId: r.kart_id,
            airTemp: num(r.air_temp),
            trackTemp: num(r.track_temp),
            tires: r.tires ?? {},
            label: r.session?.label ?? '',
            recordedAt: r.session?.recorded_at ?? '',
          }),
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    },

    async listPressureOrders(teamId) {
      const rows = must(
        await sb
          .from('pressure_orders')
          .select(
            'id, kart_id, event_id, values, target_hot, air_temp, track_temp, note, status, created_at, done_at, creator:profiles!pressure_orders_created_by_fkey(id, name, avatar_url), doer:profiles!pressure_orders_done_by_fkey(id, name, avatar_url)',
          )
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(200),
      ) as Row[]
      return rows.map(
        (r): PressureOrder => ({
          id: r.id,
          kartId: r.kart_id,
          eventId: r.event_id,
          values: r.values ?? {},
          targetHot: num(r.target_hot),
          airTemp: num(r.air_temp),
          trackTemp: num(r.track_temp),
          note: r.note,
          status: r.status,
          createdAt: r.created_at,
          doneAt: r.done_at,
          createdBy: toAuthor(r.creator),
          doneBy: toAuthor(r.doer),
        }),
      )
    },

    async sendPressureOrders(orders) {
      const me = await uid()
      must(
        await sb.from('pressure_orders').insert(
          orders.map((o) => ({
            kart_id: o.kartId,
            event_id: o.eventId,
            values: o.values,
            target_hot: o.targetHot,
            air_temp: o.airTemp,
            track_temp: o.trackTemp,
            note: o.note,
            created_by: me,
          })),
        ),
      )
    },

    async cancelPressureOrder(orderId) {
      must(await sb.from('pressure_orders').update({ status: 'cancelled' }).eq('id', orderId).eq('status', 'pending'))
    },

    async chatOverview(teamId) {
      const rows = must(await sb.rpc('chat_overview', { p_team: teamId })) as Row[]
      return rows.map(
        (r): ChatChannel => ({
          id: r.channel_id,
          kind: r.kind,
          otherId: r.other_id,
          postRoles: r.post_roles ?? [],
          postProfiles: r.post_profiles ?? [],
          canPost: r.can_post,
          lastBody: r.last_body,
          lastAt: r.last_at,
          lastAuthorId: r.last_author,
          unread: r.unread ?? 0,
        }),
      )
    },

    async listMessages(channelId) {
      const rows = must(
        await sb
          .from('messages')
          .select('id, channel_id, author_id, body, created_at')
          .eq('channel_id', channelId)
          .order('created_at', { ascending: false })
          .limit(200),
      ) as Row[]
      return rows.map(toMessage).reverse()
    },

    async sendMessage(input) {
      must(
        await sb
          .from('messages')
          .upsert(
            { id: input.id, channel_id: input.channelId, team_id: input.teamId, body: input.body, author_id: await uid() },
            { onConflict: 'id', ignoreDuplicates: true },
          ),
      )
    },

    async deleteMessage(messageId) {
      must(await sb.from('messages').delete().eq('id', messageId))
    },

    async markRead(channelId) {
      must(
        await sb
          .from('channel_reads')
          .upsert({ channel_id: channelId, profile_id: await uid(), last_read_at: new Date().toISOString() }, { onConflict: 'channel_id,profile_id' }),
      )
    },

    async openDirect(teamId, profileId) {
      return must(await sb.rpc('open_direct', { p_team: teamId, p_other: profileId })) as string
    },

    async updatePosters(channelId, roleIds, profileIds) {
      must(await sb.from('channels').update({ post_roles: roleIds, post_profiles: profileIds }).eq('id', channelId))
    },

    subscribeChat(teamId, onMessage) {
      const ch = sb
        .channel(`chat:${teamId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `team_id=eq.${teamId}` },
          (payload) => onMessage(toMessage(payload.new as Row)),
        )
        .subscribe()
      return () => void sb.removeChannel(ch)
    },

    async completePressureOrder(orderId, revision) {
      must(
        await sb.from('setup_revisions').upsert(
          {
            id: revision.id,
            kart_id: revision.kartId,
            values: revision.values,
            note: revision.note,
            recorded_at: revision.recordedAt,
            author_id: await uid(),
          },
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      )
      must(await sb.rpc('complete_pressure_order', { p_order: orderId, p_revision: revision.id }))
    },
  }
}
