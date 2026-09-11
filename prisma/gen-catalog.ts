import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface RawExercise {
  name: string;
  category: string;
  media_id: string | null;
}

interface Entry {
  pt: string;
  keyword: string;
  group: string;
  desc: string;
}

interface OutEntry {
  pt: string;
  group: string;
  gifId: string;
  desc: string;
}

const EXISTING_IDS = new Set([
  "EIeI8Vf", "PG1kcIb", "1PLE8e9", "eYnzaCm", "eZyBC3j", "4c9BhzB",
  "DhMl549", "10Z2DXU", "hrVQWvE", "4dUn2iv", "5uFK1xr", "5vfAI0I",
  "DsgkuIt", "BMMolZ3", "CosupLu",
]);

const ENTRIES: Entry[] = [
  // ---- Peito ----
  { pt: "Supino Reto com Halteres", keyword: "dumbbell bench press", group: "Peito", desc: "Alcance maior e estabilidade natural" },
  { pt: "Supino Inclinado com Barra", keyword: "barbell incline bench press", group: "Peito", desc: "Foco no peito superior" },
  { pt: "Supino Declinado com Barra", keyword: "barbell decline bench press", group: "Peito", desc: "Foco no peito inferior" },
  { pt: "Crossover na Polia", keyword: "cable cross-over variation", group: "Peito", desc: "Tensao constante no peitoral" },
  { pt: "Voador Inclinado na Polia", keyword: "cable incline fly", group: "Peito", desc: "Crucifixo inclinado no cabo" },
  { pt: "Supino Maquina Sentado", keyword: "cable seated chest press", group: "Peito", desc: "Press de peito guiado" },
  { pt: "Pullover com Halter", keyword: "dumbbell pullover", group: "Peito", desc: "Expansao do torax" },
  { pt: "Mergulho no Paralelo (Peito)", keyword: "chest dip", group: "Peito", desc: "Peitoral e triceps com peso corporal" },
  { pt: "Flexao Profunda", keyword: "deep push up", group: "Peito", desc: "Flexao com maior amplitude" },
  { pt: "Flexao com Aplauso", keyword: "clap push up", group: "Peito", desc: "Flexao explosiva" },
  { pt: "Flexao Arqueiro", keyword: "archer push up", group: "Peito", desc: "Flexao unilateral avancada" },
  { pt: "Flexao Declinada", keyword: "decline push-up", group: "Peito", desc: "Flexao com pes elevados" },
  { pt: "Crucifixo Inclinado com Halteres", keyword: "dumbbell incline fly", group: "Peito", desc: "Foco no peito superior" },
  { pt: "Crucifixo Declinado com Halteres", keyword: "dumbbell decline fly", group: "Peito", desc: "Foco no peito inferior" },
  { pt: "Crossover Baixo na Polia", keyword: "cable low fly", group: "Peito", desc: "Crucifixo baixo com tensao" },
  { pt: "Supino Reto Pegada Aberta", keyword: "barbell wide bench press", group: "Peito", desc: "Enfase no recrutamento do peitoral" },

  // ---- Costas ----
  { pt: "Chin-up (Pegada Supinada)", keyword: "chin-ups (narrow parallel grip)", group: "Costas", desc: "Barra fixa pegada supinada" },
  { pt: "Remada Baixa na Polia", keyword: "cable seated row", group: "Costas", desc: "Trabalho de dorsal e biceps" },
  { pt: "Remada Unilateral com Halter", keyword: "dumbbell one arm bent-over row", group: "Costas", desc: "Correcao de assimetrias" },
  { pt: "Remada Curvada com Halteres", keyword: "dumbbell bent over row", group: "Costas", desc: "Espessura dorsal bilateral" },
  { pt: "Remada Pendlay", keyword: "barbell pendlay row", group: "Costas", desc: "Remada de potencia" },
  { pt: "Pulldown Pro na Polia", keyword: "cable pulldown (pro lat bar)", group: "Costas", desc: "Lat pulldown com barra pro" },
  { pt: "Encolhimento (Shrug)", keyword: "barbell shrug", group: "Costas", desc: "Trapezio superior" },
  { pt: "Pullover Reto na Polia", keyword: "cable straight arm pulldown", group: "Costas", desc: "Lombar e dorsal em extensao" },
  { pt: "Remada Rotacional Palmar", keyword: "dumbbell palm rotational bent over row", group: "Costas", desc: "Remada com rotacao do punho" },
  { pt: "Pulldown Amplitude Total", keyword: "cable lat pulldown full range of motion", group: "Costas", desc: "Puxada com amplitude completa" },
  { pt: "Remada em Pe (Corpo Livre)", keyword: "bodyweight standing row", group: "Costas", desc: "Remada invertida em pe" },
  { pt: "Remada no Cabo Unilateral", keyword: "cable one arm bent over row", group: "Costas", desc: "Remada alta unilateral" },
  { pt: "Encolhimento no Cabo", keyword: "cable shrug", group: "Costas", desc: "Encolhimento de trapezio no cabo" },
  { pt: "Pulldown Atras do Pescoço", keyword: "cable wide grip rear pulldown behind neck", group: "Costas", desc: "Pulldown largo atras do pescoço" },

  // ---- Ombros ----
  { pt: "Desenvolvimento Militar", keyword: "barbell standing close grip military press", group: "Ombros", desc: "Press militar com barra" },
  { pt: "Desenvolvimento Arnold", keyword: "dumbbell arnold press", group: "Ombros", desc: "Rotacao no desenvolvimento" },
  { pt: "Desenvolvimento Sentado com Halteres", keyword: "dumbbell seated shoulder press", group: "Ombros", desc: "Deltoide anterior e lateral" },
  { pt: "Elevacao Frontal com Barra", keyword: "barbell front raise", group: "Ombros", desc: "Deltoide anterior" },
  { pt: "Elevacao Frontal com Halteres", keyword: "dumbbell front raise", group: "Ombros", desc: "Deltoide anterior" },
  { pt: "Elevacao Lateral Unilateral na Polia", keyword: "cable one arm lateral raise", group: "Ombros", desc: "Deltoide lateral com tensao constante" },
  { pt: "Elevacao Posterior Curvado", keyword: "dumbbell incline rear lateral raise", group: "Ombros", desc: "Deltoide posterior" },
  { pt: "Elevacao Posterior com Barra", keyword: "barbell rear delt raise", group: "Ombros", desc: "Posterior de ombro em pe" },
  { pt: "Crucifixo Invertido Cruzado", keyword: "cable cross-over revers fly", group: "Ombros", desc: "Posterior de ombro na polia" },
  { pt: "Remada Alta", keyword: "barbell upright row", group: "Ombros", desc: "Trapezio e deltoide lateral" },
  { pt: "Press Cubano", keyword: "dumbbell cuban press", group: "Ombros", desc: "Rotadores externos e press" },
  { pt: "Push Press com Halteres", keyword: "dumbbell push press", group: "Ombros", desc: "Press com impulso de pernas" },
  { pt: "Arranco Unilateral", keyword: "barbell one arm snatch", group: "Ombros", desc: "Arranco com um braco" },

  // ---- Bracos ----
  { pt: "Rosca Alternada com Barra", keyword: "barbell alternate biceps curl", group: "Bracos", desc: "Biceps alternado" },
  { pt: "Rosca Direta no Cabo", keyword: "cable close grip curl", group: "Bracos", desc: "Curl neutro no cabo" },
  { pt: "Rosca Martelo na Corda", keyword: "cable hammer curl (with rope)", group: "Bracos", desc: "Biceps e braquial" },
  { pt: "Rosca Scott com Barra", keyword: "barbell preacher curl", group: "Bracos", desc: "Isolamento do biceps" },
  { pt: "Rosca Scott no Cabo", keyword: "cable preacher curl", group: "Bracos", desc: "Scott com tensao constante" },
  { pt: "Rosca Concentrada no Cabo", keyword: "cable concentration curl", group: "Bracos", desc: "Biceps com apoio" },
  { pt: "Rosca Inversa", keyword: "barbell reverse curl", group: "Bracos", desc: "Braquiorradial e antebraco" },
  { pt: "Rosca Inclinada Pronada", keyword: "barbell prone incline curl", group: "Bracos", desc: "Alongamento e peak do biceps" },
  { pt: "Triceps na Polia (Corda)", keyword: "cable pushdown (with rope attachment)", group: "Bracos", desc: "Triceps com corda" },
  { pt: "Triceps na Polia (Barra)", keyword: "cable pushdown", group: "Bracos", desc: "Pushdown tradicional" },
  { pt: "Triceps Coice na Polia", keyword: "cable kickback", group: "Bracos", desc: "Kickback com tensao constante" },
  { pt: "Francês deitado", keyword: "barbell lying triceps extension", group: "Bracos", desc: "Triceps deitado com barra" },
  { pt: "Skull Crusher", keyword: "barbell lying triceps extension skull crusher", group: "Bracos", desc: "Triceps com barra na testa" },
  { pt: "Triceps acima da Cabeça na Polia", keyword: "cable high pulley overhead tricep extension", group: "Bracos", desc: "Extensao acima da cabeca no cabo" },
  { pt: "Mergulho no Banco", keyword: "bench dip (knees bent)", group: "Bracos", desc: "Triceps com peso corporal" },
  { pt: "Triceps Unilateral na Polia", keyword: "cable one arm tricep pushdown", group: "Bracos", desc: "Pushdown unilateral" },

  // ---- Pernas ----
  { pt: "Agachamento Frontal", keyword: "barbell front squat", group: "Pernas", desc: "Quadriceps com carga frontal" },
  { pt: "Agachamento com Barra Baixa", keyword: "barbell low bar squat", group: "Pernas", desc: "Padrao posterior de agachamento" },
  { pt: "Agachamento Afastado", keyword: "barbell wide squat", group: "Pernas", desc: "Agachamento com base larga" },
  { pt: "Afundo Bulgaro com Barra", keyword: "barbell single leg split squat", group: "Pernas", desc: "Trabalho unilateral" },
  { pt: "Hack Squat", keyword: "barbell hack squat", group: "Pernas", desc: "Quadriceps com barra atras" },
  { pt: "Zercher Squat", keyword: "barbell zercher squat", group: "Pernas", desc: "Agachamento com barra nos bracos" },
  { pt: "Good Morning", keyword: "barbell good morning", group: "Pernas", desc: "Posterior e lombar" },
  { pt: "Levantamento Terra", keyword: "barbell deadlift", group: "Pernas", desc: "Cadeia posterior completa" },
  { pt: "Levantamento Terra Sumo", keyword: "barbell sumo deadlift", group: "Pernas", desc: "Terra com pegada larga" },
  { pt: "RDL (Romano)", keyword: "barbell romanian deadlift", group: "Pernas", desc: "Posterior de coxa enfase" },
  { pt: "Afundo com Barra", keyword: "barbell lunge", group: "Pernas", desc: "Estabilidade de pernas e equilibrio" },
  { pt: "Afundo com Halteres", keyword: "dumbbell lunge", group: "Pernas", desc: "Afundo com carga lateral" },
  { pt: "Glute Bridge com Barra", keyword: "barbell glute bridge", group: "Pernas", desc: "Gluteos com barra" },
  { pt: "Hip Thrust", keyword: "barbell glute bridge two legs on bench (male)", group: "Pernas", desc: "Elevacao pelvica no banco" },
  { pt: "Panturrilha em Pe", keyword: "barbell standing calf raise", group: "Pernas", desc: "Gastrocnemio em pe" },
  { pt: "Panturrilha Sentada", keyword: "barbell seated calf raise", group: "Pernas", desc: "Solet e gastrocnemio" },
  { pt: "Panturrilha Unilateral", keyword: "dumbbell single leg calf raise", group: "Pernas", desc: "Panturrilha unilateral" },
  { pt: "Step-up com Barra", keyword: "barbell step-up", group: "Pernas", desc: "Subida em caixa com carga" },
  { pt: "Agachamento com Salto", keyword: "barbell jump squat", group: "Pernas", desc: "Potencia de pernas" },
  { pt: "Aducao de Quadril na Polia", keyword: "cable hip adduction", group: "Pernas", desc: "Adutores na polia" },

  // ---- Abdomen ----
  { pt: "Elevacao de Pernas deitado", keyword: "lying leg raise flat bench", group: "Abdomen", desc: "Reto abdominal inferior" },
  { pt: "Elevacao de Pernas na Barra", keyword: "hanging leg raise", group: "Abdomen", desc: "Grande ativacao do core" },
  { pt: "Elevacao na Cadeira Romana", keyword: "captains chair straight leg raise", group: "Abdomen", desc: "Elevacao com apoio nos antebracos" },
  { pt: "Prancha Lateral", keyword: "side bridge v. 2", group: "Abdomen", desc: "Obliquos e core lateral" },
  { pt: "Prancha Reversa", keyword: "reverse plank with leg lift", group: "Abdomen", desc: "Core posterior" },
  { pt: "Russian Twist com Peso", keyword: "weighted russian twist (legs up)", group: "Abdomen", desc: "Rotacao com carga" },
  { pt: "Russian Twist com Bola", keyword: "cable russian twists (on stability ball)", group: "Abdomen", desc: "Rotacao sobre a bola" },
  { pt: "Abdominal em Pe na Polia", keyword: "cable standing crunch", group: "Abdomen", desc: "Crunch em pe com tensao" },
  { pt: "Abdominal de Joelhos na Polia", keyword: "cable kneeling crunch", group: "Abdomen", desc: "Crunch de joelhos" },
  { pt: "Abdominal Sentado na Polia", keyword: "cable seated crunch", group: "Abdomen", desc: "Crunch sentado no cabo" },
  { pt: "Pallof Vertical", keyword: "band vertical pallof press", group: "Abdomen", desc: "Anti-rotacao com elastico" },
  { pt: "Elevacao de Quadril deitado", keyword: "hip raise (bent knee)", group: "Abdomen", desc: "Elevacao pelvica deitado" },
  { pt: "Obliquo Suspenso na Barra", keyword: "hanging oblique knee raise", group: "Abdomen", desc: "Obliquos na barra" },
  { pt: "Curl-up", keyword: "curl-up", group: "Abdomen", desc: "Abdominal espinhal" },
  { pt: "Elevacao de Pernas Torcida", keyword: "twisted leg raise", group: "Abdomen", desc: "Obliquos com torcao" },

  // ---- Cardio ----
  { pt: "Burpee", keyword: "burpee", group: "Cardio", desc: "Treino HIIT completo" },
  { pt: "Burpee com Halter", keyword: "dumbbell burpee", group: "Cardio", desc: "Burpee com carga" },
  { pt: "Pular Corda", keyword: "jump rope", group: "Cardio", desc: "Salto na corda" },
  { pt: "Bicicleta Estacionaria", keyword: "stationary bike walk", group: "Cardio", desc: "Ciclismo indoor" },
  { pt: "Esteira - Corrida", keyword: "run (equipment)", group: "Cardio", desc: "Corrida na esteira" },
  { pt: "Elíptico", keyword: "walk elliptical cross trainer", group: "Cardio", desc: "Cross trainer (elíptico)" },
  { pt: "Escada / Stepper", keyword: "walking on stepmill", group: "Cardio", desc: "Subida na escada" },
  { pt: "Polichinelo", keyword: "jack jump (male)", group: "Cardio", desc: "Salto com abertura" },
  { pt: "Star Jump", keyword: "star jump (male)", group: "Cardio", desc: "Salto em estrela" },
  { pt: "Escalador (Mountain Climber)", keyword: "mountain climber", group: "Cardio", desc: "Corrida em prancha" },
  { pt: "Salto Tesoura", keyword: "scissor jumps (male)", group: "Cardio", desc: "Salto em tesoura" },
  { pt: "Salto Afastado", keyword: "astride jumps (male)", group: "Cardio", desc: "Salto com pernas afastadas" },
  { pt: "Passada de Esqui", keyword: "ski step", group: "Cardio", desc: "Simulacao de esqui" },
  { pt: "Corrida Explosiva", keyword: "push to run", group: "Cardio", desc: "Impulso e corrida" },

  // ---- Mobilidade ----
  { pt: "Alongamento do Corredor", keyword: "runners stretch", group: "Mobilidade", desc: "Posterior e quadril" },
  { pt: "Alongamento de Posterior", keyword: "hamstring stretch", group: "Mobilidade", desc: "Isquiotibiais" },
  { pt: "Alongamento de Panturrilha na Parede", keyword: "calf stretch with hands against wall", group: "Mobilidade", desc: "Gastrocnemio" },
  { pt: "Alongamento de Quadriceps", keyword: "assisted prone lying quads stretch", group: "Mobilidade", desc: "Quadriceps deitado" },
  { pt: "Alongamento de Gluteo Sentado", keyword: "seated glute stretch", group: "Mobilidade", desc: "Gluteo e rotadores" },
  { pt: "Alongamento de Flexor do Quadril", keyword: "exercise ball hip flexor stretch", group: "Mobilidade", desc: "Flexor do quadril com bola" },
  { pt: "Alongamento Lateral do Pescoço", keyword: "neck side stretch", group: "Mobilidade", desc: "Trapezio e pescoço" },
  { pt: "Alongamento de Peito", keyword: "behind head chest stretch", group: "Mobilidade", desc: "Peitoral em pe" },
  { pt: "Alongamento Lombar", keyword: "exercise ball lower back stretch (pyramid)", group: "Mobilidade", desc: "Lombar com bola" },
  { pt: "Iron Cross Stretch", keyword: "iron cross stretch", group: "Mobilidade", desc: "Mobilidade toracica" },
  { pt: "Postura da Borboleta (Yoga)", keyword: "butterfly yoga pose", group: "Mobilidade", desc: "Quadril em yoga" },
  { pt: "Alongamento do Sapo", keyword: "rocking frog stretch", group: "Mobilidade", desc: "Mobilidade de quadril" },
  { pt: "Alongamento de Triceps", keyword: "overhead triceps stretch", group: "Mobilidade", desc: "Triceps acima da cabeca" },
  { pt: "Alongamento de Ombro Posterior", keyword: "rear deltoid stretch", group: "Mobilidade", desc: "Deltoide posterior" },
  { pt: "Alongamento de Posterior deitado", keyword: "leg up hamstring stretch", group: "Mobilidade", desc: "Isquiotibiais deitado" },
  { pt: "Alongamento Lateral de Quadriceps", keyword: "lying (side) quads stretch", group: "Mobilidade", desc: "Quadriceps lateral" },
  { pt: "Alongamento Dinamico de Peito", keyword: "dynamic chest stretch (male)", group: "Mobilidade", desc: "Peito dinamico" },
  { pt: "Alongamento de Coxa na Cadeira", keyword: "chair leg extended stretch", group: "Mobilidade", desc: "Coxa e posterior" },

  // ---- Outros ----
  { pt: "Rosca de Punho com Barra", keyword: "barbell wrist curl", group: "Outros", desc: "Flexores do punho" },
  { pt: "Rosca de Punho Inversa", keyword: "barbell reverse wrist curl", group: "Outros", desc: "Extensores do punho" },
  { pt: "Punho na Polia", keyword: "cable wrist curl", group: "Outros", desc: "Flexores com cabo" },
  { pt: "Punho Inverso com Halter", keyword: "dumbbell reverse wrist curl", group: "Outros", desc: "Extensores com halter" },
  { pt: "Flexao dos Dedos", keyword: "dumbbell finger curls", group: "Outros", desc: "Musculatura flexora dos dedos" },

  // ---- Extras (chegada ~150) ----
  { pt: "Supino Declinado no Cabo", keyword: "cable decline press", group: "Peito", desc: "Press de peito inferior no cabo" },
  { pt: "Remada Inclinada com Barra", keyword: "barbell incline row", group: "Costas", desc: "Remada na base inclinada" },
  { pt: "Remada Unilateral com Barra", keyword: "barbell one arm bent over row", group: "Costas", desc: "Trabalho unilateral de dorsal" },
  { pt: "Desenvolvimento Sentado com Barra", keyword: "barbell seated overhead press", group: "Ombros", desc: "Press sentado com barra" },
  { pt: "Elevacao Lateral na Polia", keyword: "cable lateral raise", group: "Ombros", desc: "Deltoide lateral no cabo" },
  { pt: "Rosca Drag", keyword: "barbell drag curl", group: "Bracos", desc: "Curl proximo ao corpo" },
  { pt: "Rosca acima da Cabeça no Cabo", keyword: "cable overhead curl", group: "Bracos", desc: "Curl com cabo acima" },
  { pt: "Terra com Pernas Rigidas", keyword: "dumbbell straight leg deadlift", group: "Pernas", desc: "Posterior com pernas esticadas" },
  { pt: "Pull Through no Cabo", keyword: "cable pull through (with rope)", group: "Pernas", desc: "Gluteos na polia" },
  { pt: "Step-up com Elastico", keyword: "band step-up", group: "Pernas", desc: "Subida com resistencia" },
  { pt: "Elevacao de Joelhos Assistida", keyword: "assisted hanging knee raise", group: "Abdomen", desc: "Core suspenso assistido" },
  { pt: "Abdominal Lateral na Polia", keyword: "cable side bend", group: "Abdomen", desc: "Obliquos na polia" },
  { pt: "Cross Trainer Ciclo", keyword: "cycle cross trainer", group: "Cardio", desc: "Aparelho eliptico de ciclo" },
  { pt: "Passada Ida e Volta", keyword: "back and forth step", group: "Cardio", desc: "Deslocamento lateral" },
  { pt: "Alongamento de Panturrilha Sentado", keyword: "seated calf stretch (male)", group: "Mobilidade", desc: "Panturrilha sentado" },
  { pt: "Alongamento de Quadril e Quadriceps", keyword: "intermediate hip flexor and quad stretch", group: "Mobilidade", desc: "Flexor do quadril em pe" },
  { pt: "Punho Inversa na Polia", keyword: "cable reverse wrist curl", group: "Outros", desc: "Extensores no cabo" },
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function main() {
  const raw: RawExercise[] = JSON.parse(
    readFileSync(process.argv[2], "utf-8")
  );

  const used = new Set<string>(EXISTING_IDS);
  const out: OutEntry[] = [];
  const missing: string[] = [];
  const dup: string[] = [];

  for (const e of ENTRIES) {
    const kw = normalize(e.keyword);
    const match = raw.find(
      (r) => normalize(r.name).includes(kw) && r.media_id
    );
    if (!match) {
      missing.push(`${e.pt} -> "${e.keyword}"`);
      continue;
    }
    if (used.has(match.media_id!)) {
      dup.push(`${e.pt} -> ${match.media_id} ("${match.name}")`);
      continue;
    }
    used.add(match.media_id!);
    out.push({ pt: e.pt, group: e.group, gifId: match.media_id!, desc: e.desc });
  }

  if (missing.length) {
    console.error("MISSING:");
    missing.forEach((m) => console.error("  " + m));
  }
  if (dup.length) {
    console.error("DUPLICATED / EXISTING media ids:");
    dup.forEach((m) => console.error("  " + m));
  }

  const lines = out.map(
    (o) =>
      `  { name: ${JSON.stringify(o.pt)}, muscleGroup: ${JSON.stringify(
        o.group
      )}, gifUrl: ${JSON.stringify(
        "https://static.exercisedb.dev/media/" + o.gifId + ".gif"
      )}, description: ${JSON.stringify(o.desc)} },`
  );

  const output = `// Gerado por prisma/gen-catalog.ts - nao editar manualmente
export interface CatalogExercise {
  name: string;
  muscleGroup: string;
  gifUrl: string;
  description: string;
}

export const CATALOG: CatalogExercise[] = [
${lines.join("\n")}
];
`;

  writeFileSync(join(process.cwd(), process.argv[3]), output);
  console.log(
    `Done: ${out.length} generated (${missing.length} missing, ${dup.length} dup/existing ids).`
  );
}

main();