import { createPosConfig } from "@/features/pos";

/** Config POS Elite Gym — productos y ventas vía POS API REST. */
export const gymPosConfig = createPosConfig({
  useMock: import.meta.env.VITE_POS_USE_MOCK === "true",
});
