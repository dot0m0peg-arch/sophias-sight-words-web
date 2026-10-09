export function plantGardenFlower(data, letter) {
  const first = String(letter).charAt(0).toLowerCase();
  const index = /^[a-z]$/.test(first) ? first.charCodeAt(0) - 97 : 0;
  const total = Math.max(data.gardenTotal, 0);
  const species = (index + total % 4) % 4;
  return {species, data: {...data,
    gardenFlowers: [...data.gardenFlowers, species].slice(-24),
    gardenTotal: Math.min(total, Number.MAX_SAFE_INTEGER - 1) + 1}};
}
