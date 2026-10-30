import type { Chapter, Ayah } from './quran-api'

export const chapters: [Chapter, ...Chapter[]] = [
  { id: 1, name: 'Al-Fātiḥah', arabic: 'الفاتحة', meaning: 'The Opening', verses: 7, place: 'Meccan' },
  { id: 2, name: 'Al-Baqarah', arabic: 'البقرة', meaning: 'The Cow', verses: 286, place: 'Medinan' },
  { id: 3, name: 'Āl ʿImrān', arabic: 'آل عمران', meaning: 'Family of Imran', verses: 200, place: 'Medinan' },
  { id: 4, name: 'An-Nisā', arabic: 'النساء', meaning: 'The Women', verses: 176, place: 'Medinan' },
  { id: 5, name: 'Al-Māʾidah', arabic: 'المائدة', meaning: 'The Table Spread', verses: 120, place: 'Medinan' },
  { id: 6, name: 'Al-Anʿām', arabic: 'الأنعام', meaning: 'The Cattle', verses: 165, place: 'Meccan' },
  { id: 7, name: 'Al-Aʿrāf', arabic: 'الأعراف', meaning: 'The Heights', verses: 206, place: 'Meccan' },
  { id: 8, name: 'Al-Anfāl', arabic: 'الأنفال', meaning: 'The Spoils of War', verses: 75, place: 'Medinan' },
  { id: 9, name: 'At-Tawbah', arabic: 'التوبة', meaning: 'The Repentance', verses: 129, place: 'Medinan' },
  { id: 10, name: 'Yūnus', arabic: 'يونس', meaning: 'Jonah', verses: 109, place: 'Meccan' },
  { id: 18, name: 'Al-Kahf', arabic: 'الكهف', meaning: 'The Cave', verses: 110, place: 'Meccan' },
  { id: 36, name: 'Yā-Sīn', arabic: 'يس', meaning: 'Ya Sin', verses: 83, place: 'Meccan' },
  { id: 55, name: 'Ar-Raḥmān', arabic: 'الرحمن', meaning: 'The Most Merciful', verses: 78, place: 'Medinan' },
  { id: 112, name: 'Al-Ikhlāṣ', arabic: 'الإخلاص', meaning: 'Sincerity', verses: 4, place: 'Meccan' },
]

export const alFatihah: Ayah[] = [
  { number: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', translation: 'In the name of Allah—the Most Compassionate, Most Merciful.' },
  { number: 2, arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', translation: 'All praise is for Allah—Lord of all worlds,' },
  { number: 3, arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', translation: 'the Most Compassionate, Most Merciful,' },
  { number: 4, arabic: 'مَالِكِ يَوْمِ الدِّينِ', translation: 'Master of the Day of Judgment.' },
  { number: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', translation: 'You ˹alone˺ we worship and You ˹alone˺ we ask for help.' },
  { number: 6, arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', translation: 'Guide us along the Straight Path,' },
  { number: 7, arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', translation: 'the Path of those You have blessed—not those You are displeased with, or those who are astray.' },
]
