import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

const LOCAL_STORAGE_KEY = "todo_tasks";

export function useLocalTasks() {
  const [tasks, setTasks] = useState([]);

  // Load tasks from local storage
  useEffect(() => {
    const savedTasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    setTasks(savedTasks);
    syncTasks(savedTasks);
  }, []);

  // Save tasks locally
  const saveTasks = (newTasks) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTasks));
    setTasks(newTasks);
    syncTasks(newTasks);
  };

  // Sync tasks with Supabase
  const syncTasks = async (localTasks) => {
    try {
      const { data: remoteTasks } = await supabase.from("tasks").select("*");

      // Merge local & remote tasks
      const updatedTasks = [...new Map([...localTasks, ...remoteTasks].map(task => [task.id, task])).values()];

      // Push new local tasks to Supabase
      const newTasks = localTasks.filter((t) => !remoteTasks.find((r) => r.id === t.id));
      await supabase.from("tasks").insert(newTasks);

      setTasks(updatedTasks);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error("Sync failed:", error.message);
    }
  };

  return { tasks, saveTasks };
}
