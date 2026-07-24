import { getCatalog } from "@/lib/catalog";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const data = getCatalog({
      query: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      minRating: searchParams.get("minRating") || "",
      shippingSpeed: searchParams.get("shipping") || "",
      seller: searchParams.get("seller") || "",
      sort: searchParams.get("sort") || "relevance",
      cursor: searchParams.get("cursor") || "0",
      pageSize: Number(searchParams.get("limit") || 12)
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError(error, 500);
  }
}

