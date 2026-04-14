export function isServerLlmDebugEnabled() {
  return process.env.NODE_ENV === 'development';
}

export function isClientLlmDebugEnabled() {
  return process.env.NODE_ENV === 'development';
}
