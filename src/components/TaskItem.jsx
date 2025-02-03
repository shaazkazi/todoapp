export default function TaskItem({ task, toggleComplete }) {
    return (
      <div className={`task-item ${task.completed ? "completed" : ""}`} onClick={() => toggleComplete(task.id)}>
        <span>{task.title}</span>
        <button>✔️</button>
      </div>
    );
  }
  