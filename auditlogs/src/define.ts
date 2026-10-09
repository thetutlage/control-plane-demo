import type { Actions, Ref } from './types.js'

type Mapper = (value: any) => { id: string | number; label: string }

/**
 * Declares the kinds of things events involve, each with how to read its
 * ID and name. Returns one function per kind that turns a value into a
 * reference of that kind:
 *
 * ```ts
 * const s = defineSubjects({
 *   member: (member: Member) => ({ id: member.id, label: member.email }),
 * })
 * s.member(sara) // { type: 'member', id: 12, label: 'sara@acme.com' }
 * ```
 */
export function defineSubjects<Mappers extends Record<string, Mapper>>(mappers: Mappers) {
  const subjects: Record<string, (value: unknown) => Ref> = {}
  for (const [type, mapper] of Object.entries(mappers)) {
    subjects[type] = (value) => ({ type, ...mapper(value) })
  }

  return subjects as {
    [Type in keyof Mappers & string]: (value: Parameters<Mappers[Type]>[0]) => Ref<Type>
  }
}

/**
 * Declares every action in one place. An action is a function from
 * whatever it needs to the event: its actor, subjects, summary and data.
 * Its parameters are what `record` then asks for. A name is
 * `category.name`.
 *
 * ```ts
 * const actions = defineActions({
 *   'access.role_assigned': (admin: User, member: Member, roles: string[]) => ({
 *     actor: s.user(admin),
 *     subjects: [s.member(member)],
 *     summary: `${admin.email} changed the roles of ${member.email}`,
 *     data: { roles },
 *   }),
 * })
 * ```
 */
export function defineActions<Catalogue extends Actions>(
  actions: Catalogue & {
    [Name in keyof Catalogue]: Name extends `${string}.${string}` ? unknown : never
  }
): Catalogue {
  for (const name of Object.keys(actions)) {
    if (!/^[^.]+\..+$/.test(name)) {
      throw new Error(`Audit action "${name}" must be named "category.name"`)
    }
  }
  return actions
}

/**
 * The category of an action: the part of its name before the first dot
 */
export function categoryOf(action: string) {
  return action.slice(0, action.indexOf('.'))
}
