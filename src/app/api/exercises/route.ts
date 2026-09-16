import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const muscleGroup = searchParams.get("muscleGroup");

  // ADMIN ve tudo. Demais perfis veem apenas presets + exercicios proprios.
  const scope =
    auth.user.role === "ADMIN"
      ? {}
      : { OR: [{ isPreset: true }, { trainerId: auth.user.userId }] };
  const where = muscleGroup
    ? { ...scope, AND: [{ muscleGroup }] }
    : scope;

  const exercises = await prisma.exercise.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises);
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  const body = await request.json();
  const { name, muscleGroup, gifUrl, description } = body;

  if (!name || !muscleGroup) {
    return NextResponse.json(
      { error: "name and muscleGroup are required" },
      { status: 400 }
    );
  }

  const exercise = await prisma.exercise.create({
    data: {
      name,
      muscleGroup,
      gifUrl,
      description,
      trainerId: user.role === "PERSONAL" ? user.userId : null,
      isPreset: user.role === "ADMIN",
    },
  });

  return NextResponse.json(exercise, { status: 201 });
}
