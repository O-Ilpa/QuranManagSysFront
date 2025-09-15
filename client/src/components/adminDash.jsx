import axios from "axios";
import React, { useState } from "react";
import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import StudentsPanel from "./StudentsPanel";
import GroupsPanel from "./GroupsPanel";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const navigate = useNavigate()
  const token = localStorage.getItem("token")
  
  let API;
  if (import.meta.env.MODE === "Production") {
    API = import.meta.env.VITE_PRODUCTION_API;
  } else {
    API = import.meta.env.VITE_LOCAL_API;
  }
  useEffect(() => {
    if (!token) {
    navigate("/login")
  }
  })

  return (
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
        <header className="bg-white shadow px-4 md:px-6 py-4 flex justify-between items-center border-b border-emerald-200">
          <h1 className="text-lg md:text-xl font-bold text-emerald-700">
            لوحة تحكم المسؤول
          </h1>
          <span className="text-xs md:text-sm text-emerald-600">
            مرحباً بك، مسؤول النظام 👨‍💼
          </span>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          {activeTab === "users" && <StudentsPanel/>}

          {activeTab === "groups" && <GroupsPanel/>}
        </main>

        <footer className="bg-white text-center text-xs text-emerald-500 py-4 border-t border-emerald-200 mt-auto">
          &copy; {new Date().getFullYear()} منصة الحلقات | تصميم عمر
        </footer>
      </div>
    </div>
  );
}
