type Listener = () => void;

const expiredListeners = new Set<Listener>();

export function emitSessionExpired() {
  expiredListeners.forEach((listener) => listener());
}

export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}
