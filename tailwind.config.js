/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Сканируем главный HTML файл
    "./src/**/*.{js,ts,jsx,tsx}", // Сканируем ВСЕ файлы внутри папки src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}