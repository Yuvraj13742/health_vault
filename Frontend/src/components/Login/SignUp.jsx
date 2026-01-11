import React, { useContext, useState } from "react";
import { api } from "../../axios.config.js";
import { UserContext } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { UserPlus, FileText, Stethoscope, GraduationCap, Eye, EyeOff } from "lucide-react";

export default function SignUp() {
  const { login } = useContext(UserContext);
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("Male");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const formData = { role, name, email, password, phone, dateOfBirth, gender };
    if (role === "doctor") formData.specialization = extra;

    try {
      const response = await api.post(
        "user/signup",
        formData,
        { withCredentials: true }
      );

      if (response.status === 201) {
        navigate("/login");
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.message || "Signup failed");
      } else {
        console.log("Error Message:", error.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-8 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/20 via-black to-black"></div>

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col md:flex-row items-center animate-fade-in-up">

        {/* Illustration Section */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/10">
          <h1 className="text-5xl font-bold text-secondary mb-12 tracking-wider">Sign Up</h1>

          <div className="relative w-64 h-64">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-secondary/20 blur-[60px] rounded-full" />

            {/* Central UserPlus Icon */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <div className="bg-surface/80 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shadow-2xl shadow-secondary/20 relative">
                <UserPlus size={80} className="text-secondary" />
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full shadow-[0_0_10px_#06b6d4]"
                />
              </div>
            </motion.div>

            {/* Orbiting Elements */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8">
                <div className="bg-surface/90 p-3 rounded-xl border border-white/10 shadow-lg transform rotate-12">
                  <FileText size={32} className="text-primary" />
                </div>
              </div>
              <div className="absolute bottom-8 right-8">
                <div className="bg-surface/90 p-3 rounded-xl border border-white/10 shadow-lg transform -rotate-12">
                  <Stethoscope size={32} className="text-green-400" />
                </div>
              </div>
              <div className="absolute bottom-8 left-8">
                <div className="bg-surface/90 p-3 rounded-xl border border-white/10 shadow-lg transform rotate-45">
                  <GraduationCap size={32} className="text-accent" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-6 md:pl-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Role Selection */}
            <div className="flex justify-center space-x-4 mb-6 bg-black/30 p-2 rounded-xl border border-white/10">
              {["student", "doctor", "admin"].map((r) => (
                <label key={r} className={`cursor-pointer px-4 py-2 rounded-lg transition-all ${role === r ? 'bg-secondary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="hidden"
                  />
                  <span className="capitalize font-medium">{r}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                >
                  <option value="Male" className="bg-black">Male</option>
                  <option value="Female" className="bg-black">Female</option>
                  <option value="Other" className="bg-black">Other</option>
                </select>
              </div>

              {role === "doctor" && (
                <input
                  type="text"
                  placeholder="Specialization"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  required
                />
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button type="submit" className="w-full mt-6 p-4 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/25 hover:bg-pink-600 hover:shadow-secondary/50 hover:scale-[1.02] transition-all duration-300">
              Create Account
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Already have an account? <span className="text-secondary cursor-pointer hover:underline" onClick={() => navigate('/login')}>Log In</span>
          </p>
        </div>
      </div>
    </div>
  );
}
