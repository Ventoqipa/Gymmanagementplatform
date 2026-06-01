import type { PosProduct } from "../domain/types";

export const POS_SEED_PRODUCTS: PosProduct[] = [
  { id: "SUP-001", name: "ISO WHEY PROTEIN 2LB", category: "SUPPLEMENTS", price: 45.99, stock: 23 },
  { id: "SUP-002", name: "PRE-WORKOUT RAGE", category: "SUPPLEMENTS", price: 32.99, stock: 18 },
  { id: "SUP-003", name: "RECOVERY BCAA", category: "SUPPLEMENTS", price: 28.5, stock: 31 },
  { id: "SUP-004", name: "CREATINE MONOHYDRATE", category: "SUPPLEMENTS", price: 24.99, stock: 27 },
  { id: "GEAR-001", name: "ELITE GYM TANK TOP", category: "GEAR", price: 19.99, stock: 45 },
  { id: "GEAR-002", name: "LIFTING GLOVES PRO", category: "GEAR", price: 15.99, stock: 12 },
  { id: "GEAR-003", name: "GYM TOWEL ELITE", category: "GEAR", price: 12.99, stock: 38 },
  { id: "ACC-001", name: "SHAKER BOTTLE 24OZ", category: "ACCESSORIES", price: 8.99, stock: 56 },
];
