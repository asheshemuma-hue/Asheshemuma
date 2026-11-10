export type PageId = 'dashboard' | 'members' | 'attendance' | 'giving' | 'events';

export interface MemberRecord {
  id: string; // e.g., MEM-001
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string; // YYYY-MM-DD
  dateJoined: string; // YYYY-MM-DD
  ministry: string;
  address: string;
  status: 'Active' | 'Inactive';
  notes: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  service: string;
  members: number;
  visitors: number;
  total: number;
  notes: string;
}

export type GivingType = 'Tithe' | 'Offering' | 'Building Fund' | 'Other';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Other';

export interface GivingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  contributor: string;
  type: GivingType;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
}

export type EventStatus = 'Upcoming' | 'Completed' | 'Cancelled';

export interface EventRecord {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  location: string;
  description: string;
  status: EventStatus;
}

export interface ActivityItem {
  id: string;
  type: 'attendance' | 'giving' | 'member' | 'event';
  title: string;
  detail: string;
  timeAgo: string;
  read?: boolean;
}

export interface DemoState {
  referenceDate: string; // Default: '2026-11-10'
  members: MemberRecord[];
  attendance: AttendanceRecord[];
  giving: GivingRecord[];
  events: EventRecord[];
  activities: ActivityItem[];
}

export const INITIAL_REFERENCE_DATE = '2026-11-10';

export const MINISTRIES = [
  "Women's Ministry",
  'Choir',
  'Youth Ministry',
  'Worship Team',
  "Men's Ministry",
  'Ushering & Hospitality',
  "Children's Ministry",
  'Prayer & Intercession',
];

export const SERVICE_TYPES = [
  'Sunday Worship Service',
  'Midweek Bible Study',
  'Friday Prayer & Deliverance',
  'Youth Fellowship Service',
  'Special Thanksgiving Service',
];

const FIRST_NAMES = [
  'Jean', 'Patrick', 'Emmanuel', 'Samuel', 'David', 'Pierre', 'Paul', 'Jacques',
  'Luc', 'Marc', 'Isaac', 'Caleb', 'Josué', 'Élie', 'Gabriel', 'Michel',
  'Esther', 'Sarah', 'Rebecca', 'Rachel', 'Déborah', 'Hannah', 'Naomi', 'Lydia',
  'Chantal', 'Nadine', 'Clarisse', 'Solange', 'Béatrice', 'Espérance', 'Bénédicte', 'Prisca',
  'Trésor', 'Dieudonné', 'Patient', 'Héritier', 'Christian', 'Cédric', 'Fabrice', 'Olivier',
];

const LAST_NAMES = [
  'Mutombo', 'Kasongo', 'Kabila', 'Lukusa', 'Kalala', 'Tshisekedi', 'Mulumba', 'Ngalula',
  'Kapinga', 'Mpiana', 'Ngoy', 'Kyungu', 'Kazadi', 'Banza', 'Mulunda', 'Ilunga',
  'Kabongo', 'Mukendi', 'Mbuyi', 'Tshibangu', 'Kalonji', 'Ntumba', 'Kanyinda', 'Lunda',
  'Mwamba', 'Kabeya', 'Tshibanda', 'Katumbi', 'Mbayo', 'Monganga', 'Ndala', 'Kambale',
];

const QUARTIERS = [
  'Quartier Mutoshi, Kolwezi',
  'Cité Manika, Kolwezi',
  'Quartier Biashara, Kolwezi',
  'Avenue Kasa-Vubu, Kolwezi',
  'Quartier Dilala, Kolwezi',
  'Quartier Joli Site, Kolwezi',
  'Cité Gécamines, Kolwezi',
  'Quartier Kapata, Kolwezi',
];

function padNumber(num: number, size: number): string {
  return String(num).padStart(size, '0');
}

export function generateInitialMembers(): MemberRecord[] {
  const initialFive: MemberRecord[] = [
    {
      id: 'MEM-001',
      fullName: 'Marie Kabeya',
      phone: '+243 810 000 101',
      email: 'marie.kabeya@demo.ecr-kolwezi.org',
      dateOfBirth: '1988-05-14',
      dateJoined: '2023-02-12',
      ministry: "Women's Ministry",
      address: 'Quartier Biashara, Kolwezi (Fictional Demo)',
      status: 'Active',
      notes: 'Small group coordinator for Women of Faith fellowship.',
    },
    {
      id: 'MEM-002',
      fullName: 'Daniel Ilunga',
      phone: '+243 810 000 102',
      email: 'daniel.ilunga@demo.ecr-kolwezi.org',
      dateOfBirth: '1992-11-03',
      dateJoined: '2024-08-20',
      ministry: 'Choir',
      address: 'Cité Manika, Kolwezi (Fictional Demo)',
      status: 'Active',
      notes: 'Tenor section leader in ECR Sanctuary Choir.',
    },
    {
      id: 'MEM-003',
      fullName: 'Grace Mbuyi',
      phone: '+243 810 000 103',
      email: 'grace.mbuyi@demo.ecr-kolwezi.org',
      dateOfBirth: '2001-04-22',
      dateJoined: '2025-01-15',
      ministry: 'Youth Ministry',
      address: 'Quartier Mutoshi, Kolwezi (Fictional Demo)',
      status: 'Active',
      notes: 'Youth outreach organizer and Sunday school volunteer.',
    },
    {
      id: 'MEM-004',
      fullName: 'Ruth Mwamba',
      phone: '+243 810 000 104',
      email: 'ruth.mwamba@demo.ecr-kolwezi.org',
      dateOfBirth: '1995-07-19',
      dateJoined: '2026-11-06',
      ministry: "Women's Ministry",
      address: 'Quartier Dilala, Kolwezi (Fictional Demo)',
      status: 'Active',
      notes: 'Completed new member orientation in November 2026.',
    },
    {
      id: 'MEM-005',
      fullName: 'Joseph Tshibanda',
      phone: '+243 810 000 105',
      email: 'joseph.tshibanda@demo.ecr-kolwezi.org',
      dateOfBirth: '1990-09-28',
      dateJoined: '2026-11-02',
      ministry: 'Worship Team',
      address: 'Quartier Joli Site, Kolwezi (Fictional Demo)',
      status: 'Active',
      notes: 'Acoustic guitarist and praise team member.',
    },
  ];

  // We need 250 total members:
  // - 238 Active, 12 Inactive
  // - Exactly 6 joined from 1–10 November 2026 (including Ruth MEM-004 and Joseph MEM-005).
  // So MEM-006, MEM-007, MEM-008, MEM-009 will have November 2026 join dates:
  const novemberJoinDates: Record<number, string> = {
    6: '2026-11-09',
    7: '2026-11-08',
    8: '2026-11-04',
    9: '2026-11-01',
  };

  const additionalMembers: MemberRecord[] = [];

  for (let i = 6; i <= 250; i++) {
    const id = `MEM-${padNumber(i, 3)}`;
    const firstName = FIRST_NAMES[(i * 7) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 11) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName} #${i}`;
    const ministry = MINISTRIES[i % MINISTRIES.length];
    const quartier = QUARTIERS[i % QUARTIERS.length];

    // Exactly 12 inactive members: MEM-239 through MEM-250
    const status: 'Active' | 'Inactive' = i >= 239 ? 'Inactive' : 'Active';

    let dateJoined: string;
    if (novemberJoinDates[i]) {
      dateJoined = novemberJoinDates[i];
    } else {
      // Spread between 2022 and October 2026
      const years = [2022, 2023, 2024, 2025, 2026];
      const year = years[i % years.length];
      // For 2026, only months 1..10 so none fall in November 2026
      const maxMonth = year === 2026 ? 10 : 12;
      const month = ((i * 3) % maxMonth) + 1;
      const day = ((i * 5) % 27) + 1;
      dateJoined = `${year}-${padNumber(month, 2)}-${padNumber(day, 2)}`;
    }

    const birthYear = 1965 + (i % 40);
    const birthMonth = ((i * 2) % 12) + 1;
    const birthDay = ((i * 4) % 27) + 1;

    additionalMembers.push({
      id,
      fullName: i <= 25 ? `${firstName} ${lastName}` : `${firstName} ${lastName} (${id})`,
      phone: `+243 810 000 ${padNumber(i, 3)}`,
      email: `member${i}@demo.ecr-kolwezi.org`,
      dateOfBirth: `${birthYear}-${padNumber(birthMonth, 2)}-${padNumber(birthDay, 2)}`,
      dateJoined,
      ministry,
      address: `${quartier} (Demo)`,
      status,
      notes: status === 'Inactive' ? 'Currently away / relocated outside Kolwezi (Demo record).' : 'Fictional demo member record.',
    });
  }

  return [...initialFive, ...additionalMembers];
}

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'ATT-001',
    date: '2026-11-08',
    service: 'Sunday Worship Service',
    members: 150,
    visitors: 30,
    total: 180,
    notes: 'Main sanctuary worship service. Strong visitor turnout.',
  },
  {
    id: 'ATT-002',
    date: '2026-11-01',
    service: 'Sunday Worship Service',
    members: 145,
    visitors: 30,
    total: 175,
    notes: 'First Sunday of November communion and thanksgiving service.',
  },
  {
    id: 'ATT-003',
    date: '2026-10-25',
    service: 'Sunday Worship Service',
    members: 140,
    visitors: 28,
    total: 168,
    notes: 'Sunday morning service with youth choir special presentation.',
  },
  {
    id: 'ATT-004',
    date: '2026-10-18',
    service: 'Sunday Worship Service',
    members: 135,
    visitors: 25,
    total: 160,
    notes: 'Sunday morning worship and teaching series.',
  },
];

export const INITIAL_GIVING: GivingRecord[] = [
  {
    id: 'GIV-001',
    date: '2026-11-08',
    contributor: 'Marie Kabeya',
    type: 'Tithe',
    amount: 350,
    paymentMethod: 'Mobile Money',
    notes: 'Monthly tithe contribution (Fictional demo record).',
  },
  {
    id: 'GIV-002',
    date: '2026-11-08',
    contributor: 'Daniel Ilunga',
    type: 'Offering',
    amount: 250,
    paymentMethod: 'Cash',
    notes: 'Sunday service thanksgiving offering (Fictional demo record).',
  },
  {
    id: 'GIV-003',
    date: '2026-11-07',
    contributor: 'Grace Mbuyi',
    type: 'Building Fund',
    amount: 300,
    paymentMethod: 'Bank Transfer',
    notes: 'Pledge toward sanctuary expansion project (Fictional demo record).',
  },
  {
    id: 'GIV-004',
    date: '2026-11-04',
    contributor: 'Ruth Mwamba',
    type: 'Tithe',
    amount: 400,
    paymentMethod: 'Bank Transfer',
    notes: 'November tithe record (Fictional demo record).',
  },
  {
    id: 'GIV-005',
    date: '2026-11-01',
    contributor: 'Joseph Tshibanda',
    type: 'Offering',
    amount: 200,
    paymentMethod: 'Cash',
    notes: 'First Sunday service offering (Fictional demo record).',
  },
];

export const INITIAL_EVENTS: EventRecord[] = [
  {
    id: 'EVT-001',
    name: 'Sunday Worship Service',
    date: '2026-11-15',
    startTime: '09:00',
    endTime: '11:00',
    location: 'Main Church Hall',
    description: 'Congregational worship, praise, intercession, and pastoral message at Église Cité de Restauration — Kolwezi.',
    status: 'Upcoming',
  },
  {
    id: 'EVT-002',
    name: 'Bible Study',
    date: '2026-11-18',
    startTime: '17:30',
    endTime: '19:00',
    location: 'Main Church Hall',
    description: 'Midweek interactive scripture study and teaching series on Isaiah 58:12.',
    status: 'Upcoming',
  },
  {
    id: 'EVT-003',
    name: 'Choir Practice',
    date: '2026-11-21',
    startTime: '09:00',
    endTime: '10:30',
    location: 'Church Meeting Room',
    description: 'Weekly choir rehearsal and vocal preparation for upcoming Sunday services.',
    status: 'Upcoming',
  },
];

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'ACT-001',
    type: 'attendance',
    title: 'Attendance recorded —',
    detail: '180 people',
    timeAgo: '2 hours ago',
    read: false,
  },
  {
    id: 'ACT-002',
    type: 'giving',
    title: 'Giving recorded —',
    detail: '$350',
    timeAgo: '4 hours ago',
    read: true,
  },
  {
    id: 'ACT-003',
    type: 'member',
    title: 'New member added —',
    detail: 'Ruth Mwamba',
    timeAgo: '1 day ago',
    read: true,
  },
];

export function createInitialDemoState(): DemoState {
  return {
    referenceDate: INITIAL_REFERENCE_DATE,
    members: generateInitialMembers(),
    attendance: [...INITIAL_ATTENDANCE],
    giving: [...INITIAL_GIVING],
    events: [...INITIAL_EVENTS],
    activities: [...INITIAL_ACTIVITIES],
  };
}
