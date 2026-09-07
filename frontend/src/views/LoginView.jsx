import React, { useState } from 'react'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Building2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ToastContainer'

export default function LoginView() {
  const { login } = useAuth()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      addToast('Por favor completa tu correo y contraseña.', 'warning')
      return
    }

    try {
      setLoading(true)
      const session = await login(email, password)
      addToast(`¡Bienvenido/a, ${session.fullName}!`, 'success')
    } catch (err) {
      addToast(err.message || 'Error al iniciar sesión.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickFillEmail = (corporateEmail) => {
    setEmail(corporateEmail)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Ambient Diffused Caustic & Luminescence */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="ambient-caustic-1 absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-slate-200/50 via-white/80 to-transparent blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-slate-100/60 via-white/70 to-transparent blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:32px_32px] opacity-30" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-[#E7E8EB] shadow-2xl space-y-8 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E7E8EB] flex items-center justify-center mx-auto shadow-xs text-lg font-bold text-slate-900 mb-3">
            ✨
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            <Building2 className="w-3.5 h-3.5 text-slate-600" /> Enterprise Operating Platform
          </div>
          <h1 className="text-2xl font-black text-[#17181B] tracking-tight font-display">
            PRODUCT <span className="chrome-gradient-text">HUB</span>
          </h1>
          <p className="text-xs text-[#6B6E75] font-medium leading-relaxed">
            Plataforma centralizada de gestión de catálogo, cotizaciones y ventas mayoristas.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#6B6E75] uppercase tracking-wider mb-1.5">
              Correo Electrónico Corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#6B6E75] uppercase tracking-wider mb-1.5">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Preset Access Credentials Card */}
        <div className="pt-4 border-t border-[#E7E8EB] space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block text-center">
            Seleccionar Cuenta Corporativa
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFillEmail('admin@kbeautyhub.com')}
              className="p-2.5 bg-[#F8F8F9] hover:bg-slate-100 rounded-xl border border-[#E7E8EB] text-left transition"
              title="Click para autocompletar correo corporativo"
            >
              <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Super Admin
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">admin@kbeautyhub.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFillEmail('ventas@kbeautyhub.com')}
              className="p-2.5 bg-[#F8F8F9] hover:bg-slate-100 rounded-xl border border-[#E7E8EB] text-left transition"
              title="Click para autocompletar correo corporativo"
            >
              <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Comercial B2B
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">ventas@kbeautyhub.com</div>
            </button>
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" /> Sesión encriptada con Bcrypt & Supabase Database
        </div>
      </div>
    </div>
  )
}
