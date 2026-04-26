let stopRequested = false;

export function markStopRequested(): void {
  stopRequested = true;
}

export function clearStopRequest(): void {
  stopRequested = false;
}

export function isStopRequested(): boolean {
  return stopRequested;
}
