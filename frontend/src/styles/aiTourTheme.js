// src/styles/aiTourTheme.js

const aiTourTheme = {

  colors: {

    primary: {
      main: "#0D9488",
      light: "#14B8A6",
      dark: "#0F766E",
      name: "Teal",
      meaning:
        "Ubwiza bwa kamere, ubukiriro, ubunyangamugayo",
    },


    secondary: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
      name: "Yellow Gold",
      meaning:
        "Izuba, ibyishimo, ubushyuhe n'ubushingantahe",
    },


    slate: {
      main: "#374151",
      light: "#4B5563",
      dark: "#1F2937",
      name: "Dark Slate",
      meaning:
        "Ubuyobozi, ubufatanye, kwizigama",
    },


    white: {
      main: "#FFFFFF",
      name: "White",
      meaning:
        "Isuku, ubwisanzure",
    },


    background: {
      light: "#F9FAFB",
      dark: "#111827",
    },


    success: "#16A34A",
    danger: "#DC2626",
    warning: "#F59E0B",

  },


  gradients: {

    primary:
      "from-[#0D9488] via-[#14B8A6] to-[#F59E0B]",


    hero:
      "from-[#0D9488] via-[#374151] to-[#F59E0B]",


    button:
      "from-[#0D9488] to-[#F59E0B]",


    card:
      "from-white to-gray-50",

  },


  shadows: {

    primary:
      "0 10px 30px rgba(13,148,136,0.25)",

    gold:
      "0 10px 30px rgba(245,158,11,0.25)",

  },


  branding: {

    name: "AI Tour Rwanda",

    slogan:
      "Discover Rwanda with Intelligent Travel",

    colors:
      [
        "#0D9488",
        "#F59E0B",
        "#374151",
        "#FFFFFF"
      ]

  }

};


export default aiTourTheme;