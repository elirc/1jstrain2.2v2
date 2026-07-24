import { requireUser } from "@/lib/auth";
import { voteReview } from "@/lib/engagement";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request) {
  try {
    const user = await requireUser(["BUYER", "SELLER", "ADMIN"]);
    const body = await request.json();

    const result = voteReview({
      userId: user.id,
      reviewId: body.reviewId,
      vote: body.vote
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error, error.status || 400);
  }
}

