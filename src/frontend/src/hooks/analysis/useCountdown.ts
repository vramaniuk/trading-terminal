import { useEffect, useState } from "react";

export function useCountdown(targetMs: number): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function update() {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setLabel("settling...");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setLabel(`${h}h ${m}m ${s}s`);
      else if (m > 0) setLabel(`${m}m ${s}s`);
      else setLabel(`${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return label;
}

export function useFngCountdown(seconds: number): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!seconds) return;
    let remaining = seconds;
    function update() {
      if (remaining <= 0) {
        setLabel("updating...");
        return;
      }
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setLabel(m > 0 ? `${m}m ${s}s` : `${s}s`);
      remaining -= 1;
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return label;
}
