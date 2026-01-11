import React, { useState, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Calendar,
    FileText,
    Award,
    MessageSquare,
    Activity,
    Video,
    Bot,
    Users,
    UserPlus,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Settings
} from "lucide-react";
import { UserContext } from "../context/UserContext";
import { api } from "../axios.config";

const Sidebar = ({ role }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, setUser } = useContext(UserContext); // Access UserContext

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleLogout = async () => {
        try {
            await api.post("user/logout");
            logout();
            setUser(null);
            navigate("/"); // Redirect to home or login
        } catch (error) {
            console.error("Error logging out:", error);
            // Even if API fails, clear local state
            logout();
            setUser(null);
            navigate("/");
        }
    };

    const menuItems = {
        student: [
            { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
            { name: "Book Appointment", path: "/appointment", icon: Calendar },
            { name: "Health Records", path: "/recordform", icon: FileText },
            { name: "Certificate Generator", path: "/certificate", icon: Award },
            { name: "Leave Concern", path: "/leave-concern", icon: AlertCircle },
            { name: "Health Record Concern", path: "/health-record-concern", icon: Activity },
            { name: "AI Diagnosis", path: "/ai-diagnosis", icon: Bot },
        ],
        doctor: [
            { name: "Dashboard", path: "/doctor", icon: LayoutDashboard },
            { name: "Set Time Slots", path: "/slots", icon: Calendar },
            { name: "Prescriptions", path: "/prescriptions", icon: FileText },
            { name: "Video Call", path: "/video-call", icon: Video },
            { name: "AI Assistant", path: "/ai-assistant", icon: Bot },
        ],
        admin: [
            { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
            { name: "Leave Applications", path: "/admin", icon: FileText },
            { name: "Health Records", path: "/admin", icon: Activity },
            { name: "Manage Doctors", path: "/admin", icon: Users },
        ],
    };

    const currentMenu = menuItems[role] || [];

    return (
        <div
            className={`${isCollapsed ? "w-20" : "w-64"
                } h-screen bg-surface/30 backdrop-blur-md border-r border-white/10 transition-all duration-300 flex flex-col sticky top-0 left-0 z-50`}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-10 bg-primary text-white p-1 rounded-full shadow-lg hover:bg-primary/80 transition-colors z-50"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Logo Area */}
            <div className="p-4 flex items-center justify-center border-b border-white/10 h-20">
                {isCollapsed ? (
                    <Activity className="text-primary w-8 h-8" />
                ) : (
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary whitespace-nowrap">
                        HealthVault
                    </h2>
                )}
            </div>

            {/* Scrollable Content (Nav + Logout) */}
            <div className="flex-1 overflow-y-auto flex flex-col">
                <nav className="space-y-2 px-3 py-4">
                    {currentMenu.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-3 py-3 rounded-xl transition-all duration-300 group ${isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <item.icon
                                    className={`w-6 h-6 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"
                                        }`}
                                />
                                {!isCollapsed && (
                                    <span className="ml-3 font-medium whitespace-nowrap">
                                        {item.name}
                                    </span>
                                )}
                                {isCollapsed && (
                                    <div className="absolute left-full rounded-md px-2 py-1 ml-6 bg-gray-900 text-white text-sm invisible opacity-0 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap z-50">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-2 mt-auto border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 group ${isCollapsed ? "justify-center" : ""
                            }`}
                    >
                        <LogOut className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
