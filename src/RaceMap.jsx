import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw, X } from 'lucide-react'
import { cx, Pill } from './ui.jsx'

// Coordenada de MUNDO real do GTA V (não fração 0-1 de imagem) — igual ao
// "Site GRA V3" de referência, pedido do usuário pra ficar pixel a pixel
// igual. As duas imagens (san-andreas-roxwood.webp + roxwood.png, mesmos
// arquivos do site de referência) já são calibradas pra esse sistema.
const MAP_MIN = -10
const MAP_MAX = 256
const MAP_SIZE = MAP_MAX - MAP_MIN
const MIN_VIEW = 11
// Até esse tanto de pontos, as alças do editor aparecem em qualquer zoom.
const ALCAS_SEM_ZOOM = 120

const TIPO_LABEL = { lap: 'Lap', sprint: 'Sprint' }
const TIPO_TONE = { lap: 'blue', sprint: 'amber' }

/** Soma a distância entre paradas consecutivas usando xReal/yReal (coordenada
 * de mundo GTA V de verdade, ~1 unidade = 1 metro — não o x/y de renderização
 * nem o caminho denso). Mesma fórmula da referência: conferido batendo com o
 * valor exibido lá pra "Road 68" (19.2km). */
function distanciaKm(paradas) {
  if (!paradas || paradas.length < 2) return 0
  let total = 0
  for (let i = 1; i < paradas.length; i++) {
    total += Math.hypot(paradas[i].xReal - paradas[i - 1].xReal, paradas[i].yReal - paradas[i - 1].yReal)
  }
  return total / 1000
}

function clampView(view) {
  const width = Math.min(MAP_SIZE, Math.max(MIN_VIEW, view.w))
  return {
    x: Math.min(MAP_MAX - width, Math.max(MAP_MIN, view.x)),
    y: Math.min(MAP_MAX - width, Math.max(MAP_MIN, view.y)),
    w: width,
    h: width,
  }
}

function MapButton({ label, onClick, children, separated = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cx(
        'grid h-9 w-9 place-items-center text-v2muted transition hover:bg-white/10 hover:text-v2ink',
        separated && 'border-t border-white/10',
      )}
    >
      {children}
    </button>
  )
}

/** Bandeira desenhada à mão (mesmo path do ícone Flag do lucide) — precisa
 * ser um <svg> aninhado posicionável por x/y/width/height, o componente
 * <Flag/> do lucide não posiciona bem dentro de outro <svg>. */
function BandeiraSvg({ x, y, size }) {
  return (
    <svg
      x={x - size * (4 / 28)}
      y={y - size}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1e3a5f"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] transition group-hover:stroke-blue-600"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

/**
 * Mapa interativo com pan (arrastar) e zoom (scroll ou botões) — trazido do
 * "Site GRA V3" de referência (pedido do usuário, igual pixel a pixel:
 * mesmas imagens, mesma coordenada de mundo, mesma cor de fundo). Sem rota
 * selecionada, mostra uma bandeira no ponto de partida de cada corrida
 * (clicável); com uma selecionada, desenha o traçado (caminho denso) com as
 * paradas numeradas, centraliza o zoom nela e mostra um card de detalhe no
 * canto superior direito.
 */
export default function RaceMap({
  corridas = [],
  selecionada,
  onSelect,
  // Editor de traçado (opcional): `caminhoEditado` é a linha sendo mexida —
  // quando vem preenchido, o mapa desenha as alças arrastáveis em vez do
  // traçado salvo, e avisa cada arrasto por `onMoverPonto`.
  caminhoEditado = null,
  onMoverPonto = null,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  // Índice do ponto do traçado sendo arrastado — enquanto tem um, o mapa não
  // faz pan (senão o mapa fugiria junto com a alça).
  const pontoRef = useRef(null)
  const [view, setView] = useState({ x: MAP_MIN, y: MAP_MIN, w: MAP_SIZE, h: MAP_SIZE })
  const [arrastando, setArrastando] = useState(false)

  function reset() {
    setView({ x: MAP_MIN, y: MAP_MIN, w: MAP_SIZE, h: MAP_SIZE })
  }

  function fitRace(corrida) {
    const paradas = corrida?.rota?.paradas
    if (!paradas?.length) {
      reset()
      return
    }
    const xs = paradas.map((p) => p.x)
    const ys = paradas.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const span = Math.max(maxX - minX, maxY - minY, MIN_VIEW)
    const size = Math.min(MAP_SIZE, span * 1.22)
    setView(
      clampView({ x: (minX + maxX - size) / 2, y: (minY + maxY - size) / 2, w: size, h: size }),
    )
  }

  useEffect(() => {
    fitRace(selecionada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada?.id])

  function zoom(factor, clientX, clientY) {
    setView((current) => {
      const rect = containerRef.current.getBoundingClientRect()
      const ratioX = clientX == null ? 0.5 : (clientX - rect.left) / rect.width
      const ratioY = clientY == null ? 0.5 : (clientY - rect.top) / rect.height
      const width = Math.min(MAP_SIZE, Math.max(MIN_VIEW, current.w * factor))
      const anchorX = current.x + current.w * ratioX
      const anchorY = current.y + current.h * ratioY
      return clampView({ x: anchorX - width * ratioX, y: anchorY - width * ratioY, w: width, h: width })
    })
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    function onWheel(e) {
      e.preventDefault()
      zoom(e.deltaY > 0 ? 1.16 : 1 / 1.16, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /**
   * Ponteiro (px da tela) → coordenada do mapa. Usa a matriz do próprio SVG:
   * o viewBox é quadrado e o container não é, então a razão simples
   * largura/altura erraria o alvo por causa da faixa vazia do
   * preserveAspectRatio — num arrasto de alça isso apareceria como a linha
   * "escapando" do cursor.
   */
  function pontoDoMapa(e) {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return
    dragRef.current = { x: e.clientX, y: e.clientY, view }
    setArrastando(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e) {
    if (pontoRef.current) {
      const p = pontoDoMapa(e)
      if (p) {
        // `inicioDoArrasto` deixa o pai empilhar UM estado por arrasto no
        // desfazer, em vez de um por pixel percorrido.
        onMoverPonto?.(pontoRef.current.i, p, pontoRef.current.primeiro)
        pontoRef.current.primeiro = false
      }
      return
    }
    if (!dragRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragRef.current.x) / rect.width) * dragRef.current.view.w
    const dy = ((e.clientY - dragRef.current.y) / rect.height) * dragRef.current.view.h
    setView(clampView({ ...dragRef.current.view, x: dragRef.current.view.x - dx, y: dragRef.current.view.y - dy }))
  }
  function onPointerUp() {
    dragRef.current = null
    pontoRef.current = null
    setArrastando(false)
  }

  function onPontoDown(e, indice) {
    if (e.button !== 0) return
    e.stopPropagation()
    pontoRef.current = { i: indice, primeiro: true }
    e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId)
  }

  const markerR = view.w * 0.012
  const lineW = view.w * 0.0028
  const flagSize = view.w * 0.04

  const caminho = caminhoEditado ?? selecionada?.rota?.caminho
  const paradas = selecionada?.rota?.paradas
  const pontosLinha = caminho?.length ? caminho : paradas
  // Um traçado importado tem centenas de pontos: mostrar todas as alças no
  // mapa inteiro viraria uma parede de bolinhas grudadas. Só aparecem as do
  // pedaço visível, e só com zoom suficiente pra dar pra pegar uma sem acertar
  // a vizinha. Linha curta (a que nasce dos próprios checkpoints) não tem esse
  // problema — exigir zoom ali só esconderia as alças sem motivo.
  const editando = caminhoEditado != null
  const zoomSuficiente = view.w <= MAP_SIZE / 4 || (caminhoEditado?.length ?? 0) <= ALCAS_SEM_ZOOM
  const alcaR = markerR * 0.42
  const alcas =
    editando && zoomSuficiente
      ? caminhoEditado
          .map((p, i) => ({ ...p, i }))
          .filter(
            (p) =>
              p.x >= view.x - alcaR &&
              p.x <= view.x + view.w + alcaR &&
              p.y >= view.y - alcaR &&
              p.y <= view.y + view.h + alcaR,
          )
      : []

  return (
    <div
      ref={containerRef}
      className={cx(
        'relative h-[min(85vh,900px)] min-h-[520px] w-full select-none overflow-hidden overscroll-contain rounded-xl border border-v2line bg-[#159fc2]',
        arrastando ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label={selecionada ? `Traçado da corrida ${selecionada.nome}` : 'Mapa de San Andreas e Roxwood'}
      >
        <image href="/mapas/san-andreas-roxwood.webp" x="0" y="0" width="256" height="256" />
        <image href="/mapas/roxwood.png" x="69.03276" y="-2.04245" width="49.897904" height="47.326111" />

        {!selecionada &&
          corridas
            .filter((c) => c.rota?.paradas?.length)
            .map((c) => {
              const inicio = c.rota.paradas[0]
              return (
                <g
                  key={c.id}
                  className="group cursor-pointer outline-none"
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir corrida ${c.nome}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onSelect(c)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(c)
                    }
                  }}
                >
                  <circle cx={inicio.x} cy={inicio.y} r={flagSize * 0.54} fill="transparent" />
                  <BandeiraSvg x={inicio.x} y={inicio.y} size={flagSize} />
                </g>
              )
            })}

        {pontosLinha?.length > 0 && (
          <g>
            <polyline
              points={pontosLinha.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(3,8,20,.78)"
              strokeWidth={lineW * 5.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={pontosLinha.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#ffffff"
              strokeWidth={lineW * 3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={pontosLinha.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#2563eb"
              strokeWidth={lineW * 1.35}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {paradas?.map((p, i) => {
              const isStart = i === 0
              const isFinish = i === paradas.length - 1 && selecionada.tipo === 'sprint'
              const fill = isStart ? '#16a34a' : isFinish ? '#dc2626' : '#1d4ed8'
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={markerR * 1.55} fill="rgba(3,8,20,.42)" />
                  <circle cx={p.x} cy={p.y} r={markerR * 1.26} fill="#ffffff" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={markerR}
                    fill={fill}
                    stroke="rgba(255,255,255,.34)"
                    strokeWidth={markerR * 0.11}
                  />
                  {/* fontSize 0.91 (era 0.82) do raio do marcador: número ~1px
                      maior na tela (pedido do usuário), e ainda em função do
                      markerR pra acompanhar o zoom como o resto do marcador. */}
                  <text
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={markerR * 0.91}
                    fontWeight="900"
                    fill="#fff"
                    stroke="rgba(0,0,0,.28)"
                    strokeWidth={markerR * 0.05}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                  >
                    {p.ordem ?? i + 1}
                  </text>
                </g>
              )
            })}

            {/* Alças do traçado por último: ficam por cima dos checkpoints pra
                dar pra pegar um ponto da linha que passe embaixo de um deles. */}
            {alcas.map((p) => (
              <circle
                key={p.i}
                cx={p.x}
                cy={p.y}
                r={alcaR}
                fill="#f59e0b"
                stroke="#0a1020"
                strokeWidth={alcaR * 0.3}
                className="cursor-move"
                onPointerDown={(e) => onPontoDown(e, p.i)}
              />
            ))}
          </g>
        )}
      </svg>

      {editando && !zoomSuficiente && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <p className="rounded-full border border-amber-400/40 bg-[#0a1020]/90 px-4 py-2 text-[12px] text-amber-200 shadow-xl backdrop-blur">
            Aproxime o zoom pra ver e arrastar os pontos da linha
          </p>
        </div>
      )}

      <div className="absolute left-3 top-3 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0a1020]/90 shadow-xl backdrop-blur">
        <MapButton label="Aumentar zoom" onClick={() => zoom(1 / 1.4)}>
          <Plus size={16} />
        </MapButton>
        <MapButton label="Diminuir zoom" onClick={() => zoom(1.4)} separated>
          <Minus size={16} />
        </MapButton>
        <MapButton label="Mostrar mapa completo" onClick={reset} separated>
          <RotateCcw size={15} />
        </MapButton>
      </div>

      {selecionada && (
        <article className="absolute right-3 top-3 w-[min(320px,calc(100%-72px))] overflow-hidden rounded-xl border border-white/20 bg-[#071120]/95 text-white shadow-2xl backdrop-blur-md">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-sky-300 to-white" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold tracking-[-0.01em] text-white">{selecionada.nome}</p>
                <div className="mt-2">
                  <Pill tone={TIPO_TONE[selecionada.tipo]} className="border-white/25 bg-white/10 font-semibold text-white">
                    {TIPO_LABEL[selecionada.tipo]}
                  </Pill>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="rounded-md p-1 text-white transition hover:bg-white/10"
                aria-label="Fechar detalhes da corrida"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white">Checkpoints</p>
                <p className="mt-1.5 text-xl font-extrabold leading-none text-white tabular-nums">
                  {paradas?.length ?? selecionada.checkpoints}
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white">Distância</p>
                <p className="mt-1.5 whitespace-nowrap text-xl font-extrabold leading-none text-white tabular-nums">
                  {distanciaKm(paradas).toFixed(1)}
                  <span className="ml-1 text-[11px] font-bold text-white">km</span>
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white">Voltas</p>
                <p className="mt-1.5 text-xl font-extrabold leading-none text-white tabular-nums">
                  {selecionada.voltas ?? '—'}
                </p>
              </div>
            </div>
          </div>
        </article>
      )}

      {!selecionada && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <p className="rounded-full border border-white/15 bg-[#0a1020]/85 px-4 py-2 text-[12px] text-slate-200 shadow-xl backdrop-blur">
            Selecione uma corrida pra ver o traçado — arraste e use o scroll pra navegar no mapa
          </p>
        </div>
      )}

      {corridas.length === 0 && (
        <div className="absolute inset-0 grid place-items-center bg-black/40 text-center text-[13px] text-white">
          Nenhuma corrida com rota registrada
        </div>
      )}
    </div>
  )
}
