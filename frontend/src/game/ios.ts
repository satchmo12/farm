export function isoPosition(x: number, y: number) {
  const tileW = 80;
  const tileH = 40;

  return {
    left: (x - y) * (tileW / 2),
    top: (x + y) * (tileH / 2),
  };
}

// export function worldToGrid(x: number, y: number): GridPosition {
//   const col = Math.round((x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2);
//   const row = Math.round((y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2);

//   return { row, col };
// }

export function getTileZIndex(row: number, col: number) {
  return row + col;
}