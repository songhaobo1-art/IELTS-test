"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, LayoutDashboard, RotateCcw, Volume2, XCircle } from "lucide-react";

type Skill = "reading" | "listening";
type Attempt = { questionId: string; skill: Skill; answer: string; isCorrect: boolean; completedAt: string };
type Question = { id: string; skill: Skill; title: string; passage: string; prompt: string; options: string[]; answer: string; explanation: string; focus: string };
type WordStatus = "new" | "learning" | "mastered";
type Word = { word: string; meaning: string; example: string; status: WordStatus };

const questions: Question[] = [
  { id: "r-01", skill: "reading", title: "Reading · Paragraph matching", focus: "同义替换", passage: "Urban trees do more than make a city attractive. Their shade can reduce the temperature of nearby streets, while their roots help rainwater enter the soil rather than overwhelm drains. Researchers also report that people who can see green space from their homes often describe lower levels of everyday stress.", prompt: "Which benefit is specifically connected with heavy rain?", options: ["Making streets cooler", "Improving city appearance", "Helping water enter the ground", "Reducing stress"], answer: "Helping water enter the ground", explanation: "文中 roots help rainwater enter the soil，直接对应 heavy rain 后的排水问题。" },
  { id: "r-02", skill: "reading", title: "Reading · True / False / Not Given", focus: "定位细节", passage: "A small museum in Northbridge recently extended its opening hours on Fridays. The change followed a survey of local residents, many of whom said they could not visit during the working week. The museum will review visitor numbers after three months before deciding whether to extend the change to other days.", prompt: "The museum has decided to stay open later every day.", options: ["True", "False", "Not Given"], answer: "False", explanation: "只提到 Fridays，且其他日期是否延长仍要三个月后再决定。" },
  { id: "l-01", skill: "listening", title: "Listening · Form completion", focus: "关键信息", passage: "You will hear a short message about a photography course. Listen once, then choose the correct answer.", prompt: "The first class will be held on:", options: ["Tuesday evening", "Wednesday morning", "Thursday evening", "Saturday morning"], answer: "Thursday evening", explanation: "音频中说：The first session is on Thursday evening, not Tuesday as originally planned。" },
  { id: "l-02", skill: "listening", title: "Listening · Multiple choice", focus: "干扰信息", passage: "You will hear a student talking to a librarian about study rooms.", prompt: "Why does the student choose Room B?", options: ["It is the cheapest", "It has a whiteboard", "It is near the entrance", "It can be booked online"], answer: "It has a whiteboard", explanation: "学生先提到线上预约与价钱，但最后明确选择 Room B because it has a whiteboard。" },
];

const starterWords: Omit<Word, "status">[] = [
  { word: "overwhelm", meaning: "使不堪重负；压垮", example: "Heavy rain can overwhelm city drains." },
  { word: "residents", meaning: "居民", example: "Local residents answered the survey." },
  { word: "extended", meaning: "延长的；扩展", example: "The museum extended its opening hours." },
  { word: "originally", meaning: "起初；原本", example: "Tuesday was originally planned." },
  { word: "session", meaning: "一节课；一次活动", example: "The first session starts at 6 pm." },
];

function getLearnerId() {
  const key = "ielts-journal-learner";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `learner_${crypto.randomUUID().replaceAll("-", "")}`;
  localStorage.setItem(key, created);
  return created;
}

export default function Home() {
  const [view, setView] = useState<"home" | "practice" | "review">("home");
  const [skill, setSkill] = useState<Skill>("reading");
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [wordRecords, setWordRecords] = useState<Word[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [saveState, setSaveState] = useState("正在连接学习记录…");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const id = getLearnerId(); setLearnerId(id);
    Promise.all([fetch(`/api/progress?learnerId=${id}`), fetch(`/api/vocabulary?learnerId=${id}`)]).then(async ([progress, vocabulary]) => {
      if (!progress.ok || !vocabulary.ok) throw new Error();
      const [progressData, vocabularyData] = await Promise.all([progress.json(), vocabulary.json()]);
      setAttempts(progressData.attempts ?? []); setWordRecords(vocabularyData.words ?? []); setSaveState("进度已安全保存");
    }).catch(() => setSaveState("暂时离线：作答后会提示重试"));
  }, []);

  const filtered = useMemo(() => questions.filter(q => q.skill === skill), [skill]);
  const question = filtered[Math.min(index, filtered.length - 1)];
  const attemptByQuestion = useMemo(() => new Map(attempts.map(a => [a.questionId, a])), [attempts]);
  const completed = attempts.length;
  const correct = attempts.filter(a => a.isCorrect).length;
  const mistakes = attempts.filter(a => !a.isCorrect);
  const skillMistakes = (next: Skill) => mistakes.filter(a => a.skill === next).length;
  const vocab = starterWords.map(word => ({ ...word, status: wordRecords.find(item => item.word === word.word)?.status ?? "new" as WordStatus }));

  function switchSkill(next: Skill) { setSkill(next); setIndex(0); setView("practice"); }
  async function answer(option: string) {
    if (!learnerId || attemptByQuestion.has(question.id)) return;
    const newAttempt: Attempt = { questionId: question.id, skill: question.skill, answer: option, isCorrect: option === question.answer, completedAt: new Date().toISOString() };
    setAttempts(old => [newAttempt, ...old]); setSaveState("正在保存…");
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ learnerId, ...newAttempt }) });
      if (!response.ok) throw new Error();
      setSaveState("已保存 · 现在可放心退出");
    } catch { setAttempts(old => old.filter(a => a.questionId !== question.id)); setSaveState("保存失败，请保持页面并重试"); }
  }
  function playAudio() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance("The first session is on Thursday evening, not Tuesday as originally planned. Please bring a notebook and one printed photograph.");
    utterance.lang = "en-GB"; utterance.rate = 0.85; utterance.onend = () => setPlaying(false); setPlaying(true); window.speechSynthesis.speak(utterance);
  }
  async function setWordStatus(word: Omit<Word, "status">, status: WordStatus) {
    if (!learnerId) return;
    const next = { ...word, status };
    setWordRecords(records => [...records.filter(item => item.word !== word.word), next]);
    const response = await fetch("/api/vocabulary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ learnerId, ...next }) });
    if (!response.ok) setSaveState("生词状态暂未保存，请稍后重试"); else setSaveState("生词记忆进度已保存");
  }

  return <main className="min-h-screen bg-[#f5f6f2] text-[#17333d]">
    <header className="sticky top-0 z-10 border-b border-[#dbe2dc] bg-[#f5f6f2]/95 px-4 py-3 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between">
      <button onClick={() => setView("home")} className="flex items-center gap-2 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#163947] font-bold text-[#f8d577]">I</span><span><b className="block text-sm">雅思冲刺</b><small className="text-xs text-[#587079]">IELTS Practice Journal</small></span></button>
      <div className="hidden items-center gap-2 text-sm text-[#587079] sm:flex"><CheckCircle2 size={16} className="text-[#2f8176]" />{saveState}</div>
    </div></header>
    <div className="mx-auto grid max-w-6xl gap-5 p-4 pb-12 sm:p-8 lg:grid-cols-[190px_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="主要导航">
        <NavButton active={view === "home"} onClick={() => setView("home")} icon={<LayoutDashboard size={18}/>} label="学习主页"/>
        <NavButton active={view === "practice"} onClick={() => setView("practice")} icon={<BookOpen size={18}/>} label="开始练习"/>
        <NavButton active={view === "review"} onClick={() => setView("review")} icon={<RotateCcw size={18}/>} label={`错题回顾 ${mistakes.length ? `(${mistakes.length})` : ""}`}/>
      </nav>
      {view === "home" && <section className="space-y-6"><div className="rounded-3xl bg-[#163947] p-6 text-white shadow-lg sm:p-8"><p className="text-sm text-[#bcd4cb]">今天，专注一小步</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">下一道题已经准备好了。</h1><p className="mt-3 max-w-xl text-[#d4e5dd]">练习会在每次作答后自动保存。关闭网页或加到手机桌面后，下次仍可继续。</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => switchSkill("reading")} className="rounded-xl bg-[#f8d577] px-4 py-3 font-semibold text-[#163947]">练习阅读</button><button onClick={() => switchSkill("listening")} className="rounded-xl border border-[#70909a] px-4 py-3 font-semibold">练习听力</button></div></div>
        <div className="grid gap-4 sm:grid-cols-3"><Stat label="已完成" value={`${completed} 题`} note="所有练习记录"/><Stat label="正确率" value={completed ? `${Math.round(correct / completed * 100)}%` : "—"} note="持续积累中"/><Stat label="待回顾" value={`${mistakes.length} 题`} note="做错并不可怕"/></div>
        <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-[#dbe2dc] bg-white p-5"><h2 className="font-semibold">你的学习诊断</h2>{completed === 0 ? <p className="mt-2 text-sm leading-6 text-[#587079]">完成至少 3 题后，我会根据错题分布给出更具体的提升建议。</p> : <div className="mt-3 space-y-2 text-sm leading-6 text-[#587079]"><p>{skillMistakes("reading") >= skillMistakes("listening") ? "阅读目前更需要巩固：先练段落关键词定位，再检查同义替换。" : "听力目前更需要巩固：播放前先读选项，重点警惕转折后的信息。"}</p><p>建议下一步：{mistakes.length ? "从错题回顾中重做 1 题，并说出原文定位依据。" : "继续完成一组听力或阅读练习，建立第一轮数据。"}</p></div>}</div><div className="rounded-2xl border border-[#dbe2dc] bg-white p-5"><h2 className="font-semibold">官方练习资源</h2><p className="mt-2 text-sm leading-6 text-[#587079]">可直接使用官方免费模考，不复制内容到本网站。</p><a className="mt-3 inline-block text-sm font-semibold text-[#2f8176] underline" href="https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests" target="_blank" rel="noreferrer">打开 British Council 免费练习 ↗</a></div></div></section>}
      {view === "practice" && <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[#587079]">{skill === "reading" ? "阅读训练" : "听力训练"} · 第 {index + 1}/{filtered.length} 题</p><h1 className="text-2xl font-semibold">{question.title}</h1></div><div className="flex rounded-xl bg-white p-1 shadow-sm"><button onClick={() => {setSkill("reading");setIndex(0)}} className={`rounded-lg px-3 py-2 text-sm ${skill === "reading" ? "bg-[#dff0ea] font-semibold" : ""}`}>阅读</button><button onClick={() => {setSkill("listening");setIndex(0)}} className={`rounded-lg px-3 py-2 text-sm ${skill === "listening" ? "bg-[#dff0ea] font-semibold" : ""}`}>听力</button></div></div>
        <div className="rounded-2xl border border-[#dbe2dc] bg-white p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><span className="rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-semibold text-[#397267]">考点：{question.focus}</span>{question.skill === "listening" && <button onClick={playAudio} className="flex items-center gap-2 rounded-xl bg-[#163947] px-3 py-2 text-sm font-semibold text-white"><Volume2 size={16}/>{playing ? "播放中" : "播放音频"}</button>}</div><p className="whitespace-pre-line text-[1rem] leading-8 text-[#385058]">{question.passage}</p><hr className="my-6 border-[#e4e9e5]"/><h2 className="text-lg font-semibold">{question.prompt}</h2><div className="mt-4 grid gap-3">{question.options.map(option => <button key={option} onClick={() => answer(option)} className={`rounded-xl border p-4 text-left text-sm transition ${attemptByQuestion.get(question.id)?.answer === option ? (option === question.answer ? "border-[#2f8176] bg-[#e6f3ec]" : "border-[#d66b5d] bg-[#fff0ec]") : "border-[#dbe2dc] hover:border-[#70909a]"}`}><span className="font-medium">{option}</span></button>)}</div>
          {attemptByQuestion.has(question.id) && <div className={`mt-5 rounded-xl p-4 ${attemptByQuestion.get(question.id)?.isCorrect ? "bg-[#e6f3ec]" : "bg-[#fff0ec]"}`}><p className="flex items-center gap-2 font-semibold">{attemptByQuestion.get(question.id)?.isCorrect ? <CheckCircle2 className="text-[#2f8176]"/> : <XCircle className="text-[#d66b5d]"/>}{attemptByQuestion.get(question.id)?.isCorrect ? "答对了！" : `正确答案：${question.answer}`}</p><p className="mt-2 text-sm leading-6 text-[#385058]">{question.explanation}</p></div>}
        </div><div className="flex justify-between"><button disabled={index === 0} onClick={() => setIndex(index - 1)} className="rounded-lg px-3 py-2 text-sm disabled:opacity-30">上一题</button><button onClick={() => setIndex((index + 1) % filtered.length)} className="rounded-lg bg-[#163947] px-4 py-2 text-sm font-semibold text-white">下一题</button></div></section>}
      {view === "review" && <section><div className="mb-5"><p className="text-sm text-[#587079]">集中处理薄弱点</p><h1 className="text-2xl font-semibold">错题回顾与生词记忆</h1></div>{mistakes.length === 0 ? <div className="rounded-2xl border border-dashed border-[#b9c8c0] bg-white p-7 text-center"><CheckCircle2 className="mx-auto text-[#2f8176]" size={34}/><p className="mt-3 font-semibold">暂时没有错题</p><p className="mt-1 text-sm text-[#587079]">完成练习后，错题会自动出现在这里。</p></div> : <div className="space-y-3">{mistakes.map(m => { const q = questions.find(x => x.id === m.questionId)!; return <article key={m.questionId} className="rounded-2xl border border-[#ead6cd] bg-white p-5"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-semibold text-[#b9594d]">{q.skill === "reading" ? "阅读" : "听力"} · {q.focus}</span><h2 className="mt-1 font-semibold">{q.prompt}</h2></div><button onClick={() => {setSkill(q.skill);setIndex(questions.filter(x=>x.skill===q.skill).findIndex(x=>x.id===q.id));setView("practice")}} className="shrink-0 rounded-lg bg-[#163947] px-3 py-2 text-sm text-white">重做</button></div><p className="mt-3 text-sm text-[#587079]">你的答案：{m.answer}　·　正确答案：{q.answer}</p><p className="mt-3 rounded-lg bg-[#fff5ef] p-3 text-sm leading-6 text-[#385058]">{q.explanation}</p></article> })}</div>}<div className="mt-6 rounded-2xl border border-[#dbe2dc] bg-white p-5"><h2 className="font-semibold">生词复习卡</h2><p className="mt-1 text-sm text-[#587079]">点击状态建立你的记忆节奏；下次打开仍会保留。</p><div className="mt-4 grid gap-3">{vocab.map(word => <article key={word.word} className="rounded-xl bg-[#f5f6f2] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{word.word}</b><span className="ml-2 text-sm text-[#587079]">{word.meaning}</span></div><div className="flex gap-1">{(["new", "learning", "mastered"] as WordStatus[]).map(status => <button key={status} onClick={() => setWordStatus(word, status)} className={`rounded-md px-2 py-1 text-xs ${word.status === status ? "bg-[#163947] text-white" : "bg-white text-[#587079]"}`}>{status === "new" ? "未学" : status === "learning" ? "学习中" : "已掌握"}</button>)}</div></div><p className="mt-2 text-sm italic text-[#587079]">{word.example}</p></article>)}</div></div></section>}
    </div><footer className="px-5 pb-7 text-center text-xs text-[#6c7f81]"><Clock3 className="mr-1 inline" size={13}/>{saveState}　·　示例题为原创练习内容；请仅导入拥有授权的剑桥雅思资料。</footer>
  </main>;
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-sm ${active ? "bg-[#163947] font-semibold text-white" : "bg-white text-[#385058] hover:bg-[#e9f0eb]"}`}>{icon}{label}</button> }
function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <article className="rounded-2xl border border-[#dbe2dc] bg-white p-5"><p className="text-sm text-[#587079]">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-[#7a8d89]">{note}</p></article> }

