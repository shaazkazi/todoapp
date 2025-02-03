import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";
import { format } from "date-fns";
import SwipeToDelete from 'react-swipe-to-delete-ios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { AddTaskModal } from './components/AddTaskModal';
import confetti from 'canvas-confetti';

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("active");
  const [isLogin, setIsLogin] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [hash, setHash] = useState(null);
  const [isResetPassword, setIsResetPassword] = useState(false);

  // New state for enhancements
  const [theme, setTheme] = useState('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [taskCategory, setTaskCategory] = useState('personal');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [taskNote, setTaskNote] = useState('');
  const [subTasks, setSubTasks] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
// Move this to the top of the file, before App component


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchTasks();

      const subscription = supabase
        .channel('tasks')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tasks' }, 
          (payload) => {
            fetchTasks();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [session]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setHash(hash);
    }
  }, []);
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
    completionRate: tasks.length ? 
      Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0
  };
    

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setError("Check your email for verification link!");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    // Clear local storage first
    localStorage.clear();
    
    // Multiple logout attempts with different scopes
    await supabase.auth.signOut({ scope: 'local' });
    await supabase.auth.signOut({ scope: 'others' });
    
    // Force clear session state
    setSession(null);
    
    // Hard redirect to clear all states
    window.location.href = 'https://toodoolister.netlify.app';
  };
  

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setError(error.message);
    } else {
      setError('Password updated successfully!');
      setTimeout(() => window.location.href = '/', 2000);
    }
    setLoading(false);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq('user_id', session.user.id)
      .order("created_at", { ascending: false });
    
    if (error) console.error("Error fetching tasks:", error);
    else setTasks(data || []);
  };

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };


  // Batch actions
  const handleBatchDelete = async () => {
    if (selectedTasks.length === 0) return;
    
    const { error } = await supabase
      .from("tasks")
      .delete()
      .in('id', selectedTasks);

    if (!error) {
      setTasks(tasks.filter(task => !selectedTasks.includes(task.id)));
      setSelectedTasks([]);
    }
  };

  const handleBatchComplete = async () => {
    if (selectedTasks.length === 0) return;
    
    const { error } = await supabase
      .from("tasks")
      .update({ completed: true })
      .in('id', selectedTasks);

    if (!error) {
      fetchTasks();
      setSelectedTasks([]);
    }
  };

  // Handle drag and drop
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTasks(items);
  };

  // Celebration effect on task completion
  const celebrateCompletion = () => {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#FF3B30', '#007AFF', '#34C759', '#FF9500'],
      startVelocity: 30,
      gravity: 0.8,
      ticks: 200,
      shapes: ['circle', 'square']
    });
  };
  const deleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
  
      if (!error) {
        setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
        
        if (navigator.vibrate) navigator.vibrate([50, 50]);
        
        console.log("Task deleted successfully:", taskId);
      } else {
        console.error("Error deleting task from Supabase:", error);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };
    
  const toggleTask = async (taskId, currentCompleted) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: !currentCompleted })
        .eq("id", taskId)
        .select();

      if (error) {
        console.error("Supabase Error:", error.message);
        alert(`Failed to update task: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        console.log("Task updated successfully:", data);
        setTasks(currentTasks =>
          currentTasks.map(task =>
            task.id === taskId
              ? { ...task, completed: !currentCompleted }
              : task
          )
        );
        if (!currentCompleted) {
          celebrateCompletion(); // Add this line here
        }
        if (navigator.vibrate) navigator.vibrate(50);
      }
    } catch (err) {
      console.error("Client Error:", err.message);
      alert(`Client-side error: ${err.message}`);
    }
  };
 // Remove the duplicate filteredTasks declaration and combine the search with existing filter
const filteredTasks = tasks.filter(task => {
  const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
  if (filter === "active") return !task.completed && matchesSearch;
  if (filter === "completed") return task.completed && matchesSearch;
  return matchesSearch;
});

// Update the addTask function to include notes
// Enhanced addTask function
const addTask = async (e) => {
  e.preventDefault();
  if (!newTask.trim()) return;

  const dueDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  const newTaskObj = {
    title: newTask,
    completed: false,
    created_at: new Date().toISOString(),
    user_id: session.user.id,
    category: taskCategory,
    priority: taskPriority,
    due_date: dueDate,
    notes: taskNote
  };

  const { error } = await supabase.from("tasks").insert([newTaskObj]);
  
  if (!error) {
    setNewTask("");
    setTaskNote("");
    setTaskCategory("personal");
    setTaskPriority("medium");
    setIsAddModalOpen(false);
    fetchTasks();
    if (navigator.vibrate) navigator.vibrate(50);
  }
};

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setError(error.message);
    } else {
      setError("Check your email for password reset link!");
    }
    setLoading(false);
  };

  if (hash) {
    return (
      <div className="auth-container">
        <form onSubmit={handleUpdatePassword} className="auth-form">
          <h1>Update Password</h1>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-container">
        <form onSubmit={isResetPassword ? handleResetPassword : isLogin ? handleLogin : handleSignUp} className="auth-form">
          <h1>Tasks</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {!isResetPassword && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : isResetPassword ? 'Reset Password' : isLogin ? 'Login' : 'Sign Up'}
          </button>
          <button 
            type="button" 
            className="auth-switch"
            onClick={() => {
              setIsResetPassword(false);
              setIsLogin(!isLogin);
            }}
          >
            {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
          </button>
          {isLogin && (
            <button 
              type="button" 
              className="auth-switch"
              onClick={() => setIsResetPassword(!isResetPassword)}
            >
              {isResetPassword ? 'Back to Login' : 'Forgot Password?'}
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-top">
          <h1>Tasks</h1>
          <div className="header-controls">
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={() => setShowStats(!showStats)} className="stats-toggle">
              📊
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
  
        {showStats && (
          <div className="stats-panel">
            <div className="stat-item">
              <span>Total: {stats.total}</span>
              <span>Completed: {stats.completed}</span>
              <span>Active: {stats.active}</span>
              <div className="completion-rate">
                <div 
                  className="completion-bar" 
                  style={{width: `${stats.completionRate}%`}}
                />
                <span>{stats.completionRate}%</span>
              </div>
            </div>
          </div>
        )}
  
  <div className="filter-buttons">
  {["active", "all", "completed"].map(filterType => (
    <button
      key={filterType}
      className={filter === filterType ? "active" : ""}
      onClick={() => setFilter(filterType)}
    >
      {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
    </button>
  ))}
</div>
      </div>
  
      <div className="task-list">
  {filteredTasks.map((task, index) => (
    <SwipeToDelete
      key={task.id}
      onDelete={() => deleteTask(task.id)}
      height={120}
    >
      <div 
        className={`task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`}
      >
        <div className="task-content">
          <div 
            className={`task-checkbox ${task.completed ? 'checked' : ''}`}
            onClick={() => toggleTask(task.id, task.completed)}
          />
          <div className="task-details">
            <div className="task-header">
              <span className="task-title">{task.title}</span>
              <span className={`task-category ${task.category}`}>
                {task.category}
              </span>
            </div>
            {task.notes && (
              <div className="task-notes-display">{task.notes}</div>
            )}
            <div className="task-meta">
              <span>{format(new Date(task.created_at), 'MMM d, h:mm a')}</span>
              {task.due_date && (
                <span className="due-date">
                  Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </SwipeToDelete>
  ))}
</div>
      <button onClick={() => setIsAddModalOpen(true)} className="add-task-button">
        +
      </button>
      {isAddModalOpen && (
  <AddTaskModal
    isOpen={isAddModalOpen}
    onClose={() => setIsAddModalOpen(false)}
    newTask={newTask}
    setNewTask={setNewTask}
    taskCategory={taskCategory}
    setTaskCategory={setTaskCategory}
    taskPriority={taskPriority}
    setTaskPriority={setTaskPriority}
    dueDate={dueDate}
    setDueDate={setDueDate}
    taskNote={taskNote}
    setTaskNote={setTaskNote}
    handleSubmit={addTask}
  />
)}
      
    </div>
  );
}

export default App;
