import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type Audit = HttpContext['audit']

/**
 * Runs a change in a transaction together with the audit events it
 * records: both are saved, or neither is. The work gets the transaction
 * and a batch to record on, and the batch is written last, inside the
 * transaction. Every access and configuration change goes through here,
 * so none can exist without its record (plan §3, "Audit events").
 */
export function auditedTransaction<Result>(
  audit: Audit,
  work: (trx: TransactionClientContract, batch: ReturnType<Audit['batch']>) => Promise<Result>
) {
  const batch = audit.batch()

  return db.transaction(async (trx) => {
    const result = await work(trx, batch)
    await batch.flush({ client: trx })
    return result
  })
}
