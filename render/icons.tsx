// Shared icon renderer — used by GameLoop (abilities) and BottomControls.
// Game-themed icons come from react-icons/gi (Game Icons project).
// We keep the string-based API (iconName: string) so JSON data files
// (abilities.json, items.json) can reference icons by name without
// needing to import React components.
import React from 'react';
import {
  GiBroadsword,
  GiShield,
  GiHeavyLightning,
  GiHealthPotion,
  GiDeathSkull,
  GiGhost,
  GiFootprint,
  GiCrosshair,
  GiWhirlwind,
  GiFire,
  GiWaterDrop,
  GiBlackBook,
  GiFlatHammer,
  GiFairyWand,
  GiTornado,
  GiTiedScroll,
  GiBubblingFlask,
} from 'react-icons/gi';
import type { IconType } from 'react-icons';

const ICONS: Record<string, IconType> = {
  Sword: GiBroadsword,
  Shield: GiShield,
  Zap: GiHeavyLightning,
  Heart: GiHealthPotion,
  Skull: GiDeathSkull,
  Ghost: GiGhost,
  Footprints: GiFootprint,
  Crosshair: GiCrosshair,
  Hurricane: GiTornado,
  Tornado: GiTornado,
  Wind: GiWhirlwind,
  Flame: GiFire,
  Droplets: GiWaterDrop,
  Book: GiBlackBook,
  Hammer: GiFlatHammer,
  Wand: GiFairyWand,
  Scroll: GiTiedScroll,
  FlaskConical: GiBubblingFlask,
};

export const renderIcon = (iconName: string, size: number = 24, className: string = '') => {
  const Icon = ICONS[iconName] ?? GiHeavyLightning;
  return <Icon size={size} className={className} />;
};
