import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, periods, location, reason, applicants } = body;

    // Basic validation
    if (!date || !periods || !Array.isArray(periods) || periods.length === 0) {
      return NextResponse.json(
        { error: "날짜와 교시를 선택해주세요." },
        { status: 400 }
      );
    }
    if (!location || typeof location !== "string") {
      return NextResponse.json(
        { error: "위치를 선택해주세요." },
        { status: 400 }
      );
    }
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return NextResponse.json(
        { error: "이동 사유를 입력해주세요." },
        { status: 400 }
      );
    }
    if (!applicants || !Array.isArray(applicants) || applicants.length === 0) {
      return NextResponse.json(
        { error: "신청자를 1명 이상 추가해주세요." },
        { status: 400 }
      );
    }

    // Validate student ID (학번) format: exactly 4 digits
    const idRegex = /^\d{4}$/;
    for (const app of applicants) {
      if (!app.id || !idRegex.test(app.id)) {
        return NextResponse.json(
          { error: `올바르지 않은 학번입니다: ${app.id || "빈 값"}. 학번은 4자리 숫자여야 합니다. (예: 1101)` },
          { status: 400 }
        );
      }
      if (!app.name || typeof app.name !== "string" || app.name.trim() === "") {
        return NextResponse.json(
          { error: "신청자 이름을 모두 입력해주세요." },
          { status: 400 }
        );
      }
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Duplicate Prevention Logic
    // Find all PENDING or APPROVED permits for the same date
    const existingPermits = await prisma.permit.findMany({
      where: {
        date: targetDate,
        status: {
          in: ["PENDING", "APPROVED"],
        },
      },
    });

    const existingStudentIds = new Set<string>();
    for (const permit of existingPermits) {
      const apps = permit.applicants as any[];
      if (Array.isArray(apps)) {
        for (const app of apps) {
          if (app && typeof app.id === "string") {
            existingStudentIds.add(app.id);
          }
        }
      }
    }

    const duplicates = applicants
      .filter((app: any) => existingStudentIds.has(app.id))
      .map((app: any) => app.id);

    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          error: "이미 해당 날짜에 허가원을 신청한 학생이 포함되어 있습니다.",
          duplicates,
        },
        { status: 400 }
      );
    }

    // Create the permit
    const newPermit = await prisma.permit.create({
      data: {
        date: targetDate,
        periods,
        location,
        reason,
        applicants: applicants as any,
        status: "PENDING",
      },
    });

    return NextResponse.json(newPermit, { status: 201 });
  } catch (error) {
    console.error("Failed to create permit:", error);
    return NextResponse.json(
      { error: "허가원 신청에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const query = searchParams.get("query");

    if (idsParam) {
      // Fetch specific permits (e.g. from user's localStorage list)
      const ids = idsParam.split(",").filter(Boolean);
      const permits = await prisma.permit.findMany({
        where: {
          id: { in: ids },
        },
        include: {
          approver: {
            select: {
              name: true,
              subject: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return NextResponse.json(permits);
    }

    if (query) {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return NextResponse.json([]);
      }

      // Fetch all permits from last 30 days and filter in-memory to prevent complicated postgres-specific json path queries
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const permits = await prisma.permit.findMany({
        where: {
          date: {
            gte: thirtyDaysAgo,
          },
        },
        include: {
          approver: {
            select: {
              name: true,
              subject: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      // Filter in-memory for name or student ID matching
      const filtered = permits.filter((permit) => {
        const apps = permit.applicants as any[];
        if (!Array.isArray(apps)) return false;
        return apps.some(
          (app) =>
            (app.id && app.id.includes(trimmedQuery)) ||
            (app.name && app.name.includes(trimmedQuery))
        );
      });

      return NextResponse.json(filtered);
    }

    return NextResponse.json(
      { error: "ids or query parameters are required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to query permits:", error);
    return NextResponse.json(
      { error: "허가원 목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
