import React, { useState, useEffect } from "react";
import { api } from "../../axios.config.js"; // Axios instance
import { Link } from "react-router-dom";
import {
  Search,
  Upload,
  Calendar,
  FileText,
  MessageCircle,
  Settings
} from "lucide-react";
import Notibell from "../Noti/Notibell.jsx";
import socket from "../../socket.js";
import { showAlert } from "../alert-system.js";
import Sidebar from "../Sidebar";

const Dashboard = () => {
  // States for various sections
  const [healthRecords, setHealthRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null); // For selected health record
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveError, setLeaveError] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // States for search suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // ** NEW: Active tab state **
  // Possible tab values: "leave", "appointments", "healthRecords", "aiDiagnosis"
  const [activeTab, setActiveTab] = useState("leave");

  // Fetch leave applications
  useEffect(() => {
    const fetchLeaveApplications = async () => {
      try {
        const response = await api.get("/leave/");
        if (Array.isArray(response.data)) {
          setLeaveApplications(response.data);
        } else {
          console.error("Unexpected response format:", response.data);
          setLeaveApplications([]);
        }
      } catch (err) {
        console.error("Error fetching leave applications:", err);
        setLeaveError("Failed to load leave applications.");
      } finally {
        setLeaveLoading(false);
      }
    };

    fetchLeaveApplications();

    socket.on("newNotification", (data) => {
      if (data.notification?.type === "leave") {
        showAlert(data.notification.message);
      }
    });

    return () => {
      socket.off("newNotification");
    };

  }, []);

  // Fetch health records
  useEffect(() => {
    const fetchHealthRecords = async () => {
      try {
        const response = await api.get("/health-record");
        if (Array.isArray(response.data)) {
          setHealthRecords(response.data);
        } else {
          console.error("Unexpected response format:", response.data);
          setHealthRecords([]);
        }
      } catch (err) {
        console.error("Error fetching health records:", err);
        setError("Failed to load health records.");
      } finally {
        setLoading(false);
      }
    };

    fetchHealthRecords();
  }, []);

  // Fetch student appointments and listen to socket events
  useEffect(() => {
    const fetchStudentAppointments = async () => {
      try {
        const response = await api.get("/appointment/student");
        if (Array.isArray(response.data)) {
          setAppointments(response.data);
        } else if (response.data && Array.isArray(response.data.appointments)) {
          setAppointments(response.data.appointments);
        } else {
          console.error("Unexpected appointment response format:", response.data);
          setAppointments([]);
        }
      } catch (err) {
        console.error("Error fetching student appointments:", err);
        setAppointmentsError("Failed to load student appointments.");
      } finally {
        setAppointmentsLoading(false);
      }
    };

    fetchStudentAppointments();

    socket.on("appointmentUpdate", (data) => {
      console.log("🔔 Real-time appointment update received:", data);
      // showAlert is assumed defined elsewhere (or you can replace with your notification logic)
      // showAlert(data.message, 'custom', 10000);
      fetchStudentAppointments();
    });

    socket.on("newAppointment", (data) => {
      console.log("📥 New appointment received:", data);
      // showAlert(data.message, "custom", 10000);
      setNotificationCount((prev) => prev + 1);
      const updatedAppointment = {
        ...data.appointment,
        doctorId: {
          ...(data.appointment.doctorId || {}),
          name: data.appointment.doctorName || data.appointment.doctorId?.name || "Unknown"
        }
      };
      setAppointments((prev) => [updatedAppointment, ...prev]);
    });

    // Clean up socket listeners when component unmounts
    return () => {
      socket.off("appointmentUpdate");
      socket.off("newAppointment");
    };
  }, []);

  // Debounced API call for search suggestions
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        api
          .get("/user/searchSuggestions", { params: { query: searchQuery } })
          .then((res) => {
            setSuggestions(res.data);
          })
          .catch((err) => {
            console.error("Error fetching suggestions:", err);
            setSuggestions([]);
          });
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle search field change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // When a suggestion is clicked, search health records by query
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
    api
      .get("/user/search", { params: { query: suggestion } })
      .then((res) => {
        setSearchResults(res.data);
      })
      .catch((err) => {
        console.error("Error fetching search results:", err);
        setSearchResults([]);
      });
  };

  // View health record details
  const viewHealthRecordDetails = async (id) => {
    try {
      const response = await api.get(`/health-record/${id}`);
      setSelectedRecord(response.data);
    } catch (err) {
      console.error("Error fetching health record details:", err);
      alert("Failed to load health record details.");
    }
  };

  // Delete a health record
  const deleteHealthRecord = async (id) => {
    try {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete this record?"
      );
      if (!confirmDelete) return;

      await api.delete(`/health-record/${id}/delete`);
      alert("Health record deleted successfully.");
      setHealthRecords(healthRecords.filter((record) => record.id !== id));
    } catch (err) {
      console.error("Error deleting health record:", err);
      alert("Failed to delete health record.");
    }
  };

  // Format date/time
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get the next upcoming appointment for the action card history
  const getNextAppointment = () => {
    if (appointments.length === 0) return "No upcoming appointments";

    // Sort appointments by slotDateTime
    const sortedAppointments = [...appointments].sort(
      (a, b) => new Date(a.slotDateTime) - new Date(b.slotDateTime)
    );

    const now = new Date();
    const upcomingAppointment = sortedAppointments.find(
      (apt) => new Date(apt.slotDateTime) > now
    );

    if (upcomingAppointment) {
      return `Next appointment: ${formatDate(
        upcomingAppointment.slotDateTime
      )} - ${upcomingAppointment.doctorId?.name || "Doctor"}`;
    } else {
      return "No upcoming appointments";
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent text-white">
      {/* Sidebar */}
      <Sidebar role="student" />

      {/* Main Content */}
      <div className="flex-1 p-8 transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-white/20 rounded-lg bg-surface/50 text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-all duration-300 focus:w-64 w-48"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {/* Dropdown for suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute bg-surface border border-white/10 rounded-lg mt-1 w-full z-10 shadow-xl">
                  {suggestions.map((item, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-white/10 cursor-pointer text-gray-200"
                      onClick={() => handleSuggestionClick(item)}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Settings className="w-6 h-6 text-gray-400 hover:text-primary transition-colors cursor-pointer hover:rotate-90 duration-500" />
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {[
            {
              title: "Health Records",
              action: "Upload Health Record",
              color: "bg-gradient-to-r from-blue-600 to-cyan-400 shadow-lg shadow-blue-500/30",
              icon: Upload,
              history: "Last uploaded: Blood Test Report - 10th March 2025",
              route: "/recordform",
            },
            {
              title: "Leave Applications",
              action: "Apply for Leave",
              color: "bg-gradient-to-r from-emerald-500 to-lime-400 shadow-lg shadow-emerald-500/30",
              icon: FileText,
              history: "Last leave applied: 5th March 2025 (Medical Leave)",
              route: "/leave",
            },
            {
              title: "Appointments",
              action: "Book Appointment",
              color: "bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg shadow-purple-500/30",
              icon: Calendar,
              history: getNextAppointment(),
              route: "/appointment",
            },
            {
              title: "AI Diagnosis",
              action: "AI DIAGNOSIS",
              color: "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-lg shadow-amber-500/30",
              icon: MessageCircle,
              history: "Last query: 'Best home remedies for fever?'",
              route: "/ai-diagnosis",
            },
          ].map((item, index) => (
            <Link to={item.route} key={index} className="block group">
              <div className="glass-card p-6 hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 ${item.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-150 duration-500`}></div>
                <h2 className="text-xl font-semibold mb-4 text-white relative z-10">
                  {item.title}
                </h2>
                <button
                  className={`flex items-center justify-center ${item.color} text-white p-4 rounded-xl shadow-md w-full mb-4 text-lg font-semibold btn-animated relative z-10`}
                >
                  <item.icon className="mr-2" /> {item.action}
                </button>
                <p className="text-gray-300 text-lg font-medium bg-white/5 p-4 rounded-lg shadow-sm border border-white/5 relative z-10">
                  {item.history}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-white/10">
          <nav className="flex space-x-6">
            <button
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-300 ${activeTab === "leave"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-primary"
                }`}
              onClick={() => setActiveTab("leave")}
            >
              Leave Applications
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-300 ${activeTab === "appointments"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-primary"
                }`}
              onClick={() => setActiveTab("appointments")}
            >
              My Appointments
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-300 ${activeTab === "healthRecords"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-primary"
                }`}
              onClick={() => setActiveTab("healthRecords")}
            >
              Health Records
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-300 ${activeTab === "aiDiagnosis"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-primary"
                }`}
              onClick={() => setActiveTab("aiDiagnosis")}
            >
              AI Diagnosis
            </button>
          </nav>
        </div>

        {/* Conditional Rendering of Sections based on Active Tab */}
        {activeTab === "leave" && (
          <div className="glass-card p-6 mb-8 animate-fade-in">
            <h2 className="text-lg font-semibold mb-4 text-white">
              Medical Leave Applications
            </h2>
            {leaveLoading ? (
              <p>Loading leave applications...</p>
            ) : leaveError ? (
              <p>{leaveError}</p>
            ) : leaveApplications.length > 0 ? (
              <table className="min-w-full bg-transparent border border-white/10 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b text-left">Sno.</th>
                    <th className="px-4 py-2 border-b text-left">Date</th>
                    <th className="px-4 py-2 border-b text-left">From Date</th>
                    <th className="px-4 py-2 border-b text-left">To Date</th>
                    <th className="px-4 py-2 border-b text-left">Diagnosis</th>
                    <th className="px-4 py-2 border-b text-left">Status</th>
                    <th className="px-4 py-2 border-b text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveApplications.map((leave, index) => (
                    <tr key={leave._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 border-b">{index + 1}</td>
                      <td className="px-4 py-2 border-b">{leave.date}</td>
                      <td className="px-4 py-2 border-b">{leave.fromDate}</td>
                      <td className="px-4 py-2 border-b">{leave.toDate}</td>
                      <td className="px-4 py-2 border-b">{leave.diagnosis}</td>
                      <td className="px-4 py-2 border-b">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${leave.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : leave.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                            }`}
                        >
                          {leave.status && typeof leave.status === "string"
                            ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1)
                            : "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-b border-white/10">
                        <button
                          onClick={() => setSelectedLeave(leave)}
                          className="text-primary hover:underline"
                        >
                          View Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No medical leave applications found.</p>
            )}

            {/* Modal for viewing selected leave details */}
            {selectedLeave && (
              <div className="glass-card p-6 mb-8 mt-4 border-l-4 border-primary">
                <h2 className="text-lg font-semibold mb-4 text-white">
                  Medical Leave Details
                </h2>
                <p>
                  <strong>Reason:</strong> {selectedLeave.reason}
                </p>
                <p>
                  <strong>Duration:</strong> {selectedLeave.fromDate} to {selectedLeave.toDate}
                </p>
                <p>
                  <strong>Diagnosis:</strong> {selectedLeave.diagnosis}
                </p>
                <p>
                  <strong>Doctor name:</strong> {selectedLeave.doctorName}
                </p>
                <p>
                  <strong>Status:</strong>
                  <span
                    className={`ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedLeave.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : selectedLeave.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                      }`}
                  >
                    {selectedLeave.status.charAt(0).toUpperCase() +
                      selectedLeave.status.slice(1)}
                  </span>
                </p>
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="mt-4 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 btn-animated"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="glass-card p-6 mb-8 animate-fade-in">
            <h2 className="text-lg font-semibold mb-4 text-white">
              My Appointments
            </h2>
            {appointmentsLoading ? (
              <p>Loading appointments...</p>
            ) : appointmentsError ? (
              <p>{appointmentsError}</p>
            ) : appointments.length > 0 ? (
              <table className="min-w-full bg-transparent border border-white/10 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b text-left">Doctor</th>
                    <th className="px-4 py-2 border-b text-left">Date & Time</th>
                    <th className="px-4 py-2 border-b text-left">Status</th>
                    <th className="px-4 py-2 border-b text-left">Prescription</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment._id || appointment.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 border-b border-white/10">
                        {appointment.doctorId?.name || "Not specified"}
                      </td>
                      <td className="px-4 py-2 border-b border-white/10">
                        {formatDate(appointment.slotDateTime)}
                      </td>
                      <td className="px-4 py-2 border-b border-white/10">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${appointment.status === "confirmed"
                            ? "bg-green-500/20 text-green-400"
                            : appointment.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : appointment.status === "cancelled"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                        >
                          {appointment.status || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-b border-white/10">
                        {appointment.prescription ? (
                          <a
                            href={appointment.prescription}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Prescription
                          </a>
                        ) : (
                          "No prescription"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No appointments found.</p>
            )}
          </div>
        )}

        {activeTab === "healthRecords" && (
          <>
            <div className="glass-card p-6 mb-8 animate-fade-in">
              <h2 className="text-lg font-semibold mb-4 text-white">
                Health Records
              </h2>
              {loading ? (
                <p>Loading...</p>
              ) : error ? (
                <p>{error}</p>
              ) : healthRecords.length > 0 ? (
                <table className="min-w-full bg-transparent border border-white/10 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border-b text-left">Sno.</th>
                      <th className="px-4 py-2 border-b text-left">Diagnosis</th>
                      <th className="px-4 py-2 border-b text-left">Date</th>
                      <th className="px-4 py-2 border-b text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthRecords.map((record, index) => (
                      <tr key={record.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 border-b">{index + 1}</td>
                        <td className="px-4 py-2 border-b">{record.diagnosis}</td>
                        <td className="px-4 py-2 border-b">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b border-white/10">
                          <button
                            onClick={() => viewHealthRecordDetails(record.id)}
                            className="text-primary hover:underline mr-4"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteHealthRecord(record.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No health records found.</p>
              )}
            </div>
            {/* Display Selected Health Record Details */}
            {selectedRecord && (
              <div className="glass-card p-6 mb-8 animate-fade-in border-l-4 border-primary">
                <h2 className="text-lg font-semibold mb-4 text-white">
                  Health Record Details
                </h2>
                <p>
                  <strong>Diagnosis:</strong> {selectedRecord.diagnosis}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(selectedRecord.date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Treatment:</strong> {selectedRecord.treatment || "N/A"}
                </p>
                <p>
                  <strong>Prescription:</strong>{" "}
                  {selectedRecord.prescription || "N/A"}
                </p>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="mt-4 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 btn-animated"
                >
                  Close
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "aiDiagnosis" && (
          <div className="glass-card p-6 mb-8 animate-fade-in">
            <h2 className="text-lg font-semibold mb-4 text-white">
              AI Diagnosis
            </h2>
            <p>This is where your AI Diagnosis content would go.</p>
          </div>
        )}

        {/* Modal for displaying search results */}
        {searchResults.length > 0 && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-white/10 w-96 shadow-lg rounded-md bg-surface">
              <h3 className="text-lg font-medium leading-6 text-white mb-2">
                Search Results
              </h3>
              {searchResults.map((record) => (
                <div key={record._id} className="mb-4 border-b pb-2">
                  <p>
                    <strong>Diagnosis:</strong> {record.diagnosis}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(record.date).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Treatment:</strong> {record.treatment || "N/A"}
                  </p>
                  <p>
                    <strong>Prescription:</strong>{" "}
                    {record.prescription || "N/A"}
                  </p>
                </div>
              ))}
              <button
                onClick={() => setSearchResults([])}
                className="mt-4 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 btn-animated"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
