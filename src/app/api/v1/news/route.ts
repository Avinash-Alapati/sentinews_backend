import { NextRequest, NextResponse } from "next/server";

import { newsService } from "@/modules/news-intelligence/services/news.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const q = searchParams.get("q");
    const company = searchParams.get("company");
    const sector = searchParams.get("sector");
    const trending = searchParams.get("trending");

    let data;

    if (trending === "true") {
      data = await newsService.getTrendingNews({
        page,
        limit,
      });
    } else if (company) {
      data = await newsService.getCompanyNews({
        company,
        page,
        limit,
      });
    } else if (sector) {
      data = await newsService.getSectorNews({
        sector,
        page,
        limit,
      });
    } else if (q) {
      data = await newsService.searchNews({
        q,
        page,
        limit,
      });
    } else {
      data = await newsService.getLatestNews({
        page,
        limit,
      });
    }

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        data,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch news.",
      },
      {
        status: 500,
      }
    );
  }
}