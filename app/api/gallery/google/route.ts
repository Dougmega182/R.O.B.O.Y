import { getGoogleTokens } from "@/lib/google";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchGooglePhotos(token: string, pageToken: string) {
  const response = await fetch(
    `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50${pageToken ? `&pageToken=${pageToken}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

export async function GET(request: Request) {
  const { sessionToken, storedToken } = await getGoogleTokens();

  if (!sessionToken && !storedToken) {
    return NextResponse.json(
      {
        error: "Google Auth Required",
        authenticated: false,
        photos: [],
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const pageToken = searchParams.get("pageToken") || "";
  const attemptedTokens = [sessionToken, storedToken].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);

  try {
    let lastErrorPayload: any = null;
    let lastStatus = 500;

    for (const token of attemptedTokens) {
      const { response, payload } = await fetchGooglePhotos(token, pageToken);

      if (response.ok) {
        const photos = (payload?.mediaItems || [])
          .filter((item: any) => item.mimeType?.startsWith("image/"))
          .map((item: any) => ({
            id: item.id,
            url: `${item.baseUrl}=w800`,
            full: `${item.baseUrl}=w1600`,
            caption: item.description || item.filename,
            created_at: item.mediaMetadata?.creationTime,
          }));

        return NextResponse.json({
          authenticated: true,
          photos,
          nextPageToken: payload?.nextPageToken || null,
        });
      }

      lastStatus = response.status;
      lastErrorPayload = payload;

      if (response.status !== 401 && response.status !== 403) {
        break;
      }
    }

    console.error("Google Photos API Error:", lastErrorPayload);

    return NextResponse.json(
      {
        error:
          lastStatus === 403
            ? "Google Photos permission denied. Reconnect Google with Photos access."
            : lastStatus === 401
              ? "Google authentication expired. Reconnect Google."
              : `Google Photos API responded with ${lastStatus}`,
        code: lastStatus,
        details: lastErrorPayload,
        photos: [],
      },
      { status: lastStatus }
    );
  } catch (error: any) {
    console.error("Google Photos Route Error:", error);
    return NextResponse.json(
      {
        error: error.message,
        photos: [],
      },
      { status: 500 }
    );
  }
}
