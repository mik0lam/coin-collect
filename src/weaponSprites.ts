import { applyWeaponSpriteOverrides, type WeaponSpriteId } from "./sprites";

import rustySwordUrl from "../newsprites/weapons/rusty-sword.png";
import ironSwordUrl from "../newsprites/weapons/iron-sword.png";
import warAxeUrl from "../newsprites/weapons/war-axe.png";
import daggerUrl from "../newsprites/weapons/dagger.png";
import soulreaverUrl from "../newsprites/weapons/soulreaver.png";
import stormCleaverUrl from "../newsprites/weapons/storm-cleaver.png";
import bloodReaperUrl from "../newsprites/weapons/blood-reaper.png";
import phantomBladeUrl from "../newsprites/weapons/phantom-blade.png";
import golemClubUrl from "../newsprites/weapons/golem-club.png";

const WEAPON_IMAGE_URLS: Record<WeaponSpriteId, string> = {
  "rusty-sword": rustySwordUrl,
  "iron-sword": ironSwordUrl,
  "war-axe": warAxeUrl,
  dagger: daggerUrl,
  soulreaver: soulreaverUrl,
  "storm-cleaver": stormCleaverUrl,
  "blood-reaper": bloodReaperUrl,
  "phantom-blade": phantomBladeUrl,
  "golem-club": golemClubUrl,
  "executioner-scythe": bloodReaperUrl,
};

let loaded = false;

async function loadImage(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch weapon image (${response.status}): ${url}`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error(`Expected image, got "${blob.type}" for ${url}`);
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return canvas;
}

export async function loadWeaponSprites() {
  if (loaded) {
    return;
  }

  const weaponIds = Object.keys(WEAPON_IMAGE_URLS) as WeaponSpriteId[];
  const sprites = await Promise.all(weaponIds.map((weaponId) => loadImage(WEAPON_IMAGE_URLS[weaponId])));
  const overrides = Object.fromEntries(weaponIds.map((weaponId, index) => [weaponId, sprites[index]])) as Partial<
    Record<WeaponSpriteId, HTMLCanvasElement>
  >;

  applyWeaponSpriteOverrides(overrides);
  loaded = true;
}
