import { NextRequest, NextResponse } from "next/server";
import { newsRepository } from "@/modules/news-intelligence/repositories/news.repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const article = await newsRepository.getById(id);

    if (!article) {
      return NextResponse.json(
        { success: false, message: "Article not found." },
        { status: 404 }
      );
    }

    // Related articles from the same source (exclude current)
    const relatedArticles = await newsRepository.getBySource(article.source, id);

    return NextResponse.json({
      success: true,
      data: {
        article,
        relatedArticles,
      },
    });
  } catch (error) {
    console.error("[/api/v1/news/[id]]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch article." },
      { status: 500 }
    );
  }
}
