const EMG_PREFIX = "EMG:";

/** Persiste teléfono de emergencia en middleName del catálogo (campo libre en API). */
export function encodeEmergencyPhone(
  dial: string,
  national: string,
): string | undefined {
  const digits = national.trim().replace(/\D/g, "");
  if (!digits) return undefined;
  const code = dial.trim().replace(/\D/g, "");
  const display = national.trim().replace(/\s+/g, " ");
  return `${EMG_PREFIX}+${code} ${display}`;
}

export function decodeEmergencyPhone(
  middleName?: string | null,
): string | undefined {
  const value = middleName?.trim();
  if (!value || value === "-" || !value.startsWith(EMG_PREFIX)) return undefined;
  return value.slice(EMG_PREFIX.length).trim();
}
