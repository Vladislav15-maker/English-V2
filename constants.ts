import { User, UserRole, Unit, Word, OnlineTest } from './types';

export const USERS: User[] = [
  { id: 'user-teacher-vlad', name: 'Ермилов Владислав', login: 'Vladislav', password: 'Vladislav15', role: UserRole.Teacher },
  { id: 'user-student-oksana', name: 'Юрченко Оксана', login: 'Oksana', password: 'Oksana25', role: UserRole.Student },
  { id: 'user-student-alex', name: 'Ермилов Александр', login: 'Alexander', password: 'Alexander23', role: UserRole.Student },
];

const generateWords = (wordsData: Omit<Word, 'id' | 'image'>[]): Word[] => {
  return wordsData.map((word, index) => {
    const wordId = word.english.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      ...word,
      id: `${wordId}-${index}`,
      image: `https://source.unsplash.com/400x300/?${encodeURIComponent(word.english)}&sig=${wordId}${index}`,
    }
  });
};

const unitData: { name: string, rounds: (Omit<Word, 'id' | 'image'>) [][] }[] = [
  {
    name: "Unit 1: Greetings",
    rounds: [
      [
        { english: 'hi', russian: 'привет', transcription: 'хай' },
        { english: 'hello', russian: 'здравствуйте', transcription: 'хэллоу' },
        { english: 'goodbye', russian: 'до свидания', transcription: 'гудбай' },
        { english: 'good morning', russian: 'доброе утро', transcription: 'гуд морнинг' },
        { english: 'good night', russian: 'спокойной ночи', transcription: 'гуд найт' },
      ],
      [
        { english: 'how are you', russian: 'как дела', transcription: 'хау ар ю' },
        { english: 'I’m fine', russian: 'у меня все хорошо', transcription: 'айм файн', alternatives: ['i am fine'] },
        { english: 'nice to meet you', russian: 'приятно познакомиться', transcription: 'найс ту мит ю' },
        { english: 'see you', russian: 'увидимся', transcription: 'си ю' },
        { english: 'take care', russian: 'береги себя', transcription: 'тэйк кэр' },
      ],
    ]
  },
  {
      name: "Unit 2: Family",
      rounds: [
          [
              { english: 'mother', russian: 'мать', transcription: 'мазэр' },
              { english: 'father', russian: 'отец', transcription: 'фазэр' },
              { english: 'sister', russian: 'сестра', transcription: 'систэр' },
              { english: 'brother', russian: 'брат', transcription: 'бразэр' },
              { english: 'parents', russian: 'родители', transcription: 'пэрэнтс' },
          ],
          [
              { english: 'grandmother', russian: 'бабушка', transcription: 'грэндмазэр' },
              { english: 'grandfather', russian: 'дедушка', transcription: 'грэндфазэр' },
              { english: 'uncle', russian: 'дядя', transcription: 'анкл' },
              { english: 'aunt', russian: 'тетя', transcription: 'ант' },
              { english: 'cousin', russian: 'двоюродный брат/сестра', transcription: 'казн' },
          ]
      ]
  },
  {
      name: "Unit 3: Food",
      rounds: [
          [
              { english: 'bread', russian: 'хлеб', transcription: 'брэд' },
              { english: 'milk', russian: 'молоко', transcription: 'милк' },
              { english: 'water', russian: 'вода', transcription: 'уотэр' },
              { english: 'juice', russian: 'сок', transcription: 'джус' },
              { english: 'apple', russian: 'яблоко', transcription: 'эпл' },
          ],
          [
              { english: 'tea', russian: 'чай', transcription: 'ти' },
              { english: 'coffee', russian: 'кофе', transcription: 'кофи' },
              { english: 'orange', russian: 'апельсин', transcription: 'орэндж' },
              { english: 'banana', russian: 'банан', transcription: 'банана' },
              { english: 'salad', russian: 'салат', transcription: 'сэлэд' },
          ]
      ]
  },
    {
        name: "Unit 4: Numbers",
        rounds: [
            [
                { english: 'one', russian: 'один', transcription: 'уан' },
                { english: 'two', russian: 'два', transcription: 'ту' },
                { english: 'three', russian: 'три', transcription: 'фри' },
                { english: 'four', russian: 'четыре', transcription: 'фор' },
                { english: 'five', russian: 'пять', transcription: 'файв' },
            ],
            [
                { english: 'six', russian: 'шесть', transcription: 'сикс' },
                { english: 'seven', russian: 'семь', transcription: 'сэвэн' },
                { english: 'eight', russian: 'восемь', transcription: 'эйт' },
                { english: 'nine', russian: 'девять', transcription: 'найн' },
                { english: 'ten', russian: 'десять', transcription: 'тэн' },
            ]
        ]
    },
    {
        name: "Unit 5: Colors",
        rounds: [
            [
                { english: 'red', russian: 'красный', transcription: 'рэд' },
                { english: 'blue', russian: 'синий', transcription: 'блу' },
                { english: 'green', russian: 'зеленый', transcription: 'грин' },
                { english: 'yellow', russian: 'желтый', transcription: 'йелоу' },
                { english: 'black', russian: 'черный', transcription: 'блэк' },
            ],
            [
                { english: 'white', russian: 'белый', transcription: 'уайт' },
                { english: 'brown', russian: 'коричневый', transcription: 'браун' },
                { english: 'orange', russian: 'оранжевый', transcription: 'орэндж' },
                { english: 'pink', russian: 'розовый', transcription: 'пинк' },
                { english: 'purple', russian: 'фиолетовый', transcription: 'пёрпл' },
            ]
        ]
    },
    {
        name: "Unit 6: School",
        rounds: [
            [
                { english: 'school', russian: 'школа', transcription: 'скул' },
                { english: 'classroom', russian: 'класс', transcription: 'класрум' },
                { english: 'teacher', russian: 'учитель', transcription: 'тичер' },
                { english: 'student', russian: 'ученик', transcription: 'стьюдент' },
                { english: 'lesson', russian: 'урок', transcription: 'лэсн' },
            ],
            [
                { english: 'book', russian: 'книга', transcription: 'бук' },
                { english: 'pen', russian: 'ручка', transcription: 'пэн' },
                { english: 'pencil', russian: 'карандаш', transcription: 'пэнсил' },
                { english: 'desk', russian: 'парта', transcription: 'дэск' },
                { english: 'chair', russian: 'стул', transcription: 'чэр' },
            ]
        ]
    },
    {
        name: "Unit 7: House",
        rounds: [
            [
                { english: 'house', russian: 'дом', transcription: 'хаус' },
                { english: 'room', russian: 'комната', transcription: 'рум' },
                { english: 'kitchen', russian: 'кухня', transcription: 'китчен' },
                { english: 'bedroom', russian: 'спальня', transcription: 'бэдрум' },
                { english: 'bathroom', russian: 'ванная', transcription: 'бафрум' },
            ],
            [
                { english: 'window', russian: 'окно', transcription: 'уиндоу' },
                { english: 'door', russian: 'дверь', transcription: 'дор' },
                { english: 'table', russian: 'стол', transcription: 'тэйбл' },
                { english: 'bed', russian: 'кровать', transcription: 'бэд' },
                { english: 'chair', russian: 'стул', transcription: 'чэр' },
            ]
        ]
    },
    {
        name: "Unit 8: Weather",
        rounds: [
            [
                { english: 'sunny', russian: 'солнечно', transcription: 'санни' },
                { english: 'rainy', russian: 'дождливо', transcription: 'рэйни' },
                { english: 'windy', russian: 'ветрено', transcription: 'уинди' },
                { english: 'cloudy', russian: 'облачно', transcription: 'клауди' },
                { english: 'snowy', russian: 'снежно', transcription: 'сноуи' },
            ],
            [
                { english: 'hot', russian: 'жарко', transcription: 'хот' },
                { english: 'cold', russian: 'холодно', transcription: 'колд' },
                { english: 'warm', russian: 'тепло', transcription: 'уорм' },
                { english: 'cool', russian: 'прохладно', transcription: 'кул' },
                { english: 'stormy', russian: 'шторм', transcription: 'сторми' },
            ]
        ]
    },
    {
        name: "Unit 9: Days of the week",
        rounds: [
            [
                { english: 'Monday', russian: 'понедельник', transcription: 'мандэй' },
                { english: 'Tuesday', russian: 'вторник', transcription: 'тьюздэй' },
                { english: 'Wednesday', russian: 'среда', transcription: 'уэнздэй' },
                { english: 'Thursday', russian: 'четверг', transcription: 'фёздэй' },
                { english: 'Friday', russian: 'пятница', transcription: 'фрайдэй' },
            ],
            [
                { english: 'Saturday', russian: 'суббота', transcription: 'сэтэдэй' },
                { english: 'Sunday', russian: 'воскресенье', transcription: 'сандэй' },
                { english: 'today', russian: 'сегодня', transcription: 'тудэй' },
                { english: 'tomorrow', russian: 'завтра', transcription: 'тумороу' },
                { english: 'yesterday', russian: 'вчера', transcription: 'йестэдэй' },
            ]
        ]
    },
    {
        name: "Unit 10: Hobbies",
        rounds: [
            [
                { english: 'reading', russian: 'чтение', transcription: 'ридинг' },
                { english: 'playing', russian: 'игра', transcription: 'плэинг' },
                { english: 'drawing', russian: 'рисование', transcription: 'дроуинг' },
                { english: 'swimming', russian: 'плавание', transcription: 'суиimming' },
                { english: 'singing', russian: 'пение', transcription: 'сингинг' },
            ],
            [
                { english: 'dancing', russian: 'танцы', transcription: 'дэнсинг' },
                { english: 'cooking', russian: 'готовка', transcription: 'кукинг' },
                { english: 'running', russian: 'бег', transcription: 'ранинг' },
                { english: 'traveling', russian: 'путешествия', transcription: 'трэвэлинг' },
                { english: 'watching TV', russian: 'просмотр ТВ', transcription: 'уотчинг тиви' },
            ]
        ]
    },
];

export const UNITS: Unit[] = unitData.map((unit, unitIndex) => ({
  id: `unit-${unitIndex + 1}`,
  name: unit.name,
  rounds: unit.rounds.map((roundWords, roundIndex) => ({
    id: `unit-${unitIndex + 1}-round-${roundIndex + 1}`,
    name: `Раунд ${roundIndex + 1}`,
    words: generateWords(roundWords),
  })),
}));

export const ONLINE_TESTS: OnlineTest[] = [
    {
        id: 'online-test-1',
        name: 'Онлайн Юнит Тест 1 (Units 1 & 2)',
        words: [...UNITS[0].rounds[0].words.slice(0, 3), ...UNITS[0].rounds[1].words.slice(0, 2), ...UNITS[1].rounds[0].words.slice(0, 2), ...UNITS[1].rounds[1].words.slice(0, 3)],
        durationMinutes: 5,
    },
    {
        id: 'online-test-2',
        name: 'Онлайн Юнит Тест 2 (Units 3 & 4)',
        words: [...UNITS[2].rounds[0].words, ...UNITS[3].rounds[1].words],
        durationMinutes: 5,
    },
    {
        id: 'online-test-3',
        name: 'Онлайн Юнит Тест 3 (Units 4 & 5)',
        words: [...UNITS[3].rounds[0].words, ...UNITS[4].rounds[1].words],
        durationMinutes: 5,
    },
    {
        id: 'online-test-4',
        name: 'Онлайн Юнит Тест 4 (Units 6 & 7)',
        words: [...UNITS[5].rounds[0].words, ...UNITS[6].rounds[1].words],
        durationMinutes: 5,
    },
];