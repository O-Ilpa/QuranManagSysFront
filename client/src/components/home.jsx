// Quran Lesson Management System UI (React + Tailwind + Arabic RTL)

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LogIn from "./login";
import { UserCircle } from "lucide-react";
import axios from "axios";


  const BACKAPI =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_PRODUCTION_API
      : import.meta.env.VITE_DEVELOPMENT_API;
  const token = localStorage.getItem("token");

function QuranLessonsHome() {
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  async function fetchGroups() {
    try {
      const res = await axios.get(`${BACKAPI}/api/groups`);
      const list = res.data?.groups ?? [];
      console.log(res)
      setGroups(list);
    } catch (err) {
      console.warn("Couldn't fetch groups:", err.message);
    }
  }

  useEffect(() => {
    fetchGroups()
    const mockGroups = [
      {
        _id: "1",
        name: "مجموعة الجمعة",
        time: "الجمعة - ٥ مساءً",
        attending: ["@ahmed", "@omar"],
      },
      {
        _id: "2",
        name: "مجموعة الأحد",
        time: "الأحد - ٤ مساءً",
        attending: ["@fatima"],
      },
    ];
    const mockUserGroups = ["1"];
    setGroups(mockGroups);
    setUserGroups(mockUserGroups);
  }, []);

  const openPortfolio = (groupId) => {
    if (!userGroups.includes(groupId)) return;
    const fakePortfolio = {
      nextRecitation: "سورة يس: آية ١ - ١٢",
      notes: "✦ مراجعة الآيات السابقة بإتقان ✦ إحضار المصحف للحلقة",
      lastUpdated: "٣ ذو الحجة ١٤٤٦هـ / ٢٠٢٥-٠٧-٠٣",
    };
    setPortfolio(fakePortfolio);
    setSelectedGroup(groupId);
  };

  const openUserPortfolio = () => {
    const defaultGroupId = userGroups[0];
    if (defaultGroupId) openPortfolio(defaultGroupId);
  };

  return (
    <>
      {/* Google Fonts Link */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap"
      />

      <div
        className="text-right min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-emerald-100"
        style={{ fontFamily: "'Cairo', sans-serif" }}
        dir="rtl"
      >
        {/* HEADER */}
        <header className="bg-white border-b border-emerald-300 py-4 px-6 shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-700">منصة الحلقات</h1>
          <span className="text-sm text-emerald-600">
            مرحبا بك، طالب العلم 🌙
          </span>
        </header>

        {/* MAIN CONTENT */}
        <main className="p-6 flex-1">
          <div className="text-center text-3xl text-emerald-800 font-bold mb-6">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <h2 className="text-4xl text-center font-extrabold text-emerald-800 mb-10 border-b border-emerald-400 inline-block pb-3">
            الحلقات القرآنية المباركة
          </h2>

          {/* GROUP LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.map((group) => (
              <div
                key={group._id}
                className="bg-white border border-emerald-200 shadow-lg rounded-xl p-6 transition-transform hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden"
              >
                <h3 className="text-2xl font-bold text-emerald-800 mb-2">
                  {group.name}
                </h3>
                <p className="text-emerald-700 mb-2">🕓 {group.time}</p>
                {userGroups.includes(group._id) && (
                  <span className="inline-block bg-emerald-100 text-emerald-800 px-4 py-1 rounded-full text-sm mb-3 font-semibold">
                    أنت في هذه الحلقة المباركة 🌿
                  </span>
                )}
                <div className="text-sm text-emerald-700 mb-4">
                  <strong>الحضور:</strong>
                  <ul className="list-disc list-inside pr-4">
                    {group.attending &&
                      group.attending.map((username, idx) => (
                        <li key={idx}>{username}</li>
                      ))}
                  </ul>
                </div>
                {userGroups.includes(group._id) && (
                  <button
                    className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md rounded-full py-2"
                    onClick={() => openPortfolio(group._id)}
                  >
                    عرض المراجعة الخاصة بك
                  </button>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* USER PROFILE BUTTON */}
        <button
          onClick={openUserPortfolio}
          className="fixed bottom-6 right-1/2 translate-x-1/2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-xl z-50"
          title="عرض ملفك الشخصي"
        >
          <UserCircle className="w-8 h-8" />
        </button>

        {/* PORTFOLIO SECTION */}
        {portfolio && (
          <div className="fixed inset-0 bg-[#0000004d] bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white border-2 border-emerald-300 rounded-lg p-6 w-full max-w-md text-right">
              <h3 className="text-emerald-800 text-2xl mb-4">
                مراجعتك الفردية
              </h3>
              <div className="space-y-3 text-emerald-800 text-lg">
                <p>
                  <strong>📖 الآيات القادمة:</strong> {portfolio.nextRecitation}
                </p>
                <p>
                  <strong>📝 الملاحظات:</strong> {portfolio.notes}
                </p>
                <p className="text-sm text-emerald-600">
                  📅 آخر تحديث: {portfolio.lastUpdated}
                </p>
              </div>
              <button
                className="mt-6 w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                onClick={() => setPortfolio(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="bg-white border-t border-emerald-300 text-emerald-700 py-4 text-center text-sm mt-auto">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ &copy;{" "}
          {new Date().getFullYear()} منصة الحلقات القرآنية
        </footer>
      </div>
    </>
  );
}

export default QuranLessonsHome;
