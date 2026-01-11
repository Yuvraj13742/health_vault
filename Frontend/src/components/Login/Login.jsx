import React, { useContext, useState } from "react";
import { api } from "../../axios.config.js";
import { UserContext } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, Key, ShieldCheck, UserCheck, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await api.post(
        "/user/login",
        { email, password },
        { withCredentials: true }
      );
      if (response.status === 200) {
        const { role, userData, token } = response.data;
        login(userData);

        if (token) {
          localStorage.setItem("token", token);
        }
        localStorage.setItem("userId", userData.id);

        if (role === "doctor") navigate("/doctor");
        else if (role === "student") navigate("/profile");
        else navigate("/admin");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Invalid email or password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-8 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-black to-black"></div>

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row items-center animate-fade-in-up">

        {/* Illustration Section */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/10">
          <h1 className="text-5xl font-bold text-secondary mb-8 tracking-wider">Log In</h1>

          <div className="relative w-64 h-64">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-secondary/20 blur-[60px] rounded-full" />

            {/* Central Lock Icon */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <div className="bg-surface/80 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shadow-2xl shadow-secondary/20 relative">
                <Lock size={80} className="text-secondary" />
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"
                />
              </div>
            </motion.div>

            {/* Orbiting Key */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6">
                <div className="bg-surface/90 p-3 rounded-xl border border-white/10 shadow-lg transform -rotate-45">
                  <Key size={32} className="text-primary" />
                </div>
              </div>
            </motion.div>

            {/* Floating Shield */}
            <motion.div
              animate={{ x: [-10, 10, -10], y: [5, -5, 5] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="absolute bottom-4 right-4 bg-surface/90 p-3 rounded-xl border border-white/10 shadow-lg"
            >
              <ShieldCheck size={28} className="text-accent" />
            </motion.div>

            {/* Floating User */}
            <motion.div
              animate={{ x: [10, -10, 10], y: [-5, 5, -5] }}
              transition={{ duration: 7, repeat: Infinity }}
              className="absolute bottom-4 left-4 bg-surface/90 p-3 rounded-xl border border-white/10 shadow-lg"
            >
              <UserCheck size={28} className="text-green-400" />
            </motion.div>
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-6 md:pl-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-gray-400 text-sm ml-1">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-2 p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                required
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-2 p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors mt-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button type="submit" className="w-full mt-6 p-4 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/25 hover:bg-pink-600 hover:shadow-secondary/50 hover:scale-[1.02] transition-all duration-300">
              Login
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account? <span className="text-secondary cursor-pointer hover:underline" onClick={() => navigate('/signup')}>Sign Up</span>
          </p>
        </div>
      </div>
    </div>
  );
}
