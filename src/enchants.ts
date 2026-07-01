import type { InventoryItem } from "./types";

export type EnchantKind = "damage" | "durability";

export interface ItemEnchant {
  kind: EnchantKind;
  value: number;
  label: string;
}

const WEAPON_ENCHANT_ROLLS: ItemEnchant[] = [
  { kind: "damage", value: 1, label: "+1 Damage" },
  { kind: "damage", value: 2, label: "+2 Damage" },
  { kind: "durability", value: 10, label: "+10 Durability" },
  { kind: "durability", value: 20, label: "+20 Durability" },
];

export function rollItemEnchant(rng: () => number): ItemEnchant {
  return WEAPON_ENCHANT_ROLLS[Math.floor(rng() * WEAPON_ENCHANT_ROLLS.length)]!;
}

export function applyEnchantToItem(item: InventoryItem, enchant: ItemEnchant): InventoryItem {
  return {
    ...item,
    enchant,
  };
}

export function formatEnchantLabel(item: InventoryItem) {
  return item.enchant?.label ?? "";
}

export function getEnchantDamageBonus(item: InventoryItem | null) {
  if (!item || item.enchant?.kind !== "damage") {
    return 0;
  }

  return item.enchant.value;
}

export function getEnchantDurabilityBonus(item: InventoryItem | null) {
  if (!item || item.enchant?.kind !== "durability") {
    return 0;
  }

  return item.enchant.value;
}
