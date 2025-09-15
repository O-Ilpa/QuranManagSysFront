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
  const [studentsList, setStudentsList] = useState([]); // each: { studentId, name, attended, notes, nextRevision:[{...}], lastRevision:{...} }
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestedRevisionIndex, setSuggestedRevisionIndex] = useState({});

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
  useEffect(() => {
    if (!token) {
    navigate("/login")
  }
  })
  function formatRevision(rev) {
    if (!rev) return "";

    // Handle string input (parse to object/array)
    if (typeof rev === "string") {
      const parsed = parseRevisionString(rev);
      if (parsed) rev = parsed;
    }

    // If rev is an array, format each revision and join them
    if (Array.isArray(rev)) {
      const formattedRevisions = rev
        .filter((r) => r && r.surah && r.fromAyah && r.toAyah)
        .map((r) => `${r.surah} ${r.fromAyah}-${r.toAyah}`);
      return formattedRevisions.length > 0 ? formattedRevisions.join(", ") : "";
    }

    // Handle single revision object
    if (!rev || !rev.surah || !rev.fromAyah || !rev.toAyah) return "";
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
    if (!input) return [];
    if (typeof input === "string") {
      const parsed = parseRevisionString(input);
      return parsed ? [parsed] : [];
    }
    if (typeof input === "object") {
      if (
        Array.isArray(input.surah) &&
        Array.isArray(input.fromAyah) &&
        Array.isArray(input.toAyah) &&
        Array.isArray(input.count)
      ) {
        const len = input.surah.length;
        if (
          input.fromAyah.length === len &&
          input.toAyah.length === len &&
          input.count.length === len
        ) {
          return input.surah.map((surah, i) => ({
            surah,
            fromAyah: Number(input.fromAyah[i]),
            toAyah: Number(input.toAyah[i]),
            count: Number(input.count[i]),
          }));
        }
        return [];
      } else {
        // single
        const surah = input.surah || input.sura || input.name || "";
        const fromAyah = input.fromAyah ?? input.from ?? input.start ?? null;
        const toAyah = input.toAyah ?? input.to ?? input.end ?? null;
        const count = input.count ?? toAyah - fromAyah + 1 ?? null;
        if (
          surah &&
          Number.isFinite(Number(fromAyah)) &&
          Number.isFinite(Number(toAyah))
        ) {
          return [
            {
              surah: surah.toString(),
              fromAyah: Number(fromAyah),
              toAyah: Number(toAyah),
              count: Number(count),
            },
          ];
        }
      }
    }
    return [];
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
            ) || null;
          }
          if (!lastRevisionObj && (entry.lastRevision || entry.notes)) {
            lastRevisionObj =
              normalizeRevisionInput(entry.lastRevision || entry.notes) || null;
          }

          // prefer stored entry.nextRevision
          let nextRev = normalizeRevisionInput(entry.nextRevision);

          const notes = entry.notes || "";
          const attended =
            !!entry.attended ||
            (notes && notes.toString().trim() !== "") ||
            !!nextRev.length;

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
      const hasNextRev = item.nextRevision.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      item.attended = !!(notesVal || hasNextRev);

      copy[idx] = item;
      return copy;
    });
  }

  function addNewRevision(studentIdx) {
    setStudentsList((prev) => {
      const copy = [...prev];
      const student = { ...copy[studentIdx] };
      student.nextRevision = [
        ...student.nextRevision,
        { surah: "", fromAyah: "", toAyah: "", count: "" },
      ];
      const notesVal = (student.notes ?? "").toString().trim();
      const hasNextRev = student.nextRevision.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      student.attended = !!(notesVal || hasNextRev);
      copy[studentIdx] = student;
      return copy;
    });
  }

  function removeRevision(studentIdx, revIdx) {
    setStudentsList((prev) => {
      const copy = [...prev];
      const student = { ...copy[studentIdx] };
      const nextRevs = [...student.nextRevision];
      nextRevs.splice(revIdx, 1);
      student.nextRevision = nextRevs;
      const notesVal = (student.notes ?? "").toString().trim();
      const hasNextRev = student.nextRevision.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      student.attended = !!(notesVal || hasNextRev);
      copy[studentIdx] = student;
      return copy;
    });
  }

  function handleSurahChange(studentIdx, revIdx, e) {
    const surahName = e.target.value || "";
    setStudentsList((prev) => {
      const copy = [...prev];
      const student = { ...copy[studentIdx] };
      const nextRevs = [...student.nextRevision];
      const rev = { ...nextRevs[revIdx] };
      rev.surah = surahName;
      const sObj = findSurahObjByName(surahName);
      if (sObj) {
        const max = sObj.numberOfAyahs;
        if (rev.toAyah && Number(rev.toAyah) > max) rev.toAyah = max;
        if (rev.fromAyah && Number(rev.fromAyah) > max) rev.fromAyah = max;
      }
      if (
        Number.isFinite(Number(rev.fromAyah)) &&
        Number.isFinite(Number(rev.toAyah))
      ) {
        rev.count = Number(rev.toAyah) - Number(rev.fromAyah) + 1;
      } else {
        rev.count = rev.count ?? "";
      }
      if (sObj && Number.isFinite(rev.toAyah)) {
        rev._exceeds = Number(rev.toAyah) > sObj.numberOfAyahs;
      } else {
        delete rev._exceeds;
      }
      nextRevs[revIdx] = rev;
      student.nextRevision = nextRevs;
      const notesVal = (student.notes ?? "").toString().trim();
      const hasNextRev = nextRevs.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      student.attended = !!(notesVal || hasNextRev);
      copy[studentIdx] = student;
      return copy;
    });
  }

  function handleFromChange(studentIdx, revIdx, e) {
    const raw = e.target.value;
    const fromVal = raw === "" ? "" : Number(raw);
    setStudentsList((prev) => {
      const copy = [...prev];
      const student = { ...copy[studentIdx] };
      const nextRevs = [...student.nextRevision];
      const rev = { ...nextRevs[revIdx] };
      rev.fromAyah = fromVal === "" ? "" : Number(fromVal);
      if (
        rev.count !== "" &&
        Number.isFinite(Number(rev.count)) &&
        rev.fromAyah !== ""
      ) {
        rev.toAyah = Number(rev.fromAyah) + Number(rev.count) - 1;
      } else if (rev.toAyah !== "" && rev.fromAyah !== "") {
        rev.toAyah = Math.max(Number(rev.toAyah), Number(rev.fromAyah));
      }
      if (
        Number.isFinite(Number(rev.fromAyah)) &&
        Number.isFinite(Number(rev.toAyah))
      ) {
        rev.count = Number(rev.toAyah) - Number(rev.fromAyah) + 1;
      }
      const sObj = findSurahObjByName(rev.surah);
      if (sObj && Number.isFinite(rev.toAyah)) {
        rev._exceeds = Number(rev.toAyah) > sObj.numberOfAyahs;
      } else {
        delete rev._exceeds;
      }
      nextRevs[revIdx] = rev;
      student.nextRevision = nextRevs;
      const notesVal = (student.notes ?? "").toString().trim();
      const hasNextRev = nextRevs.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      student.attended = !!(notesVal || hasNextRev);
      copy[studentIdx] = student;
      return copy;
    });
  }

  function handleCountChange(studentIdx, revIdx, e) {
    const raw = e.target.value;
    const newCount = raw === "" ? "" : Number(raw);
    setStudentsList((prev) => {
      const copy = [...prev];
      const student = { ...copy[studentIdx] };
      const nextRevs = [...student.nextRevision];
      const rev = { ...nextRevs[revIdx] };
      rev.count = newCount === "" ? "" : Number(newCount);
      const from = Number(rev.fromAyah) || 1;
      if (rev.count !== "" && Number.isFinite(Number(rev.count))) {
        rev.toAyah = from + Number(rev.count) - 1;
      }
      if (
        Number.isFinite(Number(rev.fromAyah)) &&
        Number.isFinite(Number(rev.toAyah))
      ) {
        rev.count = Number(rev.toAyah) - Number(rev.fromAyah) + 1;
      }
      const sObj = findSurahObjByName(rev.surah);
      if (sObj && Number.isFinite(rev.toAyah)) {
        rev._exceeds = Number(rev.toAyah) > sObj.numberOfAyahs;
      } else {
        delete rev._exceeds;
      }
      nextRevs[revIdx] = rev;
      student.nextRevision = nextRevs;
      const notesVal = (student.notes ?? "").toString().trim();
      const hasNextRev = nextRevs.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      student.attended = !!(notesVal || hasNextRev);
      copy[studentIdx] = student;
      return copy;
    });
  }

  function handleToChange(studentIdx, revIdx, e) {
    const raw = e.target.value;
    const newTo = raw === "" ? "" : Number(raw);
    setStudentsList((prev) => {
      const copy = [...prev];
      const student = { ...copy[studentIdx] };
      const nextRevs = [...student.nextRevision];
      const rev = { ...nextRevs[revIdx] };
      rev.toAyah = newTo === "" ? "" : Number(newTo);
      if (
        Number.isFinite(Number(rev.fromAyah)) &&
        Number.isFinite(Number(rev.toAyah))
      ) {
        rev.count = Number(rev.toAyah) - Number(rev.fromAyah) + 1;
      }
      const sObj = findSurahObjByName(rev.surah);
      if (sObj && Number.isFinite(rev.toAyah)) {
        rev._exceeds = Number(rev.toAyah) > sObj.numberOfAyahs;
      } else {
        delete rev._exceeds;
      }
      nextRevs[revIdx] = rev;
      student.nextRevision = nextRevs;
      const notesVal = (student.notes ?? "").toString().trim();
      const hasNextRev = nextRevs.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      student.attended = !!(notesVal || hasNextRev);
      copy[studentIdx] = student;
      return copy;
    });
  }

  function suggestNext(studentIdx) {
    setStudentsList((prev) => {
      const copy = [...prev];
      const student = { ...copy[studentIdx] };
      const lastRevs = Array.isArray(student.lastRevision)
        ? student.lastRevision
        : [];
      const nextRevs = student.nextRevision;

      // Get the current suggestion index for this student, default to 0
      const suggestIndex = suggestedRevisionIndex[studentIdx] || 0;

      // If no last revisions exist or all have been suggested, do nothing
      if (lastRevs.length === 0 || suggestIndex >= lastRevs.length) return prev;

      // Use the suggestIndex to pick the next revision from lastRevision
      const baseRev = lastRevs[suggestIndex];
      if (!baseRev) return prev;

      // Compute the suggested revision
      const suggested = computeNextRevisionChunk(baseRev, true);
      if (!suggested) return prev;

      const newRev = {
        surah: suggested.surah,
        fromAyah: suggested.fromAyah,
        toAyah: suggested.toAyah,
        count: suggested.toAyah - suggested.fromAyah + 1,
      };

      // If no next revisions exist, add to the first form; otherwise, add a new form
      if (nextRevs.length === 0) {
        student.nextRevision = [newRev];
      } else {
        student.nextRevision = [...nextRevs, newRev];
      }

      // Update attendance status
      const notesVal = (student.notes ?? "").toString().trim();
      const hasNextRev = student.nextRevision.some(
        (r) => r.surah && Number.isFinite(Number(r.fromAyah))
      );
      student.attended = !!(notesVal || hasNextRev);
      copy[studentIdx] = student;

      // Increment the suggested revision index for this student
      setSuggestedRevisionIndex((prev) => ({
        ...prev,
        [studentIdx]: suggestIndex + 1,
      }));

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
      if (cur.nextRevision.length) {
        nextForSave = {
          surah: [],
          fromAyah: [],
          toAyah: [],
          count: [],
        };
        cur.nextRevision.forEach((r) => {
          if (
            r.surah &&
            Number.isFinite(Number(r.fromAyah)) &&
            Number.isFinite(Number(r.toAyah)) &&
            Number.isFinite(Number(r.count))
          ) {
            nextForSave.surah.push(String(r.surah).trim());
            nextForSave.fromAyah.push(Number(r.fromAyah));
            nextForSave.toAyah.push(Number(r.toAyah));
            nextForSave.count.push(Number(r.count));
          }
        });
        if (!nextForSave.surah.length) nextForSave = null;
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
          nextRevision: normalizeRevisionInput(serverEntry.nextRevision),
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
        if (s.nextRevision.length) {
          nextForSave = {
            surah: [],
            fromAyah: [],
            toAyah: [],
            count: [],
          };
          s.nextRevision.forEach((r) => {
            if (
              r.surah &&
              Number.isFinite(Number(r.fromAyah)) &&
              Number.isFinite(Number(r.toAyah)) &&
              Number.isFinite(Number(r.count))
            ) {
              nextForSave.surah.push(String(r.surah).trim());
              nextForSave.fromAyah.push(Number(r.fromAyah));
              nextForSave.toAyah.push(Number(r.toAyah));
              nextForSave.count.push(Number(r.count));
            }
          });
          if (!nextForSave.surah.length) nextForSave = null;
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
    <div className="flex justify-center items-center min-h-screen bg-emerald-50">
      <svg
        className="animate-spin h-16 w-16 text-emerald-600"
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

                  {student.nextRevision.map((rev, revIdx) => (
                    <div key={revIdx} className="border p-2 rounded mb-2">
                      <div className="grid grid-cols-1 gap-2">
                        <select
                          value={rev.surah || ""}
                          onChange={(e) => handleSurahChange(idx, revIdx, e)}
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
                              value={rev.fromAyah ?? ""}
                              onChange={(e) => handleFromChange(idx, revIdx, e)}
                              className="w-full border px-3 py-2 rounded"
                              placeholder="مثال: 1"
                            />
                          </div>

                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">
                              عدد الآيات
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={rev.count ?? ""}
                              onChange={(e) =>
                                handleCountChange(idx, revIdx, e)
                              }
                              className="w-full border px-3 py-2 rounded"
                            />
                          </div>

                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">
                              إلى الآية
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={rev.toAyah ?? ""}
                              onChange={(e) => handleToChange(idx, revIdx, e)}
                              className="w-full border px-3 py-2 rounded"
                            />
                          </div>
                        </div>
                      </div>
                      {rev._exceeds && (
                        <p className="text-red-500 text-sm mt-1">
                          تجاوز عدد الآيات في السورة
                        </p>
                      )}
                      {student.nextRevision.length > 1 && (
                        <button
                          onClick={() => removeRevision(idx, revIdx)}
                          className="mt-2 px-3 py-1 rounded border bg-red-100 text-red-600 text-sm"
                        >
                          إزالة هذه المراجعة
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 items-center mt-2">
                    {Array.isArray(studentsList[index]?.lastRevision) &&
                      studentsList[index].lastRevision.length > 0 &&
                      (suggestedRevisionIndex[index] || 0) <
                        studentsList[index].lastRevision.length && (
                        <button
                          onClick={() => suggestNext(index)}
                          type="button"
                          className="px-3 py-1 rounded border bg-white text-sm"
                        >
                          اقترح 
                        </button>
                      )}
                    <button
                      onClick={() => addNewRevision(index)}
                      type="button"
                      className="px-3 py-1 rounded border bg-white text-sm"
                    >
                      إضافة 
                    </button>
                    <div className="text-sm text-gray-500">
                      {studentsList[index].nextRevision.length
                        ? studentsList[index].nextRevision
                            .map(formatRevision)
                            .join("، ")
                        : "لم يتم اختيار مراجعة"}
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