import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Pexels API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          'Authorization': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      return NextResponse.json({
        imageUrl: photo.src.medium,
        photographer: photo.photographer,
        alt: photo.alt
      });
    } else {
      return NextResponse.json({ 
        imageUrl: null,
        message: 'No images found for this query'
      });
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Error fetching image' }, { status: 500 });
  }
} 