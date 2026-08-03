import KigaliImg from "../assets/images/destinations/kigali.jpg";
import KivuImg from "../assets/images/destinations/kivu.jpg";
import GorillaImg from "../assets/images/destinations/gorilla.jpg";
import NyungweImg from "../assets/images/destinations/nyungwe.jpg"
import AkageraImg from "../assets/images/destinations/akagera.jpg"
import GisenyiImg from "../assets/images/destinations/gisenyi.jpg"
import NyanzaImg from "../assets/images/destinations/kings-palace.jpg"
import BisokeImg from "../assets/images/destinations/bisoke.jpg"
/* ========================
   DESTINATIONS (MAIN DATA)
========================= */
export const destinations = [
    {
    id: 1,
    name: "Volcanoes National Park",
    location: "Musanze, Northern Province",
    price: 1500,
    rating: 4.9,
    image:GorillaImg, 
    category: "National Parks",
    description: "Home to the endangered mountain gorillas. A once-in-a-lifetime trekking experience in the bamboo forest.",
    activities: ["Gorilla Trekking", "Golden Monkey Tracking", "Visit Karisoke Research Center", "Hike Bisoke Volcano"],
    duration: "1-2 days",
    bestTime: "June-September & December-February"
  },
  {
    id: 2,
    name: "Lake Kivu",
    location: "Rubavu / Karongi, Western Province",
    price: 120,
    rating: 4.7,
    image: KivuImg,
    category: "Nature & Relaxation",
    description: "One of Africa's Great Lakes, surrounded by green hills. Perfect for boat trips, kayaking, and beach relaxation.",
    activities: ["Boat Cruise", "Kayaking", "Island Hopping to Napoleon Island", "Bike Ride on Congo Nile Trail"],
    duration: "1-3 days",
    bestTime: "May-October"
  },
  {
    id: 3,
    name: "Nyungwe National Park",
    location: "Nyamasheke / Rusizi, South-Western Province",
    price: 400,
    rating: 4.8,
    image: NyungweImg,
    category: "National Parks",
    description: "Ancient montane rainforest with chimpanzees and the famous Canopy Walkway.",
    activities: ["Chimpanzee Trekking", "Canopy Walk", "Colobus Monkey Tracking", "Waterfall Trail", "Bird Watching"],
    duration: "1-2 days",
    bestTime: "June-August & December-February"
  },
  {
    id: 4,
    name: "Kigali City",
    location: "Kigali, Central Province",
    price: 80,
    rating: 4.6,
    image: KigaliImg,
    category: "City Tours",
    description: "Africa's cleanest city. Art, culture, nightlife, and the moving Kigali Genocide Memorial.",
    activities: ["Kigali Genocide Memorial", "Visit Inema Arts Center", "Local Food Tour", "Nightlife in Kimihurura", "Shopping at Caplaki"],
    duration: "1 day",
    bestTime: "Year-round"
  },
  {
    id: 5,
    name: "Akagera National Park",
    location: "Eastern Province (Kirehe/Kayonza)",
    price: 350,
    rating: 4.7,
    image: AkageraImg,
    category: "National Parks",
    description: "Savannah park with the Big Five. Game drives and boat safari on Lake Ihema.",
    activities: ["Game Drive (Lions, Elephants, Giraffes)", "Boat Safari on Lake Ihema", "Spot Hippos & Crocodiles", "Night Safari"],
    duration: "1-2 days",
    bestTime: "June-September (dry season)"
  },
  {
    id: 6,
    name: "Gisenyi (Rubavu)",
    location: "Rubavu, Western Province",
    price: 90,
    rating: 4.5,
    image:GisenyiImg ,
    category: "Beach & Relaxation",
    description: "Lake Kivu beach town with black volcanic sand. Perfect for weekend getaways.",
    activities: ["Swimming in Lake Kivu", "Visit Gisenyi Hot Springs", "Beach Volleyball", "Sunset Boat Cruise"],
    duration: "1-2 days",
    bestTime: "May-October"
  },
  {
    id: 7,
    name: "King's Palace Museum (Nyanza)",
    location: "Nyanza, Southern Province",
    price: 20,
    rating: 4.4,
    image: NyanzaImg,
    category: "Cultural Tours",
    description: "Replica of the traditional Rwandan king's palace with Inyambo (sacred cows) cultural experience.",
    activities: ["See Inyambo Cattle Dancing", "Learn Ancient Rwandan Architecture", "Visit the King's Hut", "Traditional Dance Performance"],
    duration: "2-3 hours",
    bestTime: "Year-round"
  },
  {
    id: 8,
    name: "Mount Bisoke",
    location: "Volcanoes National Park / Musanze",
    price: 400,
    rating: 4.9,
    image: BisokeImg,
    category: "Adventure",
    description: "An active volcano with a stunning crater lake at the summit. A challenging day hike.",
    activities: ["Hike to Crater Lake", "Bird Watching", "Views of Virunga Mountains"],
    duration: "1 day",
    bestTime: "June-September"
  }
];

/* =========================
   TRIPS (if needed later)
========================= */
export const trips = [
  {
    id: 1,
    title: "Kigali Weekend Trip",
    location: "Kigali",
  },
];

/* =========================
   TESTIMONIALS (REAL USER FEEDBACK)
========================= */
export const testimonials = [
  {
    id: 1,
    name: "Aline Uwase",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    rating: 5,
    text: "AI Tour helped me plan my gorilla trekking in Volcanoes Park. The AI recommended the best accommodation and even told me what to pack! Murakoze!"
  },
  {
    id: 2,
    name: "Kevin Mugisha",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5,
    text: "I used the AI Planner for Lake Kivu and got a perfect 3-day itinerary with boat tours and local restaurants. This is the future of Rwandan tourism!"
  },
  {
    id: 3,
    name: "Jessica Umuhoza",
    avatar: "https://randomuser.me/api/portraits/women/45.jpg",
    rating: 4,
    text: "The app is super easy to use. I found a hotel in Kigali in 2 minutes. Gen Z approved! Can't wait for more features."
  }
];