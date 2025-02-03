import { useEffect, useState } from "react";
import { supabase } from "./utils/supabase";
import { format } from "date-fns";
import SwipeToDelete from 'react-swipe-to-delete-ios';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // Existing fetch tasks call
    fetchTasks();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('tasks')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' }, 
        (payload) => {
          fetchTasks();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        created_at: new Date().toISOString()
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
        // Remove task from state after successful deletion
        setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
        
        // Vibrate on success (for user feedback)
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
      // Attempt to update the task
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: !currentCompleted })
        .eq("id", taskId)
        .select(); // Ensure we see the updated row
  
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

  return (
    <div className="container">
      <div className="header">
        <h1>Tasks</h1>
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
