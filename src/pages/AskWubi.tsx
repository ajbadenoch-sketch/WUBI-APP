import { useState, useRef, useEffect, useMemo } from 'react'
import { openai } from '../lib/openai'
import {
  useFinanceData,
  startOfMonth, endOfMonth,
  filterByDateRange, sumByTipo, formatMXN,
} from '../hooks/useFinanceData'
import { useChatStore, type WubiMode, type ChatMessage } from '../stores/chatStore'
import { GASTO_CATEGORIES } from '../types/categories'
import type { FinanceData } from '../hooks/useFinanceData'

const MODES: { key: WubiMode; label: string; emoji: string }[] = [
  { key: 'normal', label: 'Normal', emoji: '🧠' },
  { key: 'roast', label: 'Roast', emoji: '🔥' },
  { key: 'reganame', label: 'Regáñame', emoji: '⚠️' },
  { key: 'hype', label: 'Hype', emoji: '🚀' },
]

const QUICK_PROMPTS = [
  '¿Cómo van mis finanzas este mes?',
  '¿En qué estoy gastando más?',
  '¿Puedo ahorrar más este mes?',
  'Dame un plan para reducir gastos',
]

function buildSystemPrompt(mode: WubiMode, data: FinanceData): string {
  const now = new Date()
  const monthTxs = filterByDateRange(data.transactions, startOfMonth(now), endOfMonth(now))
  const ingresos = sumByTipo(monthTxs, 'ingreso')
  const gastos = sumByTipo(monthTxs, 'gasto')

  const currentBudgets = data.budgets.filter((b) => b.mes === now.getMonth() + 1 && b.anio === now.getFullYear())
  const totalBudgeted = currentBudgets.reduce((s, b) => s + b.monto_presupuestado, 0)
  const budgetPct = totalBudgeted > 0 ? Math.round((gastos / totalBudgeted) * 100) : 0

  // Top 3 gasto categories
  const gastosByCategory = new Map<string, number>()
  monthTxs.filter((t) => t.tipo === 'gasto').forEach((t) => {
    if (t.categoria_id) gastosByCategory.set(t.categoria_id, (gastosByCategory.get(t.categoria_id) || 0) + t.monto)
  })
  const top3 = Array.from(gastosByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([catId, monto]) => {
      const cat = GASTO_CATEGORIES.find((c) => c.id === catId)
      return { categoria: cat?.nombre || 'Otra', monto }
    })

  const todayStr = now.toISOString().split('T')[0]
  const proximas = data.transactions
    .filter((t) => t.es_estimada && t.fecha >= todayStr)
    .slice(0, 5)
    .map((t) => ({ descripcion: t.descripcion, monto: t.monto, fecha: t.fecha, tipo: t.tipo }))

  const deudasPendientes = data.debts
    .filter((d) => !d.pagado)
    .map((d) => ({ acreedor: d.acreedor, monto: d.monto, concepto: d.concepto, vence: d.fecha_vencimiento }))

  const financialContext = {
    balance_disponible: data.accounts.reduce((s, a) => s + a.saldo, 0),
    ingresos_mes: ingresos,
    gastos_mes: gastos,
    ahorro_neto: ingresos - gastos,
    presupuesto_usado_pct: budgetPct,
    top_3_categorias_gasto: top3,
    metas_activas: [],
    proximas_transacciones: proximas,
    deudas_pendientes: deudasPendientes,
  }

  const ctx = JSON.stringify(financialContext, null, 2)

  const bases: Record<WubiMode, string> = {
    normal: `Eres Wubi, asesor financiero amigable y claro para usuarios mexicanos. Responde en español, sé conciso y da consejos prácticos. Usa pesos mexicanos (MXN). Contexto financiero del usuario:\n${ctx}`,
    roast: `Eres Wubi en modo ROAST 🔥. Critica con humor ácido pero constructivo las finanzas del usuario. Sé gracioso pero siempre termina con un consejo útil. Responde en español con jerga mexicana. Contexto financiero:\n${ctx}`,
    reganame: `Eres Wubi en modo ESTRICTO ⚠️. Señala directamente los errores financieros sin rodeos. Sé duro pero justo. Da instrucciones claras de qué cambiar. Responde en español. Contexto financiero:\n${ctx}`,
    hype: `Eres Wubi en modo MOTIVACIONAL 🚀. Celebra cada logro financiero, por pequeño que sea. Motiva y empodera al usuario. Sé entusiasta pero realista. Responde en español. Contexto financiero:\n${ctx}`,
  }

  return bases[mode]
}

export default function AskWubi() {
  const data = useFinanceData()
  const {
    conversations, activeId, mode, setMode,
    createConversation, setActiveConversation,
    addMessage, updateLastAssistant, setFeedback,
    getActiveConversation,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeConv = getActiveConversation()
  const messages = activeConv?.messages || []

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content])

  // Context chip
  const contextChip = useMemo(() => {
    if (data.loading) return null
    const now = new Date()
    const monthTxs = filterByDateRange(data.transactions, startOfMonth(now), endOfMonth(now))
    const ing = sumByTipo(monthTxs, 'ingreso')
    const gas = sumByTipo(monthTxs, 'gasto')
    const neto = ing - gas
    return neto >= 0
      ? `Este mes llevas ${formatMXN(neto)} de superávit`
      : `Este mes llevas ${formatMXN(Math.abs(neto))} de déficit`
  }, [data])

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || streaming || !openai) return

    // Ensure we have an active conversation
    if (!activeId) createConversation()

    setInput('')
    addMessage({ role: 'user', content: msg })
    addMessage({ role: 'assistant', content: '' })
    setStreaming(true)

    try {
      // Build message history for API
      const conv = getActiveConversation()
      const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: buildSystemPrompt(mode, data) },
      ]
      // Add prior messages (skip the empty assistant we just added)
      const priorMsgs = conv?.messages.slice(0, -1) || []
      priorMsgs.forEach((m) => {
        if (m.content) apiMessages.push({ role: m.role, content: m.content })
      })

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: apiMessages,
        stream: true,
        max_tokens: 1000,
      })

      let accumulated = ''
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || ''
        accumulated += delta
        updateLastAssistant(accumulated)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido'
      updateLastAssistant(`Lo siento, hubo un error: ${errMsg}`)
    } finally {
      setStreaming(false)
    }
  }

  const handleNewConversation = () => {
    createConversation()
    setShowHistory(false)
  }

  const currentMode = MODES.find((m) => m.key === mode)!

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3">
        <button
          onClick={() => setShowHistory(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#EDE8DF' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <h1 className="text-base font-bold flex-1 truncate" style={{ color: '#1B4332' }}>
          {activeConv?.title || 'Nueva Conversación'}
        </h1>

        {/* Mode selector */}
        <div className="relative">
          <button
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
            style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
          >
            <span>{currentMode.emoji}</span>
            <span>{currentMode.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showModeDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowModeDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: 'white', minWidth: '160px' }}>
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => { setMode(m.key); setShowModeDropdown(false) }}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-colors text-left"
                    style={{
                      backgroundColor: mode === m.key ? 'rgba(82,183,136,0.1)' : 'transparent',
                      color: '#1B4332',
                    }}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span>{m.label}</span>
                    {mode === m.key && <span className="ml-auto text-[10px]" style={{ color: '#52B788' }}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        {messages.length === 0 ? (
          <EmptyState
            contextChip={contextChip}
            onQuickPrompt={(p) => {
              if (!activeId) createConversation()
              // Small delay to let store update
              setTimeout(() => handleSend(p), 50)
            }}
          />
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onFeedback={(fb) => setFeedback(msg.id, fb)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ backgroundColor: 'white', border: '2px solid #EDE8DF' }}>
          {/* Camera button for future OCR */}
          <button className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE8DF' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            placeholder="Pregúntale a Wubi..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: '#1B4332' }}
            disabled={streaming}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || streaming}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30"
            style={{ backgroundColor: '#52B788' }}
          >
            {streaming ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        {!openai && (
          <p className="text-[10px] text-center mt-1.5" style={{ color: '#EF4444' }}>
            Configura VITE_OPENAI_API_KEY en .env para habilitar el chat
          </p>
        )}
      </div>

      {/* History sidebar */}
      {showHistory && (
        <HistorySidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveConversation(id); setShowHistory(false) }}
          onNew={handleNewConversation}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

/* =============================================
   Empty State
   ============================================= */

function EmptyState({ contextChip, onQuickPrompt }: { contextChip: string | null; onQuickPrompt: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 gap-5">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
        style={{ backgroundColor: '#52B788', color: 'white', boxShadow: '0 8px 32px rgba(82,183,136,0.3)' }}
      >
        W
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: '#1B4332' }}>
          ¡Hola! Soy Wubi
        </p>
        <p className="text-xs mt-1" style={{ color: '#1B4332', opacity: 0.5 }}>
          Tu asesor financiero personal. ¿En qué te ayudo hoy?
        </p>
      </div>

      {contextChip && (
        <div className="px-4 py-2 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: '#1B4332', border: '1px solid rgba(82,183,136,0.25)' }}>
          📊 {contextChip}
        </div>
      )}

      <div className="w-full flex flex-col gap-2 px-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onQuickPrompt(p)}
            className="w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all active:scale-[0.98]"
            style={{ backgroundColor: 'white', color: '#1B4332', border: '1px solid #EDE8DF' }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

/* =============================================
   Message Bubble
   ============================================= */

function MessageBubble({ message, onFeedback }: { message: ChatMessage; onFeedback: (fb: 'up' | 'down') => void }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%]">
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black" style={{ backgroundColor: '#52B788', color: 'white' }}>W</div>
            <span className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.4 }}>Wubi</span>
          </div>
        )}
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{
            backgroundColor: isUser ? '#1B4332' : 'white',
            color: isUser ? '#F5F0E8' : '#1B4332',
            borderTopRightRadius: isUser ? '4px' : '16px',
            borderTopLeftRadius: isUser ? '16px' : '4px',
          }}
        >
          {message.content || (
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#52B788', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#52B788', animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#52B788', animationDelay: '300ms' }} />
            </span>
          )}
        </div>

        {/* Feedback buttons for assistant messages */}
        {!isUser && message.content && (
          <div className="flex gap-1 mt-1 ml-1">
            <button
              onClick={() => onFeedback('up')}
              className="w-6 h-6 rounded flex items-center justify-center transition-all active:scale-90"
              style={{ opacity: message.feedback === 'up' ? 1 : 0.3 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={message.feedback === 'up' ? '#52B788' : 'none'} stroke={message.feedback === 'up' ? '#52B788' : '#1B4332'} strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>
            <button
              onClick={() => onFeedback('down')}
              className="w-6 h-6 rounded flex items-center justify-center transition-all active:scale-90"
              style={{ opacity: message.feedback === 'down' ? 1 : 0.3 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={message.feedback === 'down' ? '#EF4444' : 'none'} stroke={message.feedback === 'down' ? '#EF4444' : '#1B4332'} strokeWidth="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* =============================================
   History Sidebar
   ============================================= */

function HistorySidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onClose,
}: {
  conversations: { id: string; title: string; createdAt: number; mode: WubiMode }[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-72 h-full flex flex-col animate-[slideRight_0.2s_ease-out]"
        style={{ backgroundColor: '#F5F0E8' }}
      >
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <h2 className="text-base font-bold" style={{ color: '#1B4332' }}>Conversaciones</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EDE8DF' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <button
          onClick={onNew}
          className="mx-4 mb-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          style={{ backgroundColor: '#52B788', color: 'white' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva conversación
        </button>

        <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
          {conversations.length === 0 ? (
            <p className="text-xs text-center mt-8" style={{ color: '#1B4332', opacity: 0.4 }}>
              Sin conversaciones aún
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {conversations.map((c) => {
                const modeInfo = MODES.find((m) => m.key === c.mode)
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: c.id === activeId ? 'rgba(82,183,136,0.12)' : 'transparent',
                      border: c.id === activeId ? '1px solid rgba(82,183,136,0.25)' : '1px solid transparent',
                    }}
                  >
                    <p className="text-xs font-medium truncate" style={{ color: '#1B4332' }}>{c.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#1B4332', opacity: 0.35 }}>
                      {modeInfo?.emoji} {modeInfo?.label} · {new Date(c.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
