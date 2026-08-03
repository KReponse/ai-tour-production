/** @type {import('tailwindcss').Config} */
export default {

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],


  darkMode: "class",


  theme: {

    extend: {

      colors: {

        /* AI TOUR BRAND */

        primary: "#0D9488",

        accent: "#F59E0B",

        slate: "#374151",

        dark: "#111827",

        light: "#FFFFFF",


        /* STATUS COLORS */

        success:"#16A34A",

        danger:"#DC2626",

        warning:"#D97706",

      },


      backgroundImage: {

        "ai-gradient":
          "linear-gradient(135deg,#0D9488,#F59E0B)",

      },


      boxShadow: {

        "ai":
          "0 20px 50px rgba(13,148,136,0.15)",

      },


      animation: {

        "fade-up":
          "fadeUp .5s ease-out",

        "float":
          "float 3s ease-in-out infinite",

      },


      keyframes: {

        fadeUp: {

          "0%":{
            opacity:0,
            transform:"translateY(20px)"
          },

          "100%":{
            opacity:1,
            transform:"translateY(0)"
          },

        },


        float:{

          "0%,100%":{
            transform:"translateY(0)"
          },

          "50%":{
            transform:"translateY(-8px)"
          },

        },


      },


    },

  },


  plugins: [

    function ({ addUtilities }) {

      addUtilities({

        ".scrollbar-hide": {

          "-ms-overflow-style":
            "none",

          "scrollbar-width":
            "none",

        },


        ".scrollbar-hide::-webkit-scrollbar": {

          display:
            "none",

        },

      });

    },

  ],

};