import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/services/api";

export const dynamic = "force-dynamic";

const ALLOWED_EXPORT_PATH =
  /^(pdf|csv)\/((turma|professor)\/\d+|todas)$/;

/**
 * Proxy server-side para streaming seguro de PDFs e CSVs gerados pelo backend Java.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  const normalizedPath = (slug ?? []).join("/");

  if (!ALLOWED_EXPORT_PATH.test(normalizedPath)) {
    return NextResponse.json(
      { error: "Rota de exportacao invalida" },
      { status: 400 }
    );
  }

  const targetUrl = `${getApiBaseUrl()}/api/export/${normalizedPath}`;
  try {
    const upstream = await fetch(targetUrl, { cache: "no-store" });
    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: errorText || "Erro ao gerar arquivo de exportacao" },
        { status: upstream.status }
      );
    }

    const bytes = await upstream.arrayBuffer();
    const headers = new Headers();
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const disposition = upstream.headers.get("content-disposition");
    headers.set("Content-Type", contentType);
    if (disposition) {
      headers.set("Content-Disposition", disposition);
    }
    headers.set("Cache-Control", "no-store");

    return new NextResponse(bytes, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: "Backend indisponivel para exportacao" },
      { status: 502 }
    );
  }
}

