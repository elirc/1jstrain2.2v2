import { getCategoryTree } from "@/lib/catalog";
import { jsonError, jsonOk } from "@/lib/http";
import { createProduct, listSellerProducts, updateProduct } from "@/lib/seller";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const products = listSellerProducts(user.id);
    const categories = getCategoryTree();

    return jsonOk({ products, categories });
  } catch (error) {
    return jsonError(error, error.status || 500);
  }
}

export async function POST(request) {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const body = await request.json();

    const product = createProduct({ sellerId: user.id, payload: body });
    return jsonOk({ product }, 201);
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function PATCH(request) {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const body = await request.json();

    const product = updateProduct({
      sellerId: user.id,
      productId: body.productId,
      payload: body
    });

    return jsonOk({ product });
  } catch (error) {
    return jsonError(error, 400);
  }
}

