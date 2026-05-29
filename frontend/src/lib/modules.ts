export type ModuleKey = 'module-1' | 'module-2' | 'module-3' | 'module-4' | 'module-5';

export type Localized<T> = { en: T; id: T };

export type ModuleQuizQuestion = {
  id: string;
  question: Localized<string>;
  options: Array<{ id: 'A' | 'B'; label: Localized<string> }>;
  correctOptionId: 'A' | 'B';
};

export type LearningModule = {
  key: ModuleKey;
  order: number;
  title: Localized<string>;
  concept: Localized<string>;
  bullets: Localized<string[]>;
  youtubeUrl?: string;
  quiz: ModuleQuizQuestion[];
};

export const learningModules: LearningModule[] = [
  {
    key: 'module-1',
    order: 1,
    title: {
      en: 'The Power of "Yes" (Reinforcement)',
      id: 'Kekuatan “Ya” (Reinforcement/Penguatan)',
    },
    concept: {
      en: 'A reinforcer is anything that follows a behavior and makes that behavior more likely to happen again in the future.',
      id: 'Reinforcer (penguat) adalah sesuatu yang diberikan setelah suatu perilaku, sehingga perilaku itu lebih mungkin muncul lagi di kemudian hari.',
    },
    bullets: {
      en: [
        'The "First/Then" Rule (Premack Principle): a preferred activity becomes available after a less-preferred task is finished.',
        'The Golden Rule: No Bribery. Bribery happens during a tantrum; reinforcement is earned after appropriate behavior.',
        'Keep it fresh: use a variety of reinforcers to avoid satiation.',
        'Be immediate and clear: reward immediately and label the behavior you are reinforcing.',
      ],
      id: [
        'Aturan “Dulu/Lalu” (Prinsip Premack): aktivitas yang disukai dilakukan setelah tugas yang kurang disukai selesai.',
        'Aturan emas: bukan suap. Suap terjadi saat tantrum untuk menghentikan perilaku; reinforcement diberikan setelah perilaku yang tepat.',
        'Jaga variasi: gunakan beberapa penguat agar anak tidak bosan/“kenyang” (satiation).',
        'Cepat dan jelas: berikan penguat segera, dan sebutkan perilaku apa yang sedang Anda perkuat.',
      ],
    },
    youtubeUrl: 'https://youtu.be/ENgIGHeh5Ak',
    quiz: [
      {
        id: 'q1',
        question: {
          en: 'How do you know if something is a true "reinforcer"?',
          id: 'Bagaimana kita tahu sesuatu benar-benar “reinforcer/penguat”?',
        },
        options: [
          {
            id: 'A',
            label: { en: 'Because you know your child likes it.', id: 'Karena kita tahu anak kita menyukainya.' },
          },
          {
            id: 'B',
            label: {
              en: 'Because you see the good behavior increasing over time.',
              id: 'Karena perilaku yang diharapkan meningkat dari waktu ke waktu.',
            },
          },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'q2',
        question: {
          en: 'What is the difference between reinforcement and bribery?',
          id: 'Apa bedanya reinforcement (penguatan) dan suap?',
        },
        options: [
          {
            id: 'A',
            label: {
              en: 'Reinforcement happens after the good behavior; bribery happens during a bad behavior to stop it.',
              id: 'Reinforcement diberikan setelah perilaku yang tepat; suap diberikan saat perilaku tidak tepat sedang terjadi agar berhenti.',
            },
          },
          {
            id: 'B',
            label: { en: 'There is no difference; they are both rewards.', id: 'Tidak ada bedanya; semuanya sama-sama hadiah.' },
          },
        ],
        correctOptionId: 'A',
      },
    ],
  },
  {
    key: 'module-2',
    order: 2,
    title: {
      en: 'The Step-by-Step Teaching Loop (DTT)',
      id: 'Siklus Mengajar Langkah demi Langkah (DTT)',
    },
    concept: {
      en: 'Discrete Trial Teaching breaks complex skills into small parts and teaches one sub-skill at a time.',
      id: 'Discrete Trial Teaching (DTT) memecah keterampilan yang kompleks menjadi bagian kecil dan mengajarkan satu sub-keterampilan setiap kali.',
    },
    bullets: {
      en: ['Instruction (SD)', 'Response (wait 3–5 seconds)', 'Feedback (immediate)'],
      id: ['Instruksi (SD)', 'Respons (tunggu 3–5 detik)', 'Umpan balik (segera)'],
    },
    youtubeUrl: 'https://youtu.be/JmAQ1ax9vH8',
    quiz: [],
  },
  {
    key: 'module-3',
    order: 3,
    title: { en: 'Giving a Helping Hand (Prompts)', id: 'Memberi Bantuan (Prompt)' },
    concept: {
      en: 'Prompts are assistance to ensure success and reduce frustration.',
      id: 'Prompt adalah bantuan agar anak berhasil dan mengurangi frustrasi.',
    },
    bullets: {
      en: ['Levels of help', 'Two-strike rule', 'Prompt fading'],
      id: ['Tingkat bantuan', 'Aturan dua kesempatan', 'Mengurangi prompt bertahap (prompt fading)'],
    },
    quiz: [],
  },
  {
    key: 'module-4',
    order: 4,
    title: {
      en: 'Building Bigger Skills (Shaping & Chaining)',
      id: 'Membangun Keterampilan yang Lebih Besar (Shaping & Chaining)',
    },
    concept: {
      en: 'Build complex skills step by step using shaping and chaining.',
      id: 'Bangun keterampilan kompleks sedikit demi sedikit dengan shaping dan chaining.',
    },
    bullets: { en: ['Shaping', 'Forward chaining', 'Backward chaining'], id: ['Shaping', 'Forward chaining', 'Backward chaining'] },
    quiz: [],
  },
  {
    key: 'module-5',
    order: 5,
    title: {
      en: 'Cracking the Code (Understanding Behavior)',
      id: 'Memahami Pola (Memahami Perilaku)',
    },
    concept: {
      en: 'Every behavior has a function; teach proactive replacement skills.',
      id: 'Setiap perilaku punya fungsi; ajarkan keterampilan pengganti secara proaktif.',
    },
    bullets: {
      en: ['Find the why', 'Teach a replacement', 'Proactive over reactive'],
      id: ['Cari “mengapa”', 'Ajarkan perilaku pengganti', 'Lebih proaktif daripada reaktif'],
    },
    quiz: [],
  },
];

export function youtubeIdFromUrl(url: string): string | null {
  const m =
    url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ||
    url.match(/v=([A-Za-z0-9_-]{6,})/) ||
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  return m?.[1] ?? null;
}

