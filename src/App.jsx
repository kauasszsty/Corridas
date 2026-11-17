import { useEffect, useMemo, useState } from "react";
import { Flag, Loader2, MapPin } from "lucide-react";
import RaceMap from "./RaceMap.jsx";
import { EmptyState, Panel, Pill, SearchInput, Tabs, normalizar } from "./ui.jsx";

const TIPO_LABEL = { lap: "Lap", sprint: "Sprint" };
const TIPO_TONE = { lap: "emerald", sprint: "blue" };

export default function App() {
  const [corridas, setCorridas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("todas");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState(null);

  useEffect(() => {
    fetch("/data/corridas.json")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar as corridas.");
        return r.json();
      })
      .then(setCorridas)
      .catch((e) => setErro(e?.message || "Falha ao carregar as corridas."))
      .finally(() => setLoading(false));
  }, []);

  const lista = useMemo(
    () =>
      corridas.filter((c) => {
        if (aba !== "todas" && c.tipo !== aba) return false;
        if (busca && !normalizar(c.nome).includes(normalizar(busca))) return false;
        return true;
      }),
    [corridas, busca, aba],
  );

  // O mapa desenha só o filtro de tipo; a busca por nome não apaga o resto do mapa.
  const noMapa = useMemo(
    () => (aba === "todas" ? corridas : corridas.filter((c) => c.tipo === aba)),
    [corridas, aba],
  );

  useEffect(() => {
    if (selecionada && !noMapa.some((c) => c.id === selecionada.id)) setSelecionada(null);
  }, [noMapa, selecionada]);

  const totalLap = corridas.filter((c) => c.tipo === "lap").length;
  const totalSprint = corridas.filter((c) => c.tipo === "sprint").length;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-v2ink">Cidade Alta - Corridas</h1>
        <p className="text-[12px] text-v2muted">GRA · Cidade Alta — catálogo de pistas e percursos</p>
      </header>

      {loading ? (
        <div className="grid min-h-[50vh] place-items-center">
          {erro ? <p className="text-rose-400">{erro}</p> : <Loader2 size={28} className="animate-spin text-v2accent" />}
        </div>
      ) : erro ? (
        <div className="grid min-h-[50vh] place-items-center">
          <p className="text-rose-400">{erro}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-v2line bg-v2card px-4 py-3.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-v2faint">Total</p>
              <p className="tabular mt-1.5 text-xl font-semibold text-v2ink">{corridas.length}</p>
            </div>
            <div className="rounded-xl border border-v2line bg-v2card px-4 py-3.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-v2faint">Lap</p>
              <p className="tabular mt-1.5 text-xl font-semibold text-emerald-400">{totalLap}</p>
            </div>
            <div className="rounded-xl border border-v2line bg-v2card px-4 py-3.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-v2faint">Sprint</p>
              <p className="tabular mt-1.5 text-xl font-semibold text-blue-400">{totalSprint}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
            <aside className="flex min-h-0 flex-col gap-3">
              <Tabs
                tabs={[
                  { id: "todas", label: "Todas", count: corridas.length },
                  { id: "lap", label: "Lap", count: totalLap },
                  { id: "sprint", label: "Sprint", count: totalSprint },
                ]}
                active={aba}
                onChange={setAba}
              />
              <SearchInput
                placeholder="Buscar corrida pelo nome…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Panel className="max-h-[min(85vh,900px)] min-h-[380px] overflow-y-auto scrollbar-thin">
                {lista.length === 0 ? (
                  <EmptyState icon={Flag} title="Nenhuma corrida encontrada" />
                ) : (
                  lista.map((c) => {
                    const ativa = selecionada?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelecionada(ativa ? null : c)}
                        className={
                          "flex cursor-pointer items-center justify-between gap-2 border-b border-v2line-soft px-3 py-3 text-left transition last:border-b-0 hover:bg-white/[0.04] " +
                          (ativa ? "bg-v2accent/[0.08]" : "")
                        }
                      >
                        <span className="min-w-0">
                          <span
                            className={
                              "flex items-center gap-1.5 text-[13px] font-medium " +
                              (ativa ? "text-v2accent" : "text-v2ink")
                            }
                          >
                            <Flag size={12} strokeWidth={1.75} className="shrink-0 text-v2faint" />
                            {c.nome}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-v2faint">
                            <MapPin size={11} strokeWidth={1.75} />
                            {c.checkpoints} checkpoints
                            {c.voltas != null && ` · ${c.voltas} voltas`}
                          </span>
                        </span>
                        <Pill tone={TIPO_TONE[c.tipo]}>{TIPO_LABEL[c.tipo]}</Pill>
                      </div>
                    );
                  })
                )}
              </Panel>
            </aside>

            <RaceMap corridas={noMapa} selecionada={selecionada} onSelect={setSelecionada} />
          </div>
        </div>
      )}
    </div>
  );
}
