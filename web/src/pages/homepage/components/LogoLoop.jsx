import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";

const ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 2 };
const toCssLength = (v) => (typeof v === "number" ? `${v}px` : (v ?? undefined));
const cx = (...p) => p.filter(Boolean).join(" ");

const useResizeObserver = (callback, elements, deps) => {
  useEffect(() => {
    if (!window.ResizeObserver) {
      const onResize = () => callback();
      window.addEventListener("resize", onResize);
      callback();
      return () => window.removeEventListener("resize", onResize);
    }
    const observers = elements.map((ref) => {
      if (!ref.current) return null;
      const ro = new ResizeObserver(callback);
      ro.observe(ref.current);
      return ro;
    });
    callback();
    return () => observers.forEach((o) => o?.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

const useImageLoader = (seqRef, onLoad, deps) => {
  useEffect(() => {
    const images = seqRef.current?.querySelectorAll("img") ?? [];
    if (images.length === 0) { onLoad(); return; }
    let remaining = images.length;
    const done = () => { remaining -= 1; if (remaining === 0) onLoad(); };
    images.forEach((img) => {
      if (img.complete) done();
      else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
    });
    return () => images.forEach((img) => { img.removeEventListener("load", done); img.removeEventListener("error", done); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

const useAnimationLoop = (trackRef, targetVelocity, seqWidth, isHovered, pauseOnHover) => {
  const rafRef = useRef(null), lastRef = useRef(null), offsetRef = useRef(0), velRef = useRef(0);
  useEffect(() => {
    const track = trackRef.current; if (!track) return;
    const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seqWidth > 0) { offsetRef.current = ((offsetRef.current % seqWidth) + seqWidth) % seqWidth; track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`; }
    if (reduced) { track.style.transform = "translate3d(0,0,0)"; return () => { lastRef.current = null; }; }
    const tick = (ts) => {
      if (lastRef.current === null) lastRef.current = ts;
      const dt = Math.max(0, ts - lastRef.current) / 1000; lastRef.current = ts;
      const target = pauseOnHover && isHovered ? 0 : targetVelocity;
      const ease = 1 - Math.exp(-dt / ANIMATION_CONFIG.SMOOTH_TAU);
      velRef.current += (target - velRef.current) * ease;
      if (seqWidth > 0) {
        let next = offsetRef.current + velRef.current * dt;
        next = ((next % seqWidth) + seqWidth) % seqWidth;
        offsetRef.current = next;
        track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastRef.current = null; };
  }, [targetVelocity, seqWidth, isHovered, pauseOnHover, trackRef]);
};

const LogoLoop = memo(({ logos, speed = 120, direction = "left", width = "100%", logoHeight = 72, gap = 64, pauseOnHover = true, fadeOut = true, fadeOutColor, scaleOnHover = true, ariaLabel = "Partner logos", className, style }) => {
  const containerRef = useRef(null), trackRef = useRef(null), seqRef = useRef(null);
  const [seqWidth, setSeqWidth] = useState(0), [copyCount, setCopyCount] = useState(ANIMATION_CONFIG.MIN_COPIES), [isHovered, setIsHovered] = useState(false);

  const targetVelocity = useMemo(() => { const mag = Math.abs(speed); const dir = direction === "left" ? 1 : -1; const sign = speed < 0 ? -1 : 1; return mag * dir * sign; }, [speed, direction]);

  const update = useCallback(() => {
    const cw = containerRef.current?.clientWidth ?? 0;
    const sw = seqRef.current?.getBoundingClientRect?.()?.width ?? 0;
    if (sw > 0) {
      setSeqWidth(Math.ceil(sw));
      const copies = Math.ceil(cw / sw) + ANIMATION_CONFIG.COPY_HEADROOM;
      setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copies));
    }
  }, []);

  useResizeObserver(update, [containerRef, seqRef], [logos, gap, logoHeight]);
  useImageLoader(seqRef, update, [logos, gap, logoHeight]);
  useAnimationLoop(trackRef, targetVelocity, seqWidth, isHovered, pauseOnHover);

  const cssVars = useMemo(() => ({ "--logoloop-gap": `${gap}px`, "--logoloop-logoHeight": `${logoHeight}px`, ...(fadeOutColor && { "--logoloop-fadeColor": fadeOutColor }) }), [gap, logoHeight, fadeOutColor]);
  const rootClasses = useMemo(() => cx("relative overflow-x-hidden group", "[--logoloop-gap:64px]", "[--logoloop-logoHeight:72px]", "[--logoloop-fadeColorAuto:#ffffff]", "dark:[--logoloop-fadeColorAuto:#0b0b0b]", scaleOnHover && "py-[calc(var(--logoloop-logoHeight)*0.1)]", className), [scaleOnHover, className]);

  const onEnter = useCallback(() => { if (pauseOnHover) setIsHovered(true); }, [pauseOnHover]);
  const onLeave = useCallback(() => { if (pauseOnHover) setIsHovered(false); }, [pauseOnHover]);

  const renderLogoItem = useCallback((item, key) => {
    const isNode = "node" in item;
    const content = isNode ? (
      <span className={cx("inline-flex items-center", scaleOnHover && "transition-transform duration-300 ease-out group-hover/item:scale-110")} aria-hidden={!!item.href && !item.ariaLabel}>{item.node}</span>
    ) : (
      <img className={cx("h-[var(--logoloop-logoHeight)] w-auto block object-contain [-webkit-user-drag:none] pointer-events-none [image-rendering:-webkit-optimize-contrast]", scaleOnHover && "transition-transform duration-300 ease-out group-hover/item:scale-110")} src={item.src} srcSet={item.srcSet} sizes={item.sizes} width={item.width} height={item.height} alt={item.alt ?? ""} title={item.title} loading="lazy" decoding="async" draggable={false} />
    );
    const itemAria = isNode ? (item.ariaLabel ?? item.title) : (item.alt ?? item.title);
    const inner = item.href ? (
      <a className="inline-flex items-center no-underline rounded transition-opacity duration-200 ease-linear hover:opacity-90 focus-visible:outline focus-visible:outline-current focus-visible:outline-offset-2" href={item.href} aria-label={itemAria || "logo link"} target="_blank" rel="noreferrer noopener">{content}</a>
    ) : content;

    return <li className={cx("flex-none mr-[var(--logoloop-gap)] leading-[1]", scaleOnHover && "overflow-visible group/item")} key={key} role="listitem">{inner}</li>;
  }, [scaleOnHover]);

  const lists = useMemo(() => Array.from({ length: copyCount }, (_, i) => (
    <ul className="flex items-center" key={`copy-${i}`} role="list" aria-hidden={i > 0} ref={i === 0 ? seqRef : undefined}>
      {logos.map((item, idx) => renderLogoItem(item, `${i}-${idx}`))}
    </ul>
  )), [copyCount, logos, renderLogoItem]);

  const containerStyle = useMemo(() => ({ width: toCssLength(width) ?? "100%", ...cssVars, ...style }), [width, cssVars, style]);

  return (
    <div ref={containerRef} className={rootClasses} style={containerStyle} role="region" aria-label={ariaLabel} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {fadeOut && (<><div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[clamp(24px,8%,120px)] bg-[linear-gradient(to_right,var(--logoloop-fadeColor,var(--logoloop-fadeColorAuto))_0%,rgba(0,0,0,0)_100%)]" /><div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-[clamp(24px,8%,120px)] bg-[linear-gradient(to_left,var(--logoloop-fadeColor,var(--logoloop-fadeColorAuto))_0%,rgba(0,0,0,0)_100%)]" /></>)}
      <div className="flex w-max will-change-transform select-none motion-reduce:transform-none" ref={trackRef}>{lists}</div>
    </div>
  );
});

LogoLoop.displayName = "LogoLoop";
export default LogoLoop;
