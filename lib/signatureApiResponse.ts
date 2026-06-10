import { NextResponse } from "next/server";

export function signatureApiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status }
  );
}

export function signatureApiError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: code || "signature_api_error",
        message,
      },
    },
    { status }
  );
}
