import TaskItem from "./TaskItem";

export default function TaskList({ tasks, toggleComplete }) {
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} toggleComplete={toggleComplete} />
      ))}
    </div>
  );
}
