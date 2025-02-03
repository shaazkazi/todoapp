import { useLocalTasks } from "../hooks/useLocalTasks";
import TaskList from "../components/TaskList";
import AddTask from "../components/AddTask";

export default function Home() {
  const { tasks, saveTasks } = useLocalTasks();

  const addTask = (title) => {
    const newTask = { id: Date.now().toString(), title, completed: false };
    saveTasks([...tasks, newTask]);
  };

  const toggleComplete = (id) => {
    const updatedTasks = tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task));
    saveTasks(updatedTasks);
  };

  return (
    <div className="home">
      <h1>To-Do</h1>
      <AddTask addTask={addTask} />
      <TaskList tasks={tasks} toggleComplete={toggleComplete} />
    </div>
  );
}
