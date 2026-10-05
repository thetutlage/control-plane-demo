import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'app_clients/create': ExtractProps<(typeof import('../../inertia/pages/app_clients/create.tsx'))['default']>
    'app_clients/edit': ExtractProps<(typeof import('../../inertia/pages/app_clients/edit.tsx'))['default']>
    'apps/create': ExtractProps<(typeof import('../../inertia/pages/apps/create.tsx'))['default']>
    'apps/index': ExtractProps<(typeof import('../../inertia/pages/apps/index.tsx'))['default']>
    'apps/settings': ExtractProps<(typeof import('../../inertia/pages/apps/settings.tsx'))['default']>
    'apps/show': ExtractProps<(typeof import('../../inertia/pages/apps/show.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/oidc': ExtractProps<(typeof import('../../inertia/pages/errors/oidc.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'members/create': ExtractProps<(typeof import('../../inertia/pages/members/create.tsx'))['default']>
    'members/index': ExtractProps<(typeof import('../../inertia/pages/members/index.tsx'))['default']>
    'members/show': ExtractProps<(typeof import('../../inertia/pages/members/show.tsx'))['default']>
    'overview/show': ExtractProps<(typeof import('../../inertia/pages/overview/show.tsx'))['default']>
    'roles/index': ExtractProps<(typeof import('../../inertia/pages/roles/index.tsx'))['default']>
    'sign_in/show': ExtractProps<(typeof import('../../inertia/pages/sign_in/show.tsx'))['default']>
  }
}
