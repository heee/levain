// Levain — id generation for synced records. crypto.randomUUID() instead of
// a Date.now() suffix: once records merge across devices, two devices
// creating a record in the same millisecond would otherwise collide.

export function newId(prefix) {
  return prefix + "-" + crypto.randomUUID();
}
