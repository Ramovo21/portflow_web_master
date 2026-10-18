const KEY = "pf.review.openNext";

export function readOpenNext(): boolean {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function writeOpenNext(value: boolean) {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    return;
  }
}
