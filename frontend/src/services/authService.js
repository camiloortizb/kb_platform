import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

const SESSION_STORAGE_KEY = 'kbeauty_auth_session_v1'

// Pre-provisioned enterprise accounts with one-way Bcrypt hashes (cost factor 10)
const PRESET_ACCOUNTS = [
  {
    id: 'usr_admin_01',
    email: 'admin@kbeautyhub.com',
    fullName: 'Camilo Ortiz',
    role: 'ADMIN', // Super Admin: Total Access
    passwordHash: '$2b$10$J4R/0Yd11elASibgWo7MhObmO5wluz0Ur/ONfxGjJlZchXIWverGm',
    department: 'Dirección General & Operaciones',
    isActive: true
  },
  {
    id: 'usr_comercial_02',
    email: 'ventas@kbeautyhub.com',
    fullName: 'Equipo Comercial B2B',
    role: 'COMMERCIAL', // Commercial: Catalog, Quotes, Orders, Clients
    passwordHash: '$2b$10$lbzYQGgU9.eqrQf99u7SbuLkcAR1woBuSVqpz80jd4C5n9whAUps2',
    department: 'Ventas Mayoristas',
    isActive: true
  },
  {
    id: 'usr_catalogador_03',
    email: 'producto@kbeautyhub.com',
    fullName: 'Gestión de Producto',
    role: 'CATALOGER', // Cataloger: Products, INCI, Approvals
    passwordHash: '$2b$10$aFrLhzz/KdClzLacBexyIuaNmg1V7ujMKnligvW7R4scqB6TnZuiS',
    department: 'Catalogación & Calidad',
    isActive: true
  }
]

export const authService = {
  // Login method with cryptographic verification
  login: async (email, password) => {
    if (!email || !password) {
      throw new Error('Por favor ingresa tu correo y contraseña.')
    }

    const cleanEmail = email.trim().toLowerCase()

    // 1. Try local verified preset accounts
    const account = PRESET_ACCOUNTS.find((u) => u.email.toLowerCase() === cleanEmail)

    if (!account) {
      // Record failed attempt for security audit
      await supabase.from('activity_log').insert({
        actor: 'SECURITY_GATE',
        action: 'FAILED_LOGIN_ATTEMPT',
        entity_type: 'auth',
        entity_id: cleanEmail,
        metadata: { reason: 'User not found', timestamp: new Date().toISOString() }
      }).select().maybeSingle()

      throw new Error('Credenciales incorrectas. Verifica el correo y la contraseña.')
    }

    if (!account.isActive) {
      throw new Error('Esta cuenta de usuario se encuentra deshabilitada.')
    }

    // 2. Verify password with bcrypt compare
    const isPasswordValid = bcrypt.compareSync(password, account.passwordHash)

    if (!isPasswordValid) {
      await supabase.from('activity_log').insert({
        actor: 'SECURITY_GATE',
        action: 'FAILED_LOGIN_ATTEMPT',
        entity_type: 'auth',
        entity_id: cleanEmail,
        metadata: { reason: 'Invalid password', timestamp: new Date().toISOString() }
      }).select().maybeSingle()

      throw new Error('Contraseña incorrecta. Inténtalo nuevamente.')
    }

    // 3. Create secure session object
    const session = {
      userId: account.id,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      department: account.department,
      token: 'auth_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).substring(2)) + '_' + Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days session
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))

    // 4. Log successful login to Supabase activity trail
    try {
      await supabase.from('activity_log').insert({
        actor: account.fullName,
        action: 'USER_LOGGED_IN',
        entity_type: 'auth_session',
        entity_id: account.email,
        metadata: {
          role: account.role,
          department: account.department,
          userAgent: navigator.userAgent
        }
      })
    } catch (e) {
      console.warn('Could not log auth event to Supabase:', e)
    }

    return session
  },

  // Get current active session
  getCurrentSession: () => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!stored) return null

      const session = JSON.parse(stored)
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(SESSION_STORAGE_KEY)
        return null
      }
      return session
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
  },

  // Logout
  logout: async () => {
    const session = authService.getCurrentSession()
    if (session) {
      try {
        await supabase.from('activity_log').insert({
          actor: session.fullName,
          action: 'USER_LOGGED_OUT',
          entity_type: 'auth_session',
          entity_id: session.email,
          metadata: { timestamp: new Date().toISOString() }
        })
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }
}
