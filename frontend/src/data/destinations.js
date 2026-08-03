import kigaliImg from "../assets/images/destinations/kigali.jpg";
import kivuImg from "../assets/images/destinations/kivu.jpg";
import volcanoImg from "../assets/images/destinations/gorilla.jpg";
import akageraImg from "../assets/images/destinations/akagera.jpg";
import nyungweImg from "../assets/images/destinations/nyungwe.jpg";
import nyanzaImg from "../assets/images/destinations/kings-palace.jpg";

export const rwandaDestinations = [
  {
    id: 1,
    name: "Volcanoes National Park",
    location: "Musanze, Northern Province",
    price: 1500,
    rating: 4.9,
    image: volcanoImg,
    category: "Wildlife",
    description:
      "Experience unforgettable mountain gorilla trekking in Rwanda’s most iconic national park surrounded by volcanoes and lush rainforest.",
    activities: [
      "Gorilla Trekking",
      "Golden Monkey Tracking",
      "Bisoke Hiking",
      "Nature Walks",
    ],
    duration: "1-2 Days",
    bestTime: "June - September",
  },

  {
    id: 2,
    name: "Lake Kivu",
    location: "Rubavu & Karongi",
    price: 120,
    rating: 4.8,
    image: kivuImg,
    category: "Relaxation",
    description:
      "Enjoy breathtaking lake views, relaxing beaches, kayaking adventures, and luxury resorts along Rwanda’s beautiful Lake Kivu.",
    activities: [
      "Boat Cruises",
      "Kayaking",
      "Beach Relaxation",
      "Island Tours",
    ],
    duration: "1-3 Days",
    bestTime: "May - October",
  },

  {
    id: 3,
    name: "Nyungwe National Park",
    location: "Nyamasheke",
    price: 400,
    rating: 4.8,
    image: nyungweImg,
    category: "Nature",
    description:
      "Explore one of Africa’s oldest rainforests featuring chimpanzees, canopy walks, waterfalls, and rich biodiversity.",
    activities: [
      "Chimpanzee Trekking",
      "Canopy Walk",
      "Bird Watching",
      "Forest Hiking",
    ],
    duration: "1-2 Days",
    bestTime: "June - August",
  },

  {
    id: 4,
    name: "Kigali City",
    location: "Kigali",
    price: 80,
    rating: 4.7,
    image: kigaliImg,
    description:
      "Discover Africa’s cleanest city with modern cafes, cultural experiences, museums, nightlife, and premium hospitality.",
    activities: [
      "Kigali Genocide Memorial",
      "Art Galleries",
      "Coffee Tours",
      "Nightlife",
    ],
    duration: "1 Day",
    bestTime: "All Year",
  },

  {
    id: 5,
    name: "Akagera National Park",
    location: "Eastern Province",
    price: 350,
    rating: 4.8,
    image: akageraImg,
    category: "Safari",
    description:
      "Experience Rwanda’s Big Five safari destination with game drives, lake safaris, and luxury lodges.",
    activities: [
      "Game Drives",
      "Boat Safari",
      "Night Safari",
      "Wildlife Photography",
    ],
    duration: "1-2 Days",
    bestTime: "June - September",
  },

  {
    id: 6,
    name: "King's Palace Museum",
    location: "Nyanza",
    price: 20,
    rating: 4.5,
    image: nyanzaImg,
    category: "Culture",
    description:
      "Discover Rwanda’s royal heritage, traditional architecture, and the famous Inyambo sacred cows.",
    activities: [
      "Cultural Tours",
      "Traditional Dance",
      "Royal History",
      "Inyambo Experience",
    ],
    duration: "2-3 Hours",
    bestTime: "All Year",
  },
];