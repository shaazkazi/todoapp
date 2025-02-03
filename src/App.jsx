import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";
import { format } from "date-fns";
import SwipeToDelete from 'react-swipe-to-delete-ios';

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");
  const [isLogin, setIsLogin] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [hash, setHash] = useState(null);

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
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setSession(null);
    }
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
      .order("created_at", { ascending: false });
    
    if (error) console.error("Error fetching tasks:", error);
    else setTasks(data || []);
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .insert([{ 
        title: newTask,
        completed: false,
        created_at: new Date().toISOString(),
        user_id: session.user.id
      }]);
    
    if (!error) {
      setNewTask("");
      fetchTasks();
      if (navigator.vibrate) navigator.vibrate(50);
    }
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
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        console.warn("No data returned from update. Task may not have been updated.");
      }
    } catch (err) {
      console.error("Client Error:", err.message);
      alert(`Client-side error: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

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
    const [isResetPassword, setIsResetPassword] = useState(false);

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
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
        <div className="filter-buttons">
          {["all", "active", "completed"].map(filterType => (
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

      <form onSubmit={addTask} className="input-group">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a task"
          aria-label="New task input"
        />
        <button type="submit" className="add-button">Add</button>
      </form>

      <div className="task-list">
        {filteredTasks.map((task, index) => (
          <SwipeToDelete
            key={task.id}
            onDelete={() => deleteTask(task.id)}
            height={88}
          >
            <div 
              className={`task-item ${task.completed ? 'completed' : ''}`} 
              style={{animationDelay: `${index * 0.05}s`}}
            >
              <div className="task-content">
                <div 
                  className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                  onClick={() => toggleTask(task.id, task.completed)}
                />
                <div className="task-details">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    {format(new Date(task.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </SwipeToDelete>
        ))}
      </div>
    </div>
  );
}

export default App;