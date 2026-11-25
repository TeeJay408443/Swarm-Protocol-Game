import areaBlackArenaImg from '../../../assets/images/area_black_arena_1795142864960.jpg'
import areaAstralCitadelImg from '../../../assets/images/area_astral_citadel_1795142864785.jpg'
import areaMoltenStarforgeImg from '../../../assets/images/area_molten_starforge.jpg'
import type { ArenaId } from '../../../config/arenas'

export const ARENA_PREVIEW_IMAGES: Record<ArenaId, string> = {
  carbon_sector: areaBlackArenaImg,
  astral_citadel: areaAstralCitadelImg,
  molten_starforge: areaMoltenStarforgeImg
}
