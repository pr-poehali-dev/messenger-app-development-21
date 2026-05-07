export function ConfirmDialog({
  title, text, danger, loading, onCancel, onConfirm,
}: {
  title: string;
  text: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-sm glass-strong rounded-3xl p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-base mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{text}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 glass rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">Отмена</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 ${danger ? "bg-red-500 hover:bg-red-600" : "grad-primary"}`}
          >
            {loading ? "..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
