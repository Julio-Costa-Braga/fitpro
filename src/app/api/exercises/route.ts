import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const muscleGroup = searchParams.get("muscleGroup");

  const exercises = await prisma.exercise.findMany({
    where: muscleGroup ? { muscleGroup } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises);
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "PERSONAL") {
    return NextResponse.json({ error: "Only trainers can create exercises" }, { status: 403 });
  }

  const body = await request.json();
  const { name, muscleGroup, gifUrl, description } = body;

  if (!name || !muscleGroup) {
    return NextResponse.json(
      { error: "name and muscleGroup are required" },
      { status: 400 }
    );
  }

  const exercise = await prisma.exercise.create({
    data: { name, muscleGroup, gifUrl, description },
  });

  return NextResponse.json(exercise, { status: 201 });
}
