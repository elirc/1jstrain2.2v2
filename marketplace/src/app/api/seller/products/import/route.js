import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { importProductsFromCsv } from "@/lib/seller";

export async function POST(request) {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const body = await request.json();

    if (!body.csvText) {
      return jsonError(new Error("csvText is required"), 400);
    }

    const result = importProductsFromCsv({
      sellerId: user.id,
      csvText: body.csvText
    });

    return jsonOk({ result }, 201);
  } catch (error) {
    return jsonError(error, 400);
  }
}

