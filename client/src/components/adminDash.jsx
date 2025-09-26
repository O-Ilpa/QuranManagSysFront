import axios from "axios";
import React, { useState } from "react";
import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import StudentsPanel from "./StudentsPanel";
import GroupsPanel from "./GroupsPanel";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  let API;
  if (import.meta.env.MODE === "Production") {
    API = import.meta.env.VITE_PRODUCTION_API;
  } else {
    API = import.meta.env.VITE_LOCAL_API;
  }
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  });
  const decoded = jwtDecode(token);
  return (
    <>
      <header className="bg-white border-b border-emerald-300 py-4 px-6 shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold text-emerald-700">منصة الحلقات</h1>
        <nav className="flex gap-4">
          <Link to="/" className="text-sm text-emerald-600 underline">
            الرئيسية
          </Link>
          <Link to="/admin" className="text-sm text-emerald-600 underline">
            التحكم
          </Link>
        </nav>
      </header>
      <div
        className="min-h-screen bg-emerald-50 text-right flex flex-col md:flex-row"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap"
          rel="stylesheet"
        />

        <aside className="w-full md:w-64 bg-emerald-700 text-white p-4 flex md:flex-col flex-row md:items-end items-center gap-2 md:gap-4 shadow-lg">
          <h2 className="text-lg font-bold mb-2 md:mb-6 hidden md:block">
            منصة الحلقات
          </h2>

          <button
            className={`w-full py-2 px-4 rounded-full text-sm font-medium transition-colors text-center ${
              activeTab === "users"
                ? "bg-white text-emerald-700"
                : "hover:bg-emerald-600"
            }`}
            onClick={() => setActiveTab("users")}
          >
            المستخدمين
          </button>
          <button
            className={`w-full py-2 px-4 rounded-full text-sm font-medium transition-colors text-center ${
              activeTab === "groups"
                ? "bg-white text-emerald-700"
                : "hover:bg-emerald-600"
            }`}
            onClick={() => setActiveTab("groups")}
          >
            الحلقات
          </button>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1 p-4 md:p-6 space-y-6">
            <div className="text-center text-red-600">{decoded.name == "Visitor" ? "Unauthorized" : ""}</div>
            {activeTab === "users" && <StudentsPanel />}

            {activeTab === "groups" && <GroupsPanel />}
          </main>
        </div>
      </div>
    </>
  );
}
