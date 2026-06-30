import { ARMOR_TIERS } from "./constants";
import type { ArmorTier } from "./types";

export function getNextArmorTier(armorTier: ArmorTier): Exclude<ArmorTier, "none"> | null {
  const order: ArmorTier[] = ["none", "leather", "chain", "plate"];
  const currentIndex = order.indexOf(armorTier);

  if (currentIndex >= order.length - 1) {
    return null;
  }

  return order[currentIndex + 1] as Exclude<ArmorTier, "none">;
}

export function tryCraftArmor(
  scrap: { value: number },
  armorTier: { value: ArmorTier },
  hp: { max: number; current: number },
): string | null {
  const next = getNextArmorTier(armorTier.value);

  if (!next) {
    return "Already wearing the best armor.";
  }

  const recipe = ARMOR_TIERS[next];

  if (scrap.value < recipe.scrapCost) {
    return `Need ${recipe.scrapCost} scrap (${scrap.value} held).`;
  }

  scrap.value -= recipe.scrapCost;
  armorTier.value = next;
  hp.max += recipe.maxHpBonus;
  hp.current += recipe.maxHpBonus;

  return `${recipe.label} crafted! +${recipe.maxHpBonus} max HP`;
}

export function getArmorLabel(armorTier: ArmorTier) {
  if (armorTier === "none") {
    return "None";
  }

  return ARMOR_TIERS[armorTier].label;
}

export function canCraftNextArmor(scrap: number, armorTier: ArmorTier) {
  const next = getNextArmorTier(armorTier);

  if (!next) {
    return false;
  }

  return scrap >= ARMOR_TIERS[next].scrapCost;
}
