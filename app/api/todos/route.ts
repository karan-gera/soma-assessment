import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(todos);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate } = await request.json();
    console.log('Received data:', { title, dueDate });
    
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Fetch image from Pexels API
    let imageUrl = null;
    try {
      const apiKey = process.env.PEXELS_API_KEY;
      if (apiKey) {
        const imageResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(title)}&per_page=1`,
          {
            headers: {
              'Authorization': apiKey,
            },
          }
        );

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.photos && imageData.photos.length > 0) {
            imageUrl = imageData.photos[0].src.medium;
          }
        }
      }
    } catch (imageError) {
      console.error('Error fetching image:', imageError);
      // Continue without image if there's an error
    }
    
    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        imageUrl,
      },
    });
    console.log('Created todo:', todo);
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Error creating todo' }, { status: 500 });
  }
}