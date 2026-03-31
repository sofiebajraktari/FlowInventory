export type UserRole = 'OWNER' | 'MANAGER' | 'WORKER'

export interface Profile {
  role: UserRole
}

const MOCK_STORAGE_KEY = 'flowinventory_demo_user'

export interface MockUser {
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
}

export function getMockUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MockUser) : null
  } catch {
    return null
  }
}

export function setMockUser(user: MockUser | null): void {
  if (user) localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(MOCK_STORAGE_KEY)
}
