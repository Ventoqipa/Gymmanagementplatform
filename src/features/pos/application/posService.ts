import { generateProductSku } from "../domain/productId";
import { createPosRepository } from "../infrastructure/createPosRepository";
import type {
  CheckoutInput,
  CreateProductInput,
  PosProduct,
  PosSale,
  UpdateProductInput,
} from "../domain/types";

export class PosService {
  private readonly repo = createPosRepository();

  listProducts(params?: { search?: string; category?: string }) {
    return this.repo.listProducts(params);
  }

  async createProduct(
    input: Omit<CreateProductInput, "id"> & { category: string },
    catalog: PosProduct[],
  ) {
    const id = generateProductSku(input.category, catalog);
    return this.repo.createProduct({ ...input, id });
  }

  updateProduct(id: string, input: UpdateProductInput) {
    return this.repo.updateProduct(id, input);
  }

  deleteProduct(id: string) {
    return this.repo.deleteProduct(id);
  }

  checkout(input: CheckoutInput) {
    return this.repo.checkout(input);
  }

  listSalesToday() {
    return this.repo.listSalesToday();
  }

  listSales(params?: { fromIso?: string; toIso?: string }): Promise<PosSale[]> {
    return this.repo.listSales(params);
  }
}

export const posService = new PosService();
