import { useEffect, useRef, useState } from "react";

export const PLAYER_ROW_HEIGHT = 56;
const OVERSCAN = 6;

export function useVirtualRows(count: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 30 });

  const measure = () => {
    const element = scrollRef.current;
    if (!element) return;
    const start = Math.max(0, Math.floor(element.scrollTop / PLAYER_ROW_HEIGHT) - OVERSCAN);
    const visible = Math.ceil(element.clientHeight / PLAYER_ROW_HEIGHT) + OVERSCAN * 2;
    setRange({ start, end: Math.min(count, start + visible) });
  };

  useEffect(measure, [count]);

  // A new filter can shorten the list beneath a scrolled-down viewport.
  useEffect(() => {
    const element = scrollRef.current;
    if (element && element.scrollTop > count * PLAYER_ROW_HEIGHT) element.scrollTop = 0;
  }, [count]);

  return { scrollRef, range, onScroll: measure };
}
