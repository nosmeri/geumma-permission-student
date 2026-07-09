"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Location {
  id: string;
  name: string;
}

interface Applicant {
  id: string; // 학번 (4자리)
  name: string;
}

export default function Home() {
  const router = useRouter();

  // Form states
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [applicants, setApplicants] = useState<Applicant[]>([{ id: "", name: "" }]);

  // UI states
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
          if (data.length > 0) {
            setSelectedLocation(data[0].name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setLoadingLocations(false);
      }
    }
    fetchLocations();
  }, []);

  // Handle period toggle
  const togglePeriod = (period: string) => {
    if (selectedPeriods.includes(period)) {
      setSelectedPeriods(selectedPeriods.filter((p) => p !== period));
    } else {
      setSelectedPeriods([...selectedPeriods, period]);
    }
  };

  // Handle applicant change
  const handleApplicantChange = (index: number, field: keyof Applicant, value: string) => {
    const updated = [...applicants];
    updated[index][field] = value;
    setApplicants(updated);
  };

  // Add applicant row
  const addApplicantRow = () => {
    setApplicants([...applicants, { id: "", name: "" }]);
  };

  // Remove applicant row
  const removeApplicantRow = (index: number) => {
    if (applicants.length === 1) return;
    setApplicants(applicants.filter((_, i) => i !== index));
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Frontend validations
    if (selectedPeriods.length === 0) {
      setErrorMessage("교시를 선택해 주세요.");
      return;
    }
    if (!selectedLocation) {
      setErrorMessage("장소를 선택해 주세요.");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("사유를 입력해 주세요.");
      return;
    }

    // Check applicant rows
    const idRegex = /^\d{4}$/;
    for (let i = 0; i < applicants.length; i++) {
      const app = applicants[i];
      if (!app.id || !idRegex.test(app.id)) {
        setErrorMessage(`${i + 1}번째 신청자의 학번이 올바르지 않습니다. (4자리 숫자 입력, 예: 1101)`);
        return;
      }
      if (!app.name.trim()) {
        setErrorMessage(`${i + 1}번째 신청자의 이름을 입력해 주세요.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const response = await fetch("/api/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          periods: selectedPeriods,
          location: selectedLocation,
          reason,
          applicants,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.duplicates) {
          setErrorMessage(
            `신청 실패: 학번 [${result.duplicates.join(", ")}] 학생은 이미 해당 날짜에 허가원을 신청했습니다.`
          );
        } else {
          setErrorMessage(result.error || "허가원 신청에 실패했습니다.");
        }
        return;
      }

      // Success
      setSuccessMessage("허가원 신청이 성공적으로 완료되었습니다!");

      // Save ID to localStorage for status tracking
      const recentPermits = JSON.parse(localStorage.getItem("recent_permits") || "[]");
      recentPermits.push(result.id);
      localStorage.setItem("recent_permits", JSON.stringify(recentPermits));

      // Reset form
      setSelectedPeriods([]);
      setReason("");
      setApplicants([{ id: "", name: "" }]);

      // Navigate to status page after 1.5 seconds
      setTimeout(() => {
        router.push("/status");
      }, 1500);
    } catch (error) {
      console.error(error);
      setErrorMessage("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-teal-500 selection:text-black">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-72 bg-gradient-to-r from-violet-600/10 via-teal-500/10 to-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            금마 전자허가원
          </h1>
        </div>
        <button
          onClick={() => router.push("/status")}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
        >
          신청 내역 조회
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-8 z-10">
        {/* Banner */}
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">허가원 신청</h2>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 text-rose-300 text-sm leading-relaxed animate-in fade-in slide-in-from-top-4 duration-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-teal-500/20 bg-teal-950/20 text-teal-300 text-sm leading-relaxed animate-in fade-in slide-in-from-top-4 duration-300">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Periods Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              1. 교시 선택
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["야자 1교시", "야자 2교시"].map((period) => {
                const isSelected = selectedPeriods.includes(period);
                return (
                  <button
                    type="button"
                    key={period}
                    onClick={() => togglePeriod(period)}
                    className={`h-13 rounded-xl border font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${isSelected
                      ? "border-teal-500 bg-teal-500/5 text-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.08)]"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                  >
                    {period}
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-teal-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              2. 장소 선택
            </label>
            {loadingLocations ? (
              <div className="h-12 w-full rounded-xl bg-zinc-900/40 border border-zinc-800 animate-pulse flex items-center px-4">
                <span className="text-xs text-zinc-500">위치 정보 불러오는 중...</span>
              </div>
            ) : (
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-200 focus:outline-none focus:border-teal-500/80 transition-colors text-sm appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: "right 1rem center",
                  backgroundSize: "1.25rem",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {locations.length === 0 ? (
                  <option value="" disabled>위치가 등록되지 않았습니다.</option>
                ) : (
                  locations.map((loc) => (
                    <option key={loc.id} value={loc.name} className="bg-zinc-950">
                      {loc.name}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              3. 사유 입력
            </label>
            <textarea
              placeholder="예: 수행평가, 실험 등"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[80px] p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/80 transition-colors text-sm resize-none leading-relaxed"
            />
          </div>

          {/* Applicants Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                4. 신청자 목록
              </label>
              <button
                type="button"
                onClick={addApplicantRow}
                className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                추가
              </button>
            </div>

            <div className="space-y-2.5">
              {applicants.map((applicant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  <input
                    type="text"
                    pattern="\d*"
                    maxLength={4}
                    placeholder="학번 (예: 1101)"
                    value={applicant.id}
                    onChange={(e) => handleApplicantChange(index, "id", e.target.value)}
                    className="w-1/3 h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/80 transition-colors text-sm text-center font-mono"
                  />
                  <input
                    type="text"
                    placeholder="이름 (예: 홍길동)"
                    value={applicant.name}
                    onChange={(e) => handleApplicantChange(index, "name", e.target.value)}
                    className="flex-1 h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/80 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeApplicantRow(index)}
                    disabled={applicants.length === 1}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl border border-zinc-800 transition-colors cursor-pointer ${applicants.length === 1
                      ? "opacity-30 cursor-not-allowed bg-zinc-900/20 text-zinc-600"
                      : "bg-zinc-900/40 text-zinc-400 hover:border-rose-500/30 hover:text-rose-400"
                      }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 3.75A1.25 1.25 0 0 1 8.75 2.5h2.5A1.25 1.25 0 0 1 12.5 3.75v.404c-.833-.035-1.67-.054-2.5-.054s-1.667.019-2.5.054V3.75Zm5.624 2.017-1.127 12.395A1.25 1.25 0 0 1 12.403 17.5H7.597a1.25 1.25 0 0 1-1.246-1.138L5.224 5.767c1.72-.258 3.486-.39 5.276-.39s3.556.132 5.276.39Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-13 mt-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(20,184,166,0.15)] hover:shadow-[0_4px_25px_rgba(20,184,166,0.25)] transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              "허가원 신청하기"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
