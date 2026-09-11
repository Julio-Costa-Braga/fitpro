import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({ where: { id } });

  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  return NextResponse.json(exercise);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "PERSONAL") {
    return NextResponse.json({ error: "Only trainers can update exercises" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, muscleGroup, gifUrl, description } = body;

  const exercise = await prisma.exercise.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(muscleGroup !== undefined && { muscleGroup }),
      ...(gifUrl !== undefined && { gifUrl }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json(exercise);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "PERSONAL") {
    return NextResponse.json({ error: "Only trainers can delete exercises" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  await prisma.exercise.delete({ where: { id } });

  return NextResponse.json({ message: "Exercise deleted" });
}
