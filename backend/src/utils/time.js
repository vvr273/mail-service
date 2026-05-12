export function addMinutes(date, min) {
  return new Date(date.getTime() + min * 60 * 1000);
}

export function addSeconds(date, sec) {
  return new Date(date.getTime() + sec * 1000);
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
