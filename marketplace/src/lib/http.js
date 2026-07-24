import { NextResponse } from "next/server";

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error, fallbackStatus = 400) {
  const status = error?.status || fallbackStatus;
  return NextResponse.json({ error: error?.message || "Request failed" }, { status });
}

