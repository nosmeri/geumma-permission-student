"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Permit {
  id: string;
  date: string;
  periods: string[];
  location: string;
  reason: string;
  applicants: { id: string; name: string }[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  approver?: {
    name: string;
    subject: string;
  } | null;
  createdAt: string;
}

export default function StatusPage() {
  const router = useRouter();
  
  // Data states
  const [permits, setPermits] = useState<Permit[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Permit[] | null>(null);
  
  // UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent permits from localStorage
  useEffect(() => {
    async function fetchRecentPermits() {
      const recentIds = JSON.parse(localStorage.getItem("recent_permits") || "[]");
      if (recentIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/permits?ids=${recentIds.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          setPermits(data);
        } else {
          setError("최근 신청 내역을 불러오지 못했습니다.");
        }
      } catch (error) {
        console.error("Failed to fetch recent permits:", error);
        setError("서버 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchRecentPermits();
  }, []);

  // Handle search submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const res = await fetch(`/api/permits?query=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        setError("조회에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      setError("서버와의 연결에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const getStatusBadge = (status: Permit["status"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            승인 완료
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/40 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            반려됨
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            승인 대기
          </span>
        );
    }
  };

  const formatPermitDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const renderPermitCard = (permit: Permit) => {
    const applicantsList = Array.isArray(permit.applicants)
      ? permit.applicants.map((a) => `${a.id} ${a.name}`).join(", ")
      : "";

    return (
      <div
        key={permit.id}
        className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm space-y-4 hover:border-zinc-800 transition-all duration-300"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500">
              {formatPermitDate(permit.date)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">
                {permit.location}
              </span>
              <span className="text-xs text-zinc-600">|</span>
              <span className="text-xs font-medium text-zinc-400">
                {permit.periods.join(", ")}
              </span>
            </div>
          </div>
          <div>{getStatusBadge(permit.status)}</div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
            <span className="text-zinc-500 font-medium w-16 shrink-0">신청 학생</span>
            <span className="text-zinc-300 break-all">{applicantsList}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
            <span className="text-zinc-500 font-medium w-16 shrink-0">이동 사유</span>
            <span className="text-zinc-300">{permit.reason}</span>
          </div>

          {permit.status === "APPROVED" && permit.approver && (
            <div className="pt-2 mt-2 border-t border-zinc-900/60 flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span className="text-zinc-500 font-medium w-16 shrink-0">승인 교사</span>
              <span className="text-teal-400 font-medium">
                {permit.approver.name} 선생님 ({permit.approver.subject})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const displayedPermits = searchResults !== null ? searchResults : permits;
  const isSearchingState = searchResults !== null;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-teal-500 selection:text-black">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-72 bg-gradient-to-r from-blue-600/10 via-teal-500/5 to-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div
          onClick={() => router.push("/")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-zinc-400"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition-colors">
            신청 페이지로
          </span>
        </div>
        <h1 className="text-base font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          허가원 내역 및 상태
        </h1>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-8 z-10 space-y-6">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="학번 또는 이름으로 검색 (예: 1101)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-11 px-4 rounded-xl border border-zinc-900 bg-zinc-900/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/80 transition-colors text-sm"
          />
          <button
            type="submit"
            className="h-11 px-4 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors text-xs font-semibold cursor-pointer shrink-0"
          >
            {searching ? "검색 중" : "검색"}
          </button>
        </form>

        {/* Info header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {isSearchingState ? `검색 결과 (${displayedPermits.length})` : "최근 내역 (최대 30일)"}
          </h3>
          {isSearchingState && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              내역 초기화
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Status list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 w-full rounded-2xl bg-zinc-900/20 border border-zinc-900 animate-pulse"
              />
            ))}
          </div>
        ) : displayedPermits.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-zinc-700 mx-auto mb-3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
              />
            </svg>
            <p className="text-sm text-zinc-500 font-medium">신청 내역이 없습니다.</p>
            {!isSearchingState && (
              <button
                onClick={() => router.push("/")}
                className="text-xs text-teal-400 font-semibold mt-2 hover:underline cursor-pointer"
              >
                지금 허가원 신청하기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPermits.map((permit) => renderPermitCard(permit))}
          </div>
        )}
      </main>
    </div>
  );
}
