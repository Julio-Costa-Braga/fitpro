import { PrismaClient, UserRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const HASHED_PASSWORD = hashSync("123456", 10);

const exercises = [
  { name: "Supino Reto com Barra", muscleGroup: "Peito", gifUrl: "https://static.exercisedb.dev/media/EIeI8Vf.gif", description: "Exercício fundamental para peito" },
  { name: "Supino Inclinado com Halteres", muscleGroup: "Peito", gifUrl: "https://static.exercisedb.dev/media/PG1kcIb.gif", description: "Foco na porção superior do peito" },
  { name: "Crucifixo com Halteres", muscleGroup: "Peito", gifUrl: "https://static.exercisedb.dev/media/1PLE8e9.gif", description: "Isolamento do peitoral" },
  { name: "Puxada Frontal", muscleGroup: "Costas", gifUrl: "https://static.exercisedb.dev/media/eYnzaCm.gif", description: "Trabalho de dorsal" },
  { name: "Remada Curvada com Barra", muscleGroup: "Costas", gifUrl: "https://static.exercisedb.dev/media/eZyBC3j.gif", description: "Espessura dorsal" },
  { name: "Pulldown na Polia", muscleGroup: "Costas", gifUrl: "https://static.exercisedb.dev/media/4c9BhzB.gif", description: "Variação da puxada frontal" },
  { name: "Agachamento Livre", muscleGroup: "Pernas", gifUrl: "https://static.exercisedb.dev/media/DhMl549.gif", description: "Rei dos exercícios de perna" },
  { name: "Leg Press 45", muscleGroup: "Pernas", gifUrl: "https://static.exercisedb.dev/media/10Z2DXU.gif", description: "Trabalho de quadríceps e glúteos" },
  { name: "Stiff", muscleGroup: "Pernas", gifUrl: "https://static.exercisedb.dev/media/hrVQWvE.gif", description: "Posterior de coxa e lombar" },
  { name: "Rosca Direta com Barra", muscleGroup: "Braços", gifUrl: "https://static.exercisedb.dev/media/4dUn2iv.gif", description: "Bíceps braquial" },
  { name: "Tríceps Testa", muscleGroup: "Braços", gifUrl: "https://static.exercisedb.dev/media/5uFK1xr.gif", description: "Cabeça longa do tríceps" },
  { name: "Desenvolvimento com Halteres", muscleGroup: "Ombros", gifUrl: "https://static.exercisedb.dev/media/5vfAI0I.gif", description: "Deltoide anterior e lateral" },
  { name: "Elevação Lateral", muscleGroup: "Ombros", gifUrl: "https://static.exercisedb.dev/media/DsgkuIt.gif", description: "Isolamento do deltoide lateral" },
  { name: "Abdominal Crunch", muscleGroup: "Abdômen", gifUrl: "https://static.exercisedb.dev/media/BMMolZ3.gif", description: "Trabalho de reto abdominal" },
  { name: "Prancha Isométrica", muscleGroup: "Abdômen", gifUrl: "https://static.exercisedb.dev/media/CosupLu.gif", description: "Core e estabilidade" },
];

async function main() {
  console.log("🧹 Limpando banco de dados...");
  await prisma.completedExercise.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.mealFood.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.progressLog.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.dietPlan.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  console.log("👤 Criando usuários...");
  const personal = await prisma.user.create({
    data: {
      name: "Eddie",
      email: "eddie@fitpro.com",
      password: HASHED_PASSWORD,
      role: UserRole.PERSONAL,
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      name: "João Silva",
      email: "joao@fitpro.com",
      password: HASHED_PASSWORD,
      role: UserRole.STUDENT,
      trainerId: personal.id,
    },
  });

  console.log("🏃 Criando registro de aluno...");
  const student = await prisma.student.create({
    data: {
      name: "João Silva",
      email: "joao@fitpro.com",
      phone: "(11) 99999-1234",
      personalId: personal.id,
    },
  });

  console.log("💪 Criando biblioteca de exercícios...");
  const createdExercises = await Promise.all(
    exercises.map((e) => prisma.exercise.create({ data: e }))
  );

  console.log("🏋️ Criando treino样品...");
  const workout = await prisma.workout.create({
    data: {
      name: "Treino A - Peito e Tríceps",
      description: "Treino focado em peito e tríceps com foco em hipertrofia",
      dayLetter: "A",
      dayOfWeek: "Segunda-feira",
      studentId: student.id,
      trainerId: personal.id,
    },
  });

  const peitoExercises = createdExercises.filter((e) => e.muscleGroup === "Peito");
  const tricepsExercises = createdExercises.filter((e) => e.muscleGroup === "Braços").slice(0, 1);

  const workoutExercisesData = [...peitoExercises, ...tricepsExercises].map((exercise, i) => ({
    order: i + 1,
    sets: i < 3 ? 4 : 3,
    reps: i < 3 ? "8-12" : "10-15",
    initialLoad: i < 3 ? "20kg" : "10kg",
    restTime: 90,
    notes: i === 0 ? "Aquecimento: 2 séries leves antes" : undefined,
    workoutId: workout.id,
    exerciseId: exercise.id,
  }));

  await prisma.workoutExercise.createMany({ data: workoutExercisesData });

  console.log("🥗 Criando plano de dieta...");
  const dietPlan = await prisma.dietPlan.create({
    data: {
      name: "Dieta Hipertrofia",
      description: "Dieta para ganho de massa muscular - 2800 kcal/dia",
      dailyProtein: 180,
      dailyCarbs: 320,
      dailyFat: 85,
      dailyCalories: 2800,
      waterIntake: "3L por dia",
      supplementation: "Whey protein pós-treino, Creatina 5g/dia, Multivitamínico",
      studentId: student.id,
      trainerId: personal.id,
    },
  });

  const mealsData = [
    {
      name: "Café da Manhã",
      time: "07:00",
      order: 1,
      foods: [
        { name: "Ovos inteiros", quantity: "4 unidades", protein: 28, carbs: 2, fat: 20, calories: 308 },
        { name: "Pão integral", quantity: "2 fatias", protein: 8, carbs: 26, fat: 2, calories: 160 },
        { name: "Banana", quantity: "1 unidade", protein: 1, carbs: 27, fat: 0, calories: 105 },
        { name: "Suco de laranja", quantity: "200ml", protein: 2, carbs: 22, fat: 0, calories: 90 },
      ],
    },
    {
      name: "Lanche da Manhã",
      time: "10:00",
      order: 2,
      foods: [
        { name: "Whey protein", quantity: "1 scoop (30g)", protein: 24, carbs: 3, fat: 1, calories: 120 },
        { name: "Aveia", quantity: "40g", protein: 5, carbs: 27, fat: 3, calories: 150 },
        { name: "Castanhas", quantity: "20g", protein: 3, carbs: 3, fat: 13, calories: 130 },
      ],
    },
    {
      name: "Almoço",
      time: "12:30",
      order: 3,
      foods: [
        { name: "Arroz integral", quantity: "150g (peso cru)", protein: 8, carbs: 72, fat: 3, calories: 360 },
        { name: "Peito de frango", quantity: "200g", protein: 46, carbs: 0, fat: 4, calories: 230 },
        { name: "Feijão carioca", quantity: "100g", protein: 9, carbs: 20, fat: 1, calories: 125 },
        { name: "Salada verde", quantity: "à vontade", protein: 2, carbs: 4, fat: 0, calories: 25 },
      ],
    },
    {
      name: "Lanche da Tarde",
      time: "15:30",
      order: 4,
      foods: [
        { name: "Batata doce", quantity: "200g", protein: 3, carbs: 50, fat: 0, calories: 210 },
        { name: "Frango desfiado", quantity: "100g", protein: 23, carbs: 0, fat: 2, calories: 115 },
        { name: "Abacate", quantity: "50g", protein: 1, carbs: 4, fat: 8, calories: 80 },
      ],
    },
    {
      name: "Jantar",
      time: "19:00",
      order: 5,
      foods: [
        { name: "Salmão", quantity: "180g", protein: 38, carbs: 0, fat: 18, calories: 320 },
        { name: "Quinoa", quantity: "100g (peso cru)", protein: 14, carbs: 62, fat: 6, calories: 360 },
        { name: "Legumes refogados", quantity: "150g", protein: 3, carbs: 10, fat: 2, calories: 65 },
      ],
    },
  ];

  for (const mealData of mealsData) {
    const { foods, ...meal } = mealData;
    const createdMeal = await prisma.meal.create({
      data: { ...meal, dietPlanId: dietPlan.id },
    });
    await prisma.mealFood.createMany({
      data: foods.map((f) => ({ ...f, mealId: createdMeal.id })),
    });
  }

  console.log("📊 Criando registro de progresso...");
  await prisma.progressLog.create({
    data: {
      date: new Date("2026-09-01"),
      weight: 78.5,
      bodyFat: 15.2,
      chest: 98,
      waist: 82,
      arm: 34,
      thigh: 56,
      notes: "Primeiro registro de progresso. Aluno demonstra boa disposição.",
      studentId: student.id,
    },
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log(`   - Personal: ${personal.email} (senha: 123456)`);
  console.log(`   - Aluno: ${studentUser.email} (senha: 123456)`);
  console.log(`   - ${exercises.length} exercícios criados`);
  console.log(`   - 1 treino com ${workoutExercisesData.length} exercícios`);
  console.log(`   - 1 dieta com ${mealsData.length} refeições`);
  console.log(`   - 1 registro de progresso`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
