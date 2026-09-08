import React, { createContext, useContext, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentSession())
  const loading = false

  const login = async (email, password) => {
    const session = await authService.login(email, password)
    setCurrentUser(session)
    return session
  }

  const logout = async () => {
    await authService.logout()
    setCurrentUser(null)
  }

  const value = {
    user: currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'ADMIN',
    isCommercial: currentUser?.role === 'COMMERCIAL' || currentUser?.role === 'ADMIN',
    isCataloger: currentUser?.role === 'CATALOGER' || currentUser?.role === 'ADMIN',
    login,
    logout,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
