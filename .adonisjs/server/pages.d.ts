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
    'app_environments/create': ExtractProps<(typeof import('../../inertia/pages/app_environments/create.tsx'))['default']>
    'app_environments/edit': ExtractProps<(typeof import('../../inertia/pages/app_environments/edit.tsx'))['default']>
    'app_environments/show': ExtractProps<(typeof import('../../inertia/pages/app_environments/show.tsx'))['default']>
    'app_members/create': ExtractProps<(typeof import('../../inertia/pages/app_members/create.tsx'))['default']>
    'app_members/edit': ExtractProps<(typeof import('../../inertia/pages/app_members/edit.tsx'))['default']>
    'apps/create': ExtractProps<(typeof import('../../inertia/pages/apps/create.tsx'))['default']>
    'apps/index': ExtractProps<(typeof import('../../inertia/pages/apps/index.tsx'))['default']>
    'apps/show': ExtractProps<(typeof import('../../inertia/pages/apps/show.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'environments/index': ExtractProps<(typeof import('../../inertia/pages/environments/index.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/oidc': ExtractProps<(typeof import('../../inertia/pages/errors/oidc.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'identity_providers/create': ExtractProps<(typeof import('../../inertia/pages/identity_providers/create.tsx'))['default']>
    'identity_providers/edit': ExtractProps<(typeof import('../../inertia/pages/identity_providers/edit.tsx'))['default']>
    'identity_providers/index': ExtractProps<(typeof import('../../inertia/pages/identity_providers/index.tsx'))['default']>
    'members/create': ExtractProps<(typeof import('../../inertia/pages/members/create.tsx'))['default']>
    'members/index': ExtractProps<(typeof import('../../inertia/pages/members/index.tsx'))['default']>
    'members/show': ExtractProps<(typeof import('../../inertia/pages/members/show.tsx'))['default']>
    'overview/show': ExtractProps<(typeof import('../../inertia/pages/overview/show.tsx'))['default']>
    'roles/create': ExtractProps<(typeof import('../../inertia/pages/roles/create.tsx'))['default']>
    'roles/edit': ExtractProps<(typeof import('../../inertia/pages/roles/edit.tsx'))['default']>
    'roles/index': ExtractProps<(typeof import('../../inertia/pages/roles/index.tsx'))['default']>
    'sign_in/no_access': ExtractProps<(typeof import('../../inertia/pages/sign_in/no_access.tsx'))['default']>
    'sign_in/show': ExtractProps<(typeof import('../../inertia/pages/sign_in/show.tsx'))['default']>
  }
}
