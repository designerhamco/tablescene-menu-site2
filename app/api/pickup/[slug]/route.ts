import { getPublicPickupQueue, PickupQueueServiceError } from "@/lib/server/pickup-queue-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  try {
    const data = await getPublicPickupQueue(slug);
    if (!data) {
      return Response.json({ error: "대기번호 화면을 찾을 수 없습니다." }, { status: 404 });
    }
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof PickupQueueServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "대기번호를 불러오지 못했습니다." }, { status: 500 });
  }
}
