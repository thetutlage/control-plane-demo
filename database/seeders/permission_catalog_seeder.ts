import { DateTime } from 'luxon'
import { readFile } from 'node:fs/promises'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Organization from '#models/organization'
import PermissionCatalog from '#models/permission_catalog'

/**
 * Gives every organization the catalogue in `database/permission_catalog.json`,
 * replacing the one it has, so roles have keys to pick from during
 * development. The sync API, from the company's access repo, replaces this
 * later.
 */
export default class PermissionCatalogSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const file = new URL('../permission_catalog.json', import.meta.url)
    const permissions = JSON.parse(await readFile(file, 'utf8'))

    for (const organization of await Organization.all()) {
      await PermissionCatalog.updateOrCreate(
        { organizationId: organization.id },
        { permissions, hash: null, gitSha: null, syncedAt: DateTime.now() }
      )
    }
  }
}
