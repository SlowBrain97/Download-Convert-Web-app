import axios from "axios";

const apiConfig = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});
console.log(import.meta.env.VITE_BASE_URL)
export default apiConfig;
