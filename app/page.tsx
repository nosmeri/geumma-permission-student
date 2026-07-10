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
      // Format current date as YYYY-MM-DD in KST (UTC+9)
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(now.getTime() + kstOffset);
      const today = kstDate.toISOString().split("T")[0]; // YYYY-MM-DD
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
            `신청 실패: 학번 [${result.duplicates.join(", ")}] 학생은 이미 해당 교시에 허가원을 신청했습니다.`
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
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-900" />
          <h1 className="text-lg font-bold tracking-tight text-zinc-900">
            전북과학고 전자허가원
          </h1>
        </div>
        <button
          onClick={() => router.push("/status")}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border border-zinc-200 transition-all cursor-pointer"
        >
          신청 내역 조회
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-8 z-10">
        {/* Banner */}
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">허가원 신청</h2>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs leading-relaxed animate-in fade-in slide-in-from-top-4 duration-300 font-medium">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs leading-relaxed animate-in fade-in slide-in-from-top-4 duration-300 font-medium">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Periods Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
                    className={`h-11 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                      }`}
                  >
                    {period}
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-3.5 h-3.5 text-white"
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              2. 장소 선택
            </label>
            {loadingLocations ? (
              <div className="h-11 w-full rounded-xl bg-zinc-100 border border-zinc-200 animate-pulse flex items-center px-4">
                <span className="text-xs text-zinc-400">위치 정보 불러오는 중...</span>
              </div>
            ) : (
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:border-zinc-900 transition-colors text-xs appearance-none cursor-pointer"
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
                    <option key={loc.id} value={loc.name} className="bg-white">
                      {loc.name}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              3. 사유 입력
            </label>
            <textarea
              placeholder="예: 수행평가, 실험 등"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[80px] p-4 rounded-xl border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors text-xs resize-none leading-relaxed"
            />
          </div>

          {/* Applicants Management */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                4. 신청자 목록
              </label>
              <button
                type="button"
                onClick={addApplicantRow}
                className="text-xs font-bold text-zinc-800 hover:text-black flex items-center gap-1 transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                추가
              </button>
            </div>

            <div className="space-y-2">
              {applicants.map((applicant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  <input
                    type="text"
                    pattern="\d*"
                    maxLength={4}
                    placeholder="학번 (예: 1101)"
                    value={applicant.id}
                    onChange={(e) => handleApplicantChange(index, "id", e.target.value)}
                    className="w-1/3 h-11 px-3 rounded-xl border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors text-xs text-center font-mono"
                  />
                  <input
                    type="text"
                    placeholder="이름 (예: 홍길동)"
                    value={applicant.name}
                    onChange={(e) => handleApplicantChange(index, "name", e.target.value)}
                    className="flex-1 h-11 px-3 rounded-xl border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeApplicantRow(index)}
                    disabled={applicants.length === 1}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl border border-zinc-200 transition-colors cursor-pointer ${applicants.length === 1
                      ? "opacity-30 cursor-not-allowed bg-zinc-50 text-zinc-300"
                      : "bg-zinc-50 text-zinc-500 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/20"
                      }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
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
            className="w-full h-12 mt-4 rounded-xl font-semibold text-xs bg-zinc-900 hover:bg-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "허가원 신청하기"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
