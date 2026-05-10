import { useEffect, useRef } from "react";

/**
 * Запускает функцию по интервалу, но ТОЛЬКО когда вкладка видима.
 * - При скрытии вкладки — интервал останавливается (экономия compute)
 * - При возврате на вкладку — сразу делается одно срабатывание + запускается интервал
 * - При размонтировании — корректно чистит таймеры и слушатели
 *
 * @param fn       Функция, которую вызывать (не должна меняться часто — оборачивай в useCallback)
 * @param interval Интервал в миллисекундах (если null/0 — polling выключен)
 * @param enabled  Доп. флаг включения (по умолчанию true). Если false — polling не работает
 */
export function useVisiblePolling(
  fn: () => void | Promise<void>,
  interval: number | null,
  enabled: boolean = true,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled || !interval || interval <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      // Сразу одно срабатывание (чтобы не ждать первый интервал после возврата на вкладку)
      try { fnRef.current(); } catch { /* ignore */ }
      timer = setInterval(() => {
        try { fnRef.current(); } catch { /* ignore */ }
      }, interval);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [interval, enabled]);
}

export default useVisiblePolling;
