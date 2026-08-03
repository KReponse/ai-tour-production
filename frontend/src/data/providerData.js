export const providerStats = [
  {
    title: 'Total Bookings',
    value: '124',
    growth: '+12%',
  },
  {
    title: 'Pending Requests',
    value: '18',
    growth: '+5%',
  },
  {
    title: 'Travelers',
    value: '87',
    growth: '+18%',
  },
  {
    title: 'Revenue',
    value: '$4,320',
    growth: '+20%',
  },
];

export const recentRequests = [
  {
    id: 1,
    traveler: 'John Doe',
    destination: 'Volcanoes National Park',
    travelers: 2,
    budget: '$1200',
    status: 'pending',
    date: '12 Oct 2026',
    location: 'Musanze, Rwanda',
  },

  {
    id: 2,
    traveler: 'Alice Smith',
    destination: 'Akagera National Park',
    travelers: 4,
    budget: '$2200',
    status: 'accepted',
    date: '18 Oct 2026',
    location: 'Eastern Province',
  },

  {
    id: 3,
    traveler: 'David Wilson',
    destination: 'Lake Kivu Experience',
    travelers: 3,
    budget: '$980',
    status: 'rejected',
    date: '22 Oct 2026',
    location: 'Rubavu, Rwanda',
  },
];
export const providerRequests = [
  {
    id: 1,
    traveler: 'Reponse Dev',
    location: 'Kigali, Rwanda',
    destination: 'Volcanoes National Park',
    travelers: '2 People',
    budget: '$1,200',
    date: '12 Oct 2026',
    status: 'Pending',
  },

  {
    id: 2,
    traveler: 'John Doe',
    location: 'Nairobi, Kenya',
    destination: 'Akagera National Park',
    travelers: '4 People',
    budget: '$2,400',
    date: '18 Nov 2026',
    status: 'Accepted',
  },

  {
    id: 3,
    traveler: 'Sarah Smith',
    location: 'Kampala, Uganda',
    destination: 'Lake Kivu',
    travelers: '3 People',
    budget: '$980',
    date: '5 Dec 2026',
    status: 'Rejected',
  },
];
export const providerBookings = [
  {
    id: 1,
    traveler: 'John Doe',
    destination: 'Akagera National Park',
    date: '15 Oct 2026',
    amount: '$1,200',
    payment: 'Paid',
    status: 'Confirmed',
  },

  {
    id: 2,
    traveler: 'Sarah Smith',
    destination: 'Volcanoes National Park',
    date: '20 Oct 2026',
    amount: '$980',
    payment: 'Pending',
    status: 'Pending',
  },

  {
    id: 3,
    traveler: 'David Brown',
    destination: 'Lake Kivu Retreat',
    date: '2 Nov 2026',
    amount: '$2,100',
    payment: 'Paid',
    status: 'Completed',
  },
];
export const providerTravelers = [
  {
    id: 1,
    name: 'John Doe',
    country: 'USA',
    trips: 4,
    status: 'Active',
    avatar: 'J',
  },

  {
    id: 2,
    name: 'Sarah Smith',
    country: 'Canada',
    trips: 2,
    status: 'Pending',
    avatar: 'S',
  },

  {
    id: 3,
    name: 'David Brown',
    country: 'UK',
    trips: 7,
    status: 'VIP',
    avatar: 'D',
  },
];
export const analyticsData = [
  {
    month: 'Jan',
    bookings: 20,
    revenue: 1200,
  },

  {
    month: 'Feb',
    bookings: 35,
    revenue: 2100,
  },

  {
    month: 'Mar',
    bookings: 28,
    revenue: 1800,
  },

  {
    month: 'Apr',
    bookings: 48,
    revenue: 3500,
  },

  {
    month: 'May',
    bookings: 52,
    revenue: 4100,
  },

  {
    month: 'Jun',
    bookings: 65,
    revenue: 5200,
  },
];
export const earningsData = [
  {
    id: 1,
    title: 'Akagera Safari',
    amount: '$1,200',
    status: 'Paid',
    date: '12 Jan 2026',
  },

  {
    id: 2,
    title: 'Volcanoes Tour',
    amount: '$850',
    status: 'Pending',
    date: '18 Jan 2026',
  },

  {
    id: 3,
    title: 'Lake Kivu Retreat',
    amount: '$2,400',
    status: 'Paid',
    date: '21 Jan 2026',
  },

  {
    id: 4,
    title: 'Kigali City Tour',
    amount: '$450',
    status: 'Processing',
    date: '25 Jan 2026',
  },
];
export const reviewsData = [
  {
    id: 1,
    traveler: 'John Doe',
    destination: 'Akagera National Park',
    rating: 5,
    comment:
      'Amazing experience and professional guide service.',
    date: '12 Jan 2026',
  },

  {
    id: 2,
    traveler: 'Sarah Smith',
    destination: 'Volcanoes National Park',
    rating: 4,
    comment:
      'Very good organization and smooth trip.',
    date: '18 Jan 2026',
  },

  {
    id: 3,
    traveler: 'Michael Brown',
    destination: 'Lake Kivu Retreat',
    rating: 5,
    comment:
      'Excellent hospitality and unforgettable experience.',
    date: '22 Jan 2026',
  },

  {
    id: 4,
    traveler: 'Emma Wilson',
    destination: 'Kigali City Tour',
    rating: 3,
    comment:
      'Good trip but transport was slightly delayed.',
    date: '25 Jan 2026',
  },
];
export const providerProfile = {
  name: 'AI Tour Rwanda',
  email: 'provider@aitourrwanda.com',
  phone: '+250 788 000 000',
  location: 'Kigali, Rwanda',
  bio:
    'Professional tourism service provider specialized in luxury Rwanda travel experiences.',
  website: 'www.aitourrwanda.com',
  verified: true,
  totalTrips: 248,
  rating: 4.8,
};