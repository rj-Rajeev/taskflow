import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./styles.css";
import "./status-control.css";

type User = { id: string; name: string; userRole: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" };
type Task = { id: string; title: string; status: string; priority: string; due_date?: string; is_overdue: boolean };
type Activity = { id: string; message: string; created_at: string; actor?: { name: string } };
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || body.message || "Request failed");
  return body;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("accessToken") || "");
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("admin@taskflow.com");
  const [password, setPassword] = useState("Password@123");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState(0);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [error, setError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "In Review",
    done: "Done",
  };

  async function login(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try { const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); localStorage.setItem("accessToken", result.accessToken); setToken(result.accessToken); } catch (e) { setError((e as Error).message); }
  }

  useEffect(() => {
    if (!token) return;
    const payload = JSON.parse(atob(token.split(".")[1]));
    setUser({ id: payload.id, name: payload.name, userRole: payload.userRole });
    const socket = io(API, { auth: { token }, withCredentials: true });
    socket.on("presence:update", (data) => setOnline(data.online));
    socket.on("activity:new", (activity) => setActivities((items) => [activity, ...items].slice(0, 20)));
    socket.on("notification:count", (data) => setUnread(data.unreadCount));
    Promise.all([
      request(`/tasks?${new URLSearchParams({ ...(status ? { status } : {}), ...(priority ? { priority } : {}) })}`, {}, token),
      request("/activity", {}, token), request("/notifications", {}, token),
    ]).then(([taskData, activityData, notificationData]) => { setTasks(taskData.data); setActivities(activityData.data); setUnread(notificationData.unreadCount); }).catch((e) => setError(e.message));
    return () => { socket.disconnect(); };
  }, [token, status, priority]);

  async function updateTask(task: Task, nextStatus: string) {
    if (nextStatus === task.status) return;
    setUpdatingTaskId(task.id);
    setError("");
    try {
      await request(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }, token);
      setTasks((currentTasks) => currentTasks.map((currentTask) => currentTask.id === task.id ? { ...currentTask, status: nextStatus } : currentTask));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (!token) return <main className="login"><form onSubmit={login}><span className="eyebrow">VELOZITY / TASKFLOW</span><h1>Project control, live.</h1><p>Sign in to your role-aware delivery workspace.</p><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" /><button>Enter workspace</button>{error && <small>{error}</small>}</form></main>;
  return <main><header><div><span className="eyebrow">VELOZITY / TASKFLOW</span><h1>{user?.userRole === "ADMIN" ? "Global command" : user?.userRole === "PROJECT_MANAGER" ? "Project pulse" : "My delivery board"}</h1></div><div className="meta"><span className="live"><i /> {online} online</span><span>{unread} notifications</span><button className="ghost" onClick={() => { localStorage.removeItem("accessToken"); setToken(""); }}>Sign out</button></div></header>{error && <div className="error">{error}</div>}<section className="stats"><div><small>ROLE</small><strong>{user?.userRole}</strong></div><div><small>VISIBLE TASKS</small><strong>{tasks.length}</strong></div><div><small>LIVE PRESENCE</small><strong>{online}</strong></div><div><small>ACTIVITY</small><strong>{activities.length}</strong></div></section><section className="workspace"><div className="tasks"><div className="section-head"><div><span className="eyebrow">TASK STREAM</span><h2>Assigned work</h2></div><div className="filters"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="review">In Review</option><option value="done">Done</option></select><select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div></div><div className="task-list">{tasks.map((task) => <article className="task" key={task.id}><div><span className={`priority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3><small>{statusLabels[task.status] || task.status} {task.is_overdue ? "· OVERDUE" : ""}</small></div><label className="status-control"><span>Status</span><select value={task.status} disabled={updatingTaskId === task.id} onChange={(event) => updateTask(task, event.target.value)} aria-label={`Change status for ${task.title}`}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="review">In Review</option><option value="done">Done</option></select>{updatingTaskId === task.id && <small>Saving...</small>}</label></article>)}</div></div><aside><div className="section-head"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Live activity</h2></div><span className="signal">LIVE</span></div>{activities.map((activity) => <div className="activity" key={activity.id}><i /><p>{activity.message}<small>{new Date(activity.created_at).toLocaleString()}</small></p></div>)}</aside></section></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
