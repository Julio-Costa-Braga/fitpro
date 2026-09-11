import { PrismaClient, StudentLevel } from "@prisma/client";

const prisma = new PrismaClient();

interface ProgramWorkout {
  name: string;
  description: string;
  slices: { group: string; count: number; offset: number }[];
  sets: number;
  reps: string;
  restTime: number;
  initialLoad: string;
}

interface Program {
  level: StudentLevel;
  namePrefix: string;
  workouts: ProgramWorkout[];
}

const PROGRAMS: Program[] = [
  {
    level: StudentLevel.INICIANTE,
    namePrefix: "Iniciante",
    workouts: [
      {
        name: "Iniciante A - Corpo Inteiro (Empurrar)",
        description: "Primeiro treino do iniciante, foco em aprender os movimentos basicos.",
        slices: [
          { group: "Peito", count: 3, offset: 0 },
          { group: "Ombros", count: 2, offset: 0 },
          { group: "Bracos", count: 1, offset: 0 },
        ],
        sets: 3,
        reps: "10-12",
        restTime: 90,
        initialLoad: "Peso leve",
      },
      {
        name: "Iniciante B - Corpo Inteiro (Puxar)",
        description: "Treino de puxada e core para o iniciante.",
        slices: [
          { group: "Costas", count: 3, offset: 2 },
          { group: "Bracos", count: 2, offset: 4 },
          { group: "Abdomen", count: 1, offset: 0 },
        ],
        sets: 3,
        reps: "10-12",
        restTime: 90,
        initialLoad: "Peso leve",
      },
      {
        name: "Iniciante C - Pernas e Core",
        description: "Treino de membros inferiores e abdome.",
        slices: [
          { group: "Pernas", count: 4, offset: 0 },
          { group: "Abdomen", count: 2, offset: 2 },
        ],
        sets: 3,
        reps: "10-12",
        restTime: 90,
        initialLoad: "Peso leve",
      },
    ],
  },
  {
    level: StudentLevel.MODERADO,
    namePrefix: "Moderado",
    workouts: [
      {
        name: "Moderado A - Peito e Triceps",
        description: "Treino dividido de peito e triceps com volume moderado.",
        slices: [
          { group: "Peito", count: 4, offset: 3 },
          { group: "Bracos", count: 2, offset: 2 },
        ],
        sets: 4,
        reps: "8-12",
        restTime: 120,
        initialLoad: "15kg",
      },
      {
        name: "Moderado B - Costas e Biceps",
        description: "Treino dividido de costas e biceps.",
        slices: [
          { group: "Costas", count: 4, offset: 0 },
          { group: "Bracos", count: 2, offset: 0 },
        ],
        sets: 4,
        reps: "8-12",
        restTime: 120,
        initialLoad: "20kg",
      },
      {
        name: "Moderado C - Pernas e Ombros",
        description: "Treino de pernas e ombros com volume moderado.",
        slices: [
          { group: "Pernas", count: 4, offset: 2 },
          { group: "Ombros", count: 3, offset: 0 },
        ],
        sets: 4,
        reps: "8-12",
        restTime: 120,
        initialLoad: "25kg",
      },
    ],
  },
  {
    level: StudentLevel.AVANCADO,
    namePrefix: "Avancado",
    workouts: [
      {
        name: "Avancado A - Pernas",
        description: "Treino pesado de membros inferiores para aluno avancado.",
        slices: [{ group: "Pernas", count: 6, offset: 0 }],
        sets: 5,
        reps: "6-12",
        restTime: 150,
        initialLoad: "40kg",
      },
      {
        name: "Avancado B - Peito",
        description: "Treino intenso de peitoral.",
        slices: [{ group: "Peito", count: 5, offset: 0 }],
        sets: 5,
        reps: "6-12",
        restTime: 150,
        initialLoad: "30kg",
      },
      {
        name: "Avancado C - Costas e Ombros",
        description: "Treino pesado de costas e ombros.",
        slices: [
          { group: "Costas", count: 4, offset: 1 },
          { group: "Ombros", count: 3, offset: 1 },
        ],
        sets: 5,
        reps: "6-12",
        restTime: 150,
        initialLoad: "35kg",
      },
      {
        name: "Avancado D - Bracos e Abdomen",
        description: "Treino de bracos e core para volume.",
        slices: [
          { group: "Bracos", count: 3, offset: 5 },
          { group: "Abdomen", count: 3, offset: 0 },
        ],
        sets: 4,
        reps: "10-15",
        restTime: 120,
        initialLoad: "12kg",
      },
    ],
  },
];

interface FoodSeed {
  name: string;
  quantity: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface MealSeed {
  name: string;
  time: string;
  foods: FoodSeed[];
}

interface DietPreset {
  level: StudentLevel;
  name: string;
  description: string;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyCalories: number;
  waterIntake: string;
  supplementation: string;
  meals: MealSeed[];
}

const BASE_MEALS: MealSeed[] = [
  {
    name: "Cafe da Manha",
    time: "07:00",
    foods: [
      { name: "Ovos inteiros", quantity: "4 unidades", protein: 28, carbs: 2, fat: 20, calories: 308 },
      { name: "Pao integral", quantity: "2 fatias", protein: 8, carbs: 26, fat: 2, calories: 160 },
      { name: "Banana", quantity: "1 unidade", protein: 1, carbs: 27, fat: 0, calories: 105 },
      { name: "Suco de laranja", quantity: "200ml", protein: 2, carbs: 22, fat: 0, calories: 90 },
    ],
  },
  {
    name: "Lanche da Manha",
    time: "10:00",
    foods: [
      { name: "Whey protein", quantity: "1 scoop (30g)", protein: 24, carbs: 3, fat: 1, calories: 120 },
      { name: "Aveia", quantity: "40g", protein: 5, carbs: 27, fat: 3, calories: 150 },
      { name: "Castanhas", quantity: "20g", protein: 3, carbs: 3, fat: 13, calories: 130 },
    ],
  },
  {
    name: "Almoco",
    time: "12:30",
    foods: [
      { name: "Arroz integral", quantity: "150g (peso cru)", protein: 8, carbs: 72, fat: 3, calories: 360 },
      { name: "Peito de frango", quantity: "200g", protein: 46, carbs: 0, fat: 4, calories: 230 },
      { name: "Feijao carioca", quantity: "100g", protein: 9, carbs: 20, fat: 1, calories: 125 },
      { name: "Salada verde", quantity: "a vontade", protein: 2, carbs: 4, fat: 0, calories: 25 },
    ],
  },
  {
    name: "Lanche da Tarde",
    time: "15:30",
    foods: [
      { name: "Batata doce", quantity: "200g", protein: 3, carbs: 50, fat: 0, calories: 210 },
      { name: "Frango desfiado", quantity: "100g", protein: 23, carbs: 0, fat: 2, calories: 115 },
      { name: "Abacate", quantity: "50g", protein: 1, carbs: 4, fat: 8, calories: 80 },
    ],
  },
  {
    name: "Jantar",
    time: "19:00",
    foods: [
      { name: "Salmao", quantity: "180g", protein: 38, carbs: 0, fat: 18, calories: 320 },
      { name: "Quinoa", quantity: "100g (peso cru)", protein: 14, carbs: 62, fat: 6, calories: 360 },
      { name: "Legumes refogados", quantity: "150g", protein: 3, carbs: 10, fat: 2, calories: 65 },
    ],
  },
];

const DIET_PRESETS: DietPreset[] = [
  {
    level: StudentLevel.INICIANTE,
    name: "Dieta Iniciante - Reeducacao Alimentar",
    description: "Primeiros passos na reeducacao alimentar, porcoes moderadas, 2000 kcal/dia.",
    dailyProtein: 150,
    dailyCarbs: 230,
    dailyFat: 55,
    dailyCalories: 2000,
    waterIntake: "2,5L por dia",
    supplementation: "Multivitaminico + Omega 3",
    meals: BASE_MEALS, // scale 1.0
  },
  {
    level: StudentLevel.MODERADO,
    name: "Dieta Moderado - Hipertrofia",
    description: "Plano para ganho de massa com porcoes maiores, 2700 kcal/dia.",
    dailyProtein: 190,
    dailyCarbs: 320,
    dailyFat: 80,
    dailyCalories: 2700,
    waterIntake: "3L por dia",
    supplementation: "Whey protein pos-treino, Creatina 5g/dia, Multivitaminico",
    meals: scaleMeals(BASE_MEALS, 1.3, " porcao maior"),
  },
  {
    level: StudentLevel.AVANCADO,
    name: "Dieta Avancado - Alto Volume",
    description: "Plano de alto volume caloricos para atleta avancado, 3200 kcal/dia.",
    dailyProtein: 220,
    dailyCarbs: 380,
    dailyFat: 95,
    dailyCalories: 3200,
    waterIntake: "3,5L por dia",
    supplementation: "Whey protein, Creatina 5g/dia, BCAAs, Cafeina pre-treino",
    meals: scaleMeals(BASE_MEALS, 1.6, " porcao extra"),
  },
];

function scaleMeals(meals: MealSeed[], factor: number, suffix: string): MealSeed[] {
  return meals.map((meal) => ({
    ...meal,
    foods: meal.foods.map((f) => ({
      name: f.name,
      quantity: f.quantity + suffix,
      protein: Math.round(f.protein * factor),
      carbs: Math.round(f.carbs * factor),
      fat: Math.round(f.fat * factor),
      calories: Math.round(f.calories * factor),
    })),
  }));
}

async function main() {
  const existing = await prisma.workoutTemplate.count({ where: { isPreset: true } });
  if (existing > 0) {
    console.log("Presets de treino ja existem, pulando.");
  } else {
    const exercisesByGroup = new Map<string, { id: string; name: string; muscleGroup: string }[]>();
    const all = await prisma.exercise.findMany({ select: { id: true, name: true, muscleGroup: true } });
    for (const e of all) {
      const list = exercisesByGroup.get(e.muscleGroup) ?? [];
      list.push(e);
      exercisesByGroup.set(e.muscleGroup, list);
    }

    for (const program of PROGRAMS) {
      for (const pw of program.workouts) {
        const template = await prisma.workoutTemplate.create({
          data: {
            name: pw.name,
            description: pw.description,
            level: program.level,
            isPreset: true,
          },
        });
        let order = 1;
        const rows: { order: number; sets: number; reps: string; initialLoad: string; restTime: number; workoutTemplateId: string; exerciseId: string }[] = [];
        for (const slice of pw.slices) {
          const groupExercises = exercisesByGroup.get(slice.group) ?? [];
          for (let i = 0; i < slice.count; i++) {
            const ex = groupExercises[(slice.offset + i) % groupExercises.length];
            if (!ex) continue;
            rows.push({
              order: order++,
              sets: pw.sets,
              reps: pw.reps,
              initialLoad: pw.initialLoad,
              restTime: pw.restTime,
              workoutTemplateId: template.id,
              exerciseId: ex.id,
            });
          }
        }
        await prisma.workoutTemplateExercise.createMany({ data: rows });
        console.log(`  + ${program.level} | ${pw.name} (${rows.length} exercicios)`);
      }
    }
  }

  const existingDiet = await prisma.dietTemplate.count({ where: { isPreset: true } });
  if (existingDiet > 0) {
    console.log("Presets de dieta ja existem, pulando.");
  } else {
    for (const preset of DIET_PRESETS) {
      const template = await prisma.dietTemplate.create({
        data: {
          name: preset.name,
          description: preset.description,
          level: preset.level,
          isPreset: true,
          dailyProtein: preset.dailyProtein,
          dailyCarbs: preset.dailyCarbs,
          dailyFat: preset.dailyFat,
          dailyCalories: preset.dailyCalories,
          waterIntake: preset.waterIntake,
          supplementation: preset.supplementation,
        },
      });
      let order = 1;
      for (const meal of preset.meals) {
        const createdMeal = await prisma.dietTemplateMeal.create({
          data: { name: meal.name, time: meal.time, order: order++, dietTemplateId: template.id },
        });
        await prisma.dietTemplateFood.createMany({
          data: meal.foods.map((f) => ({ ...f, mealId: createdMeal.id })),
        });
      }
      console.log(`  + Dieta preset: ${preset.name} (${preset.meals.length} refeicoes)`);
    }
  }

  console.log("Seed de modelos concluido!");
}

main()
  .catch((e) => {
    console.error("Erro no seed de modelos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });