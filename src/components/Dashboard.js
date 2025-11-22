import React, { useState, useRef } from "react";
import Meyda from "meyda";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  // Sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // --- Hooks
  const [listening, setListening] = useState(false);
  const [chordText, setChordText] = useState("🎸 Waiting...");
  const [detectedChords, setDetectedChords] = useState([]);

  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const meydaAnalyzerRef = useRef(null);
  const startTimeRef = useRef(null);
  const stableCandidateRef = useRef(null);
  const lastAcceptedRef = useRef(null);
  const CHROMA_FRAMES_REF = useRef([]);

  // --- Constants
  const RMS_THRESHOLD = 0.005;
  const MAX_FRAMES = 15;
  const STABLE_REQUIRED = 3;
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const TRIADS = { major: [0, 4, 7], minor: [0, 3, 7] };

  const CHORD_TEMPLATES = [];
  (function buildTemplates() {
    for (let root = 0; root < 12; root++) {
      for (const quality of ["major", "minor"]) {
        const base = TRIADS[quality];
        const vec = new Array(12).fill(0);
        for (const interval of base) vec[(root + interval) % 12] = 1;
        const name = `${NOTE_NAMES[root]} ${quality === "major" ? "Major" : "Minor"}`;
        CHORD_TEMPLATES.push({ name, vec });
      }
    }
  })();

  function normalize(v) {
    const sumSq = v.reduce((s, x) => s + x * x, 0);
    if (sumSq === 0) return v.slice();
    const norm = Math.sqrt(sumSq);
    return v.map((x) => x / norm);
  }

  function cosine(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    const norma = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    const normb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
    if (norma === 0 || normb === 0) return 0;
    return dot / (norma * normb);
  }

  function averageChroma() {
    const frames = CHROMA_FRAMES_REF.current;
    if (frames.length === 0) return null;
    const avg = new Array(12).fill(0);
    for (const frame of frames) {
      for (let i = 0; i < 12; i++) avg[i] += frame[i];
    }
    for (let i = 0; i < 12; i++) avg[i] /= frames.length;
    return avg;
  }

  function detectChordFromAvgChroma(avgChroma) {
    if (!avgChroma) return null;
    const normChroma = normalize(avgChroma);
    let best = { name: null, score: 0 };
    for (const t of CHORD_TEMPLATES) {
      const tpl = normalize(t.vec);
      const score = cosine(normChroma, tpl);
      if (score > best.score) best = { name: t.name, score };
    }
    return best.score >= 0.45 ? best : null;
  }

  function getElapsedTime() {
    return ((audioContextRef.current.currentTime - startTimeRef.current) || 0).toFixed(1);
  }

  const toggleListening = async () => {
    if (!listening) {
      setListening(true);
      CHROMA_FRAMES_REF.current = [];
      stableCandidateRef.current = null;
      lastAcceptedRef.current = null;
      setChordText("🎧 Listening...");

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      startTimeRef.current = audioContextRef.current.currentTime;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

        meydaAnalyzerRef.current = Meyda.createMeydaAnalyzer({
          audioContext: audioContextRef.current,
          source: sourceRef.current,
          bufferSize: 4096,
          featureExtractors: ["chroma", "rms"],
          callback: (features) => {
            const { chroma, rms } = features;

            if (typeof rms === "number" && rms < RMS_THRESHOLD) {
              stableCandidateRef.current = null;
              return; // don't overwrite last chord
            }

            if (!chroma) return;

            CHROMA_FRAMES_REF.current.push(chroma.slice());
            if (CHROMA_FRAMES_REF.current.length > MAX_FRAMES)
              CHROMA_FRAMES_REF.current.shift();

            const avg = averageChroma();
            if (!avg) return;

            const best = detectChordFromAvgChroma(avg);
            const timestamp = getElapsedTime();

            if (best) {
              if (!stableCandidateRef.current || stableCandidateRef.current.name !== best.name) {
                stableCandidateRef.current = { name: best.name, score: best.score, count: 1 };
              } else {
                stableCandidateRef.current.count++;
                if (
                  stableCandidateRef.current.count >= STABLE_REQUIRED &&
                  (!lastAcceptedRef.current ||
                    lastAcceptedRef.current.name !== stableCandidateRef.current.name ||
                    timestamp - lastAcceptedRef.current.time > 1.5)
                ) {
                  setDetectedChords((p) => [...p, { chord: best.name, time: timestamp }]);
                  lastAcceptedRef.current = { name: best.name, time: timestamp };
                  setChordText(`🎸 ${best.name}`);
                } else {
                  setChordText(`🎸 ...${best.name}`);
                }
              }
            } else {
              stableCandidateRef.current = null;
              setChordText("🎧 Listening...");
            }
          },
        });

        meydaAnalyzerRef.current.start();
      } catch (err) {
        console.error("Microphone access denied:", err);
        setChordText("Microphone access required");
        setListening(false);
      }
    } else {
      setListening(false);
      setChordText("🎸 Stopped.");
      if (meydaAnalyzerRef.current) meydaAnalyzerRef.current.stop();
    }
  };

  const handleLogout = () => {
    toast.info("Logged out!");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">

      {/* SIDEBAR */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* MENU BUTTON → Hidden when sidebar open */}
      {!isSidebarOpen && (
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>☰</button>
      )}

      {/* LOGOUT */}
      <button className="logout-button" onClick={handleLogout}>Logout</button>

      <h2 style={{ marginTop: "0", paddingTop: "60px" }}>
        Welcome to the Chord Analyser!
      </h2>

      <h6>Use your microphone to detect chords in real-time.</h6>

      <div className="container" style={{ marginTop: "2rem" }}>
        <div className="circle">
          <button onClick={toggleListening}>
            {listening ? "Stop Listening" : "Start Listening"}
          </button>
        </div>

        <div id="chordDisplay" style={{ marginTop: "1rem", fontSize: "1.5rem", color: "#58a6ff" }}>
          {chordText}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
