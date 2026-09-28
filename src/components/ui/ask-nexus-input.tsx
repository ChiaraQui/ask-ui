import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AskNexusInputProps {
  title?: string;
  /** Rotating placeholder suggestions shown while the input is empty. */
  placeholders?: string[];
  /** Interval (ms) between placeholder rotations. */
  placeholderInterval?: number;
  defaultValue?: string;
  /** Called with the trimmed query the instant the user submits — before the disintegration animation runs. */
  onSubmit?: (value: string) => void;
  /** Blocks submission while a request is in flight. */
  disabled?: boolean;
  className?: string;
}

type Phase = "idle" | "disintegrating";

const INPUT_FONT_PX = 14;
const PARTICLE_RGB_LIGHT = "17,24,39";
const PARTICLE_RGB_DARK = "226,232,240";

/** Canvas cannot read Tailwind's dark: variants, so resolve the colour ourselves. */
function particleRgb(): string {
  const dark =
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? PARTICLE_RGB_DARK : PARTICLE_RGB_LIGHT;
}

const DEFAULT_PLACEHOLDERS = [
  "What is Retrieval-Augmented Generation in one sentence?",
  "Explain embeddings like I'm five",
  "What is chunking in RAG?",
  "When should I use a vector database?",
  "What does temperature do in an LLM?",
];

export function AskNexusInput({
  title = "Ask",
  placeholders = DEFAULT_PLACEHOLDERS,
  placeholderInterval = 2800,
  defaultValue = "",
  onSubmit,
  disabled = false,
  className,
}: AskNexusInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [phase, setPhase] = useState<Phase>("idle");
  const [snapshot, setSnapshot] = useState("");
  const [phIndex, setPhIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activePlaceholder = placeholders[phIndex] ?? "";

  // Cycle placeholder while the input is idle and empty.
  useEffect(() => {
    if (phase !== "idle" || value || placeholders.length <= 1) return;
    const id = setInterval(
      () => setPhIndex((i) => (i + 1) % placeholders.length),
      placeholderInterval,
    );
    return () => clearInterval(id);
  }, [phase, value, placeholders.length, placeholderInterval]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (phase !== "idle" || disabled) return;
    // If empty, the live placeholder is what gets submitted + dissolved.
    const submitted = value.trim() || activePlaceholder.trim();
    if (!submitted) return;
    onSubmit?.(submitted);
    setSnapshot(submitted);
    setPhase("disintegrating");
  };

  const handleComplete = useCallback(() => {
    setSnapshot("");
    setValue("");
    setPhase("idle");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const showPlaceholder = phase === "idle" && !value;

  return (
    <div
      className={cn("flex w-full flex-col items-center gap-10 py-12", className)}
    >
      <motion.h1
        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl md:text-5xl dark:text-slate-50"
      >
        {title}
      </motion.h1>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="w-full max-w-xl"
      >
        <motion.div
          animate={
            phase === "disintegrating" ? { scale: [1, 0.985, 1] } : { scale: 1 }
          }
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-500"
        >
          <div className="relative h-6 flex-1">
            {/* Inner clip wraps only the input + placeholder so the canvas can overflow. */}
            <div className="absolute inset-0 overflow-hidden">
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={phase !== "idle" || disabled}
                spellCheck={false}
                className={cn(
                  "absolute inset-0 w-full bg-transparent text-sm text-gray-900 outline-none transition-opacity duration-300 dark:text-slate-100",
                  phase === "disintegrating" && "opacity-0",
                )}
              />

              {/* Cycling placeholder overlay */}
              <AnimatePresence mode="wait">
                {showPlaceholder && (
                  <motion.span
                    key={phIndex}
                    initial={{ y: 10, opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -10, opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 truncate text-sm text-gray-400 dark:text-slate-500"
                  >
                    {activePlaceholder}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Disintegration canvas — sibling of the clip so dust can drift past the pill. */}
            {phase === "disintegrating" && (
              <DisintegratingText text={snapshot} onComplete={handleComplete} />
            )}
          </div>

          <motion.button
            type="submit"
            aria-label="Ask"
            disabled={phase !== "idle" || disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <ArrowRight className="size-4" strokeWidth={2.25} />
          </motion.button>
        </motion.div>
      </motion.form>
    </div>
  );
}

type Particle = {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  delay: number;
  life: number;
  size: number;
};

interface DisintegratingTextProps {
  text: string;
  onComplete: () => void;
}

// Right-edge overhang so a little dust can drift past before fading.
const RIGHT_OVERHANG_PX = 90;
// Time between each character snapping. Smaller = faster wave.
const CHAR_STEP_MS = 50;
// Random jitter on each character's snap so adjacent chars overlap a touch.
const CHAR_JITTER_MS = 22;

function DisintegratingText({ text, onComplete }: DisintegratingTextProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rgb = particleRgb();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const baseW = Math.max(parent.clientWidth, 1);
    const H = Math.max(parent.clientHeight, 1);
    const W = baseW + RIGHT_OVERHANG_PX;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    ctx.font = `${INPUT_FONT_PX}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(text, 0, H / 2);

    // Map each x-range to the character that produced it, so the wave can snap
    // one character at a time instead of bleeding across the whole phrase.
    const chars = Array.from(text);
    const charBounds: { start: number; end: number }[] = [];
    let cursor = 0;
    for (const ch of chars) {
      const w = ctx.measureText(ch).width;
      charBounds.push({ start: cursor, end: cursor + w });
      cursor += w;
    }
    const totalChars = chars.length;
    const charDelay = (charIdx: number) => {
      const fromRight = totalChars - 1 - charIdx;
      return fromRight * CHAR_STEP_MS + Math.random() * CHAR_JITTER_MS;
    };
    const findCharIdx = (lx: number) => {
      // Binary search on character bounds.
      let lo = 0,
        hi = charBounds.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const b = charBounds[mid];
        if (lx < b.start) hi = mid - 1;
        else if (lx >= b.end) lo = mid + 1;
        else return mid;
      }
      return Math.min(Math.max(lo, 0), charBounds.length - 1);
    };

    const sampleW = baseW * dpr;
    const img = ctx.getImageData(0, 0, sampleW, H * dpr);
    const particles: Particle[] = [];
    const stride = dpr;

    for (let y = 0; y < H * dpr; y += stride) {
      for (let x = 0; x < sampleW; x += stride) {
        const i = (y * sampleW + x) * 4;
        if (img.data[i + 3] > 110) {
          const lx = x / dpr;
          const ly = y / dpr;
          const charIdx = findCharIdx(lx);

          // Clean dispersion: small in-place burst with slight rightward bias.
          // Most particles barely move; a few stragglers drift further.
          const angle = (Math.random() - 0.5) * Math.PI * 0.6; // ±54°
          const speed = 0.18 + Math.random() * 0.55;
          const vx = Math.cos(angle) * speed + 0.12;
          const vy = Math.sin(angle) * speed * 0.55; // squashed vertically — keeps the cloud near the text baseline

          // Size variance — fine dust with a few larger flecks.
          const sizeRoll = Math.random();
          const size = sizeRoll < 0.65 ? 1 : sizeRoll < 0.92 ? 1.4 : 1.8;

          particles.push({
            ox: lx,
            oy: ly,
            vx,
            vy,
            delay: charDelay(charIdx),
            // Short life — clean snap, not a long drifting cloud.
            life: 480 + Math.random() * 320,
            size,
          });
        }
      }
    }

    ctx.clearRect(0, 0, W, H);

    let rafId = 0;
    let start = 0;
    let cancelled = false;

    const frame = (now: number) => {
      if (cancelled) return;
      if (!start) start = now;
      const elapsed = now - start;
      ctx.clearRect(0, 0, W, H);

      let aliveCount = 0;

      for (const p of particles) {
        if (elapsed < p.delay) {
          // Brief tension shimmer in the final 80ms before this particle snaps.
          const ttd = p.delay - elapsed;
          if (ttd < 80) {
            const tension = 1 - ttd / 80;
            const jx = (Math.random() - 0.5) * 0.5 * tension;
            const jy = (Math.random() - 0.5) * 0.5 * tension;
            ctx.fillStyle = `rgb(${rgb})`;
            ctx.fillRect(p.ox + jx, p.oy + jy, p.size, p.size);
          } else {
            ctx.fillStyle = `rgb(${rgb})`;
            ctx.fillRect(p.ox, p.oy, p.size, p.size);
          }
          aliveCount++;
          continue;
        }
        const t = elapsed - p.delay;
        if (t > p.life) continue;
        aliveCount++;

        const norm = t / p.life;
        const motionT = t / 16;
        // Small wobble only — keeps the dispersion clean instead of swirly.
        const wobble = Math.sin((p.ox + motionT) * 0.22) * 0.4;
        const x = p.ox + p.vx * motionT + wobble * norm;
        const y = p.oy + p.vy * motionT;
        // Cosine ease-out fade.
        const opacity = Math.cos((norm * Math.PI) / 2);
        ctx.fillStyle = `rgba(${rgb},${opacity.toFixed(3)})`;
        ctx.fillRect(x, y, p.size, p.size);
      }

      if (aliveCount === 0) {
        onCompleteRef.current();
        return;
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [text]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-0 top-0"
      aria-hidden
    />
  );
}

export default AskNexusInput;
