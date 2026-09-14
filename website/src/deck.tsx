import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface SlideDef {
  /** Number of fragment steps beyond the initial state. */
  steps?: number;
  render: () => ReactNode;
}

interface DeckState {
  index: number;
  step: number;
}

const StepContext = createContext(0);

/** Current fragment step for the visible slide (0 = nothing revealed). */
export const useStep = () => useContext(StepContext);

/**
 * Reveals children once the slide's step reaches `at`. `mode="dim"` keeps the
 * children in the layout but faded until revealed (good for lists).
 */
export const Frag = ({
  at,
  mode = "show",
  children,
  className,
  style,
}: {
  at: number;
  mode?: "show" | "dim";
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const step = useStep();
  return (
    <div
      className={`frag ${className ?? ""}`}
      data-hidden={step < at}
      data-mode={mode}
      style={style}
    >
      {children}
    </div>
  );
};

const readHash = (max: number): DeckState => {
  const m = /^#\/?(\d+)(?:\.(\d+))?/.exec(window.location.hash);
  const index = Math.min(Math.max(Number(m?.[1] ?? 1) - 1, 0), max - 1);
  const step = Number(m?.[2] ?? 0);
  return { index, step };
};

export const Deck = ({ slides }: { slides: SlideDef[] }) => {
  const [state, setState] = useState<DeckState>(() => readHash(slides.length));
  const [scale, setScale] = useState(1);

  // Fit the 1600x900 viewport into the window.
  useLayoutEffect(() => {
    const fit = () =>
      setScale(
        Math.min(window.innerWidth / 1600, window.innerHeight / 900) * 0.96,
      );
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Sync hash <-> state.
  useEffect(() => {
    const h = `#/${state.index + 1}${state.step ? `.${state.step}` : ""}`;
    if (window.location.hash !== h) history.replaceState(null, "", h);
  }, [state]);
  useEffect(() => {
    const onHash = () => setState(readHash(slides.length));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [slides.length]);

  const nav = useMemo(() => {
    const next = () =>
      setState((s) => {
        const max = slides[s.index].steps ?? 0;
        if (s.step < max) return { ...s, step: s.step + 1 };
        if (s.index < slides.length - 1) return { index: s.index + 1, step: 0 };
        return s;
      });
    const prev = () =>
      setState((s) => {
        if (s.step > 0) return { ...s, step: s.step - 1 };
        if (s.index > 0) {
          const i = s.index - 1;
          return { index: i, step: slides[i].steps ?? 0 };
        }
        return s;
      });
    const nextSlide = () =>
      setState((s) => ({
        index: Math.min(s.index + 1, slides.length - 1),
        step: 0,
      }));
    const prevSlide = () =>
      setState((s) => ({ index: Math.max(s.index - 1, 0), step: 0 }));
    return { next, prev, nextSlide, prevSlide };
  }, [slides]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
        case "j":
          e.preventDefault();
          e.shiftKey ? nav.nextSlide() : nav.next();
          break;
        case "ArrowLeft":
        case "Backspace":
        case "PageUp":
        case "k":
          e.preventDefault();
          e.shiftKey ? nav.prevSlide() : nav.prev();
          break;
        case "ArrowDown":
          e.preventDefault();
          nav.nextSlide();
          break;
        case "ArrowUp":
          e.preventDefault();
          nav.prevSlide();
          break;
        case "Home":
          setState({ index: 0, step: 0 });
          break;
        case "End":
          setState({ index: slides.length - 1, step: 0 });
          break;
        case "f":
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, slides.length]);

  const slide = slides[state.index];
  return (
    <div
      className="deck"
      style={{ "--deck-scale": scale } as React.CSSProperties}
    >
      <div className="slide-viewport">
        <StepContext.Provider value={state.step}>
          <div key={state.index} className="slide-host">
            {slide.render()}
          </div>
        </StepContext.Provider>
      </div>
      <div className="hud">
        {state.index + 1} / {slides.length}
        {slide.steps ? ` · ${state.step}/${slide.steps}` : ""}
      </div>
      <div
        className="progress"
        style={{ width: `${((state.index + 1) / slides.length) * 100}%` }}
      />
    </div>
  );
};
