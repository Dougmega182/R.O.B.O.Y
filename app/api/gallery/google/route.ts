import { getGoogleToken } from "@/lib/google";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const token = await getGoogleToken();

  if (!token) {
    return NextResponse.json({ 
      error: "Google Auth Required", 
      authenticated: false, 
      photos: [] 
    }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageToken = searchParams.get("pageToken") || "";

  try {
    const response = await fetch(
      `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50${pageToken ? `&pageToken=${pageToken}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      console.error("Google Photos API Error:", errData);
      throw new Error(`Google Photos API responded with ${response.status}`);
    }

    const data = await response.json();
    
    const photos = (data.mediaItems || [])
      .filter((item: any) => item.mimeType?.startsWith("image/"))
      .map((item: any) => ({
        id: item.id,
        url: item.baseUrl + "=w800",
        full: item.baseUrl + "=w1600",
        caption: item.description || item.filename,
        created_at: item.mediaMetadata?.creationTime
      }));

    return NextResponse.json({ 
      authenticated: true, 
      photos,
      nextPageToken: data.nextPageToken 
    });
  } catch (error: any) {
    console.error("Google Photos Route Error:", error);
    return NextResponse.json({ 
      error: error.message, 
      photos: [] 
    }, { status: 500 });
  }
}
