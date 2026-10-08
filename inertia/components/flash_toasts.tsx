import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import { router, usePage } from '@inertiajs/react'
import { CircleAlert, CircleCheck } from 'lucide-react'

/**
 * Counts visits, so each visit's flash message gets a toast of its own.
 * One shared ID would make a message that follows another quickly, while
 * the first is still on its way out, update the dismissed toast and never
 * show.
 */
let visit = 0

export default function FlashToasts() {
  const { flash } = usePage()

  useEffect(() => {
    return router.on('start', () => {
      toast.dismiss()
      visit += 1
    })
  }, [])

  useEffect(() => {
    const id = `flash-${visit}`
    if (flash.error) toast.error(flash.error, { id })
    if (flash.success) toast.success(flash.success, { id })
  }, [flash])

  return (
    <Toaster
      position="top-center"
      toastOptions={{ unstyled: true }}
      icons={{
        success: <CircleCheck size={18} strokeWidth={1.8} />,
        error: <CircleAlert size={18} strokeWidth={1.8} />,
      }}
    />
  )
}
