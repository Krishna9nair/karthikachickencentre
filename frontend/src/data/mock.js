// Mock data for ChickenCrew (karthikachickencentre.shop clone)

export const SHOP_INFO = {
  name: 'ChickenCrew',
  tagline: 'FARM FRESH DAILY',
  address: 'Kartika Chicken Center, Trimurti Nagar, Dombivli East, Thane, Maharashtra 421201',
  phone: '8928370724',
  hoursWeekday: 'Mon \u2013 Sat: 7:00 AM \u2013 9:00 PM',
  hoursSunday: 'Sunday: 7:00 AM \u2013 9:00 PM',
  about:
    'Locally sourced, hand-cleaned chicken delivered to your door. Cluck-worthy quality, every day.',
};

export const PRODUCTS = [
  {
    id: 'whole-skin',
    name: 'Whole Chicken (with skin)',
    desc: 'Fresh farm chicken, dressed and cleaned',
    price: 220,
    tag: 'Fresh',
  },
  {
    id: 'whole-skinless',
    name: 'Whole Chicken (skinless)',
    desc: 'Skinless whole bird, ready to cook',
    price: 260,
    tag: 'Fresh',
  },
  {
    id: 'boneless-breast',
    name: 'Boneless Breast',
    desc: 'Lean white meat, skinless',
    price: 300,
    tag: 'Fresh',
  },
  {
    id: 'legs',
    name: 'Chicken Legs',
    desc: 'Juicy whole legs with thighs',
    price: 240,
    tag: 'Fresh',
  },
  {
    id: 'wings',
    name: 'Chicken Wings',
    desc: 'Tender wings, ideal for fry & grill',
    price: 280,
    tag: 'Fresh',
  },
  {
    id: 'liver',
    name: 'Chicken Liver',
    desc: 'Fresh liver, cleaned',
    price: 259,
    tag: 'Fresh',
  },
];

export const MOCK_ORDERS = [
  {
    id: 'ORD-1042',
    customer: 'Rahul Sharma',
    phone: '9876543210',
    items: [
      { name: 'Whole Chicken (skinless)', qty: 1, price: 260 },
      { name: 'Chicken Wings', qty: 0.5, price: 140 },
    ],
    total: 400,
    status: 'Ready',
    payment: 'UPI Paid',
    time: '08:45 AM',
  },
  {
    id: 'ORD-1041',
    customer: 'Priya Patil',
    phone: '9823456712',
    items: [
      { name: 'Boneless Breast', qty: 1, price: 300 },
    ],
    total: 300,
    status: 'Preparing',
    payment: 'UPI Paid',
    time: '08:20 AM',
  },
  {
    id: 'ORD-1040',
    customer: 'Amit Joshi',
    phone: '9765432110',
    items: [
      { name: 'Chicken Legs', qty: 2, price: 480 },
    ],
    total: 480,
    status: 'Out for delivery',
    payment: 'UPI Paid',
    time: '07:55 AM',
  },
];

export const RIDER_DELIVERIES = [
  {
    id: 'ORD-1040',
    customer: 'Amit Joshi',
    address: '12, Ganesh Nagar, Dombivli East',
    phone: '9765432110',
    items: '2 kg Chicken Legs',
    total: 480,
    status: 'Out for delivery',
  },
  {
    id: 'ORD-1039',
    customer: 'Sneha Kulkarni',
    address: 'Flat 302, Shivam Residency, Thane West',
    phone: '9812345678',
    items: '1 kg Whole Chicken (skinless), 0.5 kg Liver',
    total: 389,
    status: 'Picked up',
  },
];
