import React from 'react';

export const AddTaskModal = ({
  isOpen,
  onClose,
  newTask,
  setNewTask,
  taskCategory,
  setTaskCategory,
  taskPriority,
  setTaskPriority,
  dueDate,
  setDueDate,
  taskNote,
  setTaskNote,
  handleSubmit
}) => {
  if (!isOpen) return null;

  const handleModalSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(e);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Add New Task</h2>
        <form onSubmit={handleModalSubmit}>
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Task title"
            className="modal-input"
            autoFocus
          />
          <select
            value={taskCategory}
            onChange={(e) => setTaskCategory(e.target.value)}
            className="modal-select"
          >
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="shopping">Shopping</option>
            <option value="health">Health</option>
          </select>
          <select
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value)}
            className="modal-select"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="modal-input"
          />
          <textarea
            value={taskNote}
            onChange={(e) => setTaskNote(e.target.value)}
            placeholder="Add notes"
            className="modal-textarea"
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  );
};
