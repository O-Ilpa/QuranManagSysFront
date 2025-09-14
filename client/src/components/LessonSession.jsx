// src/components/LessonSession.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

/**
 * LessonSession
 *
 * - Loads group + lesson (group endpoint returns students + lessons)
 * - Loads Quran surah metadata from AlQuran Cloud (surah names + numberOfAyahs)
 * - Shows students in a Swiper (one student per slide)
 * - nextRevision and lastRevision are structured { surah, fromAyah, toAyah }
 * - If legacy strings exist, we attempt to parse them
 * - Auto-suggests nextRevision based on lastRevision; now uses last.toAyah as new from (not +1)
 */

export default function LessonSession() {
  const { groupId, lessonId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [studentsList, setStudentsList] = useState([]); // each: { studentId, name, attended, notes, nextRevision:{...}, lastRevision:{...} }
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [quranList, setQuranList] = useState([]); // array from API: { number, name, englishName, numberOfAyahs, ... }
  const [surahMap, setSurahMap] = useState({}); // map name -> numberOfAyahs

  const token = localStorage.getItem("token");
  const BACKAPI =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_PRODUCTION_API
      : import.meta.env.VITE_DEVELOPMENT_API;

  // ---------- Helpers ----------

  function parseRevisionString(str) {
    if (!str || typeof str !== "string") return null;
    const numMatch = str.match(/(\d+)\s*[-–]\s*(\d+)/);
    const surahMatch = str.match(
      /(?:سورة\s*)?([\u0621-\u064A\u0660-\u0669\-\sءآأؤئ]+)/u
    );
    if (numMatch) {
      const fromAyah = Number(numMatch[1]);
      const toAyah = Number(numMatch[2]);
      const surah = surahMatch ? (surahMatch[1] || "").trim() : "";
      if (surah) return { surah, fromAyah, toAyah };
    }
    return null;
  }

  function formatRevision(rev) {
    if (!rev) return "";
    if (typeof rev === "string") {
      const parsed = parseRevisionString(rev);
      if (parsed) rev = parsed;
    }
    if (!rev || !rev.surah) return "";
    return `${rev.surah} ${rev.fromAyah}-${rev.toAyah}`;
  }

  function findSurahObjByName(nameOrNumber) {
    if (!nameOrNumber) return null;
    if (typeof nameOrNumber === "number") {
      return quranList.find((s) => s.number === nameOrNumber) || null;
    }
    let found = quranList.find((s) => s.name && s.name.includes(nameOrNumber));
    if (found) return found;
    found =
      quranList.find(
        (s) =>
          s.englishName &&
          typeof nameOrNumber === "string" &&
          s.englishName.toLowerCase() === nameOrNumber.toLowerCase()
      ) ||
      quranList.find(
        (s) =>
          s.englishNameTranslation &&
          typeof nameOrNumber === "string" &&
          s.englishNameTranslation.toLowerCase() === nameOrNumber.toLowerCase()
      );
    return found || null;
  }

  /**
   * Compute a next revision chunk based on currentRev.
   * If useOldToAsFrom === true -> newFrom = currentRev.toAyah (NOT +1)
   * Otherwise newFrom = currentRev.toAyah + 1 (legacy behaviour)
   */
  function computeNextRevisionChunk(currentRev, useOldToAsFrom = false) {
    if (!currentRev || !quranList.length) return null;
    const surahObj = findSurahObjByName(currentRev.surah) || null;
    if (!surahObj) return null;
    const maxAyah = surahObj.numberOfAyahs;
    const length = currentRev.toAyah - currentRev.fromAyah + 1;
    // NEW: allow using last.toAyah as new from (not +1)
    let newFrom = useOldToAsFrom ? currentRev.toAyah : currentRev.toAyah + 1;
    let newSurah = surahObj;

    // If the computed newFrom is greater than max, move to next surah
    if (newFrom > maxAyah) {
      const nextIndex =
        quranList.findIndex((s) => s.number === surahObj.number) + 1;
      if (nextIndex >= quranList.length) {
        // No next surah: cap to end of same surah
        return {
          surah: surahObj.name,
          fromAyah: Math.max(1, maxAyah - length + 1),
          toAyah: maxAyah,
        };
      }
      newSurah = quranList[nextIndex];
      newFrom = 1;
    }

    let newTo = newFrom + length - 1;
    if (newTo > newSurah.numberOfAyahs) {
      newTo = newSurah.numberOfAyahs;
    }

    return {
      surah: newSurah.name,
      fromAyah: newFrom,
      toAyah: newTo,
    };
  }

  function normalizeRevisionInput(input) {
    if (!input) return null;
    if (typeof input === "string") {
      const parsed = parseRevisionString(input);
      if (parsed) return parsed;
      return null;
    }
    if (typeof input === "object") {
      const surah = input.surah || input.sura || input.name || "";
      const fromAyah = input.fromAyah ?? input.from ?? input.start ?? null;
      const toAyah = input.toAyah ?? input.to ?? input.end ?? null;
      if (
        surah &&
        Number.isFinite(Number(fromAyah)) &&
        Number.isFinite(Number(toAyah))
      ) {
        return {
          surah: surah.toString(),
          fromAyah: Number(fromAyah),
          toAyah: Number(toAyah),
        };
      }
    }
    return null;
  }

  // ---------- Load data ----------

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError("");
      try {
        // fetch surah list
        try {
          const sres = await axios.get("https://api.alquran.cloud/v1/surah");
          const surahs = sres.data?.data || [];
          setQuranList(surahs);
          const map = {};
          surahs.forEach((s) => {
            if (s.name) map[s.name] = s.numberOfAyahs;
            if (s.englishName) map[s.englishName] = s.numberOfAyahs;
          });
          setSurahMap(map);
        } catch (err) {
          console.warn("Failed to fetch surahs, continuing without them", err);
          setQuranList([]);
          setSurahMap({});
        }

        // fetch group and lesson
        const res = await axios.get(`${BACKAPI}/api/groups/${groupId}`);
        const g = res.data.group;
        if (!g) throw new Error("Group not found");
        setGroup(g);

        const l = (g.lessons || []).find(
          (x) => (x._id ?? x.id)?.toString() === lessonId.toString()
        );
        if (!l) {
          setError("الدرس غير موجود.");
          setLoading(false);
          return;
        }
        setLesson(l);

        // map students
        const mapStudents = {};
        (g.students || []).forEach((s) => {
          if (!s) return;
          const sid = s._id ?? s.id;
          if (!sid) return;
          mapStudents[sid.toString()] = s;
        });

        // build UI list
        const list = (l.students || []).map((entry) => {
          const studentObj =
            entry.student && typeof entry.student === "object"
              ? entry.student
              : null;
          const sid =
            studentObj?._id?.toString() ||
            (typeof entry.student === "string" ? entry.student : "") ||
            "";

          const studentDoc = mapStudents[sid] || studentObj || null;

          // lastRevision (from student's history)
          let lastRevisionObj = null;
          if (studentDoc?.history?.length) {
            const last = studentDoc.history[studentDoc.history.length - 1];
            lastRevisionObj = normalizeRevisionInput(
              last?.nextRevision || last?.notes || last
            );
          }
          if (!lastRevisionObj && (entry.lastRevision || entry.notes)) {
            lastRevisionObj = normalizeRevisionInput(
              entry.lastRevision || entry.notes
            );
          }

          // prefer stored entry.nextRevision
          let nextRev = normalizeRevisionInput(entry.nextRevision) || null;

          // NEW: If no explicit nextRev but have lastRevision -> auto-select same surah
          if (!nextRev && lastRevisionObj) {
            // compute suggested starting at previous TO (old-to-as-new-from)
            const suggested = computeNextRevisionChunk(lastRevisionObj, true);
            nextRev = {
              surah: lastRevisionObj.surah || "",
              fromAyah: suggested ? suggested.fromAyah : "",
              toAyah: suggested ? suggested.toAyah : "",
              count: suggested ? suggested.toAyah - suggested.fromAyah + 1 : "",
            };
          }

          const notes = entry.notes || "";
          const attended =
            !!entry.attended ||
            (notes && notes.toString().trim() !== "") ||
            !!nextRev;

          return {
            studentId: sid,
            name: studentDoc?.name || "غير معروف",
            attended,
            notes: entry.notes || "",
            nextRevision: nextRev,
            lastRevision: lastRevisionObj,
          };
        });

        setStudentsList(list);
      } catch (err) {
        console.error(err);
        setError("فشل تحميل بيانات الدرس. تحقق من الخادم.");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, lessonId]);

  // ---------- Local helpers ----------

  function updateStudentLocal(idx, patch) {
    setStudentsList((prev) => {
      const copy = prev.slice();
      const item = { ...copy[idx], ...patch };

      const notesVal = (item.notes ?? "").toString().trim();
      const hasNextRev =
        item.nextRevision &&
        item.nextRevision.surah &&
        Number.isFinite(Number(item.nextRevision.fromAyah));
      item.attended = !!(notesVal || hasNextRev);

      copy[idx] = item;
      return copy;
    });
  }

  async function saveCurrentAndNext(moveNext = false) {
    const cur = studentsList[index];
    if (!cur) return;
    setSaving(true);
    setError("");
    try {
      let nextForSave = null;
      if (
        cur.nextRevision &&
        cur.nextRevision.surah &&
        Number.isFinite(Number(cur.nextRevision.fromAyah)) &&
        Number.isFinite(Number(cur.nextRevision.toAyah))
      ) {
        nextForSave = {
          surah: String(cur.nextRevision.surah).trim(),
          fromAyah: Number(cur.nextRevision.fromAyah),
          toAyah: Number(cur.nextRevision.toAyah),
          count:
            Number(cur.nextRevision.toAyah) -
            Number(cur.nextRevision.fromAyah) +
            1,
        };
      } else {
        nextForSave = null;
      }

      const payload = {
        attended: !!cur.attended,
        notes: cur.notes,
        nextRevision: nextForSave,
      };

      const res = await axios.put(
        `${BACKAPI}/api/groups/${groupId}/lessons/${lessonId}/students/${cur.studentId}`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const serverEntry = res.data?.studentEntry;
      if (serverEntry) {
        const normalized = {
          attended: !!serverEntry.attended,
          notes: serverEntry.notes || "",
          nextRevision:
            normalizeRevisionInput(serverEntry.nextRevision) || null,
        };
        updateStudentLocal(index, normalized);
      }

      if (moveNext) {
        if (index < studentsList.length - 1) setIndex((i) => i + 1);
      }
    } catch (err) {
      console.error(err);
      setError("فشل حفظ بيانات الطالب. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  async function finishLesson() {
    setSaving(true);
    setError("");
    try {
      const attendance = studentsList.map((s) => {
        let nextForSave = null;
        if (
          s.nextRevision &&
          s.nextRevision.surah &&
          Number.isFinite(Number(s.nextRevision.fromAyah)) &&
          Number.isFinite(Number(s.nextRevision.toAyah))
        ) {
          nextForSave = {
            surah: String(s.nextRevision.surah).trim(),
            fromAyah: Number(s.nextRevision.fromAyah),
            toAyah: Number(s.nextRevision.toAyah),
            count:
              Number(s.nextRevision.toAyah) -
              Number(s.nextRevision.fromAyah) +
              1,
          };
        } else {
          nextForSave = null;
        }

        return {
          studentId: s.studentId,
          attended: !!s.attended,
          notes: s.notes,
          nextRevision: nextForSave,
        };
      });

      await axios.post(
        `${BACKAPI}/api/groups/${groupId}/lessons/${lessonId}/end`,
        { attendance },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      navigate(`/groups/${groupId}`);
    } catch (err) {
      console.error(err);
      setError("فشل إنهاء الدرس. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  function surahLabel(s) {
    if (!s) return "";
    return `${s.number}. ${s.name} (${
      s.englishNameTranslation || s.englishName
    }) - ${s.numberOfAyahs} آيات`;
  }

  // ---------- Render ----------

  if (loading)
    return (
      <div className=" flex items-center ">
        <svg
          className="animate-spin relative left-[-40%] mt-[100%] h-20 w-20 text-emerald-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      </div>
    );
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!lesson) return <div className="p-4">درس غير موجود</div>;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-6"
    >
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-emerald-800">{group?.title}</h2>
          <div className="text-sm text-emerald-600">
            {new Date(lesson.date).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="px-3 py-1 rounded border bg-white"
          >
            رجوع
          </button>
          <button
            onClick={finishLesson}
            disabled={saving}
            className="px-3 py-1 rounded bg-emerald-600 text-white"
          >
            {saving ? "جارٍ إنهاء..." : "إنهاء"}
          </button>
        </div>
      </header>

      <Swiper
        spaceBetween={30}
        slidesPerView={1}
        onSlideChange={(swiper) => setIndex(swiper.activeIndex)}
      >
        {studentsList.map((student, idx) => (
          <SwiperSlide key={(student.studentId || "") + idx}>
            <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  {student?.name ?? "طالب"}
                </h3>
                <div>
                  {student?.attended ? (
                    <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800">
                      حضر
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      لم يحضر
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-emerald-500 mb-4">
                {student?.lastRevision
                  ? `آخر مراجعة: ${formatRevision(student.lastRevision)}`
                  : "لا توجد مراجعات سابقة"}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">ملاحظات</label>
                  <textarea
                    rows={3}
                    value={student?.notes || ""}
                    onChange={(e) =>
                      updateStudentLocal(idx, { notes: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">المراجعة القادمة</label>

                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={student?.nextRevision?.surah || ""}
                      onChange={(e) => {
                        const surahName = e.target.value || "";
                        const next = student?.nextRevision
                          ? { ...student.nextRevision }
                          : { surah: "", fromAyah: "", toAyah: "", count: "" };
                        next.surah = surahName;

                        const sObj = findSurahObjByName(surahName);
                        if (sObj) {
                          const max = sObj.numberOfAyahs;
                          if (next.toAyah && Number(next.toAyah) > max)
                            next.toAyah = max;
                          if (next.fromAyah && Number(next.fromAyah) > max)
                            next.fromAyah = max;
                        }

                        // recompute count if both from/to present
                        if (
                          Number.isFinite(Number(next.fromAyah)) &&
                          Number.isFinite(Number(next.toAyah))
                        ) {
                          next.count =
                            Number(next.toAyah) - Number(next.fromAyah) + 1;
                        } else {
                          next.count = next.count ?? "";
                        }

                        // validate
                        const sObj2 = findSurahObjByName(next.surah);
                        if (sObj2 && Number.isFinite(next.toAyah)) {
                          next._exceeds = next.toAyah > sObj2.numberOfAyahs;
                        } else {
                          delete next._exceeds;
                        }

                        updateStudentLocal(idx, { nextRevision: next });
                      }}
                      className="w-full border px-3 py-2 rounded"
                    >
                      <option value="">اختر السورة...</option>
                      {quranList.map((s) => (
                        <option key={s.number} value={s.name}>
                          {surahLabel(s)}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs mb-2 font-medium">
                          من آية
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={student?.nextRevision?.fromAyah ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const fromVal = raw === "" ? "" : Number(raw);
                            const next = student?.nextRevision
                              ? { ...student.nextRevision }
                              : {
                                  surah: "",
                                  fromAyah: "",
                                  toAyah: "",
                                  count: "",
                                };
                            next.fromAyah =
                              fromVal === "" ? "" : Number(fromVal);

                            // if count exists, recompute toAyah
                            if (
                              next.count !== "" &&
                              Number.isFinite(Number(next.count)) &&
                              next.fromAyah !== ""
                            ) {
                              next.toAyah =
                                Number(next.fromAyah) + Number(next.count) - 1;
                            } else if (
                              next.toAyah !== "" &&
                              next.fromAyah !== ""
                            ) {
                              // ensure toAyah >= fromAyah
                              next.toAyah = Math.max(
                                Number(next.toAyah),
                                Number(next.fromAyah)
                              );
                            }

                            if (
                              Number.isFinite(Number(next.fromAyah)) &&
                              Number.isFinite(Number(next.toAyah))
                            ) {
                              next.count =
                                Number(next.toAyah) - Number(next.fromAyah) + 1;
                            }

                            const sObj = findSurahObjByName(next.surah);
                            if (sObj && Number.isFinite(next.toAyah))
                              next._exceeds = next.toAyah > sObj.numberOfAyahs;
                            else delete next._exceeds;

                            updateStudentLocal(idx, { nextRevision: next });
                          }}
                          className="w-full border px-3 py-2 rounded"
                          placeholder="مثال: 1"
                        />
                      </div>

                      {/* Count Input (updates student's nextRevision) */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">
                          عدد الآيات
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={student?.nextRevision?.count ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const newCount = raw === "" ? "" : Number(raw);
                            const next = student?.nextRevision
                              ? { ...student.nextRevision }
                              : {
                                  surah: "",
                                  fromAyah: "",
                                  toAyah: "",
                                  count: "",
                                };
                            next.count =
                              newCount === "" ? "" : Number(newCount);

                            // ensure fromAyah exists (default to 1)
                            const from = Number(next.fromAyah) || 1;
                            if (
                              next.count !== "" &&
                              Number.isFinite(Number(next.count))
                            ) {
                              next.toAyah =
                                Number(from) + Number(next.count) - 1;
                            }

                            if (
                              Number.isFinite(Number(next.fromAyah)) &&
                              Number.isFinite(Number(next.toAyah))
                            ) {
                              next.count =
                                Number(next.toAyah) - Number(next.fromAyah) + 1;
                            }

                            const sObj = findSurahObjByName(next.surah);
                            if (sObj && Number.isFinite(next.toAyah))
                              next._exceeds = next.toAyah > sObj.numberOfAyahs;
                            else delete next._exceeds;

                            updateStudentLocal(idx, { nextRevision: next });
                          }}
                          className="w-full border px-3 py-2 rounded"
                        />
                      </div>

                      {/* To Ayah Input */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">
                          إلى الآية
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={student?.nextRevision?.toAyah ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const newTo = raw === "" ? "" : Number(raw);
                            const next = student?.nextRevision
                              ? { ...student.nextRevision }
                              : {
                                  surah: "",
                                  fromAyah: "",
                                  toAyah: "",
                                  count: "",
                                };
                            next.toAyah = newTo === "" ? "" : Number(newTo);

                            if (
                              Number.isFinite(Number(next.fromAyah)) &&
                              Number.isFinite(Number(next.toAyah))
                            ) {
                              next.count =
                                Number(next.toAyah) - Number(next.fromAyah) + 1;
                            }

                            const sObj = findSurahObjByName(next.surah);
                            if (sObj && Number.isFinite(next.toAyah))
                              next._exceeds = next.toAyah > sObj.numberOfAyahs;
                            else delete next._exceeds;

                            updateStudentLocal(idx, { nextRevision: next });
                          }}
                          className="w-full border px-3 py-2 rounded"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => {
                          if (student.lastRevision) {
                            const suggested = computeNextRevisionChunk(
                              student.lastRevision,
                              true
                            );
                            if (suggested) {
                              updateStudentLocal(idx, {
                                nextRevision: {
                                  ...suggested,
                                  count:
                                    suggested.toAyah - suggested.fromAyah + 1,
                                },
                              });
                            }
                          }
                        }}
                        type="button"
                        className="px-3 py-1 rounded border bg-white text-sm"
                      >
                        اقترح التالي تلقائياً
                      </button>
                      <div className="text-sm text-gray-500">
                        {student?.nextRevision
                          ? formatRevision(student.nextRevision)
                          : "لم يتم اختيار مراجعة"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => saveCurrentAndNext(false)}
                    disabled={saving}
                    className="px-3 py-1 rounded bg-emerald-600 text-white"
                  >
                    {saving ? "جارٍ الحفظ..." : "تم"}
                  </button>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="max-w-xl mx-auto mt-4 text-sm text-emerald-600 text-center">
        طالب {index + 1} من {studentsList.length}
      </div>
    </div>
  );
}
