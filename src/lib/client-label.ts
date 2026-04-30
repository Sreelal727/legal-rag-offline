/**
 * Shared helper: compute the display label for a client in a Select dropdown.
 *
 * Problem solved:
 * 1. Radix UI's SelectValue resolves display text from SelectItem children at
 *    render time. When clients load asynchronously the matching SelectItem may
 *    not be mounted yet, so Radix falls back to showing the raw UUID value.
 *    Fix: always pass the computed label as explicit children to <SelectValue>.
 *
 * 2. Multiple clients can share the same name (e.g. three "Canara Bank" rows
 *    for different branches). The label includes the branch/address in brackets
 *    for disambiguation: "Canara Bank (Palakkad Main Branch)".
 */

export interface LabelClient {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
}

/**
 * Returns the human-readable label for a single client given the full list.
 * If the name is unique in the list → just the name.
 * If the name is duplicated → "Name (branch or city)".
 */
export function clientLabel(
  client: LabelClient,
  allClients: LabelClient[]
): string {
  const sameNameCount = allClients.filter((c) => c.name === client.name).length;
  if (sameNameCount > 1) {
    const extra = client.address?.trim() || client.city?.trim();
    if (extra) return `${client.name} (${extra})`;
  }
  return client.name;
}

/**
 * Convenience: returns the label for the currently-selected client ID,
 * or an empty string if not found (SelectValue will then show its placeholder).
 */
export function selectedClientLabel(
  selectedId: string | null | undefined,
  allClients: LabelClient[]
): string {
  if (!selectedId) return "";
  const client = allClients.find((c) => c.id === selectedId);
  return client ? clientLabel(client, allClients) : "";
}
